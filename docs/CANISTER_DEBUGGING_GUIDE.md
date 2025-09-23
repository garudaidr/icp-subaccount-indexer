# CANISTER DEBUGGING GUIDE

This comprehensive guide covers debugging and testing the ICP Subaccount Indexer canister in both **testnet** (shared staging) and **devnet** (individual development) environments. Both environments run identical canister code but have different identity management and ownership models.

## Overview

The ICP Subaccount Indexer canister can get stuck processing blocks, especially when dealing with archived blocks or when there's a large gap between the current `next_block` and the actual ledger tip. This guide shows how to diagnose and fix these issues across both environments.

## Environment Comparison

| Aspect                  | Testnet (Staging)               | Devnet (Individual)        |
| ----------------------- | ------------------------------- | -------------------------- |
| **Configuration**       | `test_canister_ids.json`        | `canister_ids.json`        |
| **Operations Identity** | `testnet_custodian`             | `default` (or preferred)   |
| **Upgrade Identity**    | `STAGING_DEPLOYER`              | Same as operations         |
| **Ownership**           | Shared team environment         | Individual developer owned |
| **Coordination**        | Coordinate with team            | Full control               |
| **Cycle Management**    | Shared responsibility           | Your responsibility        |
| **Purpose**             | Final staging before production | Development testing        |

### Reference Canister Data

**Testnet:**

- **Canister ID**: `uiz2m-baaaa-aaaal-qjbxq-cai`
- **Operations Principal**: `a6nt4-w4isk-ugybk-trfuq-42piz-fnsxq-jenv4-hnruq-j2xaz-jdipw-uae`
- **Controller Principal**: `pztcx-5wpjw-ko6rv-3cjff-466eb-4ywbn-a5jww-rs6yy-ypk4a-ceqfb-nqe`

**Devnet:**

- **Canister ID**: `y3hne-ryaaa-aaaag-aucea-cai`
- **Principal**: `gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe`

## Environment Setup

### Testnet Setup

```bash
# Set environment variables
export DFX_WARNING=-mainnet_plaintext_identity

# Switch to testnet custodian identity for operations
dfx identity use testnet_custodian

# Get canister ID
CANISTER_ID=$(cat test_canister_ids.json | jq -r '.icp_subaccount_indexer.ic')
echo "Testnet Canister ID: $CANISTER_ID"

# Verify identity and principal
dfx identity whoami
dfx identity get-principal
```

**⚠️ Important for Testnet**: Use `STAGING_DEPLOYER` identity ONLY for canister upgrades, never for operations.

### Devnet Setup

```bash
# Set environment variables
export DFX_WARNING=-mainnet_plaintext_identity

# Use your default identity (or preferred development identity)
dfx identity use default

# Get canister ID
CANISTER_ID=$(cat canister_ids.json | jq -r '.icp_subaccount_indexer.ic')
echo "Devnet Canister ID: $CANISTER_ID"

# Verify identity and principal
dfx identity whoami
dfx identity get-principal
```

## Prerequisites

- DFX CLI installed and configured
- Access to appropriate canister (testnet custodian privileges OR your own devnet canister)
- Basic understanding of ICP ledger block structure
- Correct identity configured (see Environment Setup above)

## Common Issues and Solutions

### Issue 1: Canister Stuck on Archived Blocks

**Symptoms:**

- `get_next_block` returns a value but doesn't advance over time
- No new transactions are detected despite fast polling intervals
- Canister appears "frozen" at a specific block number

**Root Cause:**
The canister is trying to process archived blocks, but queries to archived blocks are expensive and slow.

**Solution:**
Move the `next_block` to a safe position:

1. Match testnet position for consistency (recommended for devnet)
2. Move to current non-archived range for latest data

### Issue 2: Slow Transaction Detection

**Symptoms:**

- New transactions take too long to appear in `list_transactions`
- Webhook notifications are delayed
- Real-time testing is difficult

**Root Cause:**
Polling interval is too slow for testing purposes.

**Solution:**
Temporarily reduce the polling interval for testing, then restore to production values.

### Issue 3: Identity/Authorization Errors

**Symptoms:**

- "Unauthorized" errors when calling canister methods
- "The default identity is not stored securely" warnings

**Root Cause:**
Wrong identity or DFX security warnings for mainnet usage.

**Solutions:**

1. Verify correct identity: `dfx identity whoami`
2. Suppress security warnings: `export DFX_WARNING=-mainnet_plaintext_identity`
3. Switch identity if needed: `dfx identity use <CORRECT_IDENTITY>`

## Step-by-Step Debugging Process

### 1. Initial Diagnosis

Check current canister state:

```bash
# Check canister health and cycles
dfx canister status $CANISTER_ID --network ic

# Check current settings
dfx canister call $CANISTER_ID get_interval --network ic
dfx canister call $CANISTER_ID get_next_block --network ic

# Check recent transactions
dfx canister call $CANISTER_ID list_transactions '(opt 10)' --network ic
```

### 2. Check Current Ledger State

```bash
# Check current ledger tip to understand the gap
dfx canister call ryjl3-tyaaa-aaaaa-aaaba-cai query_blocks '(record { start = 0 : nat64; length = 1 : nat64 })' --network ic
```

This shows:

- `chain_length`: Current ledger tip
- `first_block_index`: Start of non-archived range
- Compare with your `next_block` to see if you're in archived range

### 3. Fix Archived Block Issue (if needed)

**IMPORTANT: Save original values before making changes!**

```bash
# Save current values for later restoration
ORIGINAL_NEXT_BLOCK=$(dfx canister call $CANISTER_ID get_next_block --network ic | grep -o '[0-9]*')
ORIGINAL_INTERVAL=$(dfx canister call $CANISTER_ID get_interval --network ic | grep -o '[0-9]*')

echo "Original next_block: $ORIGINAL_NEXT_BLOCK"
echo "Original interval: $ORIGINAL_INTERVAL"
```

**For Devnet - Align with Testnet (Recommended):**

```bash
# Switch to testnet identity to check reference values
dfx identity use testnet_custodian
TESTNET_CANISTER_ID=$(cat test_canister_ids.json | jq -r '.icp_subaccount_indexer.ic')
TESTNET_NEXT_BLOCK=$(dfx canister call $TESTNET_CANISTER_ID get_next_block --network ic | grep -o '[0-9]*')

# Switch back to your identity
dfx identity use default

# Set your devnet to match testnet
dfx canister call $CANISTER_ID set_next_block '('$TESTNET_NEXT_BLOCK' : nat64)' --network ic
```

**Alternative - Reset to Non-Archived Range:**

```bash
# Get current ledger info to find first_block_index
CURRENT_CHAIN_INFO=$(dfx canister call ryjl3-tyaaa-aaaaa-aaaba-cai query_blocks '(record { start = 0 : nat64; length = 1 : nat64 })' --network ic)

# Extract first_block_index from the response (usually around chain_length - 1000)
# Set next_block to first_block_index to skip archived blocks
dfx canister call $CANISTER_ID set_next_block '(<FIRST_BLOCK_INDEX> : nat64)' --network ic
```

### 4. Enable Fast Testing Mode (Temporary)

For testing new transactions:

```bash
# Set fast polling for testing (15-30 seconds) - COSTLY! Use only for testing
dfx canister call $CANISTER_ID set_interval '(30 : nat64)' --network ic
```

**⚠️ WARNING**: Fast polling is very expensive in cycles. Use only for short testing periods on both testnet AND devnet!

### 5. Monitor Progress

```bash
# Monitor next_block advancement
echo "=== Check 1 ===" && dfx canister call $CANISTER_ID get_next_block --network ic
sleep 60
echo "=== Check 2 ===" && dfx canister call $CANISTER_ID get_next_block --network ic

# Check for new transactions
dfx canister call $CANISTER_ID list_transactions '(opt 5)' --network ic
```

### 6. Test New Transactions

With fast polling enabled:

1. Send a test transaction to one of the canister's subaccounts
2. Wait 30-60 seconds
3. Check for new transactions:

```bash
dfx canister call $CANISTER_ID list_transactions '(opt 5)' --network ic
```

### 7. Restore Production Settings

**CRITICAL: Always restore production settings after testing to prevent cycle waste!**

```bash
# Restore production interval (500 seconds)
dfx canister call $CANISTER_ID set_interval '(500 : nat64)' --network ic

# Verify settings
dfx canister call $CANISTER_ID get_interval --network ic
dfx canister call $CANISTER_ID get_next_block --network ic
```

## Comprehensive Command Reference

### Environment Setup Commands

```bash
# Testnet setup
export DFX_WARNING=-mainnet_plaintext_identity
dfx identity use testnet_custodian
CANISTER_ID=$(cat test_canister_ids.json | jq -r '.icp_subaccount_indexer.ic')

# Devnet setup
export DFX_WARNING=-mainnet_plaintext_identity
dfx identity use default
CANISTER_ID=$(cat canister_ids.json | jq -r '.icp_subaccount_indexer.ic')
```

### Health Check & Status

```bash
# Check canister cycles and status
dfx canister status $CANISTER_ID --network ic

# Check current configuration
dfx canister call $CANISTER_ID get_interval --network ic
dfx canister call $CANISTER_ID get_registered_tokens --network ic
dfx canister call $CANISTER_ID get_webhook_url --network ic
dfx canister call $CANISTER_ID get_custodian --network ic
```

### Multi-Token Block Management

```bash
# Check all token block positions
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { ICP })' --network ic
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKUSDC })' --network ic
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKUSDT })' --network ic
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKBTC })' --network ic
dfx canister call $CANISTER_ID get_all_token_blocks --network ic

# Update token block positions
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { ICP }, 25841200 : nat64)' --network ic
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKUSDC }, 407027 : nat64)' --network ic
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKUSDT }, 580392 : nat64)' --network ic
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKBTC }, 2811077 : nat64)' --network ic
```

### Transaction Monitoring

```bash
# Check transaction activity
dfx canister call $CANISTER_ID get_transactions_count --network ic
dfx canister call $CANISTER_ID list_transactions '(opt 10)' --network ic
dfx canister call $CANISTER_ID get_transaction '("transaction-hash-here")' --network ic
dfx canister call $CANISTER_ID get_transaction_token_type '("tx-hash")' --network ic

# Check token balances
dfx canister call $CANISTER_ID get_balance '(variant { ICP })' --network ic
dfx canister call $CANISTER_ID get_balance '(variant { CKUSDC })' --network ic
dfx canister call $CANISTER_ID get_balance '(variant { CKUSDT })' --network ic
dfx canister call $CANISTER_ID get_balance '(variant { CKBTC })' --network ic
```

### Configuration Management

```bash
# Set polling intervals
dfx canister call $CANISTER_ID set_interval '(30 : nat64)' --network ic   # Testing
dfx canister call $CANISTER_ID set_interval '(500 : nat64)' --network ic  # Production

# Webhook configuration
dfx canister call $CANISTER_ID set_webhook_url '("https://your-api.com/webhook")' --network ic
dfx canister call $CANISTER_ID get_webhook_url --network ic

# Set custodian principal
dfx canister call $CANISTER_ID set_custodian_principal '("your-principal-id")' --network ic
```

### Subaccount Operations

```bash
# Generate subaccounts
dfx canister call $CANISTER_ID add_subaccount '(opt variant { ICP })' --network ic
dfx canister call $CANISTER_ID add_subaccount '(opt variant { CKUSDC })' --network ic

# Get subaccount information
dfx canister call $CANISTER_ID get_nonce --network ic
dfx canister call $CANISTER_ID get_subaccount_count --network ic
dfx canister call $CANISTER_ID get_subaccountid '(0 : nat32, opt variant { CKUSDC })' --network ic
dfx canister call $CANISTER_ID get_icrc_account '(0 : nat32)' --network ic

# Generate specific deposit addresses
dfx canister call $CANISTER_ID generate_icp_deposit_address '(123456789 : nat32)' --network ic
dfx canister call $CANISTER_ID generate_icrc1_deposit_address '(variant { CKUSDC }, 5 : nat32)' --network ic
```

### Sweeping Operations

```bash
# Sweep tokens by type
dfx canister call $CANISTER_ID sweep_by_token_type '(variant { ICP })' --network ic
dfx canister call $CANISTER_ID sweep_by_token_type '(variant { CKUSDC })' --network ic
dfx canister call $CANISTER_ID sweep_by_token_type '(variant { CKUSDT })' --network ic

# Single transaction sweep
dfx canister call $CANISTER_ID single_sweep '("transaction-hash")' --network ic

# Sweep specific subaccount
dfx canister call $CANISTER_ID sweep_subaccount '("subaccount-id", 0.001 : float64, opt variant { ICP })' --network ic

# Set sweep status to failed
dfx canister call $CANISTER_ID set_sweep_failed '("transaction-hash")' --network ic
```

### Transaction Management

```bash
# Clear transactions (with optional limit and timestamp)
dfx canister call $CANISTER_ID clear_transactions '(opt 100, null)' --network ic
dfx canister call $CANISTER_ID refund '(12345 : nat64)' --network ic
```

### Token Management

```bash
# Register new token
dfx canister call $CANISTER_ID register_token '(variant { CKBTC }, "mxzaz-hqaaa-aaaar-qaada-cai")' --network ic

# Reset all token blocks
dfx canister call $CANISTER_ID reset_token_blocks --network ic
```

### Canister Infrastructure Management

```bash
# Check cycles and health
dfx canister status $CANISTER_ID --network ic

# Add cycles if needed (200B minimum buffer recommended)
dfx canister deposit-cycles 200000000000 $CANISTER_ID --network ic
```

### Canister Upgrades

**For Testnet (STAGING_DEPLOYER identity required):**

```bash
dfx identity use STAGING_DEPLOYER
dfx deploy $CANISTER_ID --network ic --mode upgrade
dfx identity use testnet_custodian  # Switch back for operations
```

**For Devnet (use your identity):**

```bash
dfx deploy $CANISTER_ID --network ic --mode upgrade
```

### External Ledger Queries

```bash
# Get current ledger block heights
dfx canister call ryjl3-tyaaa-aaaaa-aaaba-cai query_blocks '(record { start = 0; length = 1 })' --network ic  # ICP
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai get_blocks '(record { start = 0; length = 1 })' --network ic      # ckUSDC
dfx canister call cngnf-vqaaa-aaaar-qag4q-cai get_blocks '(record { start = 0; length = 1 })' --network ic      # ckUSDT
dfx canister call mxzaz-hqaaa-aaaar-qaada-cai get_blocks '(record { start = 0; length = 1 })' --network ic      # ckBTC
```

### Complete Diagnostic Sequence

```bash
# Run full health check
echo "=== Canister Status ==="
dfx canister status $CANISTER_ID --network ic

echo "=== Configuration ==="
dfx canister call $CANISTER_ID get_interval --network ic
dfx canister call $CANISTER_ID get_webhook_url --network ic

echo "=== Token Registration ==="
dfx canister call $CANISTER_ID get_registered_tokens --network ic

echo "=== Block Positions ==="
for token in ICP CKUSDC CKUSDT CKBTC; do
  echo "Checking $token:"
  dfx canister call $CANISTER_ID get_token_next_block_query "(variant { $token })" --network ic
done

echo "=== Transaction Activity ==="
dfx canister call $CANISTER_ID get_transactions_count --network ic
dfx canister call $CANISTER_ID list_transactions '(opt 5)' --network ic
```

## Webhook Configuration

### Setting Webhook URL

```bash
# Set webhook URL with authentication secret
dfx canister call $CANISTER_ID set_webhook_url '("https://your-api.com/callback/icp-deposit-callback?secret=YOUR_SECRET")' --network ic

# Verify webhook URL
dfx canister call $CANISTER_ID get_webhook_url --network ic
```

### Webhook Format

The canister will call your webhook as:

```
POST https://your-api.com/callback/icp-deposit-callback?secret=YOUR_SECRET&tx_hash=TRANSACTION_HASH
```

## Production Recommendations

### Optimal Settings

- **Interval**: 300-500 seconds (5-8 minutes)

  - 300s for more responsive detection
  - 500s for maximum cost efficiency
  - Tested and proven on both testnet and devnet

- **Next Block Management**:

  - Keep aligned with testnet for consistency (devnet)
  - OR stay within ~1000 blocks of ledger tip for latest data
  - Monitor regularly to ensure no archival issues

- **Cycle Buffer**: Maintain at least 200B cycles buffer

### Cost Considerations

- **Fast polling (15-30s)**: Use only for testing, very expensive
- **Medium polling (60-120s)**: Suitable for development/staging
- **Slow polling (300-500s)**: Optimal for production

**Rule of thumb**: Each polling cycle makes inter-canister calls to the ICP ledger, which costs cycles. Balance detection speed with operational costs.

## Troubleshooting Common Errors

### "Method not found" errors

- You're using an older canister version
- Some methods may not be available
- Check the actual DID file for available methods

### "Unauthorized" errors

- Wrong identity/principal
- **Testnet**: Switch to `testnet_custodian` for operations
- **Devnet**: Verify current identity matches canister controller
- Check custodian: `dfx canister call $CANISTER_ID get_custodian --network ic`

### "The default identity is not stored securely" warnings

- Set environment variable: `export DFX_WARNING=-mainnet_plaintext_identity`
- This suppresses the warning for development use

### Canister not advancing blocks

1. Check if stuck on archived blocks (see debugging steps above)
2. Verify interval is reasonable (not too slow)
3. Check canister cycles/health
4. Consider aligning devnet with testnet position

### No webhook notifications

1. Verify webhook URL is correctly set
2. Test webhook endpoint manually
3. Check if transactions are being detected first

## Real Examples from Debugging Sessions

**Issue**: Canister stuck at block 24,600,000, not detecting new transactions
**Ledger tip**: 24,698,231 (gap of ~98,000 blocks)

**Solution Applied**:

1. Discovered blocks 24,600,000 were archived
2. Moved next_block to 24,697,000 (non-archived range)
3. Set interval to 15 seconds for testing
4. Verified canister advanced 400 blocks in 30 seconds
5. Detected new transactions successfully
6. Restored interval to 500 seconds for production

**Key Learning**: Always check if the next_block position is in the archived range when debugging stuck canisters.

## Emergency Recovery

If you accidentally leave the canister in fast polling mode:

```bash
# Immediately restore reasonable interval
dfx canister call $CANISTER_ID set_interval '(500 : nat64)' --network ic
```

If the canister runs out of cycles due to excessive polling:

```bash
# Add cycles before the canister becomes unresponsive
dfx canister deposit-cycles 500000000000 $CANISTER_ID --network ic
```

## Environment-Specific Notes

### Testnet Specifics

- **Shared environment**: Coordinate with team before making changes
- **Complex identity management**: Operations vs upgrade identities
- **Upgrade restrictions**: Only `STAGING_DEPLOYER` can upgrade
- **Staging purpose**: Final testing before production

### Devnet Specifics

- **Individual ownership**: You control everything
- **Simple identity management**: One identity for all operations
- **Full control**: Deploy, upgrade, configure as needed
- **Development purpose**: Personal testing and debugging
- **Cycle responsibility**: You manage your own cycle costs
- **Alignment option**: Consider matching testnet configuration for consistency

---

**Note**: This guide consolidates debugging procedures for both testnet canister `uiz2m-baaaa-aaaal-qjbxq-cai` and devnet canister `y3hne-ryaaa-aaaag-aucea-cai`. Both run identical code but require different identity and environment management. Adapt the commands and values for your specific setup.
