# ICSI Library Examples

This guide contains comprehensive examples from basic usage to real-world production patterns.

## Basic Setup

```typescript
import { HttpAgent } from '@dfinity/agent';
import { createHostAgentAndIdentityFromSeed } from '@jagad/icsi';

// Create agent with seed phrase
const { agent, identity } = await createHostAgentAndIdentityFromSeed(
  'your twelve word seed phrase here',
  'https://ic0.app'
);

const canisterId = 'qvn3w-rqaaa-aaaam-qd4kq-cai';
```

## Token Operations

### Creating Subaccounts

```typescript
import { addSubaccountForToken, Tokens } from '@jagad/icsi';

// Create ICP subaccount
const icpSubaccount = await addSubaccountForToken(
  agent,
  canisterId,
  Tokens.ICP
);
console.log('ICP deposit address:', icpSubaccount);

// Create ckUSDC subaccount
const usdcSubaccount = await addSubaccountForToken(
  agent,
  canisterId,
  Tokens.CKUSDC
);
console.log('ckUSDC deposit address:', usdcSubaccount);

// Create ckUSDT subaccount
const usdtSubaccount = await addSubaccountForToken(
  agent,
  canisterId,
  Tokens.CKUSDT
);
console.log('ckUSDT deposit address:', usdtSubaccount);

// Create ckBTC subaccount
const btcSubaccount = await addSubaccountForToken(
  agent,
  canisterId,
  Tokens.CKBTC
);
console.log('ckBTC deposit address:', btcSubaccount);
```

### Getting Deposit Addresses

```typescript
import { getDepositAddresses } from '@jagad/icsi';

const addresses = await getDepositAddresses(agent, canisterId);

addresses.forEach((addr) => {
  if (addr.tokenType.ICP) {
    console.log('ICP address:', addr.depositAddress);
  } else if (addr.tokenType.CKUSDC) {
    console.log('ckUSDC address:', addr.depositAddress);
  } else if (addr.tokenType.CKUSDT) {
    console.log('ckUSDT address:', addr.depositAddress);
  } else if (addr.tokenType.CKBTC) {
    console.log('ckBTC address:', addr.depositAddress);
  }
});
```

## Transaction Management

### Fetching Transactions

```typescript
import { getUserVaultTransactions } from '@jagad/icsi';

// Get recent transactions
const result = await getUserVaultTransactions(agent, canisterId, BigInt(10));

if ('Ok' in result) {
  const transactions = result.Ok;

  transactions.forEach((tx) => {
    console.log(`Transaction: ${tx.tx_hash}`);
    console.log(`Amount: ${tx.amount}`);
    console.log(`Token: ${Object.keys(tx.token_type)[0]}`);
    console.log(`Status: ${Object.keys(tx.sweep_status)[0]}`);
  });
} else {
  console.error('Error:', result.Err);
}
```

### Filtering Transactions by Token Type

```typescript
import { getTransactionsByTokenType, Tokens } from '@jagad/icsi';

// Get only ckUSDC transactions
const usdcTransactions = await getTransactionsByTokenType(
  agent,
  canisterId,
  Tokens.CKUSDC
);

console.log(`Found ${usdcTransactions.length} ckUSDC transactions`);
```

## Sweeping Operations

### Sweep All Tokens

```typescript
import { sweep } from '@jagad/icsi';

const sweepResult = await sweep(agent, canisterId);

if ('Ok' in sweepResult) {
  console.log('Sweep successful:', sweepResult.Ok);
} else {
  console.error('Sweep failed:', sweepResult.Err);
}
```

### Sweep Specific Token

```typescript
import { sweepByTokenType, Tokens } from '@jagad/icsi';

// Sweep only ckUSDC
const usdcSweepResult = await sweepByTokenType(
  agent,
  canisterId,
  Tokens.CKUSDC
);

if ('Ok' in usdcSweepResult) {
  console.log('ckUSDC sweep successful');
} else {
  console.error('ckUSDC sweep failed:', usdcSweepResult.Err);
}
```

### Sweep Specific Subaccount

```typescript
import { sweepSubaccountId } from '@jagad/icsi';

const subaccountId = 'your-subaccount-id';
const amount = 1000000; // Amount in smallest units

const result = await sweepSubaccountId(
  agent,
  canisterId,
  subaccountId,
  amount,
  Tokens.CKUSDC
);

if ('Ok' in result) {
  console.log('Subaccount sweep successful');
} else {
  console.error('Subaccount sweep failed:', result.Err);
}
```

## Configuration Management

### Setting Webhook URL

```typescript
import { setWebhookUrl } from '@jagad/icsi';

const webhookUrl = 'https://your-api.com/webhook/icp-deposits';

const result = await setWebhookUrl(agent, canisterId, webhookUrl);

if ('Ok' in result) {
  console.log('Webhook URL set successfully');
} else {
  console.error('Failed to set webhook URL:', result.Err);
}
```

### Setting Polling Interval

```typescript
import { setUserVaultInterval } from '@jagad/icsi';

// Set interval to 30 seconds (for testing)
const testInterval = BigInt(30);

const result = await setUserVaultInterval(agent, canisterId, testInterval);

if ('Ok' in result) {
  console.log('Interval updated successfully');
} else {
  console.error('Failed to update interval:', result.Err);
}

// Reset to production interval (500 seconds)
const productionInterval = BigInt(500);
await setUserVaultInterval(agent, canisterId, productionInterval);
```

## Balance Checking

### Get All Token Balances

```typescript
import { getBalances } from '@jagad/icsi';

const balances = await getBalances(agent, canisterId);

balances.forEach((balance) => {
  const tokenName = Object.keys(balance.tokenType)[0];
  console.log(`${tokenName}: ${balance.balance}`);
});
```

## Error Handling Patterns

### Robust Transaction Fetching

```typescript
import { getUserVaultTransactions } from '@jagad/icsi';

const fetchTransactionsWithRetry = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await getUserVaultTransactions(
        agent,
        canisterId,
        BigInt(50)
      );

      if ('Ok' in result) {
        return result.Ok;
      } else {
        console.warn(`Attempt ${i + 1} failed:`, result.Err);
        if (i === retries - 1) throw new Error(result.Err);
      }
    } catch (error) {
      console.warn(`Network error on attempt ${i + 1}:`, error);
      if (i === retries - 1) throw error;

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Safe Sweep Operations

```typescript
import { getBalances, sweepByTokenType, Tokens } from '@jagad/icsi';

const safeSweep = async (tokenType: typeof Tokens.CKUSDC) => {
  // Check balance first
  const balances = await getBalances(agent, canisterId);
  const tokenBalance = balances.find(
    (b) => Object.keys(b.tokenType)[0] === Object.keys(tokenType)[0]
  );

  if (!tokenBalance || tokenBalance.balance === 0) {
    console.log('No balance to sweep');
    return;
  }

  console.log(`Sweeping ${tokenBalance.balance} tokens`);

  const result = await sweepByTokenType(agent, canisterId, tokenType);

  if ('Ok' in result) {
    console.log('Sweep completed successfully');
  } else {
    console.error('Sweep failed:', result.Err);
  }
};
```

## Payment Processing Workflow

### Complete Payment System

```typescript
import {
  addSubaccountForToken,
  setWebhookUrl,
  getUserVaultTransactions,
  sweepByTokenType,
  Tokens,
} from '@jagad/icsi';

class PaymentProcessor {
  constructor(
    private agent: HttpAgent,
    private canisterId: string
  ) {}

  async initialize(webhookUrl: string) {
    // Set webhook for notifications
    await setWebhookUrl(this.agent, this.canisterId, webhookUrl);
    console.log('Payment processor initialized');
  }

  async createCustomerWallet(customerId: string) {
    const addresses = {
      customerId,
      icp: await addSubaccountForToken(this.agent, this.canisterId, Tokens.ICP),
      usdc: await addSubaccountForToken(
        this.agent,
        this.canisterId,
        Tokens.CKUSDC
      ),
      usdt: await addSubaccountForToken(
        this.agent,
        this.canisterId,
        Tokens.CKUSDT
      ),
      btc: await addSubaccountForToken(
        this.agent,
        this.canisterId,
        Tokens.CKBTC
      ),
    };

    console.log(`Created wallet for customer ${customerId}:`, addresses);
    return addresses;
  }

  async processPayments() {
    // Get recent transactions
    const result = await getUserVaultTransactions(
      this.agent,
      this.canisterId,
      BigInt(100)
    );

    if ('Ok' in result) {
      const pendingTransactions = result.Ok.filter(
        (tx) => tx.sweep_status.Pending !== undefined
      );

      console.log(`Found ${pendingTransactions.length} pending payments`);

      // Process each transaction
      for (const tx of pendingTransactions) {
        await this.processTransaction(tx);
      }
    }
  }

  private async processTransaction(tx: any) {
    console.log(`Processing transaction: ${tx.tx_hash}`);

    // Your business logic here
    // e.g., update database, send notifications, etc.

    // Mark as processed by sweeping
    const tokenType = tx.token_type.ICP
      ? Tokens.ICP
      : tx.token_type.CKUSDC
        ? Tokens.CKUSDC
        : tx.token_type.CKUSDT
          ? Tokens.CKUSDT
          : Tokens.CKBTC;

    await sweepByTokenType(this.agent, this.canisterId, tokenType);
  }
}

// Usage
const processor = new PaymentProcessor(agent, canisterId);
await processor.initialize('https://your-api.com/webhook');

// Create customer wallets
const wallet1 = await processor.createCustomerWallet('customer-123');
const wallet2 = await processor.createCustomerWallet('customer-456');

// Process incoming payments
setInterval(async () => {
  await processor.processPayments();
}, 30000); // Check every 30 seconds
```

## Real-World Production Patterns

### Authentication Pattern

In production, all ICSI library calls use an authenticated `HttpAgent` wrapper:

```typescript
import { HttpAgent } from '@dfinity/agent';
import { createHostAgentAndIdentityFromSeed } from '@jagad/icsi';

// Create authenticated agent from environment seed
export const addHttpAgent = async (functionName: any, args: any[]) => {
  const seedPhrase = process.env.ICP_USER_VAULT_AUTH_SEED;
  if (!seedPhrase) {
    throw new Error('ICP_USER_VAULT_AUTH_SEED not configured');
  }

  const { agent } = await createHostAgentAndIdentityFromSeed(
    seedPhrase,
    'https://ic0.app'
  );

  // Call the ICSI function with authenticated agent
  return await functionName(agent, ...args);
};
```

## Production Query Functions

### Get Transaction History with Error Handling

```typescript
import { getUserVaultTransactions } from '@jagad/icsi';

// Fetch recent transactions with error handling
export const getTransactions = async (
  userVaultCanisterId: string,
  limit?: bigint
) => {
  return await addHttpAgent(getUserVaultTransactions, [
    userVaultCanisterId,
    limit,
  ]);
};

// Usage with Result type handling
const result = await getTransactions(canisterId, BigInt(50));
if ('Ok' in result) {
  const transactions = result.Ok;
  console.log(`Found ${transactions.length} transactions`);
} else {
  console.error('Error fetching transactions:', result.Err);
}
```

### Production Deposit Address Management

```typescript
import { getDepositAddresses } from '@jagad/icsi';

export const fetchDepositAddresses = async (userVaultCanisterId: string) => {
  try {
    const addresses = await addHttpAgent(getDepositAddresses, [
      userVaultCanisterId,
    ]);

    // Format addresses for different token types
    const formattedAddresses = {
      ICP: addresses.find((a) => a.tokenType.ICP)?.depositAddress,
      CKUSDC: addresses.find((a) => a.tokenType.CKUSDC)?.depositAddress,
      CKUSDT: addresses.find((a) => a.tokenType.CKUSDT)?.depositAddress,
      CKBTC: addresses.find((a) => a.tokenType.CKBTC)?.depositAddress,
    };

    return { Ok: formattedAddresses };
  } catch (error) {
    return { Err: error.message };
  }
};
```

### Balance Checking Before Operations

```typescript
import { getBalances } from '@jagad/icsi';

export const checkBalances = async (userVaultCanisterId: string) => {
  const balances = await addHttpAgent(getBalances, [userVaultCanisterId]);

  // Filter out zero balances
  const nonZeroBalances = balances.filter((b) => b.balance > 0);

  return nonZeroBalances;
};
```

## Production Update Functions

### Register All Tokens with Environment Configuration

```typescript
import { registerToken, Tokens } from '@jagad/icsi';

export const registerAllTokens = async (userVaultCanisterId: string) => {
  const tokenRegistrations = [
    {
      tokenType: Tokens.CKUSDC,
      canisterId:
        process.env.CKUSDC_CANISTER_ID || 'xevnm-gaaaa-aaaar-qafnq-cai',
    },
    {
      tokenType: Tokens.CKUSDT,
      canisterId:
        process.env.CKUSDT_CANISTER_ID || 'cngnf-vqaaa-aaaar-qag4q-cai',
    },
    {
      tokenType: Tokens.CKBTC,
      canisterId:
        process.env.CKBTC_CANISTER_ID || 'mxzaz-hqaaa-aaaar-qaada-cai',
    },
  ];

  const results = [];
  for (const { tokenType, canisterId } of tokenRegistrations) {
    const result = await addHttpAgent(registerToken, [
      userVaultCanisterId,
      tokenType,
      canisterId,
    ]);
    results.push({ tokenType, result });
  }

  return results;
};
```

### Smart Sweep with Fee Calculation

```typescript
import { getBalances, sweepByTokenType, Tokens } from '@jagad/icsi';

export const smartSweep = async (
  userVaultCanisterId: string,
  tokenType: typeof Tokens.CKUSDC
) => {
  // Check balance first
  const balances = await addHttpAgent(getBalances, [userVaultCanisterId]);
  const tokenName = Object.keys(tokenType)[0];
  const balance = balances.find(
    (b) => Object.keys(b.tokenType)[0] === tokenName
  );

  if (!balance || balance.balance === 0) {
    return { Err: 'No balance to sweep' };
  }

  // Calculate fees and minimum amounts
  const fees = {
    ICP: 10000, // 0.0001 ICP
    CKUSDC: 10000, // 0.01 CKUSDC
    CKUSDT: 10000, // 0.01 CKUSDT
    CKBTC: 10, // 0.0000001 BTC
  };

  const fee = fees[tokenName] || 10000;
  const minAmount = fee * 10; // 10x fee as minimum

  if (balance.balance < minAmount) {
    return {
      Err: `Balance ${balance.balance} too low for efficient sweep (min: ${minAmount})`,
    };
  }

  // Perform sweep
  return await addHttpAgent(sweepByTokenType, [userVaultCanisterId, tokenType]);
};
```

### Create Subaccounts with Retry Logic

```typescript
import { addSubaccountForToken, Tokens } from '@jagad/icsi';

export const createSubaccountWithRetry = async (
  userVaultCanisterId: string,
  tokenType: typeof Tokens.CKUSDC,
  maxRetries = 3
) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await addHttpAgent(addSubaccountForToken, [
        userVaultCanisterId,
        tokenType,
      ]);

      if ('Ok' in result) {
        return result;
      }

      lastError = result.Err;

      // Wait before retry with exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt))
      );
    } catch (error) {
      lastError = error.message;
      if (attempt === maxRetries - 1) throw error;
    }
  }

  return { Err: lastError };
};
```

## Advanced Transaction Processing

### Process Deposit Events with Verification

```typescript
import { getUserVaultTransactions, sweepByTokenType } from '@jagad/icsi';

export const processDepositEvent = async (
  userVaultCanisterId: string,
  depositInfo: {
    amount: number;
    tokenType: any;
    depositAddress: string;
  }
) => {
  // 1. Verify transaction exists
  const txResult = await addHttpAgent(getUserVaultTransactions, [
    userVaultCanisterId,
    BigInt(100),
  ]);

  if ('Err' in txResult) {
    throw new Error(`Failed to fetch transactions: ${txResult.Err}`);
  }

  // 2. Find matching transaction
  const matchingTx = txResult.Ok.find(
    (tx) =>
      tx.amount === depositInfo.amount &&
      Object.keys(tx.token_type)[0] === Object.keys(depositInfo.tokenType)[0] &&
      tx.sweep_status.Pending !== undefined
  );

  if (!matchingTx) {
    throw new Error('Transaction not found or already swept');
  }

  // 3. Trigger sweep
  const sweepResult = await addHttpAgent(sweepByTokenType, [
    userVaultCanisterId,
    depositInfo.tokenType,
  ]);

  if ('Ok' in sweepResult) {
    console.log(
      `Successfully swept ${depositInfo.amount} ${Object.keys(depositInfo.tokenType)[0]}`
    );
    return { success: true, txHash: matchingTx.tx_hash };
  } else {
    throw new Error(`Sweep failed: ${sweepResult.Err}`);
  }
};
```

### Address Format Handling for Display

```typescript
import { getDepositAddresses } from '@jagad/icsi';

export const formatAddressForDisplay = async (userVaultCanisterId: string) => {
  const addresses = await addHttpAgent(getDepositAddresses, [
    userVaultCanisterId,
  ]);

  return addresses.map((addr) => {
    const tokenType = Object.keys(addr.tokenType)[0];
    let formattedAddress = addr.depositAddress;

    // Handle different address formats
    if (tokenType === 'ICP') {
      // ICP uses hex format (64 chars)
      formattedAddress = addr.depositAddress.toLowerCase();
    } else if (['CKUSDC', 'CKUSDT', 'CKBTC'].includes(tokenType)) {
      // ICRC-1 tokens use textual format with checksum
      // Format: canister-id-checksum.index
      const parts = addr.depositAddress.split('.');
      if (parts.length === 2) {
        formattedAddress = `${parts[0]}.${parts[1]}`;
      }
    }

    return {
      tokenType,
      address: formattedAddress,
      displayAddress: `${formattedAddress.slice(0, 6)}...${formattedAddress.slice(-4)}`,
      qrCodeData: formattedAddress,
    };
  });
};
```

## Production Webhook Integration

### Configure Webhook with Validation

```typescript
import { setWebhookUrl, getWebhookUrl } from '@jagad/icsi';

export const configureWebhook = async (
  userVaultCanisterId: string,
  webhookUrl: string
) => {
  // Validate URL format
  try {
    new URL(webhookUrl);
  } catch {
    return { Err: 'Invalid webhook URL format' };
  }

  // Set webhook
  const setResult = await addHttpAgent(setWebhookUrl, [
    userVaultCanisterId,
    webhookUrl,
  ]);

  if ('Err' in setResult) {
    return setResult;
  }

  // Verify it was set correctly
  const getResult = await addHttpAgent(getWebhookUrl, [userVaultCanisterId]);

  if ('Ok' in getResult && getResult.Ok === webhookUrl) {
    return { Ok: 'Webhook configured successfully' };
  } else {
    return { Err: 'Webhook verification failed' };
  }
};
```

## Queue Processing Pattern

```typescript
import { getUserVaultTransactions } from '@jagad/icsi';

export const processTransactionQueue = async (userVaultCanisterId: string) => {
  // Fetch unprocessed transactions
  const result = await addHttpAgent(getUserVaultTransactions, [
    userVaultCanisterId,
    BigInt(100),
  ]);

  if ('Err' in result) {
    console.error('Failed to fetch transactions:', result.Err);
    return;
  }

  // Filter pending transactions
  const pendingTransactions = result.Ok.filter(
    (tx) => tx.sweep_status.Pending !== undefined
  );

  // Process each transaction
  for (const tx of pendingTransactions) {
    try {
      await processTransaction(tx);
    } catch (error) {
      console.error(`Failed to process transaction ${tx.tx_hash}:`, error);
      // Continue with next transaction
    }
  }
};

async function processTransaction(transaction: any) {
  const tokenType = Object.keys(transaction.token_type)[0];

  // Add to processing queue
  await addToQueue({
    txHash: transaction.tx_hash,
    amount: transaction.amount,
    tokenType: tokenType,
    timestamp: transaction.timestamp,
  });

  // Your business logic here
  console.log(`Processing ${tokenType} transaction: ${transaction.amount}`);
}
```

## Robust Error Handling

### Transaction Fetching with Timeout and Retry

```typescript
import { getUserVaultTransactions } from '@jagad/icsi';

export const robustTransactionFetch = async (
  userVaultCanisterId: string,
  options = { retries: 3, timeout: 30000 }
) => {
  let lastError;

  for (let i = 0; i < options.retries; i++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), options.timeout);
      });

      // Race between actual call and timeout
      const result = await Promise.race([
        addHttpAgent(getUserVaultTransactions, [
          userVaultCanisterId,
          BigInt(50),
        ]),
        timeoutPromise,
      ]);

      return result;
    } catch (error) {
      lastError = error;

      // Log attempt failure
      console.warn(`Attempt ${i + 1} failed:`, error.message);

      // Wait before retry with exponential backoff
      if (i < options.retries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      }
    }
  }

  // All retries failed
  return {
    Err: `Failed after ${options.retries} attempts: ${lastError.message}`,
  };
};
```

## Multi-Environment Configuration

```typescript
import { createHostAgentAndIdentityFromSeed } from '@jagad/icsi';

export const createEnvironmentAgent = async () => {
  const config = {
    local: {
      host: 'http://127.0.0.1:4943',
      seedPhrase: process.env.LOCAL_SEED_PHRASE,
      canisterIds: {
        userVault: process.env.LOCAL_USER_VAULT_CANISTER,
        ckusdc: 'be2us-64aaa-aaaaa-qaabq-cai',
        ckusdt: 'be2us-64aaa-aaaaa-qaabq-cai',
        ckbtc: 'be2us-64aaa-aaaaa-qaabq-cai',
      },
    },
    testnet: {
      host: 'https://testnet.dfinity.network',
      seedPhrase: process.env.TESTNET_SEED_PHRASE,
      canisterIds: {
        userVault: process.env.TESTNET_USER_VAULT_CANISTER,
        ckusdc: 'zxeu2-7aaaa-aaaaq-aaafa-cai',
        ckusdt: 'zdzyx-siaaa-aaaar-qac2a-cai',
        ckbtc: 'mc6ru-gyaaa-aaaar-qaaaq-cai',
      },
    },
    mainnet: {
      host: 'https://ic0.app',
      seedPhrase: process.env.MAINNET_SEED_PHRASE,
      canisterIds: {
        userVault: process.env.MAINNET_USER_VAULT_CANISTER,
        ckusdc: 'xevnm-gaaaa-aaaar-qafnq-cai',
        ckusdt: 'cngnf-vqaaa-aaaar-qag4q-cai',
        ckbtc: 'mxzaz-hqaaa-aaaar-qaada-cai',
      },
    },
  };

  const environment = process.env.ICP_ENVIRONMENT || 'local';
  const envConfig = config[environment];

  if (!envConfig.seedPhrase) {
    throw new Error(
      `Seed phrase not configured for ${environment} environment`
    );
  }

  const { agent, identity } = await createHostAgentAndIdentityFromSeed(
    envConfig.seedPhrase,
    envConfig.host
  );

  return { agent, identity, config: envConfig };
};
```

These examples demonstrate both basic usage and production patterns for authentication, error handling, multi-token support, and robust transaction processing with the ICSI library.
