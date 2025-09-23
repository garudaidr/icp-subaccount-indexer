# ICSI Testing Guide

**Based on Real Testing Attempts 2-13 (June-September 2025)**

This guide consolidates lessons learned from extensive testing of the ICP Subaccount Indexer (ICSI) canister, including multi-token support, ICRC-3 integration, canister upgrades, and production deployment challenges. The procedures and error resolutions documented here are derived from 13 real testing attempts archived in `docs/logs/`.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Prerequisites and Environment Setup](#prerequisites-and-environment-setup)
3. [Deployment Procedures](#deployment-procedures)
4. [Multi-Token Testing](#multi-token-testing)
5. [Webhook Integration Testing](#webhook-integration-testing)
6. [Canister Upgrade Procedures](#canister-upgrade-procedures)
7. [Error Analysis](#error-analysis)
8. [Production Deployment Guide](#production-deployment-guide)
9. [Advanced Testing Procedures](#advanced-testing-procedures)
10. [Reference Commands](#reference-commands)

## Executive Summary

This guide addresses the complete testing lifecycle for the ICSI canister, from initial deployment through multi-token functionality validation. It incorporates critical lessons learned from 13 documented testing attempts, including cycles management, identity authentication, webhook integration, ICRC-3 connectivity, and production deployment strategies.

**Key Success Factors:**

- Large WASM files (1.9MB) require ~800B cycles for deployment
- Multi-token indexing requires separate ICRC-3 ledger monitoring
- ICRC-3 inter-canister calls can fail with network connectivity issues
- Canister upgrades require careful identity management and cycle planning
- Webhook format sends transaction hash as query parameter, not JSON body
- Different token types use different address formats and fee structures

## Prerequisites and Environment Setup

### 1. Required Tools and Funding

| Component       | Requirement     | Purpose                                 |
| --------------- | --------------- | --------------------------------------- |
| **DFX CLI**     | Version 0.15.0+ | IC SDK for deployment and interaction   |
| **ICP Balance** | 1.0+ ICP        | Cycle conversion + deployment + testing |
| **ckUSDC**      | 0.1+ ckUSDC     | Multi-token deposit testing             |
| **ckUSDT**      | 0.1+ ckUSDT     | Multi-token deposit testing             |
| **ckBTC**       | 0.001+ ckBTC    | Bitcoin multi-token testing             |
| **pnpm**        | Version 8.0.0+  | Package manager for workspace           |
| **Node.js**     | Version 16+     | For TypeScript test scripts             |
| **ngrok**       | Latest          | Webhook testing tunnel                  |

### 2. Token Ledger Information

| Token Type | Ledger Canister ID            | Standard | Fee          | Decimals | Address Format        |
| ---------- | ----------------------------- | -------- | ------------ | -------- | --------------------- |
| **ICP**    | `ryjl3-tyaaa-aaaaa-aaaba-cai` | Native   | 10,000 e8s   | 8        | Hex AccountIdentifier |
| **ckUSDC** | `xevnm-gaaaa-aaaar-qafnq-cai` | ICRC-1   | 10,000 micro | 6        | ICRC-1 textual        |
| **ckUSDT** | `cngnf-vqaaa-aaaar-qag4q-cai` | ICRC-1   | 10,000 micro | 6        | ICRC-1 textual        |
| **ckBTC**  | `mxzaz-hqaaa-aaaar-qaada-cai` | ICRC-1   | 10 sat       | 8        | ICRC-1 textual        |

### 3. Environment Configuration

```bash
# Set up environment for testing
export DFX_WARNING=-mainnet_plaintext_identity

# Verify identity configuration
dfx identity list
dfx identity whoami
dfx identity get-principal

# Record your principal for deployment arguments
DEPLOYER_PRINCIPAL=$(dfx identity get-principal)
echo "Deployer Principal: $DEPLOYER_PRINCIPAL"

# Check cycles balance (need substantial amount for large WASM)
dfx cycles balance --network ic
# Minimum required: 1.0 TC (trillion cycles)
```

## Deployment Procedures

### Basic Deployment

#### Step 1: Cycles Preparation

**Critical Discovery**: Large WASM files (1.9MB) require significantly more cycles than typical canisters.

```bash
# Check current ICP balance
dfx ledger --network ic balance

# Convert substantial ICP to cycles
dfx cycles convert --amount=0.5 --network ic

# Verify cycles balance
dfx cycles balance --network ic
# Expected: ~1.8+ TC (trillion cycles)
```

#### Step 2: Canister Creation and Deployment

**Critical Lesson**: Never use command substitution in Candid arguments - use hardcoded principals.

```bash
# Create canister with sufficient cycles
dfx canister create icp_subaccount_indexer --network ic --with-cycles 500000000000

# Get your principal and use it as hardcoded string (DO NOT use command substitution)
echo "Use this principal in deployment: $(dfx identity get-principal)"

# Deploy with hardcoded principal (REPLACE WITH YOUR ACTUAL PRINCIPAL)
dfx deploy icp_subaccount_indexer --network ic --argument '(
  variant { Mainnet },
  500: nat64,                           # Production interval
  0: nat32,                            # Initial nonce
  "ryjl3-tyaaa-aaaaa-aaaba-cai",      # ICP ledger
  "YOUR-PRINCIPAL-HERE"               # Hardcoded custodian
)'
```

### Advanced Deployment for Large WASM

For production deployments with the full 1.9MB WASM:

```bash
# Step 1: Create canister with substantial cycles
dfx canister create icp_subaccount_indexer --network ic --with-cycles 800000000000

# Step 2: Build latest code
pnpm run build:canister

# Step 3: Deploy with production settings
dfx deploy icp_subaccount_indexer --network ic --argument '(
  variant { Mainnet },
  500: nat64,                           # Production interval
  0: nat32,                            # Initial nonce
  "ryjl3-tyaaa-aaaaa-aaaba-cai",      # ICP ledger
  "your-custodian-principal-here"      # Hardcoded custodian
)'
```

#### Cycle Requirements Breakdown

- **Initial canister creation**: 500B cycles
- **WASM installation**: ~460B cycles
- **Total required**: ~960B cycles minimum
- **Recommended**: 800B+ cycles for safety

### Post-Deployment Verification

```bash
# Check canister status
dfx canister status icp_subaccount_indexer --network ic

# Verify token registration
dfx canister call icp_subaccount_indexer get_registered_tokens --network ic

# Test basic authorization
dfx canister call icp_subaccount_indexer get_nonce --network ic
# Expected: (variant { Ok = 0 : nat32 })
```

## Multi-Token Testing

### Multi-Token Architecture Understanding

Each token type maintains independent processing state:

- **Separate Block Tracking**: Each token has its own `next_block` counter
- **Independent Timers**: All tokens processed in single timer but with separate logic
- **Token-Specific APIs**: ICP uses `query_blocks`, ICRC tokens use `icrc3_get_blocks`
- **Format Differences**: ICP uses hex addresses, ICRC tokens use textual format

### ICP Testing Workflow

#### Step 1: Configure Testing Environment

```bash
# Set fast polling for testing (REMEMBER TO RESET LATER)
dfx canister call icp_subaccount_indexer set_interval '(30 : nat64)' --network ic

# Generate test subaccount
dfx canister call icp_subaccount_indexer add_subaccount '(opt variant { ICP })' --network ic
# Returns hex AccountIdentifier format
```

#### Step 2: Execute Test Transaction

```bash
# Transfer ICP to test subaccount (use address from previous step)
dfx ledger --network ic transfer --amount 0.001 --memo 123456789 SUBACCOUNT_ADDRESS

# Note the block height from transfer result
```

#### Step 3: Verify Transaction Detection

```bash
# Wait 45 seconds for processing
sleep 45

# Check transaction detection
dfx canister call icp_subaccount_indexer get_transactions_count --network ic
dfx canister call icp_subaccount_indexer list_transactions '(opt 10)' --network ic
```

### ckUSDC Testing Workflow

Based on successful testing procedures:

#### Step 1: Generate ICRC-1 Subaccount

```bash
dfx canister call icp_subaccount_indexer add_subaccount '(opt variant { CKUSDC })' --network ic
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
dfx canister call icp_subaccount_indexer set_token_next_block_update '(variant { CKUSDC }, 366986 : nat64)' --network ic
```

### ckBTC Testing Workflow

#### Step 1: Generate ckBTC Subaccount

```bash
dfx canister call icp_subaccount_indexer add_subaccount '(opt variant { CKBTC })' --network ic
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

### Subaccount Format Differences

**ICP Subaccounts:**

- Format: 64-character hex string
- Example: `39ef9f41bd7cb7de22a29e9c3a47346fe6115e8918a6fb248895a17005d82baa`
- Generated via: `AccountIdentifier::to_hex()`

**ICRC-1 Subaccounts:**

- Format: `{canister_principal}-{crc32_checksum}.{subaccount_index}`
- Example: `y3hne-ryaaa-aaaag-aucea-cai-2tg4b3i.5`
- Generated via: `IcrcAccount::to_text()`

### Restore Production Settings

```bash
# CRITICAL: Reset interval for cycle efficiency
dfx canister call icp_subaccount_indexer set_interval '(500 : nat64)' --network ic
```

## Webhook Integration Testing

### Understanding Webhook Format

**Critical Discovery**: The canister sends only `tx_hash` as a query parameter, NOT a full JSON payload.

**Expected webhook call:**

```
POST https://your-webhook-url.com/webhook?tx_hash=TRANSACTION_HASH
```

### Webhook Testing Setup

#### Step 1: Start Webhook Server

```bash
# Start webhook test server (in separate terminal)
cd packages/icsi-lib
pnpm run test:webhook

# This starts ngrok tunnel and Express server
# Note the ngrok URL for configuration
```

#### Step 2: Configure Webhook URL

```bash
# Set webhook URL in canister
dfx canister call icp_subaccount_indexer set_webhook_url '("https://your-ngrok-url.ngrok-free.app/webhook")' --network ic

# Verify configuration
dfx canister call icp_subaccount_indexer get_webhook_url --network ic
```

#### Step 3: Test Webhook Delivery

1. Execute any token deposit test (as described above)
2. Monitor webhook server output for received notifications
3. Verify transaction hash is delivered correctly

**Expected webhook server output:**

```
🔔 WEBHOOK RECEIVED!
==================
🔗 Transaction Hash: 72c4d983a2c865d008df5767a771e8b786501ea7760720d727c067b450611eb8

📋 Request Details:
Query Parameters: { tx_hash: '72c4d983a2c865d008df5767a771e8b786501ea7760720d727c067b450611eb8' }
Method: POST
URL: /webhook?tx_hash=72c4d983a2c865d008df5767a771e8b786501ea7760720d727c067b450611eb8
==================
```

## Canister Upgrade Procedures

### Pre-Upgrade Preparation

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

## Error Analysis

This section provides detailed analysis of all major errors encountered during testing attempts 2-13, with step-by-step resolution procedures.

### Error 1: Principal Format Parsing Failure ([Testing Attempt 2](logs/TESTING_ATTEMPT_2.md))

**Original Error:**

```
Error from Canister y3hne-ryaaa-aaaag-aucea-cai: Canister called `ic0.trap` with message: 'Panicked at 'Invalid custodian principal: InvalidBase32', src/icp_subaccount_indexer/src/lib.rs:808:51'
```

**Failed Command:**

```bash
dfx deploy icp_subaccount_indexer --network ic --argument '(variant { Mainnet }, 5: nat64, 0: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "$(dfx identity get-principal)")'
```

**Root Cause Analysis:**

1. **Command Substitution Issue**: The `$(dfx identity get-principal)` was not being processed correctly within Candid argument parsing
2. **Canister Initialization**: The init function was rejecting the principal due to invalid Base32 format
3. **DFX Behavior**: dfx doesn't properly handle shell command substitution within Candid syntax

**Resolution:**

```bash
# Use hardcoded principal string instead of command substitution
dfx deploy icp_subaccount_indexer --network ic --argument '(variant { Mainnet }, 5: nat64, 0: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe")'
```

**Lesson Learned:** Always use hardcoded strings for principals in Candid arguments - never rely on command substitution.

---

### Error 2: Identity Mismatch Authorization Failure ([Testing Attempts 2-3](logs/TESTING_ATTEMPT_2.md))

**Original Error:**

```
Error: Failed to get registered tokens: Unauthorized
```

**Root Cause Analysis:**

1. **Identity Mismatch**: The canister was deployed with dfx identity as custodian
2. **Library Identity**: Test scripts used different seed phrase generating different principal
3. **Authentication Flow**: Canister's `authenticate()` function checks caller against stored custodian principal

**Investigation Steps:**

```bash
# Check dfx identity
dfx identity get-principal
# Result: gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe

# Check library identity (from .env seed phrase)
# Generated principal: a6nt4-w4isk-ugybk-trfuq-42piz-fnsxq-jenv4-hnruq-j2xaz-jdipw-uae

# Verified mismatch between deployer and library identities
```

**Resolution:**

```bash
# Modified post_upgrade function to set custodian automatically
# Upgraded with explicit arguments to trigger post_upgrade properly
dfx canister install icp_subaccount_indexer --network ic --mode upgrade \
  --argument '(variant { Mainnet }, 15 : nat64, 10 : nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe")'
```

**Lesson Learned:**

- Identity consistency between deployment and testing is critical
- post_upgrade function is essential for proper custodian configuration

---

### Error 3: Webhook Script Payload Parsing Errors ([Testing Attempts 5-6](logs/TESTING_ATTEMPT_5.md))

**Original Error:**

```
WEBHOOK RECEIVED!
==================
💰 Token: undefined
💰 Amount: undefined undefined
📦 Block: undefined
RangeError: Invalid time value
    at Date.toISOString (<anonymous>)
```

**Root Cause Analysis:**

1. **Payload Format Mismatch**: Webhook script expected complete JSON payload
2. **Canister Implementation**: Canister only sends `tx_hash` as query parameter
3. **Script Assumptions**: Script assumed structured data in request body

**Investigation Steps:**

```bash
# Analyzed canister webhook implementation (lib.rs:501-557)
# Found: send_webhook() appends only tx_hash as query parameter
# Body: None (empty)
# Method: POST
```

**Resolution:**

```typescript
app.post("/webhook", (req: express.Request, res: express.Response) => {
  // Extract tx_hash from query parameters instead of body
  const txHash = req.query.tx_hash as string;
  const payload = req.body; // Will be empty {}

  console.log("\n🔔 WEBHOOK RECEIVED!");
  console.log("==================");

  if (txHash) {
    console.log(`🔗 Transaction Hash: ${txHash}`);
  }

  // Log raw request details for debugging
  console.log("\n📋 Request Details:");
  console.log("Query Parameters:", req.query);
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("==================");
});
```

**Lesson Learned:**

- Always verify actual webhook payload format from canister implementation
- Canister sends minimal data - enhance if full payload needed

---

### Error 4: Multi-Token Transfer Success but Detection Failure ([Testing Attempts 8-9](logs/TESTING_ATTEMPT_8.md))

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

### Error 5: Large WASM Deployment Cycle Exhaustion ([Testing Attempt 2](logs/TESTING_ATTEMPT_2.md))

**Original Error:**

```
Error: Canister is out of cycles: requested 3_799_393_530 cycles but the available balance is 99_998_684_000 cycles and at least 230_000_000_000 cycles are required to keep the canister running
```

**Root Cause Analysis:**

1. **Large WASM Size**: 1.9MB file vs typical 200-500KB canisters
2. **Exponential Costs**: IC cycle costs scale non-linearly with WASM size
3. **Complex Initialization**: Heavy init function with network setup and timer initialization

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

### Error 6: ICRC-3 Inter-Canister Call Failures ([Testing Attempt 13](logs/TESTING_ATTEMPT_13.md))

**Original Error:**

```
[954849. 2025-09-22T01:17:44.124393783Z]: ICRC-3 call failed: (SysTransient, "Couldn't send message")
[954850. 2025-09-22T01:17:44.124393783Z]: ERROR in query_token_ledger for CKUSDT:
[954851. 2025-09-22T01:17:44.124393783Z]:   Rejection code: SysTransient
[954852. 2025-09-22T01:17:44.124393783Z]:   Error message: Couldn't send message
```

**Root Cause Analysis:**

1. **Network Connectivity**: Inter-canister calls failing with "Couldn't send message"
2. **Resource Constraints**: Despite having 227B cycles, calls were failing
3. **Subnet Communication**: Possible temporary network issues between subnets

**Resolution:**

```bash
# Top up cycles significantly (even though it seemed sufficient)
dfx canister deposit-cycles 400000000000 <canister-id> --network ic
# New balance: 625B cycles

# Automatic recovery - no manual intervention needed!
# Pollers started working immediately after cycle top-up
```

**Lesson Learned:** ICRC-3 inter-canister calls may require higher cycle thresholds than calculated - maintain 600B+ cycles for reliability.

---

### Error 7: Token Block Processing Stuck at Archived Positions ([Testing Attempt 12](logs/TESTING_ATTEMPT_12.md))

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

**Resolution:**

```bash
# Set to correct current block positions
dfx canister call <canister-id> set_token_next_block_update '(variant { CKUSDC }, 391300 : nat64)' --network ic
dfx canister call <canister-id> set_token_next_block_update '(variant { CKUSDT }, 524100 : nat64)' --network ic

# For ICP, use sweep function to find current block
dfx canister call <canister-id> sweep --network ic
# Shows recent blocks, use for ICP position update
dfx canister call <canister-id> set_token_next_block_update '(variant { ICP }, 25288400 : nat64)' --network ic
```

**Lesson Learned:** Always verify actual ledger current blocks before setting token positions - archived blocks cause silent failures.

---

### Error 8: Identity Management and Controller Confusion ([Testing Attempt 11](logs/TESTING_ATTEMPT_11.md))

**Original Error:**

```
Error: Only the controllers of the canister can control it.
Controller identity required for canister operations.
```

**Root Cause Analysis:**

1. **Identity Confusion**: Using operator identity for controller operations
2. **Multiple Identity Types**: Different identities serve different purposes
3. **Corrupted Configuration**: identity.json file was corrupted

**Resolution:**

```bash
# Use correct controller identity for upgrades
dfx identity use STAGING_DEPLOYER

# Execute successful upgrade
dfx canister install uiz2m-baaaa-aaaal-qjbxq-cai --network ic \
  --wasm target/wasm32-unknown-unknown/release/icp_subaccount_indexer.wasm \
  --argument '(variant { Mainnet }, 15: nat64, 25002500: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "pztcx-5wpjw-ko6rv-3cjff-466eb-4ywbn-a5jww-rs6yy-ypk4a-ceqfb-nqe")' \
  --mode upgrade

# Switch back to operations identity
dfx identity use testnet_custodian
```

**Lesson Learned:**

- **STAGING_DEPLOYER**: For canister upgrades (controller)
- **testnet_custodian**: For canister operations (custodian)
- Always verify principal mappings before operations

---

### Error 9: Fee Amount Confusion for Different Token Types ([Testing Attempts 8-9](logs/TESTING_ATTEMPT_8.md))

**Original Error:**

```
(variant { Err = variant { BadFee = record { expected_fee = 10_000 : nat } } })
```

**Root Cause Analysis:**

1. **Token-Specific Fees**: Each token type has different fee structures
2. **Documentation Confusion**: Fees expressed in different units
3. **Decimal Differences**: Tokens have different decimal places

**Fee Structure Breakdown:**

| Token      | Fee Amount   | Fee in Base Units | Fee Description     |
| ---------- | ------------ | ----------------- | ------------------- |
| **ICP**    | 10,000 e8s   | 0.0001 ICP        | Standard ledger fee |
| **ckUSDC** | 10,000 micro | 0.01 ckUSDC       | 1% of transfer      |
| **ckUSDT** | 10,000 micro | 0.01 ckUSDT       | 1% of transfer      |
| **ckBTC**  | 10 sat       | 0.0000001 ckBTC   | Bitcoin network fee |

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

---

### Error 10: DFX Upgrade System Failures ([Testing Attempt 3](logs/TESTING_ATTEMPT_3.md))

**Original Error Pattern:**

```bash
cargo build --target wasm32-unknown-unknown --release -p icp_subaccount_indexer
# Result: ✅ Finished `release` profile [optimized] target(s) in 4.26s

dfx canister install icp_subaccount_indexer --network ic --mode upgrade
# Result: Module hash 76698fc22904bd82da7c85d5c5315a50b37e8ef101021ce471340a5ee5edfc5c is already installed.

# New methods added to code were not available
dfx canister call icp_subaccount_indexer set_custodian_principal '("principal")'
# Result: Error: Canister has no update method 'set_custodian_principal'
```

**Root Cause Analysis:**

1. **Build vs Deploy Disconnect**: Cargo build succeeded but dfx didn't pick up new WASM
2. **Module Hash Unchanged**: Same hash indicated no actual code update occurred
3. **Caching Issue**: DFX potentially cached old WASM despite successful compilation

**Resolution:**

```bash
# Use explicit upgrade with arguments to force proper upgrade
dfx canister install icp_subaccount_indexer --network ic --mode upgrade \
  --argument '(variant { Mainnet }, 15 : nat64, 10 : nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "YOUR-PRINCIPAL")'
```

**Lesson Learned:**

- DFX upgrade system can fail silently despite success messages
- Always verify module hash changes after upgrades
- Use explicit arguments in upgrade mode to force proper upgrade

---

### Error 11: Insufficient Token Balance for Multi-Token Testing ([Testing Attempt 7](logs/TESTING_ATTEMPT_7.md))

**Original Error:**

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

**Root Cause Analysis:**

1. **Insufficient Funding**: Test wallet had 0 ckUSDC balance
2. **Authorization Issue**: Test script used different identity than canister custodian
3. **Multi-Token Requirements**: Each token type requires separate funding

**Resolution Requirements:**

1. **Fund Test Wallet**: Send at least 0.1 ckUSDC to test principal
2. **Fix Authorization**: Ensure test script uses correct identity
3. **Verify Format**: Confirm ICRC-1 vs ICP address format differences

**Lesson Learned:**

- Multi-token testing requires actual token funding for each token type
- Different tokens use different address formats (hex vs ICRC-1 textual)
- Always verify balance before attempting transfers

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

## Advanced Testing Procedures

### ICRC-3 Connectivity Debugging

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

## Reference Commands

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
# Health check
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

### Quick Testing Workflow

```bash
# 1. Generate test wallet
pnpm run lib:generate:wallet

# 2. Fund wallet with test tokens

# 3. Deploy canister
./scripts/deploy-mainnet.sh deploy

# 4. Configure environment
echo 'USER_VAULT_CANISTER_ID="your-canister-id"' >> packages/icsi-lib/.env.test

# 5. Start webhook server
pnpm run lib:test:webhook

# 6. Test deposits
pnpm run lib:test:icp
pnpm run lib:test:usdc
pnpm run lib:test:usdt

# 7. Restore production settings
dfx canister call CANISTER_ID set_interval '(500 : nat64)' --network ic
```

## Best Practices and Key Lessons

### Advanced Success Factors

1. **Adequate cycle budgeting** for large WASM deployments (800B+ cycles)
2. **Identity management** understanding for upgrades vs operations
3. **ICRC-3 connectivity** monitoring and debugging capabilities
4. **Token-specific configuration** for each supported token type
5. **Production-ready monitoring** and health check procedures

### Security Considerations

- **Never use test wallets for production funds**
- **Rotate webhook URLs periodically**
- **Monitor unauthorized access attempts**
- **Store seed phrases securely**

### Performance Optimization

- **Production intervals**: 300-500 seconds
- **Testing intervals**: 30 seconds (restore immediately after)
- **Block position**: Keep within 1000 blocks of ledger tip
- **Cycle buffer**: Maintain 600B+ cycles for ICRC-3 reliability

### Remember

Always maintain sufficient cycles (600B+) for reliable ICRC-3 inter-canister calls and restore production settings (500-second intervals) after testing.

---

**Testing Guide Status: ✅ COMPREHENSIVE - Based on Testing Attempts 1-13**  
**Source Documentation**: All procedures derived from real testing attempts archived in `docs/logs/`  
**Last Updated**: September 23, 2025  
**Canister Version**: ICSI v2.0.0 with full multi-token ICRC-3 support
