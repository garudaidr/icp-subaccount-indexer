#!/bin/bash

set -e

echo "🚀 Deploying test token canisters..."

# Ensure we're in the right directory
cd "$(dirname "$0")/../../.."

# Get the principal for minting
MINTER_PRINCIPAL=$(dfx identity get-principal)
echo "🔑 Using minter principal: $MINTER_PRINCIPAL"

# Update init_arg placeholders in dfx.json with actual principal
sed -i.bak "s/rdmx6-jaaaa-aaaaa-aaadq-cai/$MINTER_PRINCIPAL/g" dfx.json

# Deploy all canisters defined in dfx.json
echo "📦 Deploying ICP Ledger..."
dfx deploy icp_ledger_canister --network local

# Wait for ICP ledger to be ready
echo "⏳ Waiting for ICP ledger to be ready..."
timeout 30 bash -c 'until dfx canister call icp_ledger_canister --network local symbol > /dev/null 2>&1; do sleep 2; done' || {
    echo "❌ ICP ledger failed to start properly"
    exit 1
}

echo "📦 Deploying test CKUSDC token..."
dfx deploy test_ckusdc --network local

echo "📦 Deploying test CKUSDT token..."
dfx deploy test_ckusdt --network local

# Restore original dfx.json
mv dfx.json.bak dfx.json

# Get canister IDs
ICP_CANISTER_ID=$(dfx canister id icp_ledger_canister --network local)
CKUSDC_CANISTER_ID=$(dfx canister id test_ckusdc --network local)
CKUSDT_CANISTER_ID=$(dfx canister id test_ckusdt --network local)

echo "✅ Test tokens deployed successfully!"
echo "📋 Canister IDs:"
echo "   ICP Ledger: $ICP_CANISTER_ID"
echo "   Test ckUSDC: $CKUSDC_CANISTER_ID"
echo "   Test ckUSDT: $CKUSDT_CANISTER_ID"

# Create environment file for tests
cat > packages/icsi-lib/.env.test <<EOF
# Test Environment Configuration
DFX_NETWORK=local
ICP_CANISTER_ID=$ICP_CANISTER_ID
CKUSDC_CANISTER_ID=$CKUSDC_CANISTER_ID
CKUSDT_CANISTER_ID=$CKUSDT_CANISTER_ID
USER_VAULT_CANISTER_ID=
MINTER_PRINCIPAL=$MINTER_PRINCIPAL
DFX_HOST=http://localhost:4943
EOF

echo "💾 Environment file created at packages/icsi-lib/.env.test"
echo "🎉 Token deployment complete!"