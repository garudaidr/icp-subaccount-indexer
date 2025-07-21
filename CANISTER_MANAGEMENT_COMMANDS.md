# Canister Management Commands

This document contains all the essential commands for managing the ICP Sub-Account Indexer canister `g5nrt-myaaa-aaaap-qhluq-cai`.

## Prerequisites

```bash
# Switch to mainnet_custodian identity
dfx identity use mainnet_custodian

# Set warning suppression
export DFX_WARNING=-mainnet_plaintext_identity

# Set canister ID variable for easier command usage
CANISTER_ID="g5nrt-myaaa-aaaap-qhluq-cai"
```

## Query Functions (Read-Only)

### Token and Block Information

#### Get Registered Tokens

```bash
dfx canister call $CANISTER_ID get_registered_tokens --network ic
```

**Expected Output:**

```
(
  variant {
    17_724 = vec {
      record { variant { 3_645_238 }; "ryjl3-tyaaa-aaaaa-aaaba-cai" };      // ICP
      record { variant { 828_704_773 }; "xevnm-gaaaa-aaaar-qafnq-cai" };    // ckUSDC
      record { variant { 828_704_790 }; "cngnf-vqaaa-aaaar-qag4q-cai" };    // ckUSDT
      record { variant { 3_315_481_737 }; "mxzaz-hqaaa-aaaar-qaada-cai" };  // ckBTC
    }
  },
)
```

#### Get Next Block Position for Each Token

```bash
# ICP next block
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { ICP })' --network ic

# ckUSDC next block
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKUSDC })' --network ic

# ckUSDT next block
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKUSDT })' --network ic

# ckBTC next block
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKBTC })' --network ic

# Get all token blocks at once
dfx canister call $CANISTER_ID get_all_token_blocks --network ic

# Get next block (legacy function - no parameters)
dfx canister call $CANISTER_ID get_next_block --network ic

# Get oldest block
dfx canister call $CANISTER_ID get_oldest_block --network ic
```

### Transaction Information

#### List Recent Transactions

```bash
# List last 10 transactions
dfx canister call $CANISTER_ID list_transactions '(opt 10)' --network ic

# List last 5 transactions
dfx canister call $CANISTER_ID list_transactions '(opt 5)' --network ic

# List all transactions (no limit)
dfx canister call $CANISTER_ID list_transactions '(null)' --network ic
```

#### Transaction Queries

```bash
# Get total transaction count
dfx canister call $CANISTER_ID get_transactions_count --network ic

# Get token type for a specific transaction hash
dfx canister call $CANISTER_ID get_transaction_token_type '("YOUR_TX_HASH")' --network ic
```

### Subaccount Information

```bash
# Get current nonce (number of generated subaccounts)
dfx canister call $CANISTER_ID get_nonce --network ic

# Get total subaccount count
dfx canister call $CANISTER_ID get_subaccount_count --network ic

# Get subaccount ID for a specific nonce
dfx canister call $CANISTER_ID get_subaccountid '(0 : nat32, null)' --network ic  # For all tokens
dfx canister call $CANISTER_ID get_subaccountid '(0 : nat32, opt variant { ICP })' --network ic
dfx canister call $CANISTER_ID get_subaccountid '(0 : nat32, opt variant { CKUSDC })' --network ic
dfx canister call $CANISTER_ID get_subaccountid '(0 : nat32, opt variant { CKUSDT })' --network ic
dfx canister call $CANISTER_ID get_subaccountid '(0 : nat32, opt variant { CKBTC })' --network ic

# Get ICRC account format for a nonce
dfx canister call $CANISTER_ID get_icrc_account '(0 : nat32)' --network ic
```

### Configuration Information

```bash
# Get current polling interval (in seconds)
dfx canister call $CANISTER_ID get_interval --network ic

# Get current webhook URL
dfx canister call $CANISTER_ID get_webhook_url --network ic

# Get network configuration (Mainnet/Local)
dfx canister call $CANISTER_ID get_network --network ic

# Get canister principal
dfx canister call $CANISTER_ID get_canister_principal --network ic

# Get canister status (internal)
dfx canister call $CANISTER_ID canister_status --network ic
```

### Account Validation and Conversion

```bash
# Convert text to ICRC account format
dfx canister call $CANISTER_ID convert_to_icrc_account '("YOUR_TEXT_IDENTIFIER")' --network ic

# Validate ICRC account format
dfx canister call $CANISTER_ID validate_icrc_account '("ryjl3-tyaaa-aaaaa-aaaba-cai-checksum.0")' --network ic
```

## Update Functions (State-Changing)

### Subaccount Management

```bash
# Add a new subaccount (generates next nonce)
dfx canister call $CANISTER_ID add_subaccount '(null)' --network ic  # For all tokens
dfx canister call $CANISTER_ID add_subaccount '(opt variant { ICP })' --network ic
dfx canister call $CANISTER_ID add_subaccount '(opt variant { CKUSDC })' --network ic
dfx canister call $CANISTER_ID add_subaccount '(opt variant { CKUSDT })' --network ic
dfx canister call $CANISTER_ID add_subaccount '(opt variant { CKBTC })' --network ic
```

### Token Management

```bash
# Register a new token
dfx canister call $CANISTER_ID register_token '(variant { ICP }, "ryjl3-tyaaa-aaaaa-aaaba-cai")' --network ic
dfx canister call $CANISTER_ID register_token '(variant { CKUSDC }, "xevnm-gaaaa-aaaar-qafnq-cai")' --network ic
dfx canister call $CANISTER_ID register_token '(variant { CKUSDT }, "cngnf-vqaaa-aaaar-qag4q-cai")' --network ic
dfx canister call $CANISTER_ID register_token '(variant { CKBTC }, "mxzaz-hqaaa-aaaar-qaada-cai")' --network ic

# Reset all token blocks to initial state
dfx canister call $CANISTER_ID reset_token_blocks --network ic
```

### Block Position Management

```bash
# Update next block position for each token
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { ICP }, 25841200 : nat64)' --network ic
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKUSDC }, 407027 : nat64)' --network ic
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKUSDT }, 580392 : nat64)' --network ic
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKBTC }, 2811077 : nat64)' --network ic

# Set next block (legacy function - no token type)
dfx canister call $CANISTER_ID set_next_block '(25841200 : nat64)' --network ic

# Process archived block manually
dfx canister call $CANISTER_ID process_archived_block '(25841200 : nat64)' --network ic
```

### Configuration Management

```bash
# Set polling interval
dfx canister call $CANISTER_ID set_interval '(30 : nat64)' --network ic   # Fast for testing
dfx canister call $CANISTER_ID set_interval '(500 : nat64)' --network ic  # Production setting

# Set webhook URL
dfx canister call $CANISTER_ID set_webhook_url '("https://your-domain.com/webhook")' --network ic

# Set custodian principal
dfx canister call $CANISTER_ID set_custodian_principal '("YOUR-PRINCIPAL-ID")' --network ic
```

### Transaction Management

```bash
# Clear transactions (with optional limit and timestamp)
dfx canister call $CANISTER_ID clear_transactions '(null, null)' --network ic  # Clear all
dfx canister call $CANISTER_ID clear_transactions '(opt 100, null)' --network ic  # Clear first 100
dfx canister call $CANISTER_ID clear_transactions '(null, opt record { timestamp_nanos = 1234567890000000000 })' --network ic  # Clear before timestamp
```

### Sweeping Operations

```bash
# Sweep all accumulated funds
dfx canister call $CANISTER_ID sweep --network ic

# Sweep by token type
dfx canister call $CANISTER_ID sweep_by_token_type '(variant { ICP })' --network ic
dfx canister call $CANISTER_ID sweep_by_token_type '(variant { CKUSDC })' --network ic
dfx canister call $CANISTER_ID sweep_by_token_type '(variant { CKUSDT })' --network ic
dfx canister call $CANISTER_ID sweep_by_token_type '(variant { CKBTC })' --network ic

# Single sweep for a specific transaction
dfx canister call $CANISTER_ID single_sweep '("TRANSACTION_HASH")' --network ic

# Sweep specific subaccount
dfx canister call $CANISTER_ID sweep_subaccount '("SUBACCOUNT_ID", 0.001 : float64, null)' --network ic
dfx canister call $CANISTER_ID sweep_subaccount '("SUBACCOUNT_ID", 0.001 : float64, opt variant { ICP })' --network ic
dfx canister call $CANISTER_ID sweep_subaccount '("SUBACCOUNT_ID", 0.001 : float64, opt variant { CKUSDC })' --network ic

# Set sweep status to failed for specific transactions
dfx canister call $CANISTER_ID set_sweep_failed '("TRANSACTION_HASH")' --network ic
```

### Refund Operations

```bash
# Refund a specific transaction by index
dfx canister call $CANISTER_ID refund '(12345 : nat64)' --network ic
```

## Canister Infrastructure Management

### Check Canister Status

```bash
# Check cycles, memory, status (using DFX)
dfx canister status $CANISTER_ID --network ic
```

### Add Cycles to Canister

```bash
# Add 200B cycles if running low
dfx canister deposit-cycles 200000000000 $CANISTER_ID --network ic
```

## Ledger Information (External)

### Get Current Ledger Block Heights

```bash
# ICP ledger tip
dfx canister call ryjl3-tyaaa-aaaaa-aaaba-cai query_blocks '(record { start = 0; length = 1 })' --network ic

# ckUSDC ledger tip
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai get_blocks '(record { start = 0; length = 1 })' --network ic

# ckUSDT ledger tip
dfx canister call cngnf-vqaaa-aaaar-qag4q-cai get_blocks '(record { start = 0; length = 1 })' --network ic

# ckBTC ledger tip
dfx canister call mxzaz-hqaaa-aaaar-qaada-cai get_blocks '(record { start = 0; length = 1 })' --network ic
```

## Canister Upgrade Process

### Option 1: Using Deployment Script (Recommended)

```bash
# Navigate to project root
cd /Users/theo/Projects/jagad/canister

# Build the canister first
pnpm run build:canister

# Upgrade using deployment script
./scripts/deploy-mainnet.sh upgrade
```

### Option 2: Manual Upgrade

```bash
# 1. Build the canister
pnpm run build:canister

# 2. Check current cycles before upgrade
dfx canister status $CANISTER_ID --network ic

# 3. Add more cycles if needed (upgrades consume cycles)
dfx canister deposit-cycles 100000000000 $CANISTER_ID --network ic

# 4. Upgrade the canister (with same initialization parameters)
dfx deploy $CANISTER_ID --network ic --argument '(variant { Mainnet }, 500: nat64, 0: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "your-principal-here")' --mode upgrade

# 5. Verify upgrade succeeded
dfx canister call $CANISTER_ID get_registered_tokens --network ic
```

### Option 3: Install Code Directly (Advanced)

```bash
# Install new WASM code
dfx canister install $CANISTER_ID --network ic --mode upgrade --wasm .dfx/ic/canisters/icp_subaccount_indexer/icp_subaccount_indexer.wasm
```

## Post-Upgrade Verification

After any upgrade, run these commands to verify everything is working:

```bash
# 1. Check registered tokens
dfx canister call $CANISTER_ID get_registered_tokens --network ic

# 2. Check next block positions
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { ICP })' --network ic
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKUSDC })' --network ic
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKUSDT })' --network ic
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKBTC })' --network ic

# 3. Check interval and webhook
dfx canister call $CANISTER_ID get_interval --network ic
dfx canister call $CANISTER_ID get_webhook_url --network ic

# 4. Check recent transactions
dfx canister call $CANISTER_ID list_transactions '(opt 5)' --network ic
```

## Common Patterns

### Complete Token Status Check

```bash
# Check all tokens' next block positions
for token in ICP CKUSDC CKUSDT CKBTC; do
  echo "Checking $token:"
  dfx canister call $CANISTER_ID get_token_next_block_query "(variant { $token })" --network ic
done
```

### Pre-Deployment Verification

```bash
# Run these commands to verify canister state
dfx canister call $CANISTER_ID get_registered_tokens --network ic
dfx canister call $CANISTER_ID get_all_token_blocks --network ic
dfx canister call $CANISTER_ID get_interval --network ic
dfx canister call $CANISTER_ID get_webhook_url --network ic
dfx canister call $CANISTER_ID get_transactions_count --network ic
```

### Testing Webhook Integration

```bash
# Set webhook URL for testing
dfx canister call $CANISTER_ID set_webhook_url '("https://your-ngrok-url.ngrok.io/webhook")' --network ic

# Verify it's set
dfx canister call $CANISTER_ID get_webhook_url --network ic
```

### Emergency Interval Adjustment

```bash
# Fast polling for testing/debugging (30 seconds)
dfx canister call $CANISTER_ID set_interval '(30 : nat64)' --network ic

# ALWAYS restore to production after testing (500 seconds)
dfx canister call $CANISTER_ID set_interval '(500 : nat64)' --network ic
```

### Reset Token Block Positions (If Needed)

```bash
# Reset all tokens to current ledger tips
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKUSDC }, 407027 : nat64)' --network ic
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKUSDT }, 580392 : nat64)' --network ic
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKBTC }, 2811077 : nat64)' --network ic
```

## Token Type Variants

When using TokenType in commands, use one of these variants:

- `variant { ICP }`
- `variant { CKUSDC }`
- `variant { CKUSDT }`
- `variant { CKBTC }`

## Token Ledger Canister IDs

For reference:

- **ICP**: `ryjl3-tyaaa-aaaaa-aaaba-cai`
- **ckUSDC**: `xevnm-gaaaa-aaaar-qafnq-cai`
- **ckUSDT**: `cngnf-vqaaa-aaaar-qag4q-cai`
- **ckBTC**: `mxzaz-hqaaa-aaaar-qaada-cai`

## Notes

- All query functions are read-only and don't consume cycles
- Update functions modify state and consume cycles
- Always verify token registration before attempting sweeps
- Use appropriate intervals: 30s for testing, 500s for production
- Transaction hashes should be in hex format
- Principal IDs should be in textual format
- Keep backup of important state before major operations
- Production interval should be 500 seconds to manage cycle consumption
