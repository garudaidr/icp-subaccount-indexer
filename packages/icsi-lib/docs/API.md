# ICSI Library API Reference

## Authentication Requirements

Most ICSI functions do **NOT** require special authentication beyond the standard HttpAgent identity. However, the following functions require custodian authentication on the canister side:

- `getNetwork()` - Requires authentication (returns network type)
- `getWebhookUrl()` - Requires authentication (returns sensitive webhook URL)

All other query and update functions work with any valid HttpAgent identity. The canister tracks transactions and manages subaccounts based on the caller's principal.

**Important:** While most functions don't require special authentication, you still need a valid identity (not anonymous) to interact with the canister. Use `createHostAgentAndIdentityFromSeed` or `createHostAgentAndIdentityFromPrivateKey` to create an authenticated agent.

## Query Functions (Read-only)

### Transaction Management

#### `getUserVaultTransactions`

Retrieves user vault transactions with optional limit.

```typescript
getUserVaultTransactions(
  agent: HttpAgent,
  canisterId: string,
  limit?: bigint
): Promise<Result_9>
```

**Parameters:**

- `agent`: HttpAgent instance for IC communication
- `canisterId`: The canister ID string
- `limit`: Optional limit for number of transactions (default: no limit)

**Returns:** Promise resolving to Result type with transaction array

**Example:**

```typescript
import { getUserVaultTransactions } from '@jagad/icsi';

const transactions = await getUserVaultTransactions(
  agent,
  canisterId,
  BigInt(10)
);

if ('Ok' in transactions) {
  console.log('Transactions:', transactions.Ok);
} else {
  console.error('Error:', transactions.Err);
}
```

#### `getTransactionsCount`

Gets the total number of transactions.

```typescript
getTransactionsCount(
  agent: HttpAgent,
  canisterId: string
): Promise<number>
```

**Example:**

```typescript
import { getTransactionsCount } from '@jagad/icsi';

const count = await getTransactionsCount(agent, canisterId);
console.log(`Total transactions: ${count}`);
```

#### `getTransactionsByTokenType`

Retrieves transactions filtered by token type.

```typescript
getTransactionsByTokenType(
  agent: HttpAgent,
  canisterId: string,
  tokenType: TokenType
): Promise<Transaction[]>
```

**Example:**

```typescript
import { getTransactionsByTokenType, Tokens } from '@jagad/icsi';

const usdcTxs = await getTransactionsByTokenType(
  agent,
  canisterId,
  Tokens.CKUSDC
);
console.log(`ckUSDC transactions: ${usdcTxs.length}`);
```

### Subaccount Operations

#### `getSubaccountId`

Gets subaccount ID by index and token type.

```typescript
getSubaccountId(
  agent: HttpAgent,
  canisterId: string,
  index: number,
  tokenType: TokenType
): Promise<string>
```

**Example:**

```typescript
import { getSubaccountId, Tokens } from '@jagad/icsi';

const subaccountId = await getSubaccountId(agent, canisterId, 0, Tokens.ICP);
console.log('First ICP subaccount:', subaccountId);
```

#### `getIcrcAccount`

Gets ICRC account format for a subaccount.

```typescript
getIcrcAccount(
  agent: HttpAgent,
  canisterId: string,
  index: number
): Promise<string>
```

**Example:**

```typescript
import { getIcrcAccount } from '@jagad/icsi';

const icrcAccount = await getIcrcAccount(agent, canisterId, 0);
console.log('ICRC account format:', icrcAccount);
```

#### `getSubaccountCount`

Gets the total number of subaccounts.

```typescript
getSubaccountCount(
  agent: HttpAgent,
  canisterId: string
): Promise<number>
```

**Example:**

```typescript
import { getSubaccountCount } from '@jagad/icsi';

const count = await getSubaccountCount(agent, canisterId);
console.log(`Total subaccounts: ${count}`);
```

### Configuration & Status

#### `getUserVaultInterval`

Gets the current polling interval.

```typescript
getUserVaultInterval(
  agent: HttpAgent,
  canisterId: string
): Promise<bigint>
```

**Example:**

```typescript
import { getUserVaultInterval } from '@jagad/icsi';

const interval = await getUserVaultInterval(agent, canisterId);
console.log(`Current interval: ${interval} seconds`);
```

#### `getWebhookUrl`

Gets the configured webhook URL.

```typescript
getWebhookUrl(
  agent: HttpAgent,
  canisterId: string
): Promise<string>
```

**Example:**

```typescript
import { getWebhookUrl } from '@jagad/icsi';

const webhookUrl = await getWebhookUrl(agent, canisterId);
console.log('Webhook URL:', webhookUrl);
```

#### `getNetwork`

Gets the network type (Mainnet or Local).

```typescript
getNetwork(
  agent: HttpAgent,
  canisterId: string
): Promise<'Mainnet' | 'Local'>
```

**Example:**

```typescript
import { getNetwork } from '@jagad/icsi';

const network = await getNetwork(agent, canisterId);
console.log('Network:', network);
```

#### `getRegisteredTokens`

Gets the list of registered tokens.

```typescript
getRegisteredTokens(
  agent: HttpAgent,
  canisterId: string
): Promise<Result_7>
```

**Example:**

```typescript
import { getRegisteredTokens } from '@jagad/icsi';

const result = await getRegisteredTokens(agent, canisterId);
if ('Ok' in result) {
  console.log('Registered tokens:', result.Ok);
}
```

## Update Functions (State-modifying)

### Subaccount Creation

#### `addSubaccount`

Creates a basic ICP subaccount.

```typescript
addSubaccount(
  agent: HttpAgent,
  canisterId: string
): Promise<Result_1>
```

**Example:**

```typescript
import { addSubaccount } from '@jagad/icsi';

const result = await addSubaccount(agent, canisterId);
if ('Ok' in result) {
  console.log('New subaccount:', result.Ok);
}
```

#### `addSubaccountForToken`

Creates a token-specific subaccount.

```typescript
addSubaccountForToken(
  agent: HttpAgent,
  canisterId: string,
  tokenType: TokenType
): Promise<Result_1>
```

**Example:**

```typescript
import { addSubaccountForToken, Tokens } from '@jagad/icsi';

const result = await addSubaccountForToken(agent, canisterId, Tokens.CKUSDC);
if ('Ok' in result) {
  console.log('New ckUSDC subaccount:', result.Ok);
}
```

### Token Management

#### `registerToken`

Registers a new token type with its ledger canister.

```typescript
registerToken(
  agent: HttpAgent,
  canisterId: string,
  tokenType: TokenType,
  ledgerCanisterId: string
): Promise<Result_5>
```

**Example:**

```typescript
import { registerToken, Tokens } from '@jagad/icsi';

const result = await registerToken(
  agent,
  canisterId,
  Tokens.CKUSDC,
  'xevnm-gaaaa-aaaar-qafnq-cai'
);
if ('Ok' in result) {
  console.log('Token registered successfully');
}
```

### Sweep Operations

#### `sweep`

Sweeps all tokens from all subaccounts.

```typescript
sweep(
  agent: HttpAgent,
  canisterId: string
): Promise<Result_3>
```

**Example:**

```typescript
import { sweep } from '@jagad/icsi';

const result = await sweep(agent, canisterId);
if ('Ok' in result) {
  console.log('Sweep completed:', result.Ok);
} else {
  console.error('Sweep failed:', result.Err);
}
```

#### `sweepByTokenType`

Sweeps specific token type from all subaccounts.

```typescript
sweepByTokenType(
  agent: HttpAgent,
  canisterId: string,
  tokenType: TokenType
): Promise<Result_3>
```

**Example:**

```typescript
import { sweepByTokenType, Tokens } from '@jagad/icsi';

const result = await sweepByTokenType(agent, canisterId, Tokens.CKUSDC);
if ('Ok' in result) {
  console.log('ckUSDC sweep completed');
}
```

#### `sweepSubaccountId`

Sweeps specific amount from a specific subaccount.

```typescript
sweepSubaccountId(
  agent: HttpAgent,
  canisterId: string,
  subaccountId: string,
  amount: number,
  tokenType?: TokenType
): Promise<Result_2>
```

**Example:**

```typescript
import { sweepSubaccountId, Tokens } from '@jagad/icsi';

const result = await sweepSubaccountId(
  agent,
  canisterId,
  'subaccount-123',
  1000000,
  Tokens.CKUSDC
);
if ('Ok' in result) {
  console.log('Subaccount sweep completed');
}
```

### Configuration

#### `setUserVaultInterval`

Sets the polling interval for transaction checking.

```typescript
setUserVaultInterval(
  agent: HttpAgent,
  canisterId: string,
  interval: bigint
): Promise<Result_6>
```

**Example:**

```typescript
import { setUserVaultInterval } from '@jagad/icsi';

// Set to 30 seconds for testing
const result = await setUserVaultInterval(agent, canisterId, BigInt(30));
if ('Ok' in result) {
  console.log('Interval updated');
}
```

#### `setWebhookUrl`

Sets the webhook URL for transaction notifications.

```typescript
setWebhookUrl(
  agent: HttpAgent,
  canisterId: string,
  url: string
): Promise<Result_4>
```

**Example:**

```typescript
import { setWebhookUrl } from '@jagad/icsi';

const result = await setWebhookUrl(
  agent,
  canisterId,
  'https://api.example.com/webhook'
);
if ('Ok' in result) {
  console.log('Webhook URL set');
}
```

## Helper Functions

#### `getDepositAddresses`

Gets all deposit addresses for all tokens.

```typescript
getDepositAddresses(
  agent: HttpAgent,
  canisterId: string
): Promise<DepositAddress[]>
```

**Example:**

```typescript
import { getDepositAddresses } from '@jagad/icsi';

const addresses = await getDepositAddresses(agent, canisterId);
addresses.forEach((addr) => {
  const tokenType = Object.keys(addr.tokenType)[0];
  console.log(`${tokenType}: ${addr.depositAddress}`);
});
```

#### `getBalances`

Gets balances for all tokens.

```typescript
getBalances(
  agent: HttpAgent,
  canisterId: string
): Promise<TokenBalance[]>
```

**Example:**

```typescript
import { getBalances } from '@jagad/icsi';

const balances = await getBalances(agent, canisterId);
balances.forEach((balance) => {
  const tokenType = Object.keys(balance.tokenType)[0];
  console.log(`${tokenType} balance: ${balance.balance}`);
});
```

#### `validateIcrcAccount`

Validates ICRC account format.

```typescript
validateIcrcAccount(
  agent: HttpAgent,
  canisterId: string,
  account: string
): Promise<boolean>
```

**Example:**

```typescript
import { validateIcrcAccount } from '@jagad/icsi';

const isValid = await validateIcrcAccount(
  agent,
  canisterId,
  'qvn3w-rqaaa-aaaam-qd4kq-cai-checksum.5'
);
console.log('Valid ICRC account:', isValid);
```

## Authentication Functions

#### `createHostAgentAndIdentityFromSeed`

Creates HttpAgent and Identity from seed phrase.

```typescript
createHostAgentAndIdentityFromSeed(
  seedPhrase: string,
  host: string
): Promise<{ agent: HttpAgent; identity: Identity }>
```

**Example:**

```typescript
import { createHostAgentAndIdentityFromSeed } from '@jagad/icsi';

const { agent, identity } = await createHostAgentAndIdentityFromSeed(
  'your twelve word seed phrase here',
  'https://ic0.app'
);
```

#### `createHostAgentAndIdentityFromPrivateKey`

Creates HttpAgent and Identity from PEM private key.

```typescript
createHostAgentAndIdentityFromPrivateKey(
  privateKey: string,
  host: string
): Promise<{ agent: HttpAgent; identity: Identity }>
```

**Example:**

```typescript
import { createHostAgentAndIdentityFromPrivateKey } from '@jagad/icsi';

const privateKey = `-----BEGIN EC PRIVATE KEY-----
Your PEM private key here
-----END EC PRIVATE KEY-----`;

const { agent, identity } = await createHostAgentAndIdentityFromPrivateKey(
  privateKey,
  'https://ic0.app'
);
```

## Token Constants

```typescript
import { Tokens } from '@jagad/icsi';

// Available token types
Tokens.ICP; // { ICP: null }
Tokens.CKUSDC; // { CKUSDC: null }
Tokens.CKUSDT; // { CKUSDT: null }
Tokens.CKBTC; // { CKBTC: null }
```

## Type Definitions

### TokenType

```typescript
type TokenType =
  | { ICP: null }
  | { CKUSDC: null }
  | { CKUSDT: null }
  | { CKBTC: null };
```

### Transaction

```typescript
interface Transaction {
  tx_hash: string;
  amount: number;
  token_type: TokenType;
  sweep_status: SweepStatus;
  timestamp: bigint;
  // ... other fields
}
```

### DepositAddress

```typescript
interface DepositAddress {
  tokenType: TokenType;
  depositAddress: string;
  subaccountIndex: number;
}
```

### TokenBalance

```typescript
interface TokenBalance {
  tokenType: TokenType;
  balance: number;
}
```

### Result Types

Result types follow Rust-style pattern matching:

```typescript
type Result_1 = { Ok: string } | { Err: string };
type Result_3 = { Ok: SweepStatus } | { Err: string };
type Result_9 = { Ok: Transaction[] } | { Err: string };
// ... other Result types
```

Always check for 'Ok' or 'Err' properties:

```typescript
const result = await someFunction();
if ('Ok' in result) {
  // Success case
  console.log(result.Ok);
} else {
  // Error case
  console.error(result.Err);
}
```
