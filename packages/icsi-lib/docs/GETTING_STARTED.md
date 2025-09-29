# Getting Started with ICSI Library

## Installation

```bash
npm install @jagad/icsi
# or
pnpm install @jagad/icsi
# or
yarn add @jagad/icsi
```

## Basic Setup

### 1. Import Required Functions

```typescript
import { HttpAgent } from '@dfinity/agent';
import {
  createHostAgentAndIdentityFromSeed,
  addSubaccountForToken,
  getUserVaultTransactions,
  getDepositAddresses,
  Tokens,
} from '@jagad/icsi';
```

### 2. Create Agent and Identity

```typescript
// Using seed phrase (recommended)
const { agent, identity } = await createHostAgentAndIdentityFromSeed(
  'your twelve word seed phrase here',
  'https://ic0.app'
);

// Or using private key
const privateKey = `-----BEGIN EC PRIVATE KEY-----
Your PEM private key here
-----END EC PRIVATE KEY-----`;

const { agent, identity } = await createHostAgentAndIdentityFromPrivateKey(
  privateKey,
  'https://ic0.app'
);
```

### 3. Set Canister ID

```typescript
const canisterId = 'qvn3w-rqaaa-aaaam-qd4kq-cai'; // Mainnet canister
```

## First Steps

### 1. Create Your First Subaccount

```typescript
// Create an ICP subaccount
const icpResult = await addSubaccountForToken(agent, canisterId, Tokens.ICP);

if ('Ok' in icpResult) {
  console.log('ICP deposit address:', icpResult.Ok);
} else {
  console.error('Error creating ICP subaccount:', icpResult.Err);
}

// Create a ckUSDC subaccount
const usdcResult = await addSubaccountForToken(
  agent,
  canisterId,
  Tokens.CKUSDC
);

if ('Ok' in usdcResult) {
  console.log('ckUSDC deposit address:', usdcResult.Ok);
} else {
  console.error('Error creating ckUSDC subaccount:', usdcResult.Err);
}
```

### 2. Get All Deposit Addresses

```typescript
const addresses = await getDepositAddresses(agent, canisterId);

console.log('All deposit addresses:');
addresses.forEach((addr) => {
  const tokenName = Object.keys(addr.tokenType)[0];
  console.log(`${tokenName}: ${addr.depositAddress}`);
});
```

### 3. Check for Transactions

```typescript
const transactionsResult = await getUserVaultTransactions(
  agent,
  canisterId,
  BigInt(10) // Get last 10 transactions
);

if ('Ok' in transactionsResult) {
  const transactions = transactionsResult.Ok;
  console.log(`Found ${transactions.length} transactions`);

  transactions.forEach((tx) => {
    const tokenType = Object.keys(tx.token_type)[0];
    console.log(`${tokenType} transaction: ${tx.amount} (${tx.tx_hash})`);
  });
} else {
  console.error('Error fetching transactions:', transactionsResult.Err);
}
```

## Common Patterns

### Error Handling

Always check for 'Ok' and 'Err' properties in results:

```typescript
const result = await someICSIFunction();

if ('Ok' in result) {
  // Success - use result.Ok
  console.log('Success:', result.Ok);
} else {
  // Error - handle result.Err
  console.error('Error:', result.Err);
}
```

### Working with Token Types

```typescript
import { Tokens } from '@jagad/icsi';

// Available tokens
const icpToken = Tokens.ICP; // { ICP: null }
const usdcToken = Tokens.CKUSDC; // { CKUSDC: null }
const usdtToken = Tokens.CKUSDT; // { CKUSDT: null }
const btcToken = Tokens.CKBTC; // { CKBTC: null }

// Check token type in transactions
transactions.forEach((tx) => {
  if (tx.token_type.ICP) {
    console.log('ICP transaction');
  } else if (tx.token_type.CKUSDC) {
    console.log('ckUSDC transaction');
  } else if (tx.token_type.CKUSDT) {
    console.log('ckUSDT transaction');
  } else if (tx.token_type.CKBTC) {
    console.log('ckBTC transaction');
  }
});
```

### Working with BigInt

Many functions use `bigint` for amounts and intervals:

```typescript
import { setUserVaultInterval } from '@jagad/icsi';

// Set polling interval to 30 seconds
await setUserVaultInterval(agent, canisterId, BigInt(30));

// Get specific number of transactions
await getUserVaultTransactions(agent, canisterId, BigInt(50));
```

## Quick Start Example

Here's a complete example that demonstrates basic usage:

```typescript
import { HttpAgent } from '@dfinity/agent';
import {
  createHostAgentAndIdentityFromSeed,
  addSubaccountForToken,
  getUserVaultTransactions,
  getDepositAddresses,
  getBalances,
  setWebhookUrl,
  Tokens,
} from '@jagad/icsi';

async function quickStart() {
  try {
    // 1. Setup
    const { agent } = await createHostAgentAndIdentityFromSeed(
      'your twelve word seed phrase here',
      'https://ic0.app'
    );

    const canisterId = 'qvn3w-rqaaa-aaaam-qd4kq-cai';

    // 2. Set webhook (optional)
    const webhookResult = await setWebhookUrl(
      agent,
      canisterId,
      'https://your-api.com/webhook'
    );
    console.log('Webhook set:', 'Ok' in webhookResult);

    // 3. Create subaccounts for all tokens
    console.log('Creating subaccounts...');

    const icpAddr = await addSubaccountForToken(agent, canisterId, Tokens.ICP);
    const usdcAddr = await addSubaccountForToken(
      agent,
      canisterId,
      Tokens.CKUSDC
    );
    const usdtAddr = await addSubaccountForToken(
      agent,
      canisterId,
      Tokens.CKUSDT
    );
    const btcAddr = await addSubaccountForToken(
      agent,
      canisterId,
      Tokens.CKBTC
    );

    if ('Ok' in icpAddr) console.log('ICP address:', icpAddr.Ok);
    if ('Ok' in usdcAddr) console.log('ckUSDC address:', usdcAddr.Ok);
    if ('Ok' in usdtAddr) console.log('ckUSDT address:', usdtAddr.Ok);
    if ('Ok' in btcAddr) console.log('ckBTC address:', btcAddr.Ok);

    // 4. Get all addresses
    console.log('\nAll deposit addresses:');
    const addresses = await getDepositAddresses(agent, canisterId);
    addresses.forEach((addr) => {
      const tokenType = Object.keys(addr.tokenType)[0];
      console.log(`${tokenType}: ${addr.depositAddress}`);
    });

    // 5. Check balances
    console.log('\nToken balances:');
    const balances = await getBalances(agent, canisterId);
    balances.forEach((balance) => {
      const tokenType = Object.keys(balance.tokenType)[0];
      console.log(`${tokenType}: ${balance.balance}`);
    });

    // 6. Get recent transactions
    console.log('\nRecent transactions:');
    const txResult = await getUserVaultTransactions(
      agent,
      canisterId,
      BigInt(5)
    );

    if ('Ok' in txResult) {
      txResult.Ok.forEach((tx) => {
        const tokenType = Object.keys(tx.token_type)[0];
        const status = Object.keys(tx.sweep_status)[0];
        console.log(`${tokenType}: ${tx.amount} (${status})`);
      });
    }

    console.log('\nSetup complete! Send tokens to the addresses above.');
  } catch (error) {
    console.error('Error in quickStart:', error);
  }
}

// Run the example
quickStart();
```

## Next Steps

1. **Set up webhooks** - Get real-time notifications when payments arrive
2. **Implement sweeping** - Automatically collect funds from subaccounts
3. **Monitor transactions** - Track payment status and history
4. **Handle multiple tokens** - Support ICP, ckUSDC, ckUSDT, and ckBTC
5. **Error handling** - Implement robust error handling for production

See the [Examples](./EXAMPLES.md) and [API Reference](./API.md) for more detailed usage patterns.

## Troubleshooting

### Common Issues

1. **Authentication errors**: Ensure your seed phrase or private key is correct
2. **Network errors**: Check that you're using the correct IC host URL
3. **Canister not found**: Verify the canister ID is correct
4. **Result checking**: Always check for 'Ok'/'Err' in function results

### Getting Help

- Check the [API documentation](./API.md)
- Look at [examples](./EXAMPLES.md)
- Review test files in the `test/` directory
- Open an issue on GitHub if you encounter problems
