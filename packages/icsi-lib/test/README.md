# ICSI Test Scripts

This directory contains test scripts for interacting with the Internet Computer Subaccount Indexer (ICSI) library.

## Overview

There are two types of test scripts available:

1. **Shell Scripts (Recommended)** - Use dfx CLI with dfx identity management for safer testing
2. **TypeScript Scripts (Legacy)** - Use environment files with seed phrases (moved to `legacy/` directory)

## Shell Scripts (Recommended)

The modern test scripts use the dfx CLI and dfx identity system for safer testing without exposing seed phrases in environment files.

### Prerequisites

1. **Install dfx** - Make sure you have the DFINITY SDK installed
2. **Create/Switch Identity** - Use `dfx identity` commands to manage your test identity
3. **Fund Your Identity** - Ensure your dfx identity has sufficient tokens for testing

### Available Shell Scripts

#### 1. ICP Deposit Test

Tests ICP token deposits to the ICSI canister:

```bash
# Local testing
./scripts/testICPDeposit.sh <ICSI_CANISTER_ID> --network local

# Mainnet testing
./scripts/testICPDeposit.sh <ICSI_CANISTER_ID> --network ic
```

#### 2. ckUSDC Deposit Test

Tests ckUSDC token deposits to the ICSI canister:

```bash
# Local testing
./scripts/testUSDCDeposit.sh <ICSI_CANISTER_ID> --network local

# Mainnet testing
./scripts/testUSDCDeposit.sh <ICSI_CANISTER_ID> --network ic
```

#### 3. ckUSDT Deposit Test

Tests ckUSDT token deposits to the ICSI canister:

```bash
# Local testing
./scripts/testUSDTDeposit.sh <ICSI_CANISTER_ID> --network local

# Mainnet testing
./scripts/testUSDTDeposit.sh <ICSI_CANISTER_ID> --network ic
```

#### 4. Webhook Test (TypeScript)

Tests webhook functionality - still uses TypeScript for Express server setup:

```bash
pnpm run test:script -- test/scripts/testWebhook.ts
```

### Shell Script Features

- **Safe Identity Management** - Uses dfx identity system instead of seed phrases
- **Network Support** - Supports both local and mainnet networks
- **Balance Validation** - Checks sufficient funds before transfers
- **Error Handling** - Comprehensive error checking and user feedback
- **Transaction Verification** - Waits for indexing and verifies deposits
- **Colored Output** - Uses emojis and colors for better readability

### dfx Identity Setup

```bash
# Create a new identity for testing
dfx identity new test-identity

# Switch to the test identity
dfx identity use test-identity

# Get your principal (for funding)
dfx identity get-principal

# Get your account ID (for ICP transfers)
dfx ledger account-id
```

## Legacy TypeScript Scripts

The original TypeScript scripts have been moved to the `legacy/` directory. These scripts require environment file configuration.

### Configuration for Legacy Scripts

Before running legacy scripts, you need to configure your environment variables:

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

### Legacy Scripts (Require Environment Configuration)

These scripts connect to the Internet Computer network and require a properly configured .env file:

#### 1. Get Deposit Addresses

Retrieves deposit addresses for all registered token types:

```bash
pnpm run test:script -- test/scripts/legacy/getDepositAddresses.ts
```

#### 2. Get Balances

Checks balances for all subaccounts:

```bash
pnpm run test:script -- test/scripts/legacy/getBalances.ts
```

#### 3. Register Tokens

Registers tokens with their ledger canister IDs:

```bash
pnpm run test:script -- test/scripts/legacy/registerTokens.ts
```

#### 4. Sweep All Tokens

Sweeps tokens from all subaccounts using different methods:

```bash
pnpm run test:script -- test/scripts/legacy/sweepAll.ts
```

#### 5. Legacy Deposit Tests

The original TypeScript deposit test scripts:

```bash
# ICP deposit test (legacy)
pnpm run test:script -- test/scripts/legacy/testICPDeposit.ts

# ckUSDC deposit test (legacy)
pnpm run test:script -- test/scripts/legacy/testUSDCDeposit.ts

# ckUSDT deposit test (legacy)
pnpm run test:script -- test/scripts/legacy/testUSDTDeposit.ts
```

#### 6. Run All Legacy Tests

Runs all the legacy scripts in sequence:

```bash
pnpm run test:script -- test/scripts/legacy/runAll.ts
```

## Migration Guide

### From Legacy Scripts to Shell Scripts

The new shell scripts offer several advantages over the legacy TypeScript scripts:

1. **No Seed Phrase Exposure** - Uses dfx identity system instead of environment files
2. **Better Error Handling** - More user-friendly error messages and validation
3. **Network Flexibility** - Easy switching between local and mainnet
4. **No Build Required** - Direct execution without TypeScript compilation

### When to Use Each Type

**Use Shell Scripts for:**

- Token deposit testing (ICP, ckUSDC, ckUSDT)
- Quick validation of canister functionality
- CI/CD pipelines and automated testing
- Local development and debugging

**Use Legacy TypeScript Scripts for:**

- Complex testing scenarios requiring programmatic control
- Integration with existing TypeScript test suites
- Advanced token management operations (sweeping, clearing, etc.)
- Webhook testing (testWebhook.ts)

## Creating Your Own Scripts

### Shell Script Template

For creating new shell scripts, use this template:

```bash
#!/bin/bash
set -e

# Your script logic here
ICSI_CANISTER_ID="$1"
NETWORK="${3:-local}"

# Get current identity
PRINCIPAL=$(dfx identity get-principal)
echo "Using principal: $PRINCIPAL"

# Call canister methods
dfx canister --network "$NETWORK" call "$ICSI_CANISTER_ID" someMethod '()'
```

### TypeScript Script Template

For creating new TypeScript scripts, use this template:

```typescript
import { agent, USER_VAULT_CANISTER_ID } from './legacy/config';
import { someFunction } from '../../src';
import { Principal } from '@dfinity/principal';

async function myScript() {
  try {
    const result = await someFunction(agent, [
      Principal.fromText(USER_VAULT_CANISTER_ID),
    ]);

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

## Troubleshooting

### Shell Script Issues

1. **Permission Denied** - Make sure scripts are executable: `chmod +x script.sh`
2. **dfx Not Found** - Install DFINITY SDK: `sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"`
3. **Identity Not Found** - Create identity: `dfx identity new test-identity`
4. **Insufficient Funds** - Fund your dfx identity with required tokens

### Legacy Script Issues

1. **Environment Variables** - Ensure `.env` file is properly configured
2. **Network Connection** - Check HOST URL and canister accessibility
3. **Seed Phrase Format** - Verify seed phrase is valid BIP-39 mnemonic
