# ICSI Library Test Scripts

This directory contains comprehensive test scripts for the ICSI (ICP Subaccount Indexer) library. These scripts test all the query and update functions against the devnet canister.

## 🚀 Quick Start

### Prerequisites

1. Make sure you have the ICSI library built:

   ```bash
   cd packages/icsi-lib
   pnpm install
   pnpm run build
   ```

2. **Configure Authentication**: Create a `.env` file with your credentials:

   ```bash
   # Copy the example file
   cp .env.example .env

   # Edit .env with your values
   nano .env
   ```

   Required variables (choose ONE authentication method):

   - `SEED_PHRASE`: Your mnemonic seed phrase (12 or 24 words)
   - `PRIVATE_KEY`: Your private key (PEM format from `dfx identity export`, alternative to seed phrase)
   - `USER_VAULT_CANISTER_ID`: The canister ID to test against
   - `HOST`: IC network host (default: `https://ic0.app`)

3. Ensure your identity has permissions on the target canister

### Available Test Scripts

| Script               | Command                           | Description                      | Safety         |
| -------------------- | --------------------------------- | -------------------------------- | -------------- |
| **Query Functions**  | `pnpm run test:query`             | Read-only operations (safe)      | ✅ Safe        |
| **Update Functions** | `pnpm run test:update`            | State-modifying operations       | ⚠️ Destructive |
| **Token Operations** | `pnpm run test:tokens`            | Token registration & subaccounts | ⚠️ Destructive |
| **All Functions**    | `pnpm run test:all-functions`     | Complete test suite              | ⚠️ Destructive |
| **Test Runner**      | `pnpm run test:functions [suite]` | Interactive test runner          | Variable       |

## 📝 Test Script Details

### 1. Query Functions Test (`testQueryFunctions.ts`)

Tests all read-only functions that don't modify canister state:

- `getUserVaultTransactions()` - Fetch transaction history
- `getUserVaultInterval()` - Get polling interval
- `getTransactionsCount()` - Get total transaction count
- `getNonce()` - Get current nonce value
- `getSubaccountCount()` - Get total subaccounts
- `getSubaccountId()` - Get subaccount by index and token type
- `getWebhookUrl()` - Get configured webhook URL
- `getCanisterPrincipal()` - Get canister principal
- `getIcrcAccount()` - Get ICRC account format
- `getNetwork()` - Get network configuration
- `getNextBlock()` - Get next block to process
- `getOldestBlock()` - Get oldest processed block
- `getRegisteredTokens()` - Get all registered tokens
- `getTransactionTokenType()` - Get token type for transaction
- Helper functions: `getDepositAddresses()`, `getBalances()`, `getTransactionsByTokenType()`

**Usage:**

```bash
pnpm run test:query
```

### 2. Update Functions Test (`testUpdateFunctions.ts`)

Tests all state-modifying functions:

- `registerToken()` - Register new token types
- `addSubaccount()` / `addSubaccountForToken()` - Create subaccounts
- `setUserVaultInterval()` - Modify polling interval
- `setWebhookUrl()` - Update webhook configuration
- `sweep()` / `sweepByTokenType()` / `sweepSubaccountId()` - Sweep operations
- `singleSweep()` / `setSweepFailed()` - Individual transaction handling
- `convertToIcrcAccount()` / `validateIcrcAccount()` - Account utilities
- `clearTransactions()` - Transaction cleanup (with safety limits)
- `refund()` - Refund operations

**⚠️ WARNING:** This script modifies canister state! It attempts to restore original settings but some changes may persist.

**Usage:**

```bash
pnpm run test:update
```

### 3. Token Operations Test (`testTokenOperations.ts`)

Comprehensive testing focused on multi-token support:

- Register all token types (ICP, CKUSDC, CKUSDT)
- Create subaccounts for each token type
- Test address generation and formatting
- Verify token-specific transactions
- Test token-specific sweep operations
- Validate ICRC account formats

**Usage:**

```bash
pnpm run test:tokens
```

### 4. Test Runner (`runTests.ts`)

Interactive script runner with usage instructions:

**Usage:**

```bash
# Show help
pnpm run test:functions

# Run specific test suite
pnpm run test:functions query     # Safe read-only tests
pnpm run test:functions tokens    # Token operations
pnpm run test:functions update    # Update functions
pnpm run test:functions all       # All tests
```

## 🔧 Configuration

### Environment Variables

All test scripts use environment variables for configuration. Create a `.env` file:

```bash
# AUTHENTICATION (choose ONE method):

# Option 1: Mnemonic seed phrase (12 or 24 words)
SEED_PHRASE="your mnemonic seed phrase goes here"

# Option 2: Private key (PEM format from dfx identity export)
# PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----
# MIIEpAIBAAKCAQEA0+Tys6Dyij2SYFmUKeWkNNQVl5/44C/JkGiZeoW931gxoAcG
# BSuBBAEKoUQDQgAEaVEqcupSIyWS64LRUiEJFRjKciUXYe12s5mrOz0rS+uwfSGkM
# LoBrB8s8boAvGU9S4o18KAWFqDxJkbNc2oOSw==
# -----END EC PRIVATE KEY-----"

# CANISTER CONFIGURATION:
USER_VAULT_CANISTER_ID="y3hne-ryaaa-aaaag-aucea-cai"

# IC Host URL (optional)
HOST="https://ic0.app"
```

### Authentication

**Important**: Your identity (derived from `SEED_PHRASE` or `PRIVATE_KEY`) must have proper permissions on the target canister. Using incorrect credentials will result in "Unauthorized" errors.

**Authentication Options:**

1. **Seed Phrase**: 12 or 24 word mnemonic phrase
2. **Private Key** (recommended): PEM format from `dfx identity export <identity-name>`

**Priority**: If both are provided, `PRIVATE_KEY` takes precedence over `SEED_PHRASE`.

**To get your private key:**

```bash
# Export your current dfx identity
dfx identity export default > my-identity.pem

# Copy the content to your .env file
cat my-identity.pem
```

Ensure the identity is authorized on the target canister before running tests.

## 📊 Test Output

Each script provides detailed console output including:

- ✅ Successful operations with results
- ❌ Failed operations with error messages
- 📊 State information (intervals, counts, etc.)
- 🔍 Data verification and validation results
- ⏱️ Execution timing information

### Latest Test Results

> Failures in the sweeping/update functionalities are expected because the transactions are no longer available/or is already swept for the devnet canister in the ICP mainnet.

**All Function Tests (Query + Update) - Last Run: 2025-06-18**

✅ **Query Functions (10/10 passed)**

- ✅ `getUserVaultInterval`: Returns `500n` (BigInt serialization fixed)
- ✅ `getTransactionsCount`: Returns transaction count
- ✅ `getNonce`: Returns current nonce value
- ✅ `getSubaccountCount`: Returns subaccount count
- ✅ `getWebhookUrl`: Returns configured webhook URL
- ✅ `getCanisterPrincipal`: Returns canister principal
- ✅ `getNetwork`: Returns "Mainnet" or "Local"
- ✅ `getNextBlock`: Returns `24491714n` (BigInt serialization fixed)
- ✅ `getOldestBlock`: Returns `366841n` (BigInt serialization fixed)
- ✅ `getRegisteredTokens`: Returns all 3 registered tokens (ICP, ckUSDC, ckUSDT)

✅ **Query Functions with Parameters**

- ✅ `getUserVaultTransactions(limit)`: Returns limited transaction list (BigInt serialization fixed)
- ✅ `getUserVaultTransactions()`: Returns all transactions
- ✅ `getSubaccountId()`: Works for all token types (ICP, ckUSDC, ckUSDT)
- ✅ `getIcrcAccount()`: Returns ICRC-1 account format
- ✅ `getTransactionTokenType()`: Returns token type for transaction hash

✅ **Helper Functions**

- ✅ `getDepositAddresses()`: Returns addresses for all 3 token types
- ✅ `getBalances()`: Returns balance information
- ✅ `getTransactionsByTokenType()`: Works for all token types (ICP: 3 transactions, ckUSDC: 2 transactions, ckUSDT: 0 transactions)

✅ **Update Functions (All passed)**

- ✅ Token Registration: All 3 tokens (ICP, ckUSDC, ckUSDT) successfully registered
- ✅ Subaccount Management: `addSubaccount()` and `addSubaccountForToken()` working for all token types
- ✅ Configuration Updates: `setUserVaultInterval()` and `setWebhookUrl()` working
- ✅ ICRC Account Functions: `validateIcrcAccount()` and `convertToIcrcAccount()` working correctly
- ✅ Sweep Functions: All sweep operations returning expected results (empty arrays as expected)
- ✅ Transaction Management: `singleSweep()`, `setSweepFailed()`, `refund()`, and `clearTransactions()` working (BigInt serialization fixed)

**Performance**: All tests completed in ~66 seconds

**Multi-Token Support**: ✅ Fully functional

- ICP: Native Internet Computer token (hex AccountIdentifier format)
- ckUSDC: Chain-key USDC (ICRC-1 textual format)
- ckUSDT: Chain-key USDT (ICRC-1 textual format)

**Test Environment**: Devnet canister `y3hne-ryaaa-aaaag-aucea-cai` on mainnet (`https://ic0.app`)

## 🛡️ Safety Features

### For Update Functions

1. **State Preservation**: Scripts attempt to save and restore original settings
2. **Safety Limits**: Destructive operations use conservative parameters
3. **Warnings**: Clear warnings before executing state-changing operations
4. **Graceful Errors**: Failed operations don't crash the entire test suite

### For Query Functions

Query functions are completely safe as they only read data without making any changes.

## 🚨 Important Notes

1. **Devnet Only**: These scripts are configured for devnet testing only
2. **Test Data**: Scripts may create test subaccounts and register tokens
3. **State Changes**: Update functions will modify canister state
4. **Network Requirements**: Requires network access to IC devnet
5. **Authentication**: Uses test identities (not for production use)

## 🔍 Troubleshooting

### Common Issues

**"Unauthorized" Errors:**

- Check that your `.env` file exists and has the correct `SEED_PHRASE`
- Verify your identity has permissions on the target canister
- Ensure `USER_VAULT_CANISTER_ID` matches the canister you have access to

**Environment Variable Issues:**

- Copy `.env.example` to `.env` and fill in your values
- Use quotes around multi-word seed phrases
- Check that the canister ID format is correct

**Network Errors:**

- Verify internet connectivity
- Check that the target network is accessible
- For local development, ensure replica is running

**Build Errors:**

- Run `pnpm run build` in the icsi-lib directory
- Ensure all dependencies are installed

### Debug Mode

For more detailed output, you can modify the scripts to enable debug logging:

```typescript
// Add this to any test script
process.env.DEBUG = 'true';
```

## 📚 Integration with NPM Package

These test scripts serve as:

1. **Validation Tools**: Verify library functions work correctly
2. **Documentation**: Live examples of how to use each function
3. **Integration Tests**: End-to-end testing against real canisters
4. **NPM Preparation**: Validation before publishing to NPM

Before publishing the `@jagad/icsi` package to NPM, run:

```bash
# Validate all functions work
pnpm run test:query

# Test package build
pnpm run build

# Type checking
pnpm run type-check

# Format code
pnpm run format
```

## 🎯 Next Steps

1. **Run Safe Tests First**: Start with `pnpm run test:query`
2. **Review Results**: Check that all expected functions work
3. **Test Token Operations**: Run `pnpm run test:tokens` for multi-token support
4. **Validate Package**: Ensure the built package works as expected
5. **Prepare for NPM**: Build and validate before publishing
