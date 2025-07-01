# Testing Attempt 11 - Testnet Canister Upgrade and Multi-Token Setup

**Date**: June 19, 2025  
**Objective**: Upgrade testnet canister to latest version with multi-token support and test ckUSDC transaction detection  
**Operator**: Claude Code Assistant

## Initial State

### Testnet Canister Status

- **Canister ID**: `uiz2m-baaaa-aaaal-qjbxq-cai`
- **Version**: Older version with limited multi-token support
- **Issue**: Could register tokens but only indexed ICP transactions
- **Polling Interval**: 15 seconds (fast testing mode)
- **Transaction Count**: 32 (all ICP only)

### Devnet Canister Status

- **Canister ID**: `y3hne-ryaaa-aaaag-aucea-cai`
- **Version**: Also outdated
- **Access**: Available via `default` identity

## Problem Analysis

### Multi-Token Support Issues

The existing testnet canister had incomplete multi-token implementation:

- ✅ Could register ICRC-1 tokens (`get_registered_tokens` worked)
- ❌ **No actual ICRC-1 indexing** - only ICP transactions detected
- ❌ Missing individual token methods (`get_token_next_block`, `set_token_next_block_update`)
- **Root Cause**: Outdated canister version without full multi-token indexing implementation

### User's ckUSDC Transaction

- **Target**: `uiz2m-baaaa-aaaal-qjbxq-cai-3teoeqy.62` (nonce 62)
- **Status**: Not detected due to canister limitations
- **Format**: ICRC-1 textual format for ckUSDC

## Identity Investigation

### Controller Access Challenge

Initial attempts failed due to incorrect identity usage:

**Available Identities:**

```bash
dfx identity list
STAGING_DEPLOYER *
anonymous
custodian
default
testnet_custodian
```

### Principal Mapping Discovery

Systematically checked each identity against canister controllers:

**Testnet Canister Controllers**:

- `e3mmv-5qaaa-aaaah-aadma-cai` (canister)
- `pztcx-5wpjw-ko6rv-3cjff-466eb-4ywbn-a5jww-rs6yy-ypk4a-ceqfb-nqe` (principal) ⭐
- `rofcd-vaaaa-aaaal-qcgtq-cai` (canister)

**Identity Principal Mapping:**

```bash
STAGING_DEPLOYER:    pztcx-5wpjw-ko6rv-3cjff-466eb-4ywbn-a5jww-rs6yy-ypk4a-ceqfb-nqe ✅ MATCH!
anonymous:           2vxsx-fae
custodian:           2kub6-ym4rr-jb64b-ups2d-ykjs6-olg5n-xb3vf-uea3s-drct6-ibgsp-gqe
default:             gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe
testnet_custodian:   a6nt4-w4isk-ugybk-trfuq-42piz-fnsxq-jenv4-hnruq-j2xaz-jdipw-uae
```

**Key Discovery**: `STAGING_DEPLOYER` identity is the correct controller for testnet canister upgrades!

## Cycle Management

### ICP Funding Requirements

**Testnet Principal for Cycles**: `a6nt4-w4isk-ugybk-trfuq-42piz-fnsxq-jenv4-hnruq-j2xaz-jdipw-uae`  
**Devnet Principal for Cycles**: `gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe`

### Identity Configuration Fix

Encountered corrupted `/Users/theo/.config/dfx/identity.json`:

```json
{
  "default": "default"
}stodian"
}
```

**Fixed to:**

```json
{
  "default": "default"
}
```

## Upgrade Process

### Step 1: Build Latest Code

```bash
pnpm run build:canister
# Successfully built latest multi-token version
```

### Step 2: Devnet Canister Upgrade (for testing)

```bash
dfx identity use default
export DFX_WARNING=-mainnet_plaintext_identity
dfx canister deposit-cycles 200000000000 y3hne-ryaaa-aaaag-aucea-cai --network ic
# Added 200B cycles, balance: 464,098,432,090 cycles

dfx canister install y3hne-ryaaa-aaaag-aucea-cai --network ic \
  --wasm target/wasm32-unknown-unknown/release/icp_subaccount_indexer.wasm \
  --argument '(variant { Mainnet }, 15: nat64, 25002500: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe")' \
  --mode upgrade
# ✅ SUCCESS: Upgraded code for canister y3hne-ryaaa-aaaag-aucea-cai
```

### Step 3: Immediate Devnet Cycle Conservation

```bash
dfx canister call y3hne-ryaaa-aaaag-aucea-cai set_interval '(500 : nat64)' --network ic
# ✅ Restored production 500-second interval to prevent cycle waste
```

### Step 4: Testnet Canister Upgrade

```bash
dfx identity use STAGING_DEPLOYER  # Critical: Use correct controller identity
export DFX_WARNING=-mainnet_plaintext_identity
dfx canister install uiz2m-baaaa-aaaal-qjbxq-cai --network ic \
  --wasm target/wasm32-unknown-unknown/release/icp_subaccount_indexer.wasm \
  --argument '(variant { Mainnet }, 15: nat64, 25002500: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "pztcx-5wpjw-ko6rv-3cjff-466eb-4ywbn-a5jww-rs6yy-ypk4a-ceqfb-nqe")' \
  --mode upgrade
# ✅ SUCCESS: Upgraded code for canister uiz2m-baaaa-aaaal-qjbxq-cai
```

## Post-Upgrade Verification

### Multi-Token Registration Check

```bash
dfx identity use testnet_custodian  # Switch back for operations
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai get_registered_tokens --network ic
```

**Result**: ✅ All three tokens confirmed registered:

- ICP: `ryjl3-tyaaa-aaaaa-aaaba-cai`
- ckUSDC: `xevnm-gaaaa-aaaar-qafnq-cai`
- ckUSDT: `cngnf-vqaaa-aaaar-qag4q-cai`

### Fast Polling Configuration

```bash
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai set_interval '(15 : nat64)' --network ic
# ✅ Set to 15-second fast polling for testing
```

### Transaction Format Analysis

Post-upgrade, the transaction format changed significantly:

- **Old format**: Clear `token_type = variant { ICP }` fields
- **New format**: Encoded variant numbers (e.g., `variant { 3_645_238 }`)
- **Issue**: Still only showing ICP transactions despite upgrade

## Current Status After Upgrade

### ✅ Successful Upgrades

- **Testnet canister**: Latest code deployed with `STAGING_DEPLOYER` identity
- **Devnet canister**: Upgraded and reverted to production settings
- **Multi-token registration**: All three tokens properly registered

### ⏳ Pending Issues

- **ICRC-1 indexing**: Still not detecting ckUSDC/ckUSDT transactions
- **Transaction format**: New encoded format needs analysis
- **User's ckUSDC**: Transaction to nonce 62 still not detected

### 🔧 Configuration Status

- **Fast polling**: 15 seconds enabled for rapid testing
- **ICP indexing**: Working correctly (32 ICP transactions detected)
- **Next steps**: Monitor for ICRC-1 transaction detection improvement

## Key Lessons Learned

### 1. Identity Management Critical

- **`STAGING_DEPLOYER`** is the correct identity for testnet canister upgrades
- **`testnet_custodian`** is for operations only, not upgrades
- Always verify principal mapping before attempting upgrades

### 2. Upgrade Process Validation

- Building latest code is essential for multi-token support
- Cycle management must be done with funding principals, not controller principals
- Post-upgrade verification shows format changes may require additional investigation

### 3. Multi-Token Implementation Status

- Token registration works properly post-upgrade
- ICRC-1 indexing implementation may need further investigation
- Fast polling enables rapid testing and troubleshooting

## Recommendations for Future Testing

### 1. Immediate Actions

- Monitor testnet canister for 2-3 polling cycles (30-45 seconds)
- Check if ICRC-1 indexing starts working with new implementation
- Document transaction format changes for proper interpretation

### 2. Long-term Improvements

- Ensure all canisters maintain consistent versions
- Document identity roles clearly (upgrader vs operator)
- Implement monitoring for multi-token indexing health

### 3. Testing Protocol Updates

- Always use `STAGING_DEPLOYER` for testnet upgrades
- Immediately revert devnet to production settings after testing
- Maintain comprehensive principal mapping documentation

## Environment State After Session

- **Testnet**: Upgraded, fast polling, ready for ckUSDC testing
- **Devnet**: Upgraded, production settings, cycle-efficient
- **Identity**: `testnet_custodian` active for operations
- **Transaction Count**: 32 (monitoring for growth with ICRC-1 indexing)
