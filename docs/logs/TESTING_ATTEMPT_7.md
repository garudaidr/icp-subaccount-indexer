# TESTING ATTEMPT 7 - CKUSDC Deposit Test Setup

**Date**: June 6, 2025  
**Test Type**: CKUSDC Deposit Testing Setup  
**Status**: ❌ STOPPED - Insufficient CKUSDC Balance  
**Duration**: ~30 minutes  

## 🎯 Test Objectives

1. Verify webhook script running on port 3000
2. Update custodian webhook URL to new ngrok endpoint
3. Configure canister interval for testing (500 → 30 → 500)
4. Check CKUSDC balance before testing
5. Execute CKUSDC deposit test
6. Verify CKUSDC subaccount address format
7. Check canister cycles status

## 📋 Test Environment

- **Network**: Internet Computer Mainnet (`ic`)
- **Canister ID**: `y3hne-ryaaa-aaaag-aucea-cai`
- **CKUSDC Ledger**: `xevnm-gaaaa-aaaar-qafnq-cai`
- **Test Principal**: `crmc4-uypeq-seqvf-sowpb-x456x-xggrd-dk2u6-dxegr-7rfwm-eyhru-lqe`
- **Webhook URL**: `https://e03c-14-161-37-208.ngrok-free.app/webhook`

## ✅ Successfully Completed Steps

### 1. Webhook Service Verification
```bash
lsof -i :3000
```
**Result**: ✅ Node process (PID 35895) confirmed running on port 3000

### 2. Webhook URL Configuration
```bash
# Check current webhook URL
dfx canister --network ic call y3hne-ryaaa-aaaag-aucea-cai get_webhook_url
# Result: "https://f0f7-14-161-37-208.ngrok-free.app/webhook"

# Update to new ngrok URL
dfx canister --network ic call y3hne-ryaaa-aaaag-aucea-cai set_webhook_url '("https://e03c-14-161-37-208.ngrok-free.app/webhook")'
# Result: ✅ Successfully updated
```

### 3. Canister Interval Management
```bash
# Check current interval
dfx canister --network ic call y3hne-ryaaa-aaaag-aucea-cai get_interval
# Result: 500 seconds

# Set to testing interval
dfx canister --network ic call y3hne-ryaaa-aaaag-aucea-cai set_interval '(30 : nat64)'
# Result: ✅ Successfully set to 30 seconds

# Later reset back to production
dfx canister --network ic call y3hne-ryaaa-aaaag-aucea-cai set_interval '(500 : nat64)'
# Result: ✅ Successfully reset to 500 seconds
```

### 4. CKUSDC Subaccount Address Verification
```bash
dfx canister --network ic call y3hne-ryaaa-aaaag-aucea-cai get_subaccountid '(1 : nat32, opt variant { CKUSDC })'
```
**Result**: `y3hne-ryaaa-aaaag-aucea-cai-2oqaj5a.1`

**✅ Format Verification**: CKUSDC uses ICRC-1 textual format as expected:
- Format: `{canister_principal}-{crc32_checksum}.{subaccount_index}`
- Different from ICP hex format, confirming proper multi-token support

### 5. Canister Cycles Status Check
```bash
dfx canister --network ic status y3hne-ryaaa-aaaag-aucea-cai
```
**Results**:
- **Balance**: 470,274,969,906 cycles (~470B cycles)
- **Daily burn**: 810,265,456 cycles (~810M/day)
- **Estimated runtime**: ~580 days
- **Status**: ✅ Well-funded, no action needed

## ❌ Test Stopped - Balance Issue

### CKUSDC Balance Check
```bash
dfx canister --network ic call xevnm-gaaaa-aaaar-qafnq-cai icrc1_balance_of '(record { owner = principal "crmc4-uypeq-seqvf-sowpb-x456x-xggrd-dk2u6-dxegr-7rfwm-eyhru-lqe"; subaccount = null })'
```
**Result**: `0 CKUSDC` ❌

**Test Script Error**:
```
🚀 Testing USDC Deposit with ICSI Canister
==========================================
✅ Identity created from seed phrase
📍 Principal: crmc4-uypeq-seqvf-sowpb-x456x-xggrd-dk2u6-dxegr-7rfwm-eyhru-lqe

💰 CKUSDC Token Config:
   Canister ID: xevnm-gaaaa-aaaar-qafnq-cai
   Symbol: CKUSDC
   Decimals: 6

📬 Getting deposit addresses...
Error: Failed to get registered tokens: Unauthorized
```

## 🚫 Blocking Issues

1. **Insufficient CKUSDC Balance**: Test wallet has 0 CKUSDC, needs minimum 0.1 CKUSDC
2. **Authorization Error**: Test script encounters "Unauthorized" when calling `get_registered_tokens`

## 📝 Required Actions for Future Testing

### 1. Fund Test Wallet with CKUSDC
**Target Principal**: `crmc4-uypeq-seqvf-sowpb-x456x-xggrd-dk2u6-dxegr-7rfwm-eyhru-lqe`  
**Minimum Amount**: 0.1 CKUSDC (100,000 units with 6 decimals)  
**CKUSDC Ledger**: `xevnm-gaaaa-aaaar-qafnq-cai`

### 2. Debug Authorization Issue
- Investigate why test script cannot access `get_registered_tokens`
- Verify principal permissions for canister interaction
- Check if additional setup is needed for mainnet testing

## 🔧 Technical Insights

### CKUSDC Subaccount Format Analysis
Based on code review in `src/icp_subaccount_indexer/src/lib.rs`:

1. **CKUSDC Detection** (lines 1043-1047):
   ```rust
   if token_type == TokenType::CKUSDC || token_type == TokenType::CKUSDT {
       let canister_id = CanisterApiManager::id();
       let icrc_account = IcrcAccount::from_principal_and_index(canister_id, nonce);
       return Ok(icrc_account.to_text());
   }
   ```

2. **ICRC-1 Format**: Uses `IcrcAccount::to_text()` which generates:
   - Format: `{principal}-{crc32_checksum}.{subaccount_hex}`
   - Example: `y3hne-ryaaa-aaaag-aucea-cai-2oqaj5a.1`

3. **Differentiation from ICP**: ICP uses `AccountIdentifier::to_hex()` for traditional hex format

## 📊 Configuration Summary

| Component | Previous Value | New Value | Status |
|-----------|---------------|-----------|---------|
| Webhook URL | `https://f0f7-14-161-37-208.ngrok-free.app/webhook` | `https://e03c-14-161-37-208.ngrok-free.app/webhook` | ✅ Updated |
| Canister Interval | 500s | 30s → 500s | ✅ Restored |
| CKUSDC Balance | 0 | 0 | ❌ Needs funding |
| Cycles Balance | 470B | 470B | ✅ Sufficient |

## 🎯 Next Steps

1. **Fund Test Wallet**: Send at least 0.1 CKUSDC to test principal
2. **Retry Test**: Run `pnpm run lib:test:usdc` after funding
3. **Debug Auth**: Investigate authorization requirements for mainnet testing
4. **Monitor Webhook**: Verify webhook receives notifications during actual deposit test

## 🔍 Verification Commands

For future reference, key verification commands used:

```bash
# Check webhook service
lsof -i :3000

# Canister status and cycles
dfx canister --network ic status <canister_id>

# Get CKUSDC subaccount
dfx canister --network ic call <canister_id> get_subaccountid '(1 : nat32, opt variant { CKUSDC })'

# Check CKUSDC balance
dfx canister --network ic call xevnm-gaaaa-aaaar-qafnq-cai icrc1_balance_of '(record { owner = principal "<principal>"; subaccount = null })'

# Update webhook URL
dfx canister --network ic call <canister_id> set_webhook_url '("<new_url>")'

# Manage intervals
dfx canister --network ic call <canister_id> set_interval '(<seconds> : nat64)'
```

---

**Note**: All private keys and seed phrases have been removed from this log. Only public information (canister IDs, principals, public addresses) are retained for reference.