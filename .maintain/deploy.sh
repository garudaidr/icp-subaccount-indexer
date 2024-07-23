#!/bin/bash

# Function to print colored output
print_colored() {
    COLOR=$1
    MESSAGE=$2
    RESET='\033[0m'
    echo -e "${COLOR}${MESSAGE}${RESET}"
}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'

# Function to check if a command was successful
check_command() {
    if [ $? -eq 0 ]; then
        print_colored "$GREEN" "Success: $1"
    else
        print_colored "$RED" "Error: $1 failed"
        exit 1
    fi
}

# Parse command line arguments
NETWORK="local"
CLEAN_START=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --network) NETWORK="$2"; shift ;;
        --clean) CLEAN_START=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Start the local ICP network if deploying locally
if [ "$NETWORK" = "local" ]; then
    if [ "$CLEAN_START" = true ]; then
        print_colored "$YELLOW" "Starting a clean local ICP network..."
        dfx start --clean --background
    else
        print_colored "$YELLOW" "Starting local ICP network..."
        dfx start --background
    fi
fi

# Create and use minter identity
print_colored "$YELLOW" "Creating minter identity..."
dfx identity new minter

dfx identity use minter
check_command "Use minter identity"

export MINTER_ACCOUNT_ID=$(dfx ledger account-id)
check_command "Get minter account ID"

# Switch to default identity
print_colored "$YELLOW" "Switching to default identity..."
dfx identity use default
check_command "Switch to default identity"

export DEFAULT_ACCOUNT_ID=$(dfx ledger account-id)
check_command "Get default account ID"

# Deploy ICP ledger canister
print_colored "$YELLOW" "Deploying ICP ledger canister..."
dfx deploy --network "$NETWORK" --specified-id ryjl3-tyaaa-aaaaa-aaaba-cai icp_ledger_canister --argument "
  (variant {
    Init = record {
      minting_account = \"$MINTER_ACCOUNT_ID\";
      initial_values = vec {
        record {
          \"$DEFAULT_ACCOUNT_ID\";
          record {
            e8s = 10_000_000_000 : nat64;
          };
        };
      };
      send_whitelist = vec {};
      transfer_fee = opt record {
        e8s = 10_000 : nat64;
      };
      token_symbol = opt \"LICP\";
      token_name = opt \"Local ICP\";
    }
  })
"
check_command "Deploy ICP ledger canister"

# Create and use custodian identity
print_colored "$YELLOW" "Creating custodian identity..."
dfx identity new custodian

dfx identity use custodian
check_command "Use custodian identity"

export CUSTODIAN_PRINCIPAL=$(dfx identity get-principal)
check_command "Get custodian principal"

print_colored "$GREEN" "Custodian Principal: $CUSTODIAN_PRINCIPAL"

# Deploy the backend canister
print_colored "$YELLOW" "Deploying backend canister..."
if [ "$NETWORK" = "ic" ]; then
    dfx deploy icp_prototype_backend --network ic --no-wallet --argument "(variant { Mainnet }, 15 : nat64, 10 : nat32, \"ryjl3-tyaaa-aaaaa-aaaba-cai\", \"$CUSTODIAN_PRINCIPAL\")"
else
    dfx deploy icp_prototype_backend --network "$NETWORK" --argument "(variant { Local }, 15 : nat64, 10 : nat32, \"ryjl3-tyaaa-aaaaa-aaaba-cai\", \"$CUSTODIAN_PRINCIPAL\")"
fi
check_command "Deploy backend canister"

print_colored "$GREEN" "Deployment completed successfully!"