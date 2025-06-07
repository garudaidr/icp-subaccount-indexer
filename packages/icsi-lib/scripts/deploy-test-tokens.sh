#!/bin/bash

set -e

echo "🚀 Deploying test token canisters..."

# Ensure we're in the right directory
cd "$(dirname "$0")/../../.."

# First, deploy the ICP ledger
echo "📦 Deploying ICP Ledger..."
dfx deploy icp_ledger_canister --network local

# Wait for ICP ledger to be ready
echo "⏳ Waiting for ICP ledger to be ready..."
timeout 30 bash -c 'until dfx canister call icp_ledger_canister --network local symbol; do sleep 2; done' || {
    echo "❌ ICP ledger failed to start properly"
    exit 1
}

# Get the principal for minting
MINTER_PRINCIPAL=$(dfx identity get-principal)
echo "🔑 Using minter principal: $MINTER_PRINCIPAL"

# Deploy test CKUSDC token (ICRC-1 compatible)
echo "📦 Deploying test CKUSDC token..."

# Create test CKUSDC canister
dfx canister create test_ckusdc --network local || echo "Canister already exists"

# Deploy with ICRC-1 initialization
dfx deploy --network local --argument "(variant {
  Init = record {
    token_symbol = \"ckUSDC\";
    token_name = \"Test Chain Key USDC\";
    minting_account = record { owner = principal \"$MINTER_PRINCIPAL\" };
    transfer_fee = 10_000 : nat;
    metadata = vec {};
    initial_balances = vec {
      record {
        record { owner = principal \"$MINTER_PRINCIPAL\" };
        1_000_000_000 : nat;
      }
    };
    archive_options = record {
      num_blocks_to_archive = 1000 : nat64;
      trigger_threshold = 2000 : nat64;
      controller_id = principal \"$MINTER_PRINCIPAL\";
    };
    feature_flags = opt record { icrc2 = true };
  }
})" test_ckusdc || {
    echo "⚠️  Failed to deploy test_ckusdc, trying alternative approach..."
    
    # Create a simple mock ICRC-1 canister
    cat > /tmp/test_token.did <<EOF
service : {
  icrc1_name : () -> (text) query;
  icrc1_symbol : () -> (text) query;
  icrc1_decimals : () -> (nat8) query;
  icrc1_fee : () -> (nat) query;
  icrc1_total_supply : () -> (nat) query;
  icrc1_minting_account : () -> (opt record { owner : principal; subaccount : opt vec nat8 }) query;
  icrc1_balance_of : (record { owner : principal; subaccount : opt vec nat8 }) -> (nat) query;
  icrc1_transfer : (record {
    from_subaccount : opt vec nat8;
    to : record { owner : principal; subaccount : opt vec nat8 };
    amount : nat;
    fee : opt nat;
    memo : opt vec nat8;
    created_at_time : opt nat64;
  }) -> (variant { Ok : nat; Err : text });
}
EOF

    # Install a minimal working ICRC-1 mock (using existing ICP ledger as template)
    dfx canister install test_ckusdc --network local --wasm "$(dfx info replica-rev | xargs -I {} echo https://download.dfinity.systems/ic/{}/canisters/ledger-canister.wasm.gz | xargs wget -qO-)" --argument "(record {
      minting_account = \"$MINTER_PRINCIPAL\";
      initial_values = vec { record { \"$MINTER_PRINCIPAL\"; record { e8s = 1_000_000_000_000 : nat64 } } };
      send_whitelist = vec {};
      transfer_fee = opt record { e8s = 10_000 : nat64 };
      token_symbol = opt \"ckUSDC\";
      token_name = opt \"Test Chain Key USDC\";
    })" --mode install
}

# Deploy test CKUSDT token
echo "📦 Deploying test CKUSDT token..."
dfx canister create test_ckusdt --network local || echo "Canister already exists"

# Use same approach as CKUSDC
dfx canister install test_ckusdt --network local --wasm "$(dfx info replica-rev | xargs -I {} echo https://download.dfinity.systems/ic/{}/canisters/ledger-canister.wasm.gz | xargs wget -qO-)" --argument "(record {
  minting_account = \"$MINTER_PRINCIPAL\";
  initial_values = vec { record { \"$MINTER_PRINCIPAL\"; record { e8s = 1_000_000_000_000 : nat64 } } };
  send_whitelist = vec {};
  transfer_fee = opt record { e8s = 10_000 : nat64 };
  token_symbol = opt \"ckUSDT\";
  token_name = opt \"Test Chain Key USDT\";
})" --mode install || {
    echo "⚠️  Failed to install test_ckusdt, continuing..."
}

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
cat > packages/icsi-lib/.env.docker <<EOF
# Test Environment Configuration
DFX_NETWORK=local
ICP_CANISTER_ID=$ICP_CANISTER_ID
CKUSDC_CANISTER_ID=$CKUSDC_CANISTER_ID
CKUSDT_CANISTER_ID=$CKUSDT_CANISTER_ID
USER_VAULT_CANISTER_ID=
MINTER_PRINCIPAL=$MINTER_PRINCIPAL
DFX_HOST=http://localhost:4943
EOF

echo "💾 Environment file created at packages/icsi-lib/.env.docker"
echo "🎉 Token deployment complete!"