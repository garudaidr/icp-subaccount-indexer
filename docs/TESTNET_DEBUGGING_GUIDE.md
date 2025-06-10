# TESTNET DEBUGGING GUIDE

This guide documents the complete process for debugging and testing the ICP Subaccount Indexer canister on testnet/mainnet, based on real debugging session from June 10, 2025.

## Overview

The ICP Subaccount Indexer canister can get stuck processing blocks, especially when dealing with archived blocks or when there's a large gap between the current `next_block` and the actual ledger tip. This guide shows how to diagnose and fix these issues.

## Environment Setup

### Testnet vs Devnet

This project has two main environments for testing deployed canisters:

- **Testnet/Staging**: Shared staging environment

  - Configuration: `testnet_canister_ids.json` (if it exists) or `test_canister_ids.json`
  - Identity: `dfx identity testnet_custodian`
  - Principal: Use `dfx identity get-principal` after switching to testnet_custodian
  - Purpose: Staging environment for final testing before production

- **Devnet**: Individual developer testing on mainnet
  - Configuration: `canister_ids.json`
  - Identity: `dfx identity default` (or your preferred identity)
  - Principal: Each developer deploys their own canister
  - Purpose: Development testing with real mainnet conditions

**Important**: Both environments need cycle management! The same cost-saving rules apply to devnet testing.

### Identity Setup

For testnet debugging:

```bash
# Switch to testnet custodian identity
dfx identity use testnet_custodian

# Get the principal (needed for authorization)
dfx identity get-principal
# Example output: a6nt4-w4isk-ugybk-trfuq-42piz-fnsxq-jenv4-hnruq-j2xaz-jdipw-uae

# Suppress DFX mainnet security warnings
export DFX_WARNING=-mainnet_plaintext_identity
```

For devnet debugging:

```bash
# Use your default identity (or preferred development identity)
dfx identity use default

# Get your principal
dfx identity get-principal
# Example: gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe

# Suppress DFX mainnet security warnings
export DFX_WARNING=-mainnet_plaintext_identity
```

### Current Reference Data (as of October 2025)

**Testnet Canister State:**

- **Canister ID**: `uiz2m-baaaa-aaaal-qjbxq-cai`
- **Identity**: `testnet_custodian`
- **Principal**: `a6nt4-w4isk-ugybk-trfuq-42piz-fnsxq-jenv4-hnruq-j2xaz-jdipw-uae`
- **Current next_block**: `15,954,744`
- **Interval**: `500` seconds (production optimal)
- **Purpose**: Shared staging environment

**Devnet Reference:**

- **Canister ID**: `y3hne-ryaaa-aaaag-aucea-cai` (example)
- **Identity**: `default`
- **Principal**: `gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe` (example)
- **Current next_block**: `15,954,744` (aligned with testnet)

**Ledger Reference (October 2025):**

- **Current tip**: ~`24,700,138`
- **Non-archived range**: Starts at ~`24,699,000`
- **Archived blocks**: Everything before ~`24,699,000`

## Prerequisites

- DFX CLI installed and configured
- Access to testnet canister with custodian privileges (for testnet) OR your own deployed canister (for devnet)
- Basic understanding of ICP ledger block structure
- Correct identity configured (see Environment Setup above)

## Common Issues and Solutions

### Issue 1: Canister Stuck on Archived Blocks

**Symptoms:**

- `get_next_block` returns a value but doesn't advance over time
- No new transactions are detected despite fast polling intervals
- Canister appears "frozen" at a specific block number

**Root Cause:**
The canister is trying to process archived blocks, but the old canister version cannot query archived blocks properly.

**Solution:**
Move the `next_block` to the current non-archived range.

### Issue 2: Slow Transaction Detection

**Symptoms:**

- New transactions take too long to appear in `list_transactions`
- Webhook notifications are delayed
- Real-time testing is difficult

**Root Cause:**
Polling interval is too slow for testing purposes.

**Solution:**
Temporarily reduce the polling interval for testing, then restore to production values.

## Step-by-Step Debugging Process

### 1. Initial Diagnosis

First, ensure you're using the correct identity and canister ID:

```bash
# Set up environment (suppress DFX warnings)
export DFX_WARNING=-mainnet_plaintext_identity

# For testnet: Switch identity and get canister ID
dfx identity use testnet_custodian
CANISTER_ID=$(cat test_canister_ids.json | jq -r '.icp_subaccount_indexer.ic')
echo "Testnet Canister ID: $CANISTER_ID"

# For devnet: Switch identity and get canister ID
dfx identity use default
CANISTER_ID=$(cat canister_ids.json | jq -r '.icp_subaccount_indexer.ic')
echo "Devnet Canister ID: $CANISTER_ID"

# Verify you're using the correct identity
dfx identity whoami
dfx identity get-principal
```

Then check the current state of the canister:

```bash
# Check current interval (should be reasonable for production, like 300-500 seconds)
dfx canister call $CANISTER_ID get_interval --network ic

# Check current next block position
dfx canister call $CANISTER_ID get_next_block --network ic

# Check current ledger tip to understand the gap
dfx canister call ryjl3-tyaaa-aaaaa-aaaba-cai query_blocks '(record { start = 0 : nat64; length = 1 : nat64 })' --network ic

# Check recent transactions
dfx canister call $CANISTER_ID list_transactions '(opt 10)' --network ic
```

### 2. Check Canister Health

```bash
# Verify canister is operational
dfx canister call $CANISTER_ID canister_status --network ic

# Check if you have the right identity/custodian access
dfx identity get-principal
dfx canister info $CANISTER_ID --network ic

# Check cycles status (important for both testnet and devnet!)
dfx canister status $CANISTER_ID --network ic
```

### 3. Fix Archived Block Issue (if needed)

If the `next_block` is far behind the current ledger tip (more than ~1000 blocks), the canister might be stuck on archived blocks.

**IMPORTANT: Save original values before making changes!**

```bash
# Save current values for later restoration
ORIGINAL_NEXT_BLOCK=$(dfx canister call $CANISTER_ID get_next_block --network ic | grep -o '[0-9]*')
ORIGINAL_INTERVAL=$(dfx canister call $CANISTER_ID get_interval --network ic | grep -o '[0-9]*')

echo "Original next_block: $ORIGINAL_NEXT_BLOCK"
echo "Original interval: $ORIGINAL_INTERVAL"
```

**Check if blocks are archived:**

```bash
# Try to query blocks at current next_block position
dfx canister call ryjl3-tyaaa-aaaaa-aaaba-cai query_blocks '(record { start = $ORIGINAL_NEXT_BLOCK : nat64; length = 10 : nat64 })' --network ic
```

If the response shows `archived_blocks` instead of `blocks`, the canister is stuck on archived blocks.

**Fix by moving to non-archived range:**

```bash
# Get current ledger info to find first_block_index
CURRENT_CHAIN_INFO=$(dfx canister call ryjl3-tyaaa-aaaaa-aaaba-cai query_blocks '(record { start = 0 : nat64; length = 1 : nat64 })' --network ic)

# Extract first_block_index from the response (usually around chain_length - 1000)
# Set next_block to first_block_index to skip archived blocks
dfx canister call $CANISTER_ID set_next_block '(<FIRST_BLOCK_INDEX> : nat64)' --network ic
```

### 4. Enable Fast Testing Mode

For testing new transactions, temporarily speed up the polling:

```bash
# Set fast polling for testing (15 seconds) - COSTLY! Use only for testing
dfx canister call $CANISTER_ID set_interval '(15 : nat64)' --network ic
```

**⚠️ WARNING**: Fast polling (15 seconds) is very expensive in cycles. Use only for short testing periods on both testnet AND devnet!

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
2. Wait 15-30 seconds
3. Check for new transactions:

```bash
dfx canister call $CANISTER_ID list_transactions '(opt 5)' --network ic
```

### 7. Restore Production Settings

**CRITICAL: Always restore production settings after testing to prevent cycle waste!**

```bash
# Restore production interval (usually 300-500 seconds for production)
dfx canister call $CANISTER_ID set_interval '(500 : nat64)' --network ic

# If you moved next_block for testing, consider leaving it at the advanced position
# OR restore to original if needed for your use case
dfx canister call $CANISTER_ID set_next_block '($ORIGINAL_NEXT_BLOCK : nat64)' --network ic
```

**This step is crucial for both testnet AND devnet to prevent unnecessary cycle consumption!**

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

  - Balances cost efficiency with reasonable detection time
  - 300s for more responsive detection
  - 500s for maximum cost efficiency

- **Next Block Management**:
  - Keep close to ledger tip (within ~1000 blocks)
  - Monitor regularly to ensure no archival issues

### Monitoring

Set up regular monitoring to check:

```bash
# Check if canister is advancing (run periodically)
dfx canister call <CANISTER_ID> get_next_block --network ic

# Check recent activity
dfx canister call <CANISTER_ID> get_transactions_count --network ic
```

## Troubleshooting Common Errors

### "Method not found" errors

- You're using an older canister version
- Some methods may not be available
- Check the actual DID file for available methods

### "Unauthorized" errors

- Wrong identity/principal
- Switch to correct custodian identity: `dfx identity use <CUSTODIAN_IDENTITY>`

### Canister not advancing blocks

1. Check if stuck on archived blocks (see Section 3)
2. Verify interval is reasonable (not too slow)
3. Check canister cycles/health

### No webhook notifications

1. Verify webhook URL is correctly set
2. Test webhook endpoint manually
3. Check if transactions are being detected first

## Real Example from Debugging Session

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

## Cost Considerations

- **Fast polling (15s)**: Use only for testing, very expensive
- **Medium polling (60-120s)**: Suitable for development/staging
- **Slow polling (300-500s)**: Optimal for production

**Rule of thumb**: Each polling cycle makes inter-canister calls to the ICP ledger, which costs cycles. Balance detection speed with operational costs.

## Emergency Recovery

If you accidentally leave the canister in fast polling mode:

```bash
# Immediately restore reasonable interval
dfx canister call <CANISTER_ID> set_interval '(500 : nat64)' --network ic
```

If the canister runs out of cycles due to excessive polling, you'll need to add cycles before it can respond to calls.

---

**Note**: This guide is based on debugging session with testnet canister `uiz2m-baaaa-aaaal-qjbxq-cai` using identity `testnet_custodian` on June 10, 2025. The same principles apply to devnet canisters using `dfx identity default`. Adapt the commands and values for your specific setup.

## Environment-Specific Notes

### Testnet (test_canister_ids.json)

- Use `dfx identity testnet_custodian`
- Shared staging environment - coordinate with team
- Principal: `a6nt4-w4isk-ugybk-trfuq-42piz-fnsxq-jenv4-hnruq-j2xaz-jdipw-uae` (example from debugging session)

### Devnet (canister_ids.json)

- Use `dfx identity default` or your preferred development identity
- Individual developer environment - you own the canister
- Principal: Your own principal from `dfx identity get-principal`
- Remember to manage cycles on your own canister
