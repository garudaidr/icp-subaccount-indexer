#!/bin/bash

# ICP Deposit Test Script using dfx CLI
# This script tests ICP token deposits to the ICSI canister using the dfx identity system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Emojis
ROCKET="🚀"
CHECK="✅"
CROSS="❌"
MONEY="💰"
CLOCK="⏳"
MAILBOX="📬"
CHART="📊"
BELL="🔔"
PIN="📍"

echo -e "${ROCKET} Testing ICP Deposit with ICSI Canister"
echo "=========================================="

# Check if canister ID is provided
if [ -z "$1" ]; then
    echo -e "${CROSS} Usage: $0 <ICSI_CANISTER_ID> [--network <network>]"
    echo "Example: $0 rdmx6-jaaaa-aaaaa-aaadq-cai --network local"
    exit 1
fi

ICSI_CANISTER_ID="$1"
NETWORK="${3:-local}"  # Default to local network

# Token configurations
ICP_CANISTER_ID="ryjl3-tyaaa-aaaaa-aaaba-cai"
if [ "$NETWORK" = "local" ]; then
    # Use local ICP ledger canister ID if available
    ICP_CANISTER_ID=$(dfx canister --network local id icp_ledger 2>/dev/null || echo "ryjl3-tyaaa-aaaaa-aaaba-cai")
fi

ICP_DECIMALS=8
TRANSFER_AMOUNT=10000000  # 0.1 ICP in e8s
TRANSFER_FEE=10000        # 0.0001 ICP fee in e8s
MINIMUM_BALANCE=10010000  # 0.1001 ICP in e8s (transfer + fee)

# Get current identity info
PRINCIPAL=$(dfx identity get-principal)
echo -e "${CHECK} Using dfx identity"
echo -e "${PIN} Principal: $PRINCIPAL"

echo -e "\n${MONEY} ICP Token Config:"
echo "   Canister ID: $ICP_CANISTER_ID"
echo "   Symbol: ICP"
echo "   Decimals: $ICP_DECIMALS"
echo "   Network: $NETWORK"

# Function to convert amount from e8s to ICP for display
icp_from_e8s() {
    echo "scale=8; $1 / 100000000" | bc -l
}

# Function to get account identifier from principal
get_account_id() {
    local principal="$1"
    local subaccount_hex="${2:-}"
    
    if [ -n "$subaccount_hex" ]; then
        # Convert hex to comma-separated array format for dfx
        local subaccount_array=""
        for ((i=0; i<${#subaccount_hex}; i+=2)); do
            if [ -n "$subaccount_array" ]; then
                subaccount_array="$subaccount_array,"
            fi
            subaccount_array="$subaccount_array$((16#${subaccount_hex:$i:2}))"
        done
        echo "principal \"$principal\"; subaccount [$subaccount_array]" | dfx ledger account-id --of-principal -
    else
        dfx ledger account-id --of-principal "$principal"
    fi
}

# Get deposit addresses from ICSI canister
echo -e "\n${MAILBOX} Getting deposit addresses..."

# First, try to add a subaccount for ICP token (might already exist)
dfx canister --network "$NETWORK" call "$ICSI_CANISTER_ID" addSubaccountForToken '(variant { ICP })' >/dev/null 2>&1 || true

# Get nonce for subaccount ID
NONCE_RESULT=$(dfx canister --network "$NETWORK" call "$ICSI_CANISTER_ID" getNonce '()')
NONCE=$(echo "$NONCE_RESULT" | grep -o '[0-9]\+' | head -1)

if [ -z "$NONCE" ]; then
    echo -e "${CROSS} Failed to get nonce from canister"
    exit 1
fi

# Get subaccount ID for ICP
SUBACCOUNT_RESULT=$(dfx canister --network "$NETWORK" call "$ICSI_CANISTER_ID" getSubaccountId "(${NONCE} : nat32, variant { ICP })")
SUBACCOUNT_ID=$(echo "$SUBACCOUNT_RESULT" | sed -n 's/.*Ok = "\([^"]*\)".*/\1/p')

if [ -z "$SUBACCOUNT_ID" ]; then
    echo -e "${CROSS} Failed to get ICP subaccount ID"
    exit 1
fi

# Get ICRC account (deposit address)
DEPOSIT_ADDRESS_RESULT=$(dfx canister --network "$NETWORK" call "$ICSI_CANISTER_ID" getIcrcAccount "(${NONCE} : nat32)")
DEPOSIT_ADDRESS=$(echo "$DEPOSIT_ADDRESS_RESULT" | sed -n 's/.*Ok = "\([^"]*\)".*/\1/p')

if [ -z "$DEPOSIT_ADDRESS" ]; then
    echo -e "${CROSS} Failed to get deposit address"
    exit 1
fi

echo -e "${CHECK} ICP Deposit Address: $DEPOSIT_ADDRESS"
echo "   Subaccount ID: $SUBACCOUNT_ID"

# Get sender's ICP balance
echo -e "\n${MONEY} Checking sender ICP balance..."
SENDER_ACCOUNT_ID=$(get_account_id "$PRINCIPAL")
BALANCE_RESULT=$(dfx canister --network "$NETWORK" call "$ICP_CANISTER_ID" account_balance "(record { account = \"$SENDER_ACCOUNT_ID\" })")
SENDER_BALANCE=$(echo "$BALANCE_RESULT" | grep -o '[0-9]\+' | head -1)

if [ -z "$SENDER_BALANCE" ]; then
    echo -e "${CROSS} Failed to get sender balance"
    exit 1
fi

SENDER_BALANCE_ICP=$(icp_from_e8s "$SENDER_BALANCE")
echo "   Balance: $SENDER_BALANCE_ICP ICP"

# Check minimum balance
if [ "$SENDER_BALANCE" -lt "$MINIMUM_BALANCE" ]; then
    MINIMUM_ICP=$(icp_from_e8s "$MINIMUM_BALANCE")
    echo -e "${CROSS} Insufficient ICP balance. Need at least $MINIMUM_ICP ICP (including fee)"
    echo "   Current balance: $SENDER_BALANCE_ICP ICP"
    echo "   Required: 0.1 ICP for transfer + 0.0001 ICP for fee"
    exit 1
fi

# Calculate deposit account ID with subaccount
DEPOSIT_ACCOUNT_ID=$(get_account_id "$ICSI_CANISTER_ID" "$SUBACCOUNT_ID")
TRANSFER_AMOUNT_ICP=$(icp_from_e8s "$TRANSFER_AMOUNT")

echo -e "\n${MONEY} Sending $TRANSFER_AMOUNT_ICP ICP to deposit address..."

# Make the transfer using dfx ledger transfer
TRANSFER_RESULT=$(dfx ledger --network "$NETWORK" transfer \
    --amount "$TRANSFER_AMOUNT_ICP" \
    --fee 0.0001 \
    --to "$DEPOSIT_ACCOUNT_ID" 2>&1)

if echo "$TRANSFER_RESULT" | grep -q "Transfer sent at block height"; then
    BLOCK_HEIGHT=$(echo "$TRANSFER_RESULT" | grep -o 'block height [0-9]\+' | grep -o '[0-9]\+')
    echo -e "${CHECK} Transfer successful! Block height: $BLOCK_HEIGHT"
else
    echo -e "${CROSS} Transfer failed:"
    echo "$TRANSFER_RESULT"
    exit 1
fi

# Check webhook URL
echo -e "\n${BELL} Checking webhook configuration..."
WEBHOOK_RESULT=$(dfx canister --network "$NETWORK" call "$ICSI_CANISTER_ID" getWebhookUrl '()')
WEBHOOK_URL=$(echo "$WEBHOOK_RESULT" | sed -n 's/.*opt "\([^"]*\)".*/\1/p')
if [ -z "$WEBHOOK_URL" ]; then
    WEBHOOK_URL="Not configured"
fi
echo "   Webhook URL: $WEBHOOK_URL"

# Wait for transaction to be indexed
echo -e "\n${CLOCK} Waiting for transaction to be indexed (30 seconds)..."
sleep 30

# Check balances in ICSI canister
echo -e "\n${MONEY} Checking ICSI balances..."
TRANSACTIONS_RESULT=$(dfx canister --network "$NETWORK" call "$ICSI_CANISTER_ID" getUserVaultTransactions '(0 : nat64)')

if echo "$TRANSACTIONS_RESULT" | grep -q "ICP"; then
    echo -e "${CHECK} Found ICP transactions in ICSI canister"
    
    # Get recent ICP transactions
    echo -e "\n${CHART} Recent ICP transactions:"
    echo "$TRANSACTIONS_RESULT" | grep -A 10 -B 5 "ICP" | head -20
else
    echo -e "${YELLOW} No ICP transactions found yet. Transaction may still be processing."
fi

echo -e "\n${CHECK} ICP deposit test completed!"
echo "Note: If no transactions appear immediately, try running again in a few minutes."
echo "The canister indexes transactions periodically."