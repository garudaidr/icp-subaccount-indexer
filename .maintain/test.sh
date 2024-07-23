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
SKIP_DEPLOY=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --network) NETWORK="$2"; shift ;;
        --skip-deploy) SKIP_DEPLOY=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Run deploy script if not skipped
if [ "$SKIP_DEPLOY" = false ]; then
    print_colored "$YELLOW" "Running deployment script..."
    .maintain/deploy.sh --network "$NETWORK"
    check_command "Run deployment script"
fi

# Set default identity
print_colored "$YELLOW" "Setting default identity..."
dfx identity use default
check_command "Set default identity"

DEFAULT_PRINCIPAL=$(dfx identity get-principal)
check_command "Get default principal"
print_colored "$GREEN" "Default Principal: $DEFAULT_PRINCIPAL"

# Show balance before transfer
print_colored "$YELLOW" "Checking balance before transfer..."
DEFAULT_ACCOUNT_ID=$(dfx ledger account-id)
check_command "Get default account ID"
dfx ledger --network "$NETWORK" balance "$DEFAULT_ACCOUNT_ID"
check_command "Check balance"

# Create a new subaccount-id using index.js
print_colored "$YELLOW" "Creating a new subaccount-id..."
SUBACCOUNT_ID=$(node .maintain/script/index.js --cli add_subaccount | grep -o '[0-9a-f]\{64\}')
check_command "Create new subaccount-id"
print_colored "$GREEN" "New Subaccount ID: $SUBACCOUNT_ID"

# Set webhook URL
print_colored "$YELLOW" "Setting webhook URL..."
read -p "Enter webhook URL: " WEBHOOK_URL
node .maintain/script/index.js --cli set_webhook_url "$WEBHOOK_URL"
check_command "Set webhook URL"

# Perform transfer
print_colored "$YELLOW" "Performing ICP transfer..."
dfx ledger transfer --network "$NETWORK" --amount 1.25 --memo 001 "$SUBACCOUNT_ID"
check_command "Transfer ICP"

# Check balance after transfer
print_colored "$YELLOW" "Checking balance after transfer..."
dfx ledger --network "$NETWORK" balance "$DEFAULT_ACCOUNT_ID"
check_command "Check balance after transfer"

print_colored "$GREEN" "All tests completed successfully!"