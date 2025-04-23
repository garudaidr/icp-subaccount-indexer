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
# Use https://ic0.app for mainnet
# Use http://localhost:4943 for local development
HOST=https://ic0.app
```

These environment variables will be loaded automatically by the test scripts.

### Important Notes

1. For local development with a local replica, make sure the HOST is set to `http://localhost:4943` and the agent will automatically fetch the root key.

2. If you're using the mainnet (HOST=https://ic0.app), ensure your canister ID and seed phrase are correct.

3. Make sure your user vault canister is deployed and accessible from the network you're connecting to.

4. The SEED_PHRASE must have the necessary permissions to interact with the specified user vault canister.

## Available Scripts

### Real Scripts (Require Proper Configuration)

These scripts connect to the Internet Computer network and require a properly configured .env file:

#### 1. Get Deposit Addresses

Retrieves deposit addresses for all registered token types:

```
pnpm run test:script -- test/scripts/getDepositAddresses.ts
```

#### 2. Get Balances

Checks balances for all subaccounts:

```
pnpm run test:script -- test/scripts/getBalances.ts
```

#### 3. Register Tokens

Registers tokens with their ledger canister IDs:

```
pnpm run test:script -- test/scripts/registerTokens.ts
```

#### 4. Sweep All Tokens

Sweeps tokens from all subaccounts using different methods:

```
pnpm run test:script -- test/scripts/sweepAll.ts
```

#### 5. Run All Tests

Runs all the scripts in sequence:

```
pnpm run test:scripts
```

### Mock Scripts (No Configuration Required)

These mock scripts demonstrate the functionality without actually connecting to the Internet Computer network:

#### 1. Mock Get Deposit Addresses

Demonstrates how to retrieve deposit addresses with mock data:

```
pnpm run test:script -- test/scripts/mockGetDepositAddresses.ts
```

#### 2. Mock Get Balances

Demonstrates checking balances with mock data:

```
pnpm run test:script -- test/scripts/mockGetBalances.ts
```

#### 3. Mock Register Tokens

Demonstrates registering tokens with mock data:

```
pnpm run test:script -- test/scripts/mockRegisterTokens.ts
```

#### 4. Mock Sweep All Tokens

Demonstrates sweeping tokens with mock data:

```
pnpm run test:script -- test/scripts/mockSweepAll.ts
```

#### 5. Mock Run All Tests

Runs all mock scripts in sequence:

```
pnpm run test:script -- test/scripts/mockRunAll.ts
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