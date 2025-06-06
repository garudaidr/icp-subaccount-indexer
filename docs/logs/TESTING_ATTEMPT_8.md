# Testing Attempt 8 - ckUSDC Deposit Test

**Date:** June 6, 2025  
**Objective:** Test ckUSDC token deposits to the ICSI canister with webhook notifications  
**Status:** ⚠️ PARTIAL SUCCESS (Transfer successful, but no indexing or webhook delivery)  
**Network:** IC Mainnet

## Test Overview

This test validates the ckUSDC deposit workflow including:

- ckUSDC subaccount generation
- ckUSDC token transfer to ICSI canister
- Transaction indexing by canister
- Webhook notification delivery

## Pre-Test Setup

### Environment Configuration

- **dfx identity:** `default`
- **Principal:** `gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe`
- **Canister ID:** `y3hne-ryaaa-aaaag-aucea-cai`
- **Network:** IC Mainnet
- **Authorization:** ✅ Previously configured in Testing Attempt 4

### Webhook Infrastructure

- **Webhook Server Status:** ✅ Confirmed running on port 3000
  ```bash
  lsof -i :3000
  # Result: node process (PID 37346) listening on port 3000
  ```
- **ngrok Tunnel:** `https://b6a5-14-161-37-208.ngrok-free.app/webhook`
- **Expected Duration:** ~2 minutes for complete cycle

### ckUSDC Token Configuration

- **ckUSDC Canister ID:** `xevnm-gaaaa-aaaar-qafnq-cai`
- **Token Symbol:** ckUSDC
- **Decimals:** 6
- **Network:** IC Mainnet

## Test Execution Steps

### Step 1: Configure Webhook URL

**Command:**

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call icp_subaccount_indexer set_webhook_url '("https://b6a5-14-161-37-208.ngrok-free.app/webhook")'
```

**Result:** ✅ SUCCESS

```
(variant { Ok = "https://b6a5-14-161-37-208.ngrok-free.app/webhook" })
```

### Step 2: Optimize Polling Interval for Testing

**Command:**

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call icp_subaccount_indexer set_interval '(30)'
```

**Result:** ✅ SUCCESS

```
(variant { Ok = 30 : nat64 })
```

**Purpose:** Reduced from 500 seconds to 30 seconds for faster transaction detection during testing.

### Step 3: Check Initial ckUSDC Balance

**Command:**

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call xevnm-gaaaa-aaaar-qafnq-cai icrc1_balance_of '(record { owner = principal "gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe"; subaccount = null })'
```

**Result:** ✅ SUFFICIENT BALANCE

```
(500_000 : nat)
```

**Analysis:**

- **Balance:** 500,000 micro-USDC = 0.5 ckUSDC
- **Required:** 110,000 micro-USDC (100,000 transfer + 10,000 fee)
- **Status:** ✅ Sufficient funds confirmed

### Step 4: Generate ckUSDC Subaccount

**Command:**

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call icp_subaccount_indexer add_subaccount '(opt variant { CKUSDC })'
```

**Result:** ✅ SUCCESS

```
(variant { Ok = "y3hne-ryaaa-aaaag-aucea-cai-hwxglwa.3" })
```

**Generated Subaccount Details:**

- **Subaccount Index:** 3
- **Subaccount Address:** `y3hne-ryaaa-aaaag-aucea-cai-hwxglwa.3`
- **Raw Subaccount ID:** Bytes array ending with `3` (32-byte array with last byte = 3)

### Step 5: Execute ckUSDC Transfer (First Attempt - Failed)

**Command:**

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call xevnm-gaaaa-aaaar-qafnq-cai icrc1_transfer '(record { to = record { owner = principal "y3hne-ryaaa-aaaag-aucea-cai"; subaccount = opt vec { 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 3 } }; amount = 100000; fee = opt 10; memo = null; from_subaccount = null; created_at_time = null })'
```

**Result:** ❌ FEE ERROR

```
(variant { Err = variant { BadFee = record { expected_fee = 10_000 : nat } } })
```

**Issue:** Used incorrect fee (10 instead of 10,000 micro-USDC)

### Step 6: Execute ckUSDC Transfer (Second Attempt - Success)

**Command:**

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call xevnm-gaaaa-aaaar-qafnq-cai icrc1_transfer '(record { to = record { owner = principal "y3hne-ryaaa-aaaag-aucea-cai"; subaccount = opt vec { 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 3 } }; amount = 100000; fee = opt 10000; memo = null; from_subaccount = null; created_at_time = null })'
```

**Result:** ✅ SUCCESS

```
(variant { Ok = 366_796 : nat })
```

**Transaction Details:**

- **Amount:** 100,000 micro-USDC (0.1 ckUSDC)
- **Fee:** 10,000 micro-USDC (0.01 ckUSDC)
- **Block Height:** 366,796
- **Status:** Transfer successful on ckUSDC ledger

### Step 7: Monitor Transaction Processing

**Wait Period:** 45 seconds for block processing

**Block Processing Status Check:**

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call icp_subaccount_indexer get_next_block '()'
```

**Result:**

```
(variant { Ok = 24_491_714 : nat64 })
```

**Analysis:** Canister is processing ICP ledger blocks, not ckUSDC ledger blocks.

### Step 8: Verify Transaction Counts and Lists

**Transaction Count Check:**

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call icp_subaccount_indexer get_transactions_count '()'
```

**Result:** No change from previous tests

```
(variant { Ok = 3 : nat32 })
```

**Transaction List Check:**

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call icp_subaccount_indexer list_transactions '(opt 10)'
```

**Result:** Only ICP transactions found (same 3 from previous tests)

- Transaction 1: Block 24,489,683 (ICP, memo 123,456,789)
- Transaction 2: Block 24,490,166 (ICP, memo 987,654,321)
- Transaction 3: Block 24,490,258 (ICP, memo 555,888,999)

### Step 9: Restore Production Settings

**Command:**

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call icp_subaccount_indexer set_interval '(500)'
```

**Result:** ✅ SUCCESS

```
(variant { Ok = 500 : nat64 })
```

## Post-Test Verification

### ckUSDC Ledger Verification

#### Canister Subaccount Balance

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call xevnm-gaaaa-aaaar-qafnq-cai icrc1_balance_of '(record { owner = principal "y3hne-ryaaa-aaaag-aucea-cai"; subaccount = opt vec { 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 3 } })'
```

**Result:** ✅ FUNDS RECEIVED

```
(100_000 : nat)
```

**Analysis:** The ICSI canister subaccount successfully received 0.1 ckUSDC (100,000 micro-USDC)

#### Sender's Remaining Balance

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call xevnm-gaaaa-aaaar-qafnq-cai icrc1_balance_of '(record { owner = principal "gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe"; subaccount = null })'
```

**Result:** ✅ BALANCE REDUCED CORRECTLY

```
(390_000 : nat)
```

**Analysis:**

- **Original balance:** 500,000 micro-USDC
- **After transfer:** 390,000 micro-USDC
- **Deducted:** 110,000 micro-USDC (100,000 transfer + 10,000 fee) ✅

### ICSI Canister State Verification

#### Current Configuration Status

- **Webhook URL:** `https://b6a5-14-161-37-208.ngrok-free.app/webhook` ✅
- **Polling Interval:** 500 seconds ✅
- **Total Transactions:** 3 (all ICP, no ckUSDC) ❌
- **Registered Tokens:** ICP, ckUSDC, ckUSDT ✅

#### Block Processing Status

- **Current ICP Block:** 24,491,714
- **ckUSDC Processing:** Unknown (separate ledger)

## Key Findings and Issues

### ✅ What Worked Successfully

1. **Token Transfer**: ckUSDC successfully transferred from sender to ICSI subaccount
2. **Balance Verification**: Both sender and recipient balances updated correctly
3. **Subaccount Generation**: ckUSDC subaccount created with proper format
4. **Webhook Configuration**: URL properly set and verified
5. **Fee Handling**: Correct ckUSDC fees applied (10,000 micro-USDC)

### ❌ What Failed

1. **Transaction Indexing**: ICSI canister did not detect the ckUSDC transaction
2. **Webhook Delivery**: No webhook notification received
3. **Multi-Token Processing**: Canister appears to only process ICP ledger

### 🔍 Root Cause Analysis

#### Issue 1: Missing ckUSDC Transaction Detection

**Potential Causes:**

1. **Separate Ledger Processing**: ckUSDC and ICP use different ledgers with separate block numbering
2. **Token-Specific Block Tracking**: Canister may track `next_block` separately for each token type
3. **Processing Logic**: Current implementation may only actively monitor ICP ledger
4. **Timing**: ckUSDC blocks may require longer processing intervals

#### Issue 2: No Webhook Delivery

**Root Cause:** No transaction detected = no webhook triggered

- Webhook system depends on transaction detection
- Since ckUSDC transaction wasn't indexed, no webhook was sent

## Technical Analysis

### Multi-Token Architecture Investigation

**Registered Tokens Query:**

```bash
export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --network ic call icp_subaccount_indexer get_registered_tokens '()'
```

**Result:**

```
(variant {
  Ok = vec {
    record { variant { ICP }; "ryjl3-tyaaa-aaaaa-aaaba-cai" };
    record { variant { CKUSDC }; "xevnm-gaaaa-aaaar-qafnq-cai" };
    record { variant { CKUSDT }; "cngnf-vqaaa-aaaar-qag4q-cai" };
  }
})
```

**Analysis:** All three tokens are properly registered, but only ICP transactions are being processed.

### Hypothesis: Implementation Gap

Based on the results, the canister appears to have:

1. ✅ **Token Registration**: All tokens properly configured
2. ✅ **Subaccount Generation**: Works for all token types
3. ✅ **Balance Receiving**: Can receive ckUSDC transfers
4. ❌ **Transaction Monitoring**: Only actively monitors ICP ledger
5. ❌ **Multi-Ledger Processing**: May not implement ckUSDC/ckUSDT block monitoring

## Current Status Summary

### Transfer Success Metrics

- **ckUSDC Transfer**: ✅ Successful (Block 366,796)
- **Amount Received**: ✅ 0.1 ckUSDC in subaccount 3
- **Fee Processing**: ✅ Correct 0.01 ckUSDC fee deducted
- **Balance Verification**: ✅ All balances correct

### Indexing Failure Metrics

- **ICSI Transaction Count**: ❌ No increase (still 3)
- **ckUSDC Detection**: ❌ No ckUSDC transactions in list
- **Webhook Delivery**: ❌ No notifications received
- **Multi-Token Processing**: ❌ Only ICP ledger monitored

## Recommendations for Investigation

### Immediate Next Steps

1. **Code Review**: Examine `lib.rs` for multi-token processing logic
2. **Block Monitoring**: Check if canister tracks separate `next_block` for each token
3. **ICRC-1 Integration**: Verify ckUSDC/ckUSDT ledger monitoring implementation
4. **Timer Logic**: Review if processing timers handle multiple ledgers

### Potential Code Areas to Investigate

1. **Block Processing Functions**: How `get_next_block` works for different tokens
2. **Transaction Detection**: ICRC-1 vs ICP ledger integration
3. **Timer Implementation**: Multi-ledger periodic processing
4. **Token-Specific Logic**: Separate processing paths for different tokens

## Security and Production Notes

### ✅ Security Validations

- **Authorization**: All operations properly authenticated
- **Token Transfer**: Legitimate ckUSDC transfer executed
- **Balance Integrity**: No funds lost, correct accounting
- **Webhook URL**: Properly configured and verified

### ⚠️ Production Concerns

- **Multi-Token Support**: Current implementation may not fully support ckUSDC/ckUSDT indexing
- **Incomplete Workflow**: Transfers succeed but indexing fails
- **Webhook Reliability**: Depends on successful transaction detection

## Test Artifacts

### Successful Transfer Details

- **ckUSDC Block Height:** 366,796
- **Amount:** 0.1 ckUSDC (100,000 micro-USDC)
- **Fee:** 0.01 ckUSDC (10,000 micro-USDC)
- **Subaccount:** `y3hne-ryaaa-aaaag-aucea-cai-hwxglwa.3`

### ckUSDC Subaccount Information

- **Subaccount Index:** 3
- **Subaccount Address:** `y3hne-ryaaa-aaaag-aucea-cai-hwxglwa.3`
- **Principal for Transfers:** `gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe`
- **dfx Identity Used:** `default`

### Final Balance State

- **Sender ckUSDC Balance:** 0.39 ckUSDC (390,000 micro-USDC)
- **ICSI Subaccount Balance:** 0.1 ckUSDC (100,000 micro-USDC)
- **Total ICSI Transactions:** 3 (all ICP)

## Conclusion

**Status: ⚠️ PARTIAL SUCCESS**

The ckUSDC deposit test demonstrates:

**✅ Successful Components:**

- Token transfer mechanism works correctly
- Subaccount generation and addressing functional
- Balance management and fee handling proper
- Webhook infrastructure correctly configured

**❌ Failed Components:**

- ckUSDC transaction indexing not implemented or broken
- Multi-token processing appears incomplete
- Webhook delivery depends on indexing success

**Key Discovery:** The ICSI canister can receive ckUSDC transfers but cannot detect/index them, indicating a gap in the multi-token processing implementation.

## Next Steps Required

1. **Code Investigation**: Review multi-token indexing logic in `src/icp_subaccount_indexer/src/lib.rs`
2. **Implementation Fix**: Add or repair ckUSDC/ckUSDT ledger monitoring
3. **Testing Validation**: Re-test after implementation fixes
4. **Documentation Update**: Update architecture docs to reflect current limitations

---

**Testing Attempt 8 Status: ⚠️ PARTIAL SUCCESS - Transfer successful, indexing implementation incomplete**
