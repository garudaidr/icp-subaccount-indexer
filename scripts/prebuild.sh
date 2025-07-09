#!/bin/bash

set -e

echo "🔍 Running prebuild checks..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Check if we're on local network
NETWORK="${DFX_NETWORK:-local}"

if [ "$NETWORK" = "local" ]; then
    echo "📦 Checking for required test canisters..."
    
    # Check if local replica is running
    if ! dfx ping > /dev/null 2>&1; then
        echo "⚠️  Local replica is not running. Please run 'dfx start' first."
        echo "⚠️  Skipping test canister deployment for now."
        echo "📝 Note: You'll need to deploy test canisters manually if required."
    else
        # Check if .dfx/local directory exists
        if [ ! -d ".dfx/local/canisters" ]; then
            mkdir -p .dfx/local/canisters
        fi
        
        # Check if test token canisters are deployed
        MISSING_CANISTERS=()
        
        for canister in test_ckusdc test_ckusdt test_ckbtc; do
            if [ ! -f ".dfx/local/canisters/${canister}/${canister}.did" ]; then
                MISSING_CANISTERS+=("$canister")
            fi
        done
        
        if [ ${#MISSING_CANISTERS[@]} -gt 0 ]; then
            echo "⚠️  Missing canisters: ${MISSING_CANISTERS[@]}"
            echo "📦 Deploying test token canisters..."
            
            # Deploy the test tokens using the existing script
            if [ -f "packages/icsi-lib/scripts/deploy-test-tokens.sh" ]; then
                bash packages/icsi-lib/scripts/deploy-test-tokens.sh
            else
                echo "❌ Deploy test tokens script not found!"
                exit 1
            fi
        else
            echo "✅ All test canisters are already deployed"
        fi
    fi
else
    echo "📦 Non-local network detected. Skipping test canister deployment."
fi

# Now run dfx generate only for canisters that exist
echo "🔧 Generating type declarations..."

# For non-local networks or when replica is not running, only generate for main canister
if [ "$NETWORK" != "local" ] || ! dfx ping > /dev/null 2>&1; then
    echo "📝 Generating types for main canister only..."
    dfx generate icp_subaccount_indexer 2>/dev/null || true
else
    # Generate for all canisters
    dfx generate
fi

echo "✅ Prebuild complete!"