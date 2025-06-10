# DEVNET DEBUGGING GUIDE

This guide documents the complete process for debugging and testing your personal ICP Subaccount Indexer canister on devnet (mainnet), based on real debugging sessions and the testnet debugging procedures.

## Overview

The ICP Subaccount Indexer canister can get stuck processing blocks, especially when dealing with archived blocks or when there's a large gap between the current `next_block` and the actual ledger tip. This guide shows how to diagnose and fix these issues specifically for devnet deployments.

## Environment Setup

### Devnet Configuration

**Devnet** is your individual developer testing environment on mainnet:

- **Configuration**: `canister_ids.json`
- **Identity**: `dfx identity default` (or your preferred development identity)
- **Principal**: Your own principal from `dfx identity get-principal`
- **Purpose**: Development testing with real mainnet conditions
- **Ownership**: You own and control the canister completely

**Important**: You are responsible for cycle management on your devnet canister!

### Identity Setup

For devnet debugging:

```bash
# Use your default identity (or preferred development identity)
dfx identity use default

# Get your principal (needed for authorization)
dfx identity get-principal
# Example output: gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe

# Suppress DFX mainnet security warnings (for development)
export DFX_WARNING=-mainnet_plaintext_identity
```

### Current Reference Data (as of October 2025)

**Devnet Canister State:**

- **Canister ID**: `y3hne-ryaaa-aaaag-aucea-cai`
- **Principal**: `gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe`
- **Current next_block**: `15,954,744` (reset to match testnet)
- **Interval**: `500` seconds (production optimal)
- **Cycles**: `364B` cycles (healthy)
- **Status**: Running

**Ledger Reference (October 2025):**

- **Current tip**: ~`24,700,138`
- **Non-archived range**: Starts at ~`24,699,000`
- **Archived blocks**: Everything before ~`24,699,000`

## Prerequisites

- DFX CLI installed and configured
- Your own deployed devnet canister with correct principal as controller
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
Move the `next_block` to a safe position, either:

1. Match testnet position for consistency
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

**Solution:**

1. Verify correct identity: `dfx identity whoami`
2. Suppress security warnings: `export DFX_WARNING=-mainnet_plaintext_identity`
3. Switch identity if needed: `dfx identity use <YOUR_IDENTITY>`

## Step-by-Step Debugging Process

### 1. Initial Setup and Diagnosis

Set up environment and check canister state:

```bash
# Set up environment
export DFX_WARNING=-mainnet_plaintext_identity
dfx identity use default  # or your preferred identity

# Get your devnet canister ID
CANISTER_ID=$(cat canister_ids.json | jq -r '.icp_subaccount_indexer.ic')
echo "Devnet Canister ID: $CANISTER_ID"

# Verify identity and principal
dfx identity whoami
dfx identity get-principal
```

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

This will show:

- `chain_length`: Current ledger tip
- `first_block_index`: Start of non-archived range
- Compare with your `next_block` to see if you're in archived range

### 3. Align with Testnet (Recommended)

For consistency with the shared staging environment:

```bash
# Switch to testnet identity to check reference values
dfx identity use testnet_custodian

# Get testnet canister ID and current state
TESTNET_CANISTER_ID=$(cat test_canister_ids.json | jq -r '.icp_subaccount_indexer.ic')
TESTNET_NEXT_BLOCK=$(dfx canister call $TESTNET_CANISTER_ID get_next_block --network ic)

# Switch back to your identity
dfx identity use default

# Set your devnet to match testnet
# Extract the number from the testnet response (e.g., 15954744)
dfx canister call $CANISTER_ID set_next_block '(15954744 : nat64)' --network ic
```

### 4. Alternative: Reset to Non-Archived Range

If you prefer to process the latest blocks:

```bash
# Save current values first
ORIGINAL_NEXT_BLOCK=$(dfx canister call $CANISTER_ID get_next_block --network ic | grep -o '[0-9]*')
echo "Original next_block: $ORIGINAL_NEXT_BLOCK"

# Move to current non-archived range (use first_block_index from ledger query)
dfx canister call $CANISTER_ID set_next_block '(24699000 : nat64)' --network ic
```

### 5. Enable Fast Testing Mode (Temporary)

For testing new transactions:

```bash
# Set fast polling for testing (30 seconds) - COSTLY! Use only for testing
dfx canister call $CANISTER_ID set_interval '(30 : nat64)' --network ic
```

**⚠️ WARNING**: Fast polling is very expensive in cycles. Use only for short testing periods!

### 6. Monitor Progress

```bash
# Monitor next_block advancement
echo "=== Check 1 ===" && dfx canister call $CANISTER_ID get_next_block --network ic
sleep 60
echo "=== Check 2 ===" && dfx canister call $CANISTER_ID get_next_block --network ic

# Check for new transactions
dfx canister call $CANISTER_ID list_transactions '(opt 5)' --network ic
```

### 7. Test New Transactions

With fast polling enabled:

1. Send a test transaction to one of the canister's subaccounts
2. Wait 30-60 seconds
3. Check for new transactions:

```bash
dfx canister call $CANISTER_ID list_transactions '(opt 5)' --network ic
```

### 8. Restore Production Settings

**CRITICAL: Always restore production settings after testing to prevent cycle waste!**

```bash
# Restore production interval (500 seconds)
dfx canister call $CANISTER_ID set_interval '(500 : nat64)' --network ic

# Verify settings
dfx canister call $CANISTER_ID get_interval --network ic
dfx canister call $CANISTER_ID get_next_block --network ic
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

## Cycle Management

### Monitoring Cycles

```bash
# Check current cycles
dfx canister status $CANISTER_ID --network ic

# Check daily burn rate
# Look for "Idle cycles burned per day" in the status output
```

### Adding Cycles

```bash
# Add cycles if running low (200B cycles recommended minimum buffer)
dfx canister deposit-cycles 200000000000 $CANISTER_ID --network ic
```

### Cost Optimization

- **Production interval**: 500 seconds (optimal balance)
- **Testing interval**: 30-60 seconds (use sparingly)
- **Emergency interval**: 15 seconds (only for urgent debugging)

**Rule of thumb**: Each polling cycle costs cycles for inter-canister calls. Balance detection speed with operational costs.

## Production Recommendations

### Optimal Settings

- **Interval**: `500` seconds (8+ minutes)

  - Balances cost efficiency with reasonable detection time
  - Tested and proven on both testnet and devnet

- **Next Block Management**:

  - Keep aligned with testnet for consistency
  - OR stay within ~1000 blocks of ledger tip for latest data
  - Monitor regularly to ensure no archival issues

- **Cycle Buffer**: Maintain at least 200B cycles buffer

### Regular Monitoring

Set up regular monitoring to check:

```bash
# Check if canister is advancing (run periodically)
dfx canister call $CANISTER_ID get_next_block --network ic

# Check recent activity
dfx canister call $CANISTER_ID get_transactions_count --network ic

# Check cycle health
dfx canister status $CANISTER_ID --network ic
```

## Troubleshooting Common Errors

### "Method not found" errors

- You're using an older canister version
- Some methods may not be available
- Check the actual DID file for available methods

### "Unauthorized" errors

- Wrong identity/principal
- Verify current identity: `dfx identity whoami`
- Check if your principal is the controller: `dfx canister info $CANISTER_ID --network ic`

### "The default identity is not stored securely" warnings

- Set environment variable: `export DFX_WARNING=-mainnet_plaintext_identity`
- This suppresses the warning for development use

### Canister not advancing blocks

1. Check if stuck on archived blocks (see Section 3)
2. Verify interval is reasonable (not too slow)
3. Check canister cycles/health
4. Consider aligning with testnet position

### No webhook notifications

1. Verify webhook URL is correctly set
2. Test webhook endpoint manually
3. Check if transactions are being detected first

## Real Example from Recent Reset

**Issue**: Devnet canister stuck at block 24,491,714, testnet at 15,954,744
**Ledger tip**: 24,700,138 (devnet was 208k blocks behind in archived range)

**Solution Applied**:

1. Checked testnet position: 15,954,744
2. Reset devnet to match testnet: `set_next_block '(15954744 : nat64)'`
3. Maintained production interval: 500 seconds
4. Result: Aligned environments, escaped archived blocks, optimized cycle usage

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

## Quick Reference Commands

```bash
# Environment setup
export DFX_WARNING=-mainnet_plaintext_identity
dfx identity use default
CANISTER_ID=$(cat canister_ids.json | jq -r '.icp_subaccount_indexer.ic')

# Health check
dfx canister status $CANISTER_ID --network ic
dfx canister call $CANISTER_ID get_interval --network ic
dfx canister call $CANISTER_ID get_next_block --network ic

# Align with testnet
dfx identity use testnet_custodian
TESTNET_NEXT=$(dfx canister call $(cat test_canister_ids.json | jq -r '.icp_subaccount_indexer.ic') get_next_block --network ic | grep -o '[0-9]*')
dfx identity use default
dfx canister call $CANISTER_ID set_next_block '('$TESTNET_NEXT' : nat64)' --network ic

# Production settings
dfx canister call $CANISTER_ID set_interval '(500 : nat64)' --network ic
```

---

**Note**: This guide is based on debugging sessions with devnet canister `y3hne-ryaaa-aaaag-aucea-cai` using identity `default` and principal `gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe`. Adapt the commands and values for your specific setup.
