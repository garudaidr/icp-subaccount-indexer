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

## CRITICAL: Pre-Testing Requirements

**BEFORE conducting ANY testing or debugging with deployed canisters, Claude MUST:**

1. **Read the debugging guides first:**

   - **Testnet**: `docs/TESTNET_DEBUGGING_GUIDE.md`
   - **Devnet**: `docs/DEVNET_DEBUGGING_GUIDE.md`

2. **Understand the current state:**

   - Check canister IDs, current next_block positions, intervals
   - Verify correct identity setup (testnet_custodian vs default)
   - Set up environment variables: `export DFX_WARNING=-mainnet_plaintext_identity`

3. **Plan cycle-efficient approach:**
   - Use production intervals (500s) unless testing requires temporary fast polling
   - Always restore production settings after testing
   - Consider aligning devnet with testnet for consistency

**Failure to read these guides will result in wasted time, inefficient cycle usage, and potential canister issues.**

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
# Build everything (canister + library)
pnpm run build

# Build just the canister
pnpm run build:canister

# Build just the TypeScript library
pnpm run build:lib

# Generate Candid interface files
pnpm run generate
```

### Testing

You can see the testing guide in `TESTING_GUIDE.md`. The modern test suite is in `packages/icsi-lib/test/scripts/` (except for the legacy tests in `packages/icsi-lib/test/scripts/legacy/`).

The logs for each test are in `docs/logs/`. You can see each test's logs in the file named `TESTING_ATTEMPT_1.md`, `TESTING_ATTEMPT_2.md`, etc. Do not use the seed phrase from the logs to generate a new wallet and don't use the same seed phrase for personal or production use.

**Critical Testing Order**:

1. First run webhook server: `pnpm run lib:test:webhook` (keep it running!)
2. Then in another terminal: `pnpm run lib:generate:wallet`
3. Fund the wallet with test tokens
4. Run deposit tests: `pnpm run lib:test:usdc`

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
```

**Canister tests:**

```bash
# Run all canister tests
pnpm run test:backend

# Test specific scenarios
pnpm run test:happy_path  # Success path tests
pnpm run test:sad_path    # Error handling tests
```

### Deployment

**Mainnet deployment:**

```bash
# Initial deployment
./scripts/deploy-mainnet.sh deploy

# Upgrade existing canister
./scripts/deploy-mainnet.sh upgrade
```

**Manual deployment (if script fails):**

```bash
# 1. Create canister with enough cycles (critical!)
dfx canister create icp_subaccount_indexer --network ic --with-cycles 500000000000

# 2. Build first
pnpm run build:canister

# 3. Deploy with your principal (hardcoded, not command substitution)
dfx deploy icp_subaccount_indexer --network ic --argument '(variant { Mainnet }, 5: nat64, 0: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "your-principal-here")'
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
  - Ledger: `ryjl3-tyaaa-aaaaa-aaaba-cai`
  - Fee: 10,000 e8s (0.0001 ICP)
  - Address format: Hex AccountIdentifier
- **ckUSDC**: Chain-key USDC (ICRC-1 standard)
  - Ledger: `xevnm-gaaaa-aaaar-qafnq-cai`
  - Fee: 10,000 micro-units (0.01 ckUSDC) - NOT 10!
  - Address format: ICRC-1 textual
- **ckUSDT**: Chain-key USDT (ICRC-1 standard)
  - Ledger: `cngnf-vqaaa-aaaar-qag4q-cai`
  - Fee: 10,000 micro-units (0.01 ckUSDT)
  - Address format: ICRC-1 textual

Each token type has unified APIs for deposits, balances, and sweeping operations.

## Subaccount System

- **Generation**: Deterministic based on nonces for reproducibility
- **Format**:
  - ICP: Hex string AccountIdentifier (64 characters)
  - ckUSDC/ckUSDT: ICRC-1 textual format (e.g., `canister-id-checksum.nonce`)
- **Indexing**: Hash-based lookup with efficient storage
- **Compatibility**: Supports both traditional ICP account IDs and ICRC-1 textual format
- **Important**: Each token type may use different address formats!

## Development Workflow

1. **Local Development**: Deploy with ICP ledger using `pnpm run deploy:local`
2. **Testing**: Use TypeScript test suite with generated test wallets
3. **Code Quality**: Run `pnpm run format` before commits
4. **Deployment**: Use deployment scripts for mainnet

## Important Notes

- **Legacy Scripts**: Avoid `.maintain/legacy/` and `packages/icsi-lib/test/scripts/legacy/` scripts for testing
- **Environment Files**: Test scripts generate `.env.test` files with credentials
- **Webhook Testing**: Uses ngrok for local webhook tunneling
- **Webhook Format**: Sends transaction hash as query parameter, NOT JSON body
- **State Management**: Canister uses stable structures for upgrade-safe storage
- **Authentication**: Principal-based access control with caller guards
- **Token Fees**: ckUSDC/ckUSDT use 10,000 micro-units (0.01), not 10!

## Testing Environment Setup

1. Generate test wallet: `pnpm run lib:generate:wallet`
2. Fund wallet with ICP (for fees) and test tokens
3. Deploy canister locally or to mainnet
4. Configure `.env.test` with canister ID
5. Run test scripts to verify functionality

See `TESTING_GUIDE.md` for detailed testing procedures.

## Testnet/Mainnet Debugging and Testing

When working with deployed canisters that appear stuck or unresponsive, you may need to debug block processing issues, adjust polling intervals for testing, or fix webhook configurations. Common issues include:

- **Canister stuck on archived blocks**: When next_block is too far behind the ledger tip
- **Slow transaction detection**: Polling intervals too slow for testing
- **Missing webhook notifications**: Incorrect or outdated webhook URLs
- **Cycle management**: Balancing fast polling with cost efficiency

**For complete debugging procedures, troubleshooting steps, and production best practices, see: `docs/TESTNET_DEBUGGING_GUIDE.md`**

This guide contains real-world debugging scenarios, step-by-step fixes, and critical safety procedures to prevent cycle waste during testing.

## Lessons Learned from Testing (Critical for Future Claude)

After conducting 10+ testing attempts documented in `docs/logs/`, here are critical insights that will save you hours of debugging:

### 1. Mainnet Deployment Gotchas

**Cycles Management is Critical**

- A 1.9MB WASM file requires ~460B cycles for deployment (not the default amount!)
- Always create canisters with extra cycles: `--with-cycles 500000000000`
- Monitor cycles with `dfx canister status` - insufficient cycles cause cryptic errors
- Keep a buffer of at least 200B cycles for operations

**Principal Format in Deployment**

```bash
# ❌ NEVER do this - command substitution fails in Candid arguments
dfx deploy --argument '(variant { Mainnet }, 5, 0, "ledger-id", $(dfx identity get-principal))'

# ✅ ALWAYS use hardcoded principal
dfx deploy --argument '(variant { Mainnet }, 5, 0, "ledger-id", "gf3g2-eaeha-...-qqe")'
```

### 2. Multi-Token Testing Insights

**Token-Specific Quirks**

- **ICP**: Uses hex AccountIdentifier format (64 chars)
- **ckUSDC/ckUSDT**: Uses ICRC-1 textual format with CRC32 checksum (e.g., `canister-id-checksum.5`)
- **Critical**: ckUSDC fee is 10,000 micro-units (0.01 ckUSDC), NOT 10!

**Block Processing State**

- Each token maintains independent `next_block` state
- After canister upgrades, you may need to manually set:
  ```bash
  dfx canister call <id> set_token_next_block_update '(variant { CKUSDC }, 366986 : nat64)'
  ```

### 3. Authorization and Custodian Issues

**The Silent Killer: Mismatched Principals**

- Library calls fail with "Unauthorized" if custodian doesn't match your principal
- Always check: `dfx canister call <id> get_custodian`
- Fix by upgrading with correct principal in initialization arguments

**Post-Upgrade Hook**

- The canister's `post_upgrade` function MUST set the custodian
- Without this, all authenticated calls fail silently

### 4. Webhook Integration Reality

**Webhook Format Changed**

- Documentation may say JSON body, but implementation sends:
  ```
  POST /webhook?tx_hash=<hash>
  ```
- Extract from query parameters, not request body!

**ngrok Setup**

- Webhook testing requires public URL - use ngrok
- The test script handles this automatically
- Keep webhook server running during all deposit tests

### 5. Testing Workflow That Actually Works

```bash
# 1. Always start fresh
pnpm run clean && pnpm install

# 2. For mainnet testing, set faster polling (then restore later)
dfx canister call <id> set_interval '(30 : nat64)'  # Testing
# Don't forget to restore: set_interval '(500 : nat64)'  # Production

# 3. Run webhook server FIRST (keep it running)
pnpm run lib:test:webhook

# 4. Then run deposit tests in another terminal
pnpm run lib:test:usdc

# 5. Wait patiently - indexing takes 30-45 seconds
```

### 6. Debugging Transaction Detection Failures

**Common Causes**

1. Token not registered (check `get_registered_tokens`)
2. Wrong `next_block` for token (use `set_token_next_block_update`)
3. Insufficient polling interval (30s for testing, 500s for production)
4. Multi-token support not deployed (requires canister upgrade)

**Verification Commands**

```bash
# Check if transactions are being indexed
dfx canister call <id> get_transactions_count

# List recent transactions
dfx canister call <id> list_transactions '(opt 10)'

# Check specific token balance
dfx canister call <id> get_balance '(variant { CKUSDC })'
```

### 7. Environment Setup That Prevents Pain

**Always Use Test Wallets**

- Generate fresh: `pnpm run lib:generate:wallet`
- Fund with small amounts only
- Never reuse mnemonics from logs

**Canister ID Management**

- Save canister IDs immediately after creation
- Add to `.env.test`: `USER_VAULT_CANISTER_ID="your-id"`
- Keep `canister_ids.json` updated

### 8. What the Scripts Actually Do

**Modern Test Scripts** (use these):

- `testICPDeposit.sh`: Sends 0.001 ICP to generated subaccount
- `testUSDCDeposit.sh`: Sends 0.1 ckUSDC with proper 0.01 fee
- `testWebhook.ts`: Express server + ngrok + auto-configuration

**Legacy Scripts** (avoid unless necessary):

- Manual token registration (now automatic)
- Complex multi-step processes
- No integrated webhook testing

### 9. Production Deployment Checklist

1. ✅ Sufficient ICP for cycles (at least 0.1 ICP)
2. ✅ Build canister first: `pnpm run build:canister`
3. ✅ Use deployment script: `./scripts/deploy-mainnet.sh deploy`
4. ✅ Verify token registration: `get_registered_tokens`
5. ✅ Set production interval: `set_interval '(500 : nat64)'`
6. ✅ Configure webhook URL for production
7. ✅ Test with small amounts first

### 10. Time-Saving Commands Reference

```bash
# Quick canister health check
dfx canister status <id> --network ic

# Add more cycles if running low
dfx canister deposit-cycles 200000000000 <id> --network ic

# Full state inspection
dfx canister call <id> get_custodian
dfx canister call <id> get_registered_tokens
dfx canister call <id> get_interval
dfx canister call <id> get_webhook_url
dfx canister call <id> get_nonce
```

## When Things Go Wrong

Check `docs/logs/TESTING_ATTEMPT_*.md` files - they document real issues and solutions:

- Attempt 1-2: Cycles and deployment issues
- Attempt 3-4: Authorization fixes
- Attempt 5-6: Webhook integration
- Attempt 7-10: Multi-token support

Each log shows the exact error and the fix that worked.
