# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ICSI (ICP Sub-Account Indexer)** is a production-ready Internet Computer Protocol (ICP) canister system for managing sub-accounts and tracking multi-token transactions. The system enables organizations to generate unique sub-account IDs, track incoming token transfers (ICP, ckUSDC, ckUSDT), and manage tokens through sweeping mechanisms with webhook notifications.

## Architecture

This is a **pnpm workspace monorepo** with the following key components:

- **Root**: DFX canister configuration and Webpack setup
- **`src/icp_subaccount_indexer/`**: Core Rust canister implementation
- **`packages/icsi-lib/`**: TypeScript SDK for canister interaction
- **`.maintain/legacy/`**: Deprecated scripts (avoid unless necessary)

### Core Technologies

- **Rust**: IC-CDK, stable structures, ICRC/ledger integration
- **TypeScript**: DFinity agent, secp256k1 identity management
- **DFX**: Internet Computer SDK for deployment
- **pnpm**: Workspace dependency management

## Essential Commands

For all of the commands below, use `pnpm` instead of `yarn` or `npm`. Even when you want to run a script that is in a different package, use `pnpm run <script>` instead of `yarn run <script>` or `npm run <script>`. For Rust scripts, use `cargo <script>`, but most scripts will already available in the `package.json` of the package that you want to run the script from.

### Development Setup

```bash
# Install all workspace dependencies
pnpm install

# Start local IC replica with old metering
pnpm run start:local:env

# Deploy locally with ICP ledger integration
pnpm run deploy:local

# Or use the script directly
.maintain/deploy.sh --network local [--clean]
```

### Building

```bash
# Build everything (backend + library)
pnpm run build

# Build just the canister backend
pnpm run build:backend

# Build just the TypeScript library
pnpm run build:lib

# Generate Candid interface files
pnpm run generate
```

### Testing

You can see the testing guide in `TESTING_GUIDE.md`. The modern test suite is in `packages/icsi-lib/test/scripts/` (except for the legacy tests in `packages/icsi-lib/test/scripts/legacy/`).

The logs for each test are in `docs/logs/`. You can see each test's logs in the file named `TESTING_ATTEMPT_1.md`, `TESTING_ATTEMPT_2.md`, etc. Do not use the seed phrase from the logs to generate a new wallet and don't use the same seed phrase for personal or production use.

You can use the `lib:generate:wallet` script to generate a new wallet.

**Use the modern test suite in `packages/icsi-lib/test/scripts/`:**

```bash
# Generate test wallet with mnemonic
pnpm run lib:generate:wallet

# Test token deposits (requires funded wallet)
pnpm run lib:test:icp     # Test ICP deposits
pnpm run lib:test:usdc    # Test ckUSDC deposits
pnpm run lib:test:usdt    # Test ckUSDT deposits

# Test webhook functionality
pnpm run lib:test:webhook

# Run all library tests
pnpm run lib:test:all
```

**Rust backend tests:**

```bash
# Run all backend tests
pnpm run test:backend

# Test specific scenarios
pnpm run test:happy_path  # Success path tests
pnpm run test:sad_path    # Error handling tests
```

### Deployment

**Local deployment:**

```bash
.maintain/deploy.sh --network local [--clean]
```

**Mainnet deployment:**

```bash
# Initial deployment
./scripts/deploy-mainnet.sh deploy

# Upgrade existing canister
./scripts/deploy-mainnet.sh upgrade
```

### Code Quality

```bash
# Format all code (Rust + TypeScript + Prettier)
pnpm run format

# Clean all build artifacts
pnpm run clean
```

### Committing

When committing, use `git commit`. Make sure the commit message is clear and concise, not more than 80 characters.

Separate each feature into its own commit. If you have multiple features, commit them separately. If you have multiple changes, commit them separately. Commits with less than 400 lines are preferred.

If you have multiple changes, try to group them into logical units. For example, if you are adding a new feature and fixing a bug, you can group them into two commits.

Also, don't add "Claude" as a co-author, and don't add "Claude" to the commit message. Finally, before every commit run `pnpm run format` to format the code.

## Key File Locations

- **Main canister logic**: `src/icp_subaccount_indexer/src/lib.rs`
- **Type definitions**: `src/icp_subaccount_indexer/src/types.rs`
- **Candid interface**: `src/icp_subaccount_indexer/icp_subaccount_indexer.did`
- **TypeScript SDK**: `packages/icsi-lib/src/index.ts`
- **Test scripts**: `packages/icsi-lib/test/scripts/`
- **Deployment scripts**: `scripts/deploy-mainnet.sh`

## Multi-Token Support

The system supports three token types:

- **ICP**: Native Internet Computer token
- **ckUSDC**: Chain-key USDC (ICRC-1 standard)
- **ckUSDT**: Chain-key USDT (ICRC-1 standard)

Each token type has unified APIs for deposits, balances, and sweeping operations.

## Subaccount System

- **Generation**: Deterministic based on nonces for reproducibility
- **Format**: Hex string sub-account IDs
- **Indexing**: Hash-based lookup with efficient storage
- **Compatibility**: Supports both traditional ICP account IDs and ICRC-1 textual format

## Development Workflow

1. **Local Development**: Deploy with ICP ledger using `pnpm run deploy:local`
2. **Testing**: Use TypeScript test suite with generated test wallets
3. **Code Quality**: Run `pnpm run format` before commits
4. **Deployment**: Use deployment scripts for mainnet

## Important Notes

- **Legacy Scripts**: Avoid `.maintain/legacy/` and `packages/icsi-lib/test/scripts/legacy/` scripts for testing
- **Environment Files**: Test scripts generate `.env.test` files with credentials
- **Webhook Testing**: Uses ngrok for local webhook tunneling
- **State Management**: Canister uses stable structures for upgrade-safe storage
- **Authentication**: Principal-based access control with caller guards

## Testing Environment Setup

1. Generate test wallet: `pnpm run lib:generate:wallet`
2. Fund wallet with ICP (for fees) and test tokens
3. Deploy canister locally or to mainnet
4. Configure `.env.test` with canister ID
5. Run test scripts to verify functionality

See `TESTING_GUIDE.md` for detailed testing procedures.
