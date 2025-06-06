# ICSI Testing Guide

This guide will walk you through testing the ICP Subaccount Indexer (ICSI) canister with multi-token deposits (ICP, ckUSDC, ckUSDT) and webhook functionality. This guide has been thoroughly tested and refined through 10+ testing attempts documented in `docs/logs/`.

## Prerequisites

1. **dfx** - Internet Computer SDK (version 0.15.0 or later)
2. **pnpm** - Package manager (version 8.0.0 or later)
3. **Node.js** - Version 16 or later
4. **ICP wallet** with some ICP for fees and cycle conversion
5. **Test tokens** for deposits:
   - ICP for native token testing (at least 0.1 ICP for cycles + testing)
   - ckUSDC tokens for USDC testing (at least 0.11 ckUSDC)
   - ckUSDT tokens for USDT testing (at least 0.11 ckUSDT)

## Important Notes for Beginners

- **Always use test wallets**: Never use your personal wallet for testing
- **Mainnet costs real money**: Each deployment and test uses real ICP
- **Cycles are required**: You need to convert ICP to cycles for canister operations
- **Be patient**: Transaction indexing takes 30-45 seconds
- **Keep terminals open**: Some commands require persistent connections

## Quick Start

### From Root Directory (Recommended)

The project uses pnpm workspaces, so you can run all tests from the root:

```bash
# Install all dependencies
pnpm install

# Generate test wallet
pnpm run lib:generate:wallet

# Run tests
pnpm run lib:test:icp     # Test ICP deposits
pnpm run lib:test:usdc    # Test ckUSDC deposits
pnpm run lib:test:usdt    # Test ckUSDT deposits
pnpm run lib:test:webhook  # Test webhook server
```

### From Package Directory

```bash
cd packages/icsi-lib
pnpm run test:icp-deposit
pnpm run test:usdc-deposit
pnpm run test:usdt-deposit
pnpm run test:webhook
```

## Step 1: Generate Test Wallet

First, generate a new test wallet for isolated testing:

```bash
# From root directory
pnpm run lib:generate:wallet

# Or from package directory
cd packages/icsi-lib
pnpm run generate:wallet
```

This will:

- Generate a new 12-word mnemonic seed phrase
- Create `.env.test` with the test wallet credentials
- Display the principal ID and account ID for funding

**Example output:**

```
🔑 ICP Test Wallet Generator
============================

📝 Generated Mnemonic (12 words):
   word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12

🆔 Principal ID:
   xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxx

💳 Account Identifier:
   xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxx

💾 Test wallet saved to: .env.test
```

## Step 2: Fund Test Wallet

Send funds to your test wallet:

1. **For ICP**: Send to the Account Identifier displayed
2. **For ckUSDC/ckUSDT**: Send to the Principal ID displayed

Minimum funding requirements:

- **ICP**: At least 0.002 ICP (for fees and test transfers)
- **ckUSDC**: At least 0.11 ckUSDC (0.1 for transfer + 0.01 fee)
- **ckUSDT**: At least 0.11 ckUSDT (0.1 for transfer + 0.01 fee)

**Token Ledger Canister IDs (Mainnet):**

- ICP: `ryjl3-tyaaa-aaaaa-aaaba-cai`
- ckUSDC: `xevnm-gaaaa-aaaar-qafnq-cai`
- ckUSDT: `cngnf-vqaaa-aaaar-qag4q-cai`

## Step 3: Deploy ICSI Canister

### Option A: Using Deployment Script (Recommended)

Deploy a new ICSI canister or upgrade an existing one:

```bash
# From project root
./scripts/deploy-mainnet.sh deploy    # Initial deployment
./scripts/deploy-mainnet.sh upgrade   # Upgrade existing canister
```

### Option B: Manual DFX Deployment (Advanced)

If the deployment script is unavailable or you need more control:

#### Step 3.1: Prepare for Deployment

```bash
# Check your identity and network
dfx identity whoami
dfx identity get-principal

# Suppress mainnet plaintext identity warnings
export DFX_WARNING=-mainnet_plaintext_identity
```

#### Step 3.2: Convert ICP to Cycles

```bash
# Check your ICP balance
dfx ledger --network ic balance

# Convert ICP to cycles (1.9MB canister needs ~500B cycles)
dfx ledger --network ic top-up --amount 0.05 $(dfx identity get-wallet --network ic)
```

#### Step 3.3: Create and Deploy Canister

```bash
# Create canister with sufficient cycles (500B cycles minimum)
dfx canister create icp_subaccount_indexer --network ic --with-cycles 500000000000

# Save the canister ID from output!
# Example: y3hne-ryaaa-aaaag-aucea-cai

# Build the canister
pnpm run build:canister

# Deploy with initialization arguments
dfx deploy icp_subaccount_indexer --network ic --argument '(
  variant { Mainnet },
  5: nat64,  # Initial nonce
  0: nat32,  # Reserved (must be 0)
  "ryjl3-tyaaa-aaaaa-aaaba-cai",  # ICP ledger canister
  "YOUR-PRINCIPAL-HERE"  # Your principal ID (custodian)
)'
```

**Important**: Replace `YOUR-PRINCIPAL-HERE` with your actual principal from `dfx identity get-principal`

#### Step 3.4: Verify Deployment

```bash
# Check canister status
dfx canister status icp_subaccount_indexer --network ic

# Verify token registration
dfx canister --network ic call icp_subaccount_indexer get_registered_tokens
```

**Note**: The canister automatically registers all three token types (ICP, ckUSDC, ckUSDT) during initialization.

## Step 4: Configure Environment

The `.env.test` file is automatically created when you generate a wallet. Add your canister ID:

```bash
cd packages/icsi-lib

# Edit .env.test and add your canister ID:
echo 'USER_VAULT_CANISTER_ID="your-canister-id-here"' >> .env.test
```

**Example `.env.test` file:**

```
MNEMONIC="your twelve word seed phrase goes here"
USER_VAULT_CANISTER_ID="y3hne-ryaaa-aaaag-aucea-cai"
```

## Step 5: Configure Canister for Testing

Before testing, optimize the canister for faster transaction detection:

```bash
# Set faster polling interval for testing (30 seconds instead of 500)
dfx canister --network ic call YOUR-CANISTER-ID set_interval '(30 : nat64)'

# Verify the change
dfx canister --network ic call YOUR-CANISTER-ID get_interval
```

**Remember to restore production settings after testing:**

```bash
# Restore production polling interval (500 seconds)
dfx canister --network ic call YOUR-CANISTER-ID set_interval '(500 : nat64)'
```

## Step 6: Test Webhook Functionality

Start the webhook test server in one terminal:

```bash
# From root directory
pnpm run lib:test:webhook

# Or from package directory
cd packages/icsi-lib
pnpm run test:webhook
```

This will:

- Start a local Express server on port 3000
- Create an ngrok tunnel for public access
- Automatically configure the webhook URL in your ICSI canister
- Display the public webhook URL

**Keep this terminal running during deposit tests!**

**Note**: The webhook receives transaction hashes as query parameters (e.g., `POST /webhook?tx_hash=...`)

## Step 7: Test Token Deposits

In a new terminal, run deposit tests for different tokens:

### ICP Deposit Test

```bash
pnpm run lib:test:icp
```

- Sends 0.001 ICP to a generated subaccount
- Uses standard AccountIdentifier format
- Fee: 0.0001 ICP

### ckUSDC Deposit Test

```bash
pnpm run lib:test:usdc
```

- Sends 0.1 ckUSDC to a generated subaccount
- Uses ICRC-1 textual format (e.g., `canister-id-checksum.index`)
- Fee: 0.01 ckUSDC

### ckUSDT Deposit Test

```bash
pnpm run lib:test:usdt
```

- Sends 0.1 ckUSDT to a generated subaccount
- Uses ICRC-1 textual format
- Fee: 0.01 ckUSDT

**Each test will:**

1. Generate a new subaccount
2. Send tokens to the subaccount
3. Wait for transaction indexing (~30-45 seconds)
4. Display the transaction details

## Step 8: Verify Webhook Notification

Check the webhook terminal to see the deposit notification:

```
🔔 WEBHOOK RECEIVED!
==================
🔗 Transaction Hash: 4bce1468a62a3aec861686d071a683397dc164b97b997f44e9a1bf8a5ef700ad

📋 Request Details:
Query Parameters: { tx_hash: '4bce1468a62a3aec861686d071a683397dc164b97b997f44e9a1bf8a5ef700ad' }
Method: POST
URL: /webhook?tx_hash=4bce1468a62a3aec861686d071a683397dc164b97b997f44e9a1bf8a5ef700ad
==================
```

## Testing Workflow Summary

1. **Generate wallet**: `pnpm run lib:generate:wallet`
2. **Fund wallet** with ICP and test tokens (ckUSDC/ckUSDT)
3. **Deploy canister**: `./scripts/deploy-mainnet.sh deploy`
4. **Configure** `.env.test` with canister ID
5. **Start webhook**: `pnpm run lib:test:webhook` (keep running)
6. **Test deposits**:
   - `pnpm run lib:test:icp` (ICP)
   - `pnpm run lib:test:usdc` (ckUSDC)
   - `pnpm run lib:test:usdt` (ckUSDT)
7. **Verify** webhook notifications for each deposit

## Alternative: Manual DFX Token Transfers

If the TypeScript test scripts aren't working, you can manually test with dfx commands:

### Manual ICP Transfer

```bash
# Generate a subaccount
dfx canister --network ic call YOUR-CANISTER-ID generate_icp_deposit_address '(123456789 : nat32)'
# Returns something like: "bd54f8b5e0fe4c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b"

# Transfer ICP to the subaccount
dfx ledger --network ic transfer --amount 0.001 --memo 123456789 bd54f8b5e0fe4c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b8c6b
```

### Manual ckUSDC Transfer

```bash
# Generate ICRC-1 format subaccount
dfx canister --network ic call YOUR-CANISTER-ID generate_icrc1_deposit_address '(variant { CKUSDC }, 5 : nat32)'
# Returns something like: "y3hne-ryaaa-aaaag-aucea-cai-dzfvpaa.5"

# Transfer ckUSDC using ICRC-1 standard
dfx canister --network ic call xevnm-gaaaa-aaaar-qafnq-cai icrc1_transfer '(
  record {
    to = record {
      owner = principal "YOUR-CANISTER-ID";
      subaccount = opt vec {
        0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0;
        0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 5
      }
    };
    amount = 100000;  # 0.1 ckUSDC (6 decimals)
    fee = opt 10000;  # 0.01 ckUSDC fee
    memo = null;
    from_subaccount = null;
    created_at_time = null
  }
)'
```

**Note**: The subaccount vector must be exactly 32 bytes with the nonce as the last byte.

## Troubleshooting

### Common Errors and Solutions

#### "Insufficient balance" errors

- **ICP**: Ensure you have at least 0.002 ICP (0.001 for transfer + 0.0001 fee + buffer)
- **ckUSDC/ckUSDT**: Ensure you have at least 0.11 tokens (0.1 for transfer + 0.01 fee)
- Check the principal ID matches your funded wallet
- For ckUSDC: Fee is 10,000 micro-units (0.01 ckUSDC), not 10!

#### "Insufficient cycles" during deployment

- Large WASM files (1.9MB) need ~460B cycles for deployment
- Add more cycles: `dfx canister deposit-cycles 200000000000 icp_subaccount_indexer --network ic`
- Convert more ICP to cycles: `dfx ledger --network ic top-up --amount 0.1 $(dfx identity get-wallet --network ic)`

#### "Unauthorized" errors from library

- The canister's custodian must match your principal
- Check custodian: `dfx canister --network ic call YOUR-CANISTER-ID get_custodian`
- If mismatched, upgrade canister with correct principal in arguments

#### "Principal format error" during deployment

- Don't use command substitution `$(dfx identity get-principal)` in Candid arguments
- Use the hardcoded principal string instead
- Get your principal: `dfx identity get-principal`, then copy-paste it

### "Canister not found"

- Verify the USER_VAULT_CANISTER_ID in .env.test is correct
- Ensure the canister is deployed on mainnet
- Check you're using the correct network (`--network ic`)

### "Webhook not received"

- Check the webhook server is still running (port 3000)
- Verify ngrok tunnel is active
- Wait at least 30-45 seconds for transaction indexing
- Check canister polling interval (should be ~30s for testing)

### "Transaction not detected"

- Wait at least 30-45 seconds for indexing
- Verify the token's next block is set correctly
- Check transaction count: `dfx canister --network ic call YOUR-CANISTER-ID get_transactions_count`
- List transactions: `dfx canister --network ic call YOUR-CANISTER-ID list_transactions '(opt 10)'`
- For ckUSDC/ckUSDT, ensure multi-token support is deployed (requires canister upgrade)
- Check token-specific block processing:
  ```bash
  # Set next block for ckUSDC if needed
  dfx canister --network ic call YOUR-CANISTER-ID set_token_next_block_update '(variant { CKUSDC }, 366986 : nat64)'
  ```

### Build errors

- Run `pnpm install` from project root
- Run `pnpm run build` to compile everything
- Ensure you have Node.js 16+ and pnpm 8+

## Security Notes

- **Never use test wallets for real funds**
- Test mnemonics are stored in plain text in `.env.test`
- Always use separate wallets for testing
- Keep your production seed phrases secure
- The `.env.test` file is gitignored by default

## Advanced Testing

### Complete DFX Command Reference

#### Identity and Network Management

```bash
# Check current identity
dfx identity whoami
dfx identity get-principal

# List all identities
dfx identity list

# Switch identity
dfx identity use <identity-name>

# Suppress warnings
export DFX_WARNING=-mainnet_plaintext_identity
```

#### Canister Lifecycle Management

```bash
# Create canister with cycles
dfx canister create icp_subaccount_indexer --network ic --with-cycles 500000000000

# Build canister
dfx build icp_subaccount_indexer

# Deploy with arguments
dfx deploy icp_subaccount_indexer --network ic --argument '(variant { Mainnet }, 5: nat64, 0: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "your-principal-here")'

# Upgrade existing canister
dfx canister install icp_subaccount_indexer --network ic --mode upgrade

# Check status
dfx canister status icp_subaccount_indexer --network ic

# Add cycles to canister
dfx canister deposit-cycles 200000000000 icp_subaccount_indexer --network ic

# Delete canister (be careful!)
dfx canister delete icp_subaccount_indexer --network ic
```

#### Configuration Commands

```bash
# Set webhook URL
dfx canister --network ic call YOUR-CANISTER-ID set_webhook_url '("https://your-webhook-url.com/webhook")'

# Set polling interval (seconds)
dfx canister --network ic call YOUR-CANISTER-ID set_interval '(30 : nat64)'  # Testing
dfx canister --network ic call YOUR-CANISTER-ID set_interval '(500 : nat64)' # Production

# Set next block for token processing
dfx canister --network ic call YOUR-CANISTER-ID set_token_next_block_update '(variant { ICP }, 123456 : nat64)'
dfx canister --network ic call YOUR-CANISTER-ID set_token_next_block_update '(variant { CKUSDC }, 366986 : nat64)'
dfx canister --network ic call YOUR-CANISTER-ID set_token_next_block_update '(variant { CKUSDT }, 234567 : nat64)'
```

### Monitoring and Debugging Commands

```bash
# Get canister information
dfx canister --network ic call YOUR-CANISTER-ID get_custodian
dfx canister --network ic call YOUR-CANISTER-ID get_registered_tokens
dfx canister --network ic call YOUR-CANISTER-ID get_interval
dfx canister --network ic call YOUR-CANISTER-ID get_nonce

# Transaction monitoring
dfx canister --network ic call YOUR-CANISTER-ID get_transactions_count
dfx canister --network ic call YOUR-CANISTER-ID list_transactions '(opt 10)'
dfx canister --network ic call YOUR-CANISTER-ID get_transaction '("transaction-hash-here")'

# Balance checking
dfx canister --network ic call YOUR-CANISTER-ID get_balance '(variant { ICP })'
dfx canister --network ic call YOUR-CANISTER-ID get_balance '(variant { CKUSDC })'
dfx canister --network ic call YOUR-CANISTER-ID get_balance '(variant { CKUSDT })'

# Subaccount management
dfx canister --network ic call YOUR-CANISTER-ID list_deposit_addresses '(opt 10)'
dfx canister --network ic call YOUR-CANISTER-ID get_subaccount_by_id '("subaccount-id-here")'

# Token operations
dfx canister --network ic call YOUR-CANISTER-ID sweep_all '(variant { ICP })'
dfx canister --network ic call YOUR-CANISTER-ID sweep_all '(variant { CKUSDC })'
```

### Working with Token Ledgers Directly

```bash
# Check ICP balance
dfx ledger --network ic balance

# Check ckUSDC balance
dfx canister --network ic call xevnm-gaaaa-aaaar-qafnq-cai icrc1_balance_of '(
  record {
    owner = principal "your-principal-here";
    subaccount = null
  }
)'

# Get token metadata
dfx canister --network ic call xevnm-gaaaa-aaaar-qafnq-cai icrc1_metadata
```

## Test Logs and Learning Resources

Detailed test execution logs are maintained in `docs/logs/` for reference:

- `TESTING_ATTEMPT_1.md` - Initial deployment and cycles management
- `TESTING_ATTEMPT_2.md` - Principal format fixes
- `TESTING_ATTEMPT_3.md` - Authorization troubleshooting
- `TESTING_ATTEMPT_4.md` - Post-upgrade custodian fixes
- `TESTING_ATTEMPT_5.md` - ICP transaction indexing
- `TESTING_ATTEMPT_6.md` - Webhook script fixes and validation
- `TESTING_ATTEMPT_7.md` - ckUSDC integration attempts
- `TESTING_ATTEMPT_8.md` - Token balance checking
- `TESTING_ATTEMPT_9.md` - ckUSDC fee corrections
- `TESTING_ATTEMPT_10.md` - Successful ckUSDC multi-token testing

**Important**: These logs contain test seed phrases and transaction details. Never reuse seed phrases from logs for personal or production use.

## Key Lessons from Testing

1. **Cycles Management**: Large WASM files need significantly more cycles than expected
2. **Principal Format**: Always use hardcoded principals in deployment arguments
3. **Token Fees**: ckUSDC/ckUSDT use 10,000 micro-units (0.01), not 10
4. **Multi-token Support**: Requires canister upgrade with proper implementation
5. **Block Processing**: Each token type maintains independent block state
6. **Webhook Format**: Sends transaction hash as query parameter, not JSON body
7. **Address Formats**: ICP uses hex AccountIdentifier, ICRC-1 uses textual format with CRC32

## Test Script Architecture

### Modern Test Scripts (`packages/icsi-lib/test/scripts/`)

- **Shell Scripts**: `testICPDeposit.sh`, `testUSDCDeposit.sh`, `testUSDTDeposit.sh`

  - Execute complete deposit workflows
  - Handle wallet generation, transfers, and verification
  - Production-ready testing approach

- **TypeScript Scripts**: `testWebhook.ts`
  - Express server for webhook testing
  - ngrok integration for public URLs
  - Transaction hash logging and summary

### Legacy Scripts (`packages/icsi-lib/test/scripts/legacy/`)

Legacy scripts are available but not recommended for standard testing:

- `registerTokens.ts` - Manual token registration
- `getDepositAddresses.ts` - List all deposit addresses
- `getBalances.ts` - Check token balances
- `sweepAll.ts` - Sweep tokens from subaccounts
- `clearTransactions.ts` - Clear transaction history

**Note**: The canister now auto-registers tokens during initialization, making manual registration unnecessary.
