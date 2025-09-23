# ICSI Canister Testing Guide - Comprehensive Reference

**Based on Real Testing Attempts 2-7 (June 6, 2025)**

This guide consolidates lessons learned from multiple testing attempts of the ICP Subaccount Indexer (ICSI) canister deployment and validation on IC Mainnet. It provides step-by-step procedures, troubleshooting solutions, and best practices for successful testing.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Prerequisites](#critical-prerequisites)
3. [Deployment Phase](#deployment-phase)
4. [Post-Deployment Setup](#post-deployment-setup)
5. [Testing Procedures](#testing-procedures)
6. [Webhook Testing](#webhook-testing)
7. [Multi-Token Testing](#multi-token-testing)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Production Best Practices](#production-best-practices)
10. [Reference Commands](#reference-commands)

## Executive Summary

This guide addresses the complete testing lifecycle for the ICSI canister, from initial deployment through comprehensive functionality validation. It incorporates critical lessons learned from multiple testing attempts, including cycles management, identity authentication, webhook integration, and multi-token support.

**Key Success Factors:**
- Proper cycles budgeting for large WASM deployments (~460B cycles required)
- Consistent identity management between deployment and testing
- Correct webhook payload format understanding
- Systematic approach to multi-token testing
- Production-ready interval and configuration management

## Critical Prerequisites

### 1. Required Tools and Accounts

- **DFX CLI** (version 0.15.0+)
- **Internet Identity** with funded ICP wallet (minimum 1.0 ICP)
- **pnpm** package manager
- **Node.js** (version 16+)
- **ngrok** (for webhook testing)

### 2. Funding Requirements

| Token Type | Minimum Required | Purpose |
|------------|------------------|---------|
| **ICP** | 1.0 ICP | Cycle conversion + deployment + testing |
| **ckUSDC** | 0.1 ckUSDC | Multi-token deposit testing |
| **ckUSDT** | 0.1 ckUSDT | Multi-token deposit testing |

### 3. Environment Setup

```bash
# Set up DFX warning suppression for mainnet testing
export DFX_WARNING=-mainnet_plaintext_identity

# Verify dfx identity
dfx identity whoami
dfx identity get-principal

# Note: Record your principal for use in deployment
DEPLOYER_PRINCIPAL=$(dfx identity get-principal)
echo "Deployer Principal: $DEPLOYER_PRINCIPAL"
```

## Deployment Phase

### Step 1: Cycles Preparation

**Critical Lesson**: Large WASM files (1.9MB) require significantly more cycles than typical canisters.

```bash
# Check current ICP balance
dfx ledger --network ic balance

# Convert ICP to cycles (minimum 0.5 ICP recommended)
dfx cycles convert --amount=0.5 --network ic

# Verify cycles balance
dfx cycles balance --network ic
# Expected: ~1.8+ TC (trillion cycles)
```

### Step 2: Canister Creation and Deployment

**Critical Lesson**: Never use command substitution in Candid arguments - use hardcoded principals.

```bash
# Create canister with sufficient cycles
dfx canister create icp_subaccount_indexer --network ic --with-cycles 500000000000

# Get your principal and use it as hardcoded string (DO NOT use command substitution)
echo "Use this principal in deployment: $(dfx identity get-principal)"

# Deploy with hardcoded principal (REPLACE WITH YOUR ACTUAL PRINCIPAL)
dfx deploy icp_subaccount_indexer --network ic --argument '(
  variant { Mainnet }, 
  5: nat64, 
  0: nat32, 
  "ryjl3-tyaaa-aaaaa-aaaba-cai", 
  "YOUR-PRINCIPAL-HERE"
)'
```

**Success Criteria:**
- Deployment completes without errors
- Canister status shows "Running"
- Module hash is generated
- Cycles consumption: ~460B cycles

### Step 3: Post-Deployment Verification

```bash
# Check canister status
dfx canister status icp_subaccount_indexer --network ic

# Verify deployment success
dfx canister call icp_subaccount_indexer get_nonce --network ic
# Expected: (variant { Ok = 0 : nat32 })
```

## Post-Deployment Setup

### Step 1: Authorization Configuration

**Critical Lesson**: The post_upgrade function must set the custodian principal correctly.

If you encounter "Unauthorized" errors, upgrade the canister with proper arguments:

```bash
# Add more cycles for upgrade
dfx canister deposit-cycles 200000000000 icp_subaccount_indexer --network ic

# Upgrade canister with proper custodian setup
dfx canister install icp_subaccount_indexer --network ic --mode upgrade \
  --argument '(variant { Mainnet }, 15 : nat64, 10 : nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "YOUR-PRINCIPAL-HERE")'
```

### Step 2: Token Registration

```bash
# Register supported tokens
dfx canister call icp_subaccount_indexer register_token '(variant { ICP }, "ryjl3-tyaaa-aaaaa-aaaba-cai")' --network ic
dfx canister call icp_subaccount_indexer register_token '(variant { CKUSDC }, "xevnm-gaaaa-aaaar-qafnq-cai")' --network ic
dfx canister call icp_subaccount_indexer register_token '(variant { CKUSDT }, "cngnf-vqaaa-aaaar-qag4q-cai")' --network ic

# Verify registration
dfx canister call icp_subaccount_indexer get_registered_tokens --network ic
```

### Step 3: Authorization Verification

```bash
# Test basic authorization
dfx canister call icp_subaccount_indexer canister_status --network ic
# Expected: (variant { Ok = "{{\"message\": \"Canister is operational\"}}" })

dfx canister call icp_subaccount_indexer get_nonce --network ic
# Expected: (variant { Ok = 0 : nat32 })
```

## Testing Procedures

### ICP Deposit Testing

#### Step 1: Configure Testing Environment

```bash
# Set fast polling for testing (REMEMBER TO RESET LATER)
dfx canister call icp_subaccount_indexer set_interval '(30 : nat64)' --network ic

# Generate test subaccount
dfx canister call icp_subaccount_indexer add_subaccount '(opt variant { ICP })' --network ic
# Save the returned subaccount address
```

#### Step 2: Execute Test Transaction

```bash
# Transfer ICP to test subaccount (use address from previous step)
dfx ledger --network ic transfer --amount 0.001 --memo 123456789 SUBACCOUNT_ADDRESS

# Note the block height from transfer result
```

#### Step 3: Optimize Block Processing

```bash
# Set next_block close to your transaction for faster detection
dfx canister call icp_subaccount_indexer set_next_block '(BLOCK_HEIGHT_MINUS_10)' --network ic

# Wait 45 seconds for processing
sleep 45

# Verify transaction detection
dfx canister call icp_subaccount_indexer get_transactions_count --network ic
dfx canister call icp_subaccount_indexer list_transactions '(opt 1)' --network ic
```

#### Step 4: Restore Production Settings

```bash
# CRITICAL: Reset interval for cycle efficiency
dfx canister call icp_subaccount_indexer set_interval '(500 : nat64)' --network ic
```

## Webhook Testing

### Step 1: Understanding Webhook Format

**Critical Lesson**: The canister sends only `tx_hash` as a query parameter, NOT a full JSON payload.

**Expected webhook call:**
```
POST https://your-webhook-url.com/webhook?tx_hash=TRANSACTION_HASH
```

### Step 2: Set Up Webhook Server

```bash
# Start webhook test server (in separate terminal)
cd packages/icsi-lib
pnpm run test:webhook

# This starts ngrok tunnel and Express server
# Note the ngrok URL for configuration
```

### Step 3: Configure Webhook URL

```bash
# Set webhook URL in canister
dfx canister call icp_subaccount_indexer set_webhook_url '("https://your-ngrok-url.ngrok-free.app/webhook")' --network ic

# Verify configuration
dfx canister call icp_subaccount_indexer get_webhook_url --network ic
```

### Step 4: Test Webhook Delivery

1. Execute ICP deposit test (as described above)
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

## Multi-Token Testing

### ckUSDC Testing Setup

#### Prerequisites
- Test wallet funded with at least 0.1 ckUSDC
- Webhook server running (as above)

#### Step 1: Verify ckUSDC Balance

```bash
# Check test wallet ckUSDC balance
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai icrc1_balance_of '(
  record { 
    owner = principal "YOUR-TEST-PRINCIPAL"; 
    subaccount = null 
  }
)' --network ic
```

#### Step 2: Generate ckUSDC Subaccount

```bash
# Generate ICRC-1 format subaccount
dfx canister call icp_subaccount_indexer get_subaccountid '(1 : nat32, opt variant { CKUSDC })' --network ic
# Expected format: canister-id-checksum.1
```

#### Step 3: Execute ckUSDC Transfer

```bash
# Use TypeScript test script or manual dfx command
pnpm run lib:test:usdc

# OR manual transfer:
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai icrc1_transfer '(
  record {
    to = record {
      owner = principal "YOUR-CANISTER-ID";
      subaccount = opt vec { /* 32-byte subaccount */ }
    };
    amount = 100000;  # 0.1 ckUSDC (6 decimals)
    fee = opt 10000;  # 0.01 ckUSDC fee
    memo = null;
    from_subaccount = null;
    created_at_time = null
  }
)' --network ic
```

## Error Analysis & Resolution

This section provides detailed analysis of each error encountered during testing attempts, the root cause investigation, and step-by-step resolution procedures.

### Error 1: Principal Format Parsing Failure (Testing Attempt 2)

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

**Investigation Steps:**
```bash
# Verified principal format was correct
dfx identity get-principal
# Result: gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe

echo "$(dfx identity get-principal)"
# Result: gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe
```

**Resolution:**
```bash
# Use hardcoded principal string instead of command substitution
dfx deploy icp_subaccount_indexer --network ic --argument '(variant { Mainnet }, 5: nat64, 0: nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe")'
```

**Lesson Learned:** Always use hardcoded strings for principals in Candid arguments - never rely on command substitution.

---

### Error 2: Identity Mismatch Authorization Failure (Testing Attempts 2-3)

**Original Error:**
```
Error: Failed to get registered tokens: Unauthorized
```

**Failed Command:**
```bash
pnpm test:icp-deposit
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

**Failed Resolution Attempts:**
1. **Editing post_upgrade function**: Changed custodian to library identity
2. **Building and upgrading**: Multiple attempts with correct Rust compilation
3. **Module hash verification**: Module hash remained unchanged despite successful builds

**Failed Upgrade Issue:**
```bash
cargo build --target wasm32-unknown-unknown --release -p icp_subaccount_indexer
# Result: ✅ Compilation successful

dfx canister install icp_subaccount_indexer --network ic --mode upgrade
# Result: "Module hash 76698fc22904bd82da7c85d5c5315a50b37e8ef101021ce471340a5ee5edfc5c is already installed"

# Issue: DFX upgrade system failed to apply new code despite successful compilation
```

**Final Resolution (Testing Attempt 4):**
```bash
# Modified post_upgrade function to set custodian automatically
# Upgraded with explicit arguments to trigger post_upgrade properly
dfx canister install icp_subaccount_indexer --network ic --mode upgrade \
  --argument '(variant { Mainnet }, 15 : nat64, 10 : nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "gf3g2-eaeha-ii22q-ij5tb-bep3w-xxwgx-h4roh-6c2sm-cx2sw-tppv4-qqe")'
```

**Lesson Learned:** 
- Identity consistency between deployment and testing is critical
- DFX upgrade system can fail silently - always verify module hash changes
- post_upgrade function is essential for proper custodian configuration

---

### Error 3: Webhook Script Payload Parsing Errors (Testing Attempts 5-6)

**Original Error:**
```
WEBHOOK RECEIVED!
==================
💰 Token: undefined
💰 Amount: undefined undefined
📦 Block: undefined
RangeError: Invalid time value
    at Date.toISOString (<anonymous>)
    at /Users/theo/Projects/icp-subaccount-indexer/packages/icsi-lib/test/scripts/testWebhook.ts:89:38
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

**Canister Webhook Implementation:**
```rust
async fn send_webhook(tx_hash: String) -> String {
    let url = WEBHOOK_URL.with(|cell| cell.borrow().get().clone());
    let url_with_param = match Url::parse(&url) {
        Ok(mut parsed_url) => {
            parsed_url.query_pairs_mut().append_pair("tx_hash", &tx_hash);
            parsed_url.to_string()
        }
        // ...
    };
    
    let request = CanisterHttpRequestArgument {
        url: url_with_param.clone(),
        method: HttpMethod::POST,
        headers: vec![],
        body: None,  // ← No JSON body sent
        // ...
    };
}
```

**Failed Script Code:**
```typescript
app.post("/webhook", (req: express.Request, res: express.Response) => {
  const payload: WebhookPayload = req.body; // ← Empty object
  const emoji = getTokenEmoji(payload.tokenType); // ← undefined
  const formattedAmount = formatTokenAmount(payload.amount, payload.tokenType); // ← undefined
  // ... accessing non-existent fields
});
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
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("==================");
  
  // ... rest of implementation
});
```

**Lesson Learned:** 
- Always verify actual webhook payload format from canister implementation
- Canister sends minimal data - enhance if full payload needed
- Add comprehensive debugging for webhook integration

---

### Error 4: Insufficient Token Balance for Multi-Token Testing (Testing Attempt 7)

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

**Additional Discovery:**
```bash
# Check CKUSDC balance
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai icrc1_balance_of '(record { owner = principal "crmc4-uypeq-seqvf-sowpb-x456x-xggrd-dk2u6-dxegr-7rfwm-eyhru-lqe"; subaccount = null })'
# Result: 0 CKUSDC
```

**Root Cause Analysis:**
1. **Insufficient Funding**: Test wallet had 0 ckUSDC balance
2. **Authorization Issue**: Test script used different identity than canister custodian
3. **Multi-Token Requirements**: Each token type requires separate funding

**Investigation Steps:**
```bash
# Verified ckUSDC subaccount format works correctly
dfx canister call y3hne-ryaaa-aaaag-aucea-cai get_subaccountid '(1 : nat32, opt variant { CKUSDC })'
# Result: y3hne-ryaaa-aaaag-aucea-cai-2oqaj5a.1

# Confirmed ICRC-1 textual format vs ICP hex format
# This shows multi-token support is implemented correctly
```

**Resolution Requirements:**
1. **Fund Test Wallet**: Send at least 0.1 ckUSDC to test principal
2. **Fix Authorization**: Ensure test script uses correct identity
3. **Verify Format**: Confirm ICRC-1 vs ICP address format differences

**Lesson Learned:**
- Multi-token testing requires actual token funding for each token type
- Different tokens use different address formats (hex vs ICRC-1 textual)
- Always verify balance before attempting transfers

---

### Error 5: DFX Upgrade System Failures (Testing Attempt 3)

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

**Investigation Steps:**
```bash
# Verified WASM file was built and updated
sha256sum target/wasm32-unknown-unknown/release/icp_subaccount_indexer.wasm
# Result: 9f5454e0375a6ccdc93e4db959123353632d575ae1567baec173e3c5227e5611

# But deployed module hash remained old
dfx canister status icp_subaccount_indexer --network ic | grep "Module hash"
# Result: Module hash: 0x76698fc22904bd82da7c85d5c5315a50b37e8ef101021ce471340a5ee5edfc5c
```

**Failed Resolution Attempts:**
1. **Multiple upgrade attempts**: All claimed success but hash unchanged
2. **Forced rebuild**: WASM updated but deployment didn't pick up changes
3. **Manual method calls**: New methods remained unavailable

**Working Resolution:**
```bash
# Use explicit upgrade with arguments to force proper upgrade
dfx canister install icp_subaccount_indexer --network ic --mode upgrade \
  --argument '(variant { Mainnet }, 15 : nat64, 10 : nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "YOUR-PRINCIPAL")'
```

**Lesson Learned:**
- DFX upgrade system can fail silently despite success messages
- Always verify module hash changes after upgrades
- Use explicit arguments in upgrade mode to force proper upgrade
- Consider reinstall mode if upgrade consistently fails

---

## Troubleshooting Guide

### Issue 1: "Insufficient cycles" During Deployment

**Symptoms:**
- Deployment fails with cycles error
- Error mentions needed cycles amount

**Solution:**
```bash
# Add more cycles to wallet
dfx cycles convert --amount=0.5 --network ic

# Or deposit directly to canister
dfx canister deposit-cycles 500000000000 icp_subaccount_indexer --network ic
```

### Issue 2: "Unauthorized" Errors

**Symptoms:**
- Library calls fail with "Unauthorized"
- dfx calls work but scripts don't

**Root Cause:** Identity mismatch between deployer and test scripts

**Solution:**
```bash
# Check current custodian
dfx canister call icp_subaccount_indexer get_custodian --network ic

# If mismatch, upgrade canister with correct principal
dfx canister install icp_subaccount_indexer --network ic --mode upgrade \
  --argument '(variant { Mainnet }, 15 : nat64, 10 : nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "YOUR-PRINCIPAL")'
```

### Issue 3: Webhook Not Received

**Symptoms:**
- Transactions detected but no webhook delivery
- Webhook server shows no activity

**Solution:**
```bash
# Verify webhook URL is set
dfx canister call icp_subaccount_indexer get_webhook_url --network ic

# Check ngrok tunnel is active
curl -s http://localhost:4040/api/tunnels

# Verify canister can make HTTP outcalls
dfx canister logs icp_subaccount_indexer --network ic
```

### Issue 4: DFX Upgrade Issues

**Symptoms:**
- Upgrade claims success but module hash unchanged
- New methods not available after upgrade

**Solution:**
```bash
# Build first to ensure WASM is updated
cargo build --target wasm32-unknown-unknown --release -p icp_subaccount_indexer

# Check WASM file exists and is recent
ls -la target/wasm32-unknown-unknown/release/icp_subaccount_indexer.wasm

# Upgrade with explicit arguments
dfx canister install icp_subaccount_indexer --network ic --mode upgrade \
  --argument '(variant { Mainnet }, 15 : nat64, 10 : nat32, "ryjl3-tyaaa-aaaaa-aaaba-cai", "YOUR-PRINCIPAL")'
```

### Issue 5: Transaction Not Detected

**Symptoms:**
- Transfers complete but don't appear in canister
- Transaction count doesn't increase

**Solution:**
```bash
# Check current block processing position
dfx canister call icp_subaccount_indexer get_next_block --network ic

# Set next_block closer to recent transactions
dfx canister call icp_subaccount_indexer set_next_block '(RECENT_BLOCK_NUMBER)' --network ic

# Temporarily increase polling frequency
dfx canister call icp_subaccount_indexer set_interval '(30 : nat64)' --network ic

# Wait and check again
sleep 60
dfx canister call icp_subaccount_indexer list_transactions '(opt 5)' --network ic
```

## Production Best Practices

### 1. Cycles Management

```bash
# Monitor cycles regularly
dfx canister status icp_subaccount_indexer --network ic

# Maintain 200B+ cycles buffer
dfx canister deposit-cycles 200000000000 icp_subaccount_indexer --network ic

# Use production-efficient intervals
dfx canister call icp_subaccount_indexer set_interval '(500 : nat64)' --network ic
```

### 2. Security Considerations

- **Never use default identity for production**
- **Store seed phrases securely**
- **Rotate webhook URLs periodically**
- **Monitor unauthorized access attempts**

### 3. Performance Optimization

- **Production intervals**: 300-500 seconds
- **Testing intervals**: 30 seconds (restore immediately after)
- **Block position**: Keep within 1000 blocks of ledger tip
- **Memory monitoring**: Track transaction storage growth

### 4. Monitoring and Alerting

```bash
# Regular health checks
dfx canister status icp_subaccount_indexer --network ic
dfx canister call icp_subaccount_indexer canister_status --network ic
dfx canister call icp_subaccount_indexer get_transactions_count --network ic

# Webhook validation
curl -s YOUR_WEBHOOK_URL/status

# Cycle balance monitoring
# Set up alerts when balance < 200B cycles
```

## Reference Commands

### Essential Testing Commands

```bash
# Environment setup
export DFX_WARNING=-mainnet_plaintext_identity
dfx identity use default

# Canister management
dfx canister status CANISTER_ID --network ic
dfx canister deposit-cycles 200000000000 CANISTER_ID --network ic

# Configuration
dfx canister call CANISTER_ID set_interval '(30 : nat64)' --network ic
dfx canister call CANISTER_ID set_webhook_url '("URL")' --network ic
dfx canister call CANISTER_ID set_next_block '(BLOCK_NUM : nat64)' --network ic

# Transaction testing
dfx canister call CANISTER_ID add_subaccount '(opt variant { ICP })' --network ic
dfx ledger --network ic transfer --amount 0.001 --memo 123 SUBACCOUNT
dfx canister call CANISTER_ID list_transactions '(opt 5)' --network ic

# Token balance checks
dfx canister call xevnm-gaaaa-aaaar-qafnq-cai icrc1_balance_of '(record { owner = principal "PRINCIPAL"; subaccount = null })' --network ic

# Webhook testing
pnpm run lib:test:webhook
curl -s http://localhost:3000/status
```

### Quick Debugging Commands

```bash
# Check authorization
dfx canister call CANISTER_ID get_custodian --network ic
dfx canister call CANISTER_ID canister_status --network ic

# Check configuration
dfx canister call CANISTER_ID get_registered_tokens --network ic
dfx canister call CANISTER_ID get_interval --network ic
dfx canister call CANISTER_ID get_webhook_url --network ic

# Check transaction processing
dfx canister call CANISTER_ID get_next_block --network ic
dfx canister call CANISTER_ID get_transactions_count --network ic
```

## Conclusion

This testing guide represents battle-tested procedures derived from real deployment and testing experience. Following these procedures should result in successful canister deployment, proper authorization setup, and comprehensive functionality validation.

**Key Success Factors:**
1. **Adequate cycles budgeting** for large WASM deployments
2. **Consistent identity management** throughout testing
3. **Proper webhook format understanding** and implementation
4. **Systematic approach** to multi-token testing
5. **Production-ready configuration** management

**Remember:** Always restore production settings (500-second intervals) after testing to ensure cost-efficient operation.

---

**Testing Guide Status: ✅ COMPREHENSIVE - Based on Testing Attempts 2-7**  
**Last Updated:** June 6, 2025  
**Canister Version:** ICSI v0.1.0 with multi-token support