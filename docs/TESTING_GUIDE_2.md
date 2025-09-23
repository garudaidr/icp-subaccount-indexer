# ICSI Multi-Token Testing Guide - Advanced Reference

**Based on Real Testing Attempts 8-13 (June-September 2025)**

This guide consolidates advanced lessons learned from testing attempts 8-13 of the ICP Subaccount Indexer (ICSI) canister, focusing on multi-token support, ICRC-3 integration, canister upgrades, and production deployment challenges. It builds upon the foundational procedures in TESTING_GUIDE_1.md with advanced troubleshooting and multi-token workflows.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Advanced Prerequisites](#advanced-prerequisites)
3. [Multi-Token Architecture](#multi-token-architecture)
4. [Advanced Deployment Procedures](#advanced-deployment-procedures)
5. [ICRC-3 Token Testing](#icrc-3-token-testing)
6. [Canister Upgrade Procedures](#canister-upgrade-procedures)
7. [Advanced Error Analysis & Resolution](#advanced-error-analysis--resolution)
8. [ICRC-3 Connectivity Debugging](#icrc-3-connectivity-debugging)
9. [Production Deployment Guide](#production-deployment-guide)
10. [Advanced Reference Commands](#advanced-reference-commands)

## Executive Summary

This guide addresses advanced testing scenarios for the ICSI canister's multi-token functionality, including ckBTC, ckUSDT, and ckUSDC support. It incorporates critical lessons learned from testing attempts 8-13, including ICRC-3 integration challenges, inter-canister connectivity issues, and large WASM deployment requirements.

**Advanced Key Success Factors:**
- Multi-token indexing requires separate ICRC-3 ledger monitoring
- Large WASM files (1.9MB) require ~800B cycles for deployment
- ICRC-3 inter-canister calls can fail with network connectivity issues
- Canister upgrades require careful identity management and cycle planning
- Token-specific block processing states must be managed independently

## Advanced Prerequisites

### 1. Multi-Token Environment Requirements

Beyond the basic requirements in TESTING_GUIDE_1.md, advanced testing requires:

- **Enhanced Cycle Budget**: Minimum 1.0 ICP for large WASM deployments
- **Multi-Token Balances**: Test amounts for ckBTC, ckUSDT in addition to ckUSDC
- **Identity Management**: Understanding of controller vs custodian vs operator identities
- **Network Monitoring**: Tools to diagnose inter-canister connectivity

### 2. Token Requirements and Characteristics

| Token Type | Ledger Canister ID | Standard | Fee | Decimals | Address Format |
|------------|-------------------|----------|-----|----------|----------------|
| **ICP** | `ryjl3-tyaaa-aaaaa-aaaba-cai` | Native | 10,000 e8s | 8 | Hex AccountIdentifier |
| **ckUSDC** | `xevnm-gaaaa-aaaar-qafnq-cai` | ICRC-1 | 10,000 micro | 6 | ICRC-1 textual |
| **ckUSDT** | `cngnf-vqaaa-aaaar-qag4q-cai` | ICRC-1 | 10,000 micro | 6 | ICRC-1 textual |
| **ckBTC** | `mxzaz-hqaaa-aaaar-qaada-cai` | ICRC-1 | 10 sat | 8 | ICRC-1 textual |

### 3. Advanced Environment Setup

```bash
# Set up environment for multi-token testing
export DFX_WARNING=-mainnet_plaintext_identity

# Verify identity configuration
dfx identity list
dfx identity whoami
dfx identity get-principal

# Check cycles balance (need substantial amount for large WASM)
dfx cycles balance --network ic
# Minimum required: 1.0 TC (trillion cycles)
```

## Multi-Token Architecture

### Token Processing Independence

Each token type maintains independent processing state:

- **Separate Block Tracking**: Each token has its own `next_block` counter
- **Independent Timers**: All tokens processed in single timer but with separate logic
- **Token-Specific APIs**: ICP uses `query_blocks`, ICRC tokens use `icrc3_get_blocks`
- **Format Differences**: ICP uses hex addresses, ICRC tokens use textual format

### ICRC-3 Integration Architecture

```rust
// Token processing logic structure
match token_type {
    TokenType::ICP => {
        // Uses traditional ledger query_blocks method
        query_blocks(ledger_id, start_block, length)
    }
    TokenType::CKUSDC | TokenType::CKUSDT | TokenType::CKBTC => {
        // Uses ICRC-3 standard icrc3_get_blocks method
        icrc3_get_blocks(ledger_id, start_block, length)
    }
}
```

### Subaccount Format Differences

**ICP Subaccounts:**
- Format: 64-character hex string
- Example: `39ef9f41bd7cb7de22a29e9c3a47346fe6115e8918a6fb248895a17005d82baa`
- Generated via: `AccountIdentifier::to_hex()`

**ICRC-1 Subaccounts:**
- Format: `{canister_principal}-{crc32_checksum}.{subaccount_index}`
- Example: `y3hne-ryaaa-aaaag-aucea-cai-2tg4b3i.5`
- Generated via: `IcrcAccount::to_text()`

## Advanced Deployment Procedures

### Large WASM Deployment Requirements

**Critical Discovery**: The ICSI canister WASM file (~1.9MB) requires significantly more cycles than typical canisters.

#### Cycle Requirements Breakdown

```bash
# For 1.9MB WASM deployment on mainnet:
# Initial canister creation: 500B cycles
# WASM installation: ~460B cycles
# Total required: ~960B cycles minimum

# Step 1: Create canister with substantial cycles
dfx canister create icp_subaccount_indexer --network ic --with-cycles 500000000000

# Step 2: Add additional cycles for deployment
dfx canister deposit-cycles 500000000000 icp_subaccount_indexer --network ic

# Step 3: Deploy with hardcoded principal (NEVER use command substitution)
dfx deploy icp_subaccount_indexer --network ic --argument '(
  variant { Mainnet }, 
  500: nat64, 
  0: nat32, 
  "ryjl3-tyaaa-aaaaa-aaaba-cai", 
  "your-actual-principal-here"
)'
```

### Identity Management for Upgrades

**Critical Lesson**: Different identities serve different purposes:

- **Controller Identity**: Can upgrade canisters (e.g., `STAGING_DEPLOYER`)
- **Custodian Identity**: Can perform operations (e.g., `testnet_custodian`)
- **Operator Identity**: For daily operations (e.g., `default`)

```bash
# For testnet canister upgrades, use STAGING_DEPLOYER
dfx identity use STAGING_DEPLOYER
dfx canister install uiz2m-baaaa-aaaal-qjbxq-cai --network ic --mode upgrade

# For operations, use testnet_custodian
dfx identity use testnet_custodian
dfx canister call uiz2m-baaaa-aaaal-qjbxq-cai get_transactions_count --network ic
```

## ICRC-3 Token Testing

### ckUSDC Testing Workflow

Based on successful testing in Attempt 10:

#### Step 1: Generate ICRC-1 Subaccount

```bash
dfx canister call <canister-id> add_subaccount '(opt variant { CKUSDC })' --network ic
# Expected result: y3hne-ryaaa-aaaag-aucea-cai-2tg4b3i.5
```

#### Step 2: Execute ckUSDC Transfer

```bash
# Transfer with correct fee (10,000 micro-units = 0.01 ckUSDC)
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai icrc1_transfer '(record {
  to = record {
    owner = principal "your-canister-id";
    subaccount = opt vec { 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 0; 5 }
  };
  amount = 100000 : nat;     # 0.1 ckUSDC
  fee = opt (10000 : nat);   # 0.01 ckUSDC (CRITICAL: Not 10!)
  memo = null;
  from_subaccount = null;
  created_at_time = null
})' --network ic
```

#### Step 3: Configure Block Processing

```bash
# Set ckUSDC processing to start just before transaction block
dfx canister call <canister-id> set_token_next_block_update '(variant { CKUSDC }, 366986 : nat64)' --network ic
```

### ckBTC Testing Workflow

Based on testing in Attempt 13:

#### Step 1: Generate ckBTC Subaccount

```bash
dfx canister call <canister-id> add_subaccount '(opt variant { CKBTC })' --network ic
# Expected result: y3hne-ryaaa-aaaag-aucea-cai-o2vldhy.26
```

#### Step 2: Execute ckBTC Transfer

```bash
# ckBTC uses different fee structure (10 satoshis vs 10,000 micro-units)
dfx canister call mxzaz-hqaaa-aaaar-qaada-cai icrc1_transfer '(record {
  to = record {
    owner = principal "your-canister-id";
    subaccount = opt vec { /* 32-byte array with index 26 */ }
  };
  amount = 100 : nat;        # 100 satoshis
  fee = opt (10 : nat);      # 10 satoshis fee
  memo = null;
  from_subaccount = null;
  created_at_time = null
})' --network ic
```

## Canister Upgrade Procedures

### Pre-Upgrade Preparation

Based on Attempt 11 findings:

#### Step 1: Identity Verification

```bash
# Map available identities to their principals
dfx identity list
# Example output: STAGING_DEPLOYER, custodian, default, testnet_custodian

# Check each identity's principal
for identity in $(dfx identity list | grep -v "^anonymous$"); do
  echo "$identity: $(dfx identity use $identity && dfx identity get-principal)"
done
```

#### Step 2: Controller Verification

```bash
# Check canister controllers
dfx canister info <canister-id> --network ic

# Ensure your identity matches one of the controllers
dfx identity get-principal
```

#### Step 3: Cycle Management

```bash
# Check current cycles
dfx canister status <canister-id> --network ic

# Add cycles if needed (200B minimum for upgrade)
dfx canister deposit-cycles 200000000000 <canister-id> --network ic
```

### Upgrade Execution

```bash
# Use correct controller identity
dfx identity use STAGING_DEPLOYER

# Build latest code
pnpm run build:canister

# Execute upgrade with proper arguments
dfx canister install <canister-id> --network ic \
  --wasm target/wasm32-unknown-unknown/release/icp_subaccount_indexer.wasm \
  --argument '(variant { Mainnet }, 500: nat64, 25002500: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "controller-principal")' \
  --mode upgrade
```

### Post-Upgrade Verification

```bash
# Switch to operations identity
dfx identity use testnet_custodian

# Verify upgrade success
dfx canister call <canister-id> get_registered_tokens --network ic
dfx canister call <canister-id> get_transactions_count --network ic
dfx canister call <canister-id> get_all_token_blocks --network ic
```

## Advanced Error Analysis & Resolution

This section provides detailed analysis of advanced errors encountered during testing attempts 8-13, with step-by-step resolution procedures.

### Error 1: Multi-Token Transfer Success but Detection Failure (Testing Attempts 8-9)

**Original Error Pattern:**
```
Transfer successful: ✅ ckUSDC sent to subaccount
Balance verification: ✅ Balances updated correctly
Transaction indexing: ❌ Transaction not detected by canister
Webhook delivery: ❌ No notification received
```

**Root Cause Analysis:**
1. **Implementation Gap**: Early multi-token versions could receive transfers but couldn't index them
2. **ICRC-3 Missing**: Canister lacked `icrc3_get_blocks` implementation
3. **Block Processing Logic**: Only ICP ledger was being monitored

**Investigation Steps:**
```bash
# Verify transfer occurred on ledger
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai icrc1_balance_of '(record { 
  owner = principal "canister-id"; 
  subaccount = opt vec { /* subaccount bytes */ } 
})' --network ic
# Result: 100,000 (transfer successful)

# Check canister detection
dfx canister call <canister-id> get_transactions_count --network ic
# Result: No increase (detection failed)
```

**Resolution:**
```bash
# 1. Upgrade canister to version with ICRC-3 support
dfx canister install <canister-id> --network ic --mode upgrade \
  --argument '(variant { Mainnet }, 500: nat64, 10: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "principal")'

# 2. Configure token block processing
dfx canister call <canister-id> set_token_next_block_update '(variant { CKUSDC }, 366986 : nat64)' --network ic

# 3. Set fast polling for testing
dfx canister call <canister-id> set_interval '(30 : nat64)' --network ic

# 4. Wait 45 seconds and verify
dfx canister call <canister-id> get_transactions_count --network ic
# Expected: Count increases
```

**Lesson Learned:** Multi-token support requires both code implementation AND proper version deployment.

---

### Error 2: Large WASM Deployment Cycle Exhaustion (Testing Attempt - TESTING_ATTEMPT.md)

**Original Error:**
```
Error: Canister is out of cycles: requested 3_799_393_530 cycles but the available balance is 99_998_684_000 cycles and at least 230_000_000_000 cycles are required to keep the canister running
```

**Failed Commands:**
```bash
# Started with 500B cycles
dfx canister create icp_subaccount_indexer --network ic --with-cycles 500000000000

# Added more cycles
dfx canister deposit-cycles 100000000000 icp_subaccount_indexer --network ic
dfx canister deposit-cycles 129000000000 icp_subaccount_indexer --network ic

# Still failed deployment
dfx deploy icp_subaccount_indexer --network ic --argument '...'
# Result: Still needs 86_205_075_530 additional cycles
```

**Root Cause Analysis:**
1. **Large WASM Size**: 1.9MB file vs typical 200-500KB canisters
2. **Exponential Costs**: IC cycle costs scale non-linearly with WASM size
3. **Complex Initialization**: Heavy init function with network setup and timer initialization

**Investigation Steps:**
```bash
# Check WASM file size
ls -la target/wasm32-unknown-unknown/release/icp_subaccount_indexer.wasm
# Result: 1996185 bytes (1.9MB) - Unusually large!

# Check canister status
dfx canister status icp_subaccount_indexer --network ic
# Result: Running with 213B cycles but Module hash: None (no code installed)
```

**Mathematical Analysis:**
- Started with: 500B cycles (creation)
- Added: 229B cycles (deposits)
- Total Available: 729B cycles
- Still Needed: 90B cycles
- **Final Requirement**: ~819B cycles for 1.9MB WASM

**Resolution:**
```bash
# Ensure sufficient ICP balance first
dfx ledger balance --network ic
# Minimum: 0.3 ICP needed

# Convert more ICP to cycles
dfx cycles convert --amount=0.3 --network ic

# Create canister with maximum cycles
dfx canister create icp_subaccount_indexer --network ic --with-cycles 800000000000

# Deploy immediately
dfx deploy icp_subaccount_indexer --network ic --argument '(
  variant { Mainnet }, 
  500: nat64, 
  0: nat32, 
  "ryjl3-tyaaa-aaaaa-aaaba-cai", 
  "hardcoded-principal-here"
)'
```

**Lesson Learned:** Large WASM files require significantly more cycles - budget 800B+ for 1.9MB deployments.

---

### Error 3: ICRC-3 Inter-Canister Call Failures (Testing Attempt 13)

**Original Error:**
```
[954849. 2025-09-22T01:17:44.124393783Z]: ICRC-3 call failed: (SysTransient, "Couldn't send message")
[954850. 2025-09-22T01:17:44.124393783Z]: ERROR in query_token_ledger for CKUSDT:
[954851. 2025-09-22T01:17:44.124393783Z]:   Rejection code: SysTransient
[954852. 2025-09-22T01:17:44.124393783Z]:   Error message: Couldn't send message
```

**Failed Symptoms:**
```bash
# ckBTC and ckUSDT pollers stuck while ICP advanced
Token    | Position   | Status
---------|------------|--------
ICP      | Advancing  | ✅ Working  
ckUSDC   | 448,807    | ✅ Working
ckUSDT   | 663,296    | ❌ Stuck
ckBTC    | 3,111,605  | ❌ Stuck
```

**Root Cause Analysis:**
1. **Network Connectivity**: Inter-canister calls failing with "Couldn't send message"
2. **Resource Constraints**: Despite having 227B cycles, calls were failing
3. **Subnet Communication**: Possible temporary network issues between subnets

**Investigation Steps:**
```bash
# Check canister logs for errors
dfx canister logs <canister-id> --network ic
# Found: ICRC-3 call failures with SysTransient errors

# Test direct ledger access
dfx canister call mxzaz-hqaaa-aaaar-qaada-cai icrc3_get_blocks '(vec {record { start = 3111616 : nat; length = 5 : nat }})' --network ic
# Result: ✅ Direct calls work perfectly

# Check canister cycles
dfx canister status <canister-id> --network ic
# Result: 227B cycles (should be sufficient)
```

**Resolution:**
```bash
# Top up cycles significantly (even though it seemed sufficient)
dfx canister deposit-cycles 400000000000 <canister-id> --network ic
# New balance: 625B cycles

# Automatic recovery - no manual intervention needed!
# Pollers started working immediately after cycle top-up
```

**Post-Resolution Verification:**
```bash
# Check transaction detection
dfx canister call <canister-id> get_transactions_count --network ic
# Result: Increased from 5 to 7 transactions

# Verify new transactions
dfx canister call <canister-id> list_transactions '(opt 10)' --network ic
# Found: ckUSDT and ckBTC transactions detected!
```

**Lesson Learned:** ICRC-3 inter-canister calls may require higher cycle thresholds than calculated - maintain 600B+ cycles for reliability.

---

### Error 4: Token Block Processing Stuck at Archived Positions (Testing Attempt 12)

**Original Error Pattern:**
```
Token     | Next Block | Status
----------|------------|--------
ICP       | 25,158,675 | Stuck ❌
CKUSDC    | 600,000    | Stuck ❌ (archived)
CKUSDT    | 300,000    | Stuck ❌ (archived)
```

**Root Cause Analysis:**
1. **Archived Blocks**: Old block positions were beyond ledger's accessible range
2. **Silent Failures**: Canister couldn't query archived blocks, failed silently
3. **Incorrect Current Blocks**: ICRC token blocks were much lower than set positions

**Investigation Steps:**
```bash
# Check individual token positions
dfx canister call <canister-id> get_token_next_block_query '(variant { CKUSDC })' --network ic
# Result: 1,600,000 (way too high)

# Check actual current ledger blocks
# CKUSDC actual: ~391,355
# CKUSDT actual: ~524,113
```

**Failed Resolution Attempts:**
```bash
# Tried updating to still-too-high blocks
dfx canister call <canister-id> set_token_next_block_update '(variant { CKUSDC }, 700000 : nat64)' --network ic
# Still failed because 700k > 391k actual
```

**Working Resolution:**
```bash
# Set to correct current block positions
dfx canister call <canister-id> set_token_next_block_update '(variant { CKUSDC }, 391300 : nat64)' --network ic
dfx canister call <canister-id> set_token_next_block_update '(variant { CKUSDT }, 524100 : nat64)' --network ic

# For ICP, use sweep function to find current block
dfx canister call <canister-id> sweep --network ic
# Shows recent blocks, use for ICP position update
dfx canister call <canister-id> set_token_next_block_update '(variant { ICP }, 25288400 : nat64)' --network ic
```

**Verification:**
```bash
# All indexers started advancing immediately
dfx canister call <canister-id> get_all_token_blocks --network ic
# Result: All tokens advancing from correct positions
```

**Lesson Learned:** Always verify actual ledger current blocks before setting token positions - archived blocks cause silent failures.

---

### Error 5: Identity Management and Controller Confusion (Testing Attempt 11)

**Original Error:**
```
Error: Only the controllers of the canister can control it.
Controller identity required for canister operations.
```

**Failed Commands:**
```bash
# Attempted upgrade with wrong identity
dfx identity use testnet_custodian
dfx canister install uiz2m-baaaa-aaaal-qjbxq-cai --network ic --mode upgrade
# Result: Permission denied
```

**Root Cause Analysis:**
1. **Identity Confusion**: Using operator identity for controller operations
2. **Multiple Identity Types**: Different identities serve different purposes
3. **Corrupted Configuration**: identity.json file was corrupted

**Investigation Steps:**
```bash
# Check available identities
dfx identity list
# Result: STAGING_DEPLOYER, custodian, default, testnet_custodian

# Map identities to principals
dfx identity use STAGING_DEPLOYER && dfx identity get-principal
# Result: pztcx-5wpjw-ko6rv-3cjff-466eb-4ywbn-a5jww-rs6yy-ypk4a-ceqfb-nqe

# Check canister controllers
dfx canister info uiz2m-baaaa-aaaal-qjbxq-cai --network ic
# Controllers: e3mmv-5qaaa-aaaah-aadma-cai pztcx-5wpjw-ko6rv-3cjff-466eb-4ywbn-a5jww-rs6yy-ypk4a-ceqfb-nqe rofcd-vaaaa-aaaal-qcgtq-cai

# STAGING_DEPLOYER principal matches controller! ✅
```

**Configuration Fix:**
```bash
# Fixed corrupted identity.json
cat ~/.config/dfx/identity.json
# Was: {"default": "default"}stodian"}
# Fixed to: {"default": "default"}
```

**Resolution:**
```bash
# Use correct controller identity for upgrades
dfx identity use STAGING_DEPLOYER

# Execute successful upgrade
dfx canister install uiz2m-baaaa-aaaal-qjbxq-cai --network ic \
  --wasm target/wasm32-unknown-unknown/release/icp_subaccount_indexer.wasm \
  --argument '(variant { Mainnet }, 15: nat64, 25002500: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "pztcx-5wpjw-ko6rv-3cjff-466eb-4ywbn-a5jww-rs6yy-ypk4a-ceqfb-nqe")' \
  --mode upgrade
# Result: ✅ SUCCESS

# Switch back to operations identity
dfx identity use testnet_custodian
```

**Lesson Learned:** 
- **STAGING_DEPLOYER**: For canister upgrades (controller)
- **testnet_custodian**: For canister operations (custodian)
- Always verify principal mappings before operations

---

### Error 6: Fee Amount Confusion for Different Token Types (Testing Attempts 8-9)

**Original Error:**
```
(variant { Err = variant { BadFee = record { expected_fee = 10_000 : nat } } })
```

**Failed Commands:**
```bash
# Incorrect ckUSDC transfer with wrong fee
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai icrc1_transfer '(record {
  amount = 100000 : nat;
  fee = opt (10 : nat);    # ❌ WRONG! Should be 10,000
  ...
})' --network ic
```

**Root Cause Analysis:**
1. **Token-Specific Fees**: Each token type has different fee structures
2. **Documentation Confusion**: Fees expressed in different units
3. **Decimal Differences**: Tokens have different decimal places

**Fee Structure Breakdown:**

| Token | Fee Amount | Fee in Base Units | Fee Description |
|-------|------------|-------------------|-----------------|
| **ICP** | 10,000 e8s | 0.0001 ICP | Standard ledger fee |
| **ckUSDC** | 10,000 micro | 0.01 ckUSDC | 1% of transfer |
| **ckUSDT** | 10,000 micro | 0.01 ckUSDT | 1% of transfer |
| **ckBTC** | 10 sat | 0.0000001 ckBTC | Bitcoin network fee |

**Resolution Examples:**

```bash
# ckUSDC transfer (correct fee)
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai icrc1_transfer '(record {
  amount = 100000 : nat;     # 0.1 ckUSDC
  fee = opt (10000 : nat);   # ✅ CORRECT: 0.01 ckUSDC
  ...
})' --network ic

# ckBTC transfer (different fee structure)
dfx canister call mxzaz-hqaaa-aaaar-qaada-cai icrc1_transfer '(record {
  amount = 100 : nat;        # 100 satoshis
  fee = opt (10 : nat);      # ✅ CORRECT: 10 satoshis
  ...
})' --network ic
```

**Lesson Learned:** Always verify fee requirements per token type - ckBTC uses different fee structure than ckUSDC/ckUSDT.

## ICRC-3 Connectivity Debugging

### Diagnosing Inter-Canister Call Failures

When ICRC tokens stop being indexed:

#### Step 1: Check Canister Logs

```bash
dfx canister logs <canister-id> --network ic
# Look for: "ICRC-3 call failed" messages
# Look for: "SysTransient" or "Couldn't send message" errors
```

#### Step 2: Test Direct Ledger Access

```bash
# Test ckUSDC ledger directly
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai icrc3_get_blocks '(vec {record { start = 448800 : nat; length = 5 : nat }})' --network ic

# Test ckBTC ledger directly
dfx canister call mxzaz-hqaaa-aaaar-qaada-cai icrc3_get_blocks '(vec {record { start = 3111616 : nat; length = 5 : nat }})' --network ic
```

#### Step 3: Monitor Token Position Advancement

```bash
# Check if positions are advancing
dfx canister call <canister-id> get_all_token_blocks --network ic
# Wait 60 seconds
dfx canister call <canister-id> get_all_token_blocks --network ic
# Compare results - stuck positions indicate connectivity issues
```

#### Step 4: Resolution Actions

```bash
# 1. Top up cycles significantly
dfx canister deposit-cycles 400000000000 <canister-id> --network ic

# 2. Temporarily increase polling frequency
dfx canister call <canister-id> set_interval '(30 : nat64)' --network ic

# 3. Monitor for automatic recovery
# Connectivity usually resumes within 2-3 polling cycles

# 4. Restore production settings
dfx canister call <canister-id> set_interval '(500 : nat64)' --network ic
```

### Network Health Monitoring

```bash
# Create monitoring script
#!/bin/bash
while true; do
  echo "=== $(date) ==="
  dfx canister call <canister-id> get_all_token_blocks --network ic
  echo ""
  sleep 60
done
```

## Production Deployment Guide

### Pre-Deployment Checklist

- [ ] **ICP Funding**: Minimum 0.5 ICP in deployer wallet
- [ ] **Identity Setup**: Correct controller identity active
- [ ] **Code Build**: Latest multi-token version built
- [ ] **Network Access**: IC mainnet accessible
- [ ] **Webhook Setup**: Production webhook URL ready

### Deployment Process

#### Step 1: Environment Preparation

```bash
# Set environment
export DFX_WARNING=-mainnet_plaintext_identity
dfx identity use <controller-identity>

# Verify funding
dfx ledger balance --network ic
# Minimum: 0.5 ICP

# Convert to cycles
dfx cycles convert --amount=0.5 --network ic
```

#### Step 2: Canister Creation

```bash
# Create with substantial cycles
dfx canister create icp_subaccount_indexer --network ic --with-cycles 800000000000

# Record canister ID
CANISTER_ID=$(dfx canister id icp_subaccount_indexer --network ic)
echo "Canister ID: $CANISTER_ID"
```

#### Step 3: Deployment

```bash
# Build latest code
pnpm run build:canister

# Deploy with production settings
dfx deploy icp_subaccount_indexer --network ic --argument '(
  variant { Mainnet }, 
  500: nat64,                           # Production interval
  0: nat32,                            # Initial nonce
  "ryjl3-tyaaa-aaaaa-aaaba-cai",      # ICP ledger
  "your-custodian-principal-here"      # Hardcoded custodian
)'
```

#### Step 4: Post-Deployment Configuration

```bash
# Verify token registration
dfx canister call $CANISTER_ID get_registered_tokens --network ic

# Set production webhook URL
dfx canister call $CANISTER_ID set_webhook_url '("https://your-production-webhook.com/callback")' --network ic

# Verify configuration
dfx canister call $CANISTER_ID get_webhook_url --network ic
dfx canister call $CANISTER_ID get_interval --network ic
```

### Production Monitoring Setup

```bash
# Check canister health regularly
dfx canister status $CANISTER_ID --network ic

# Monitor all token advancement
dfx canister call $CANISTER_ID get_all_token_blocks --network ic

# Check transaction processing
dfx canister call $CANISTER_ID get_transactions_count --network ic
```

## Advanced Reference Commands

### Multi-Token Operations

```bash
# Generate subaccounts for all token types
dfx canister call $CANISTER_ID add_subaccount '(opt variant { ICP })' --network ic
dfx canister call $CANISTER_ID add_subaccount '(opt variant { CKUSDC })' --network ic
dfx canister call $CANISTER_ID add_subaccount '(opt variant { CKUSDT })' --network ic
dfx canister call $CANISTER_ID add_subaccount '(opt variant { CKBTC })' --network ic

# Check individual token block positions
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKUSDC })' --network ic
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKUSDT })' --network ic
dfx canister call $CANISTER_ID get_token_next_block_query '(variant { CKBTC })' --network ic

# Update token block positions
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKUSDC }, 448000 : nat64)' --network ic
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKUSDT }, 663000 : nat64)' --network ic
dfx canister call $CANISTER_ID set_token_next_block_update '(variant { CKBTC }, 3111000 : nat64)' --network ic
```

### Diagnostic Commands

```bash
# Comprehensive health check
dfx canister status $CANISTER_ID --network ic
dfx canister logs $CANISTER_ID --network ic
dfx canister call $CANISTER_ID get_all_token_blocks --network ic
dfx canister call $CANISTER_ID get_transactions_count --network ic
dfx canister call $CANISTER_ID get_interval --network ic
dfx canister call $CANISTER_ID get_webhook_url --network ic

# Test direct ledger access
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai icrc3_get_blocks '(vec {record { start = 448800 : nat; length = 5 : nat }})' --network ic
dfx canister call cngnf-vqaaa-aaaar-qag4q-cai icrc3_get_blocks '(vec {record { start = 663000 : nat; length = 5 : nat }})' --network ic
dfx canister call mxzaz-hqaaa-aaaar-qaada-cai icrc3_get_blocks '(vec {record { start = 3111000 : nat; length = 5 : nat }})' --network ic

# Cycle management
dfx cycles balance --network ic
dfx canister deposit-cycles 400000000000 $CANISTER_ID --network ic
```

### Production Operations

```bash
# Execute sweeping operations
dfx canister call $CANISTER_ID sweep --network ic

# Monitor recent transactions
dfx canister call $CANISTER_ID list_transactions '(opt 20)' --network ic

# Emergency interval adjustment
dfx canister call $CANISTER_ID set_interval '(30 : nat64)' --network ic  # Fast testing
dfx canister call $CANISTER_ID set_interval '(500 : nat64)' --network ic # Production
```

## Conclusion

This advanced testing guide represents comprehensive procedures derived from real multi-token testing experience. Following these procedures should result in successful multi-token deployment, proper ICRC-3 integration, and robust production operation.

**Advanced Success Factors:**
1. **Adequate cycle budgeting** for large WASM deployments (800B+ cycles)
2. **Identity management** understanding for upgrades vs operations
3. **ICRC-3 connectivity** monitoring and debugging capabilities
4. **Token-specific configuration** for each supported token type
5. **Production-ready monitoring** and health check procedures

**Remember:** Always maintain sufficient cycles (600B+) for reliable ICRC-3 inter-canister calls and restore production settings (500-second intervals) after testing.

---

**Testing Guide Status: ✅ COMPREHENSIVE - Based on Testing Attempts 8-13**  
**Last Updated:** September 23, 2025  
**Canister Version:** ICSI v2.0.0 with full multi-token ICRC-3 support