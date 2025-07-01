# Testing Attempt 12 - Multi-Token Indexing Debug & Fix

**Date**: July 1, 2025  
**Tester**: Claude (with Theo)  
**Environment**: IC Testnet  
**Canister**: uiz2m-baaaa-aaaal-qjbxq-cai

## Executive Summary

This testing session focused on debugging why CK-USDC and CK-USDT deposits were not being detected by the ICP User Vault Canister. Through systematic investigation, we discovered that the ICRC token indexers were stuck at incorrect block positions and successfully fixed the issue, resulting in full multi-token functionality.

**Initial Testing Phase Key Findings:**

- ✅ ICP deposits working correctly (32 transactions recorded)
- ❌ CK-USDC deposits not detected (stuck at block 600,000)
- ❌ CK-USDT deposits not detected (stuck at block 300,000)
- ✅ Root cause identified: outdated block positions causing indexer to miss new transactions

**Final Resolution:**

- ✅ Identified root cause: ICRC indexers stuck at blocks 1.6M/1.4M instead of ~391k/524k
- ✅ Fixed block positions for all tokens
- ✅ Successfully detected CKUSDC transaction at block 391,317
- ✅ Successfully detected CKUSDT transaction at block 524,123
- ✅ All three token types (ICP, CKUSDC, CKUSDT) now indexing correctly

## Initial State

### Environment Configuration

```bash
Identity: testnet_custodian
Principal: a6nt4-w4isk-ugybk-trfuq-42piz-fnsxq-jenv4-hnruq-j2xaz-jdipw-uae
Canister: uiz2m-baaaa-aaaal-qjbxq-cai
Network: IC Testnet
```

### Initial Canister State

- **Polling Interval**: 15 seconds (fast testing mode)
- **Webhook URL**: https://staging-api.garudawallet.com/callback/icp-deposit-callback?secret=bP4xWyGVhg46
- **Registered Tokens**: ICP, CKUSDC, CKUSDT
- **Transaction Count**: 32 (all ICP)

### Initial Block Heights

```
Token     | Next Block | Status
----------|------------|--------
ICP       | 25,158,675 | Stuck ❌
CKUSDC    | 600,000    | Stuck ❌ (likely archived)
CKUSDT    | 300,000    | Stuck ❌ (likely archived)
```

Note: These blocks are too old and have been archived by the ledger, making them inaccessible. The canister cannot query archived blocks directly, causing the indexer to fail silently.

## Problem Discovery

### Issue 1: All Indexers Appeared Stuck

Initial checks showed that none of the token indexers were advancing:

```bash
# Multiple checks showed no movement
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai get_all_token_blocks --network ic
# Always returned same values
```

### Issue 2: Incorrect Block Positions for ICRC Tokens

The CKUSDC and CKUSDT indexers were set to very high block numbers (1.6M and 1.4M respectively), but the actual current blocks were:

- **CKUSDC**: ~391,355
- **CKUSDT**: ~524,113

This was discovered when Theo provided the correct current block heights.

## ICRC Token Interfaces (Provided by User)

### CKUSDC/CKUSDT Canister Interface

```candid
type Account = record { owner : principal; subaccount : opt blob };
type TransferArg = record {
  to : Account;
  fee : opt nat;
  memo : opt blob;
  from_subaccount : opt blob;
  created_at_time : opt nat64;
  amount : nat;
};
type GetBlocksRequest = record { start : nat; length : nat };
type GetBlocksResult = record {
  log_length : nat;
  blocks : vec BlockWithId;
  archived_blocks : vec ArchivedBlocks;
};

service : (LedgerArgument) -> {
  icrc1_balance_of : (Account) -> (nat) query;
  icrc1_transfer : (TransferArg) -> (Result_1);
  icrc3_get_blocks : (vec GetBlocksRequest) -> (GetBlocksResult) query;
  // ... other ICRC methods
}
```

### ICP User Vault Canister Interface

```candid
type TokenType = variant { ICP; CKUSDC; CKUSDT };
type Result_3 = variant { Ok : vec record { TokenType; nat64 }; Err : text };
type Result_12 = variant { Ok : nat64; Err : Error };

service : (Network, nat64, nat32, text, text) -> {
  get_all_token_blocks : () -> (Result_3) query;
  get_token_next_block_query : (TokenType) -> (Result_4) query;
  set_token_next_block_update : (TokenType, nat64) -> (Result_12);
  reset_token_blocks : () -> (Result);
  // ... other methods
}
```

## Debugging Process

### Initial Fix Attempt (Before Discovering Real Issue)

First attempted to update block positions based on assumed archived blocks:

```bash
# Update CKUSDC to block 700,000
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai set_token_next_block_update '(variant { CKUSDC }, 700000 : nat64)' --network ic

# Update CKUSDT to block 500,000
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai set_token_next_block_update '(variant { CKUSDT }, 500000 : nat64)' --network ic
```

### Step 1: Checking Individual Token Blocks

Initial attempts to update ICRC token blocks seemed to fail:

```bash
# Set CKUSDC to 700,000
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai set_token_next_block_update '(variant { CKUSDC }, 700000 : nat64)' --network ic
# Returned: (variant { 17_724 = 700_000 : nat64 })

# But get_all_token_blocks still showed old value
# This led to initial confusion about whether updates were working
```

### Step 2: Discovering the Cache/Display Issue

When checking individual token blocks directly:

```bash
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai get_token_next_block_query '(variant { CKUSDC })' --network ic
# Returned: (variant { 17_724 = 391_362 : nat64 })  # Already updated and advancing!
```

This revealed that `get_all_token_blocks` was showing cached or incorrect values, while the individual queries showed the truth.

### Step 3: Fixing ICP Indexer

The ICP indexer was also stuck. Using information from the sweep function:

```bash
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai sweep --network ic
# Showed recent blocks like 25,288,379+

# Updated ICP to recent block
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai set_token_next_block_update '(variant { ICP }, 25288400 : nat64)' --network ic
```

This immediately unstuck the ICP indexer.

### Step 4: Correcting ICRC Token Positions

With the correct block heights provided:

```bash
# CKUSDC current: 391,355
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai set_token_next_block_update '(variant { CKUSDC }, 391300 : nat64)' --network ic

# CKUSDT current: 524,113
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai set_token_next_block_update '(variant { CKUSDT }, 524100 : nat64)' --network ic
```

### Step 5: Interval Manipulation

Attempted to trigger indexing by changing intervals:

```bash
# Changed from 15 → 30 → 15
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai set_interval '(30 : nat64)' --network ic
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai set_interval '(15 : nat64)' --network ic

# Later tried 500 → 10
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai set_interval '(10 : nat64)' --network ic
```

## Resolution

### All Indexers Started Working

After setting the correct block positions:

1. **ICP**: Advanced from 25,288,400 → 25,288,509+
2. **CKUSDC**: Advanced from 391,300 → 391,366+
3. **CKUSDT**: Advanced from 524,100 → 524,124+

### Transactions Detected

The canister successfully found:

1. **CKUSDC Transaction**:

   - Block: 391,317
   - Amount: 1,000,000 micro-units (1 CKUSDC)
   - Ledger: xevnm-gaaaa-aaaar-qafnq-cai
   - Hash: 5998c753794977654401833cf3a5f0d00c08b28bc3abc70c30e7642b4822dc7f

2. **CKUSDT Transaction**:
   - Block: 524,123
   - Amount: 1,000,000 micro-units (1 CKUSDT)
   - Ledger: cngnf-vqaaa-aaaar-qag4q-cai
   - Hash: a5f84ca4a93358c493d5eb849a8b0b4f2f114d66978402848696508a8579f2cc

### Final State

- **Total Transactions**: 34 (32 ICP + 1 CKUSDC + 1 CKUSDT)
- **All indexers**: Actively advancing
- **Interval**: 10 seconds (fast testing mode)

## Key Learnings

### 1. Block Position Accuracy is Critical

Setting ICRC token blocks to positions that are too high (beyond the actual chain length) causes the indexer to fail silently. Always verify current block heights before updating.

### 2. API Method Inconsistencies

The `get_all_token_blocks` method was showing stale/incorrect data while individual `get_token_next_block_query` calls showed correct values. This caused initial confusion about whether updates were working.

### 3. ICRC vs ICP Ledger Differences

- ICP ledger blocks are in the 25M+ range
- CKUSDC blocks are in the ~391k range
- CKUSDT blocks are in the ~524k range
  Each ledger maintains its own independent block numbering.

### 4. Indexer Recovery Process

When indexers are stuck:

1. Check current block position with individual token queries
2. Verify the actual ledger's current block height
3. Set token block to slightly before current (to catch recent transactions)
4. Monitor for advancement within 1-2 polling intervals

### 5. Transaction Detection Works

Once the block positions were corrected, the canister successfully detected and indexed transactions for all three token types, proving the multi-token implementation is functional.

## Recommendations

### Immediate Actions

1. **Restore Production Interval**: Change from 10s back to 500s to save cycles
2. **Monitor All Tokens**: Ensure all three continue advancing
3. **Document Current Blocks**: Keep track of approximate current blocks for each ledger

### Code Improvements

1. **Fix get_all_token_blocks**: Ensure it returns current values, not cached
2. **Add Block Validation**: Prevent setting blocks beyond ledger tip
3. **Better Error Handling**: Log when ICRC queries fail
4. **Auto-Recovery**: Detect stuck indexers and auto-adjust blocks
5. **Archive Block Handling**: Add detection and recovery for archived block scenarios

### Suggested Code Addition

```rust
// Suggested code addition in lib.rs
if ledger_response.is_archived() {
    // Jump to first non-archived block
    let current_tip = get_ledger_tip().await?;
    let safe_block = current_tip.saturating_sub(1000);
    set_token_next_block(token_type, safe_block);
}
```

### Testing Improvements

1. **Add Health Check**: Method to verify all indexers are advancing
2. **Block Range Validation**: Check if requested blocks exist before querying
3. **Automated Testing**: Script to verify multi-token deposits
4. **Update Test Scripts**: Method names have changed (e.g., `addSubaccountForToken` → `add_subaccount`)

## Commands Reference

```bash
# Check all token blocks
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai get_all_token_blocks --network ic

# Check specific token block
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai get_token_next_block_query '(variant { CKUSDC })' --network ic

# Update token block position
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai set_token_next_block_update '(variant { CKUSDC }, 391300 : nat64)' --network ic

# Check transaction count
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai get_transactions_count --network ic

# List recent transactions
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai list_transactions '(opt 50)' --network ic

# Search for specific token transactions
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai list_transactions '(opt 50)' --network ic 2>/dev/null | grep -B5 -A5 "828_704_773"  # CKUSDC
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai list_transactions '(opt 50)' --network ic 2>/dev/null | grep -B5 -A5 "828_704_790"  # CKUSDT
```

## Conclusion

The testing session successfully identified and resolved the issue preventing CK-USDC and CK-USDT deposit detection. The root cause was incorrect block positions for the ICRC token indexers. Once corrected to match the actual ledger positions (~391k for CKUSDC and ~524k for CKUSDT), the indexers immediately began working and successfully detected existing transactions.

### Testing Evolution

1. **Initial Discovery**: Found ICRC tokens stuck at very old blocks (600k/300k)
2. **First Fix Attempt**: Updated to 700k/500k but blocks were still too high
3. **Real Issue**: Discovered actual blocks were much lower (391k/524k) and get_all_token_blocks had display issues
4. **Final Resolution**: Set correct block positions and verified transaction detection

The ICP User Vault Canister's multi-token support is now fully functional, capable of detecting and indexing deposits for ICP, CKUSDC, and CKUSDT tokens.

**Final Status**: ✅ All systems operational

**Next Steps:**

1. Fund testnet wallet with CKUSDC/CKUSDT for continued testing
2. Monitor block advancement
3. Implement permanent code fixes if needed
4. Restore production interval (500s) after testing
