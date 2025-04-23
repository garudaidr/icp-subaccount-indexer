# ICSI Test Scripts

This directory contains test scripts for interacting with the Internet Computer Subaccount Indexer (ICSI) library.

## Configuration

Before running the scripts, you need to configure your environment variables:

1. Copy the `.env.example` file to `.env` in the root directory of the project:

```bash
cp .env.example .env
```

2. Edit the `.env` file with your own values:

```
# Seed phrase for testing (required)
SEED_PHRASE=your seed phrase here

# User Vault Canister ID (required)
USER_VAULT_CANISTER_ID=your_canister_id_here

# IC host URL (optional, defaults to mainnet)
HOST=https://ic0.app
```

These environment variables will be loaded automatically by the test scripts.

## Available Scripts

### 1. Get Deposit Addresses

Retrieves deposit addresses for all registered token types:

```
npm run test:script -- test/scripts/getDepositAddresses.ts
```

### 2. Get Balances

Checks balances for all subaccounts:

```
npm run test:script -- test/scripts/getBalances.ts
```

### 3. Sweep All Tokens

Sweeps tokens from all subaccounts using different methods:

```
npm run test:script -- test/scripts/sweepAll.ts
```

### 4. Run All Tests

Runs all the scripts in sequence:

```
npm run test:scripts
```

## Creating Your Own Scripts

You can use these scripts as templates to create your own test scripts. Make sure to:

1. Import the necessary functions from the ICSI library
2. Import the agent and canister ID from `config.ts`
3. Handle errors properly with try/catch blocks and Result types
4. Export your main function as the default export
5. Add logic to run the script directly when executed via Node.js

Example structure:

```typescript
import { agent, USER_VAULT_CANISTER_ID } from './config';
import { someFunction } from '../../src';
import { Principal } from '@dfinity/principal';

async function myScript() {
  try {
    const result = await someFunction(agent, [Principal.fromText(USER_VAULT_CANISTER_ID)]);
    
    if ('Err' in result) {
      console.error(`Error: ${result.Err}`);
      return;
    }
    
    console.log('Success:', result.Ok);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  myScript()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default myScript;
```