# ICSI-Lib

Internet Computer Subaccount Indexer Library - A TypeScript library for interacting with ICP user vault canisters.

## Installation

```bash
npm install icsi-lib
```

## Usage

```typescript
import { HttpAgent } from '@dfinity/agent';
import { addSubaccount, getUserVaultTransactions, sweep } from 'icsi-lib';

// Create an HTTP agent
const agent = new HttpAgent({ host: 'https://ic0.app' });

// Set the USER_VAULT_CANISTER_ID environment variable
process.env.USER_VAULT_CANISTER_ID = 'your-canister-id';

// Example: Add a new subaccount
async function createSubaccount() {
  try {
    const result = await addSubaccount(agent);
    console.log('Subaccount created:', result);
  } catch (error) {
    console.error('Error creating subaccount:', error);
  }
}

// Example: Get transactions
async function getTransactions() {
  try {
    const transactions = await getUserVaultTransactions(agent);
    console.log('Transactions:', transactions);
  } catch (error) {
    console.error('Error getting transactions:', error);
  }
}

// Example: Sweep all subaccounts
async function sweepAll() {
  try {
    const result = await sweep(agent);
    console.log('Sweep result:', result);
  } catch (error) {
    console.error('Error sweeping accounts:', error);
  }
}
```

## Environment Variables

The library uses the following environment variables:

- `USER_VAULT_CANISTER_ID` (required): The canister ID of your user vault
- `ICP_USER_VAULT_AUTH_SEED` (for authenticated calls): Seed phrase for authentication
- `ICP_LEDGER_CANISTER_ID` (optional): The ICP ledger canister ID (defaults to mainnet)
- `CKUSDC_CANISTER_ID` (optional): The CKUSDC token canister ID (defaults to mainnet)
- `CKUSDT_CANISTER_ID` (optional): The CKUSDT token canister ID (defaults to mainnet)

## API Reference

### Query Functions

- `getUserVaultTransactions`: Get transactions from the user vault
- `getUserVaultInterval`: Get the current interval setting
- `getTransactionsCount`: Get the count of transactions
- `getNonce`: Get the current nonce value
- `getSubaccountCount`: Get the count of subaccounts
- `getSubaccountId`: Get a subaccount ID by index
- `getWebhookUrl`: Get the configured webhook URL
- `getCanisterPrincipal`: Get the principal of the canister
- `getIcrcAccount`: Get the ICRC-1 account for a subaccount
- `getNetwork`: Get the network the canister is running on
- `getNextBlock`: Get the next block to be processed
- `getOldestBlock`: Get the oldest processed block
- `getRegisteredTokens`: Get all registered token types
- `getTransactionTokenType`: Get the token type for a transaction

### Update Functions

- `refund`: Refund an amount to the controller
- `setUserVaultInterval`: Set the interval for processing
- `sweep`: Sweep all subaccounts
- `sweepByTokenType`: Sweep all subaccounts for a specific token
- `addSubaccount`: Add a new subaccount
- `addSubaccountForToken`: Add a new subaccount for a specific token
- `clearTransactions`: Clear transactions from the vault
- `setWebhookUrl`: Set a webhook URL for notifications
- `registerToken`: Register a new token type
- `sweepSubaccountId`: Sweep a specific subaccount
- `convertToIcrcAccount`: Convert a subaccount to ICRC format
- `validateIcrcAccount`: Validate an ICRC account format
- `singleSweep`: Perform a single sweep for a transaction
- `setSweepFailed`: Mark a sweep as failed

## License

MIT
