#!/bin/bash

# CKUSDT Deposit Test Script using dfx CLI
# This script tests ckUSDT token deposits to the ICSI canister using the dfx identity system

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

echo -e "${ROCKET} Testing CKUSDT Deposit with ICSI Canister"
echo "============================================="

# Check if canister ID is provided
if [ -z "$1" ]; then
    echo -e "${CROSS} Usage: $0 <ICSI_CANISTER_ID> [--network <network>]"
    echo "Example: $0 rdmx6-jaaaa-aaaaa-aaadq-cai --network local"
    exit 1
fi

ICSI_CANISTER_ID="$1"
NETWORK="${3:-local}"  # Default to local network

# Token configurations
CKUSDT_CANISTER_ID="cngnf-vqaaa-aaaar-qag4q-cai"  # Mainnet ckUSDT
if [ "$NETWORK" = "local" ]; then
    # For local testing, you might need to deploy your own ICRC-1 token
    echo -e "${YELLOW} Warning: Using mainnet ckUSDT canister ID for local testing"
    echo "You may need to deploy a local ICRC-1 token for local testing"
fi

CKUSDT_DECIMALS=6
TRANSFER_AMOUNT=100000  # 0.1 ckUSDT in micro-units (6 decimals)
TRANSFER_FEE=10         # ckUSDT fee
MINIMUM_BALANCE=100010  # 0.100010 ckUSDT in micro-units (transfer + fee)

# Get current identity info
PRINCIPAL=$(dfx identity get-principal)
echo -e "${CHECK} Using dfx identity"
echo -e "${PIN} Principal: $PRINCIPAL"

echo -e "\n${MONEY} CKUSDT Token Config:"
echo "   Canister ID: $CKUSDT_CANISTER_ID"
echo "   Symbol: CKUSDT"
echo "   Decimals: $CKUSDT_DECIMALS"
echo "   Network: $NETWORK"

# Function to convert amount from micro-units to CKUSDT for display
ckusdt_from_micro() {
    echo "scale=6; $1 / 1000000" | bc -l
}

# Function to create subaccount array from hex string
hex_to_subaccount_array() {
    local hex="$1"
    local array=""
    
    # Pad to 64 characters (32 bytes)
    while [ ${#hex} -lt 64 ]; do
        hex="0$hex"
    done
    
    for ((i=0; i<64; i+=2)); do
        if [ -n "$array" ]; then
            array="$array,"
        fi
        array="$array$((16#${hex:$i:2}))"
    done
    echo "$array"
}

# Get deposit addresses from ICSI canister
echo -e "\n${MAILBOX} Getting deposit addresses..."

# First, try to add a subaccount for CKUSDT token (might already exist)
dfx canister --network "$NETWORK" call "$ICSI_CANISTER_ID" addSubaccountForToken '(variant { CKUSDT })' >/dev/null 2>&1 || true

# Get nonce for subaccount ID
NONCE_RESULT=$(dfx canister --network "$NETWORK" call "$ICSI_CANISTER_ID" getNonce '()')
NONCE=$(echo "$NONCE_RESULT" | grep -o '[0-9]\+' | head -1)

if [ -z "$NONCE" ]; then
    echo -e "${CROSS} Failed to get nonce from canister"
    exit 1
fi

# Get subaccount ID for CKUSDT
SUBACCOUNT_RESULT=$(dfx canister --network "$NETWORK" call "$ICSI_CANISTER_ID" getSubaccountId "(${NONCE} : nat32, variant { CKUSDT })")
SUBACCOUNT_ID=$(echo "$SUBACCOUNT_RESULT" | sed -n 's/.*Ok = "\([^"]*\)".*/\1/p')

if [ -z "$SUBACCOUNT_ID" ]; then
    echo -e "${CROSS} Failed to get CKUSDT subaccount ID"
    exit 1
fi

# Get ICRC account (deposit address)
DEPOSIT_ADDRESS_RESULT=$(dfx canister --network "$NETWORK" call "$ICSI_CANISTER_ID" getIcrcAccount "(${NONCE} : nat32)")
DEPOSIT_ADDRESS=$(echo "$DEPOSIT_ADDRESS_RESULT" | sed -n 's/.*Ok = "\([^"]*\)".*/\1/p')

if [ -z "$DEPOSIT_ADDRESS" ]; then
    echo -e "${CROSS} Failed to get deposit address"
    exit 1
fi

echo -e "${CHECK} CKUSDT Deposit Address: $DEPOSIT_ADDRESS"
echo "   Subaccount ID: $SUBACCOUNT_ID"

# Get sender's CKUSDT balance
echo -e "\n${MONEY} Checking sender CKUSDT balance..."
BALANCE_RESULT=$(dfx canister --network "$NETWORK" call "$CKUSDT_CANISTER_ID" icrc1_balance_of "(record { owner = principal \"$PRINCIPAL\"; subaccount = null })")
SENDER_BALANCE=$(echo "$BALANCE_RESULT" | grep -o '[0-9]\+' | head -1)

if [ -z "$SENDER_BALANCE" ]; then
    echo -e "${CROSS} Failed to get sender balance"
    exit 1
fi

SENDER_BALANCE_CKUSDT=$(ckusdt_from_micro "$SENDER_BALANCE")
echo "   Balance: $SENDER_BALANCE_CKUSDT CKUSDT"

# Check minimum balance
if [ "$SENDER_BALANCE" -lt "$MINIMUM_BALANCE" ]; then
    MINIMUM_CKUSDT=$(ckusdt_from_micro "$MINIMUM_BALANCE")
    echo -e "${CROSS} Insufficient CKUSDT balance. Need at least $MINIMUM_CKUSDT CKUSDT (including fee)"
    echo "   Current balance: $SENDER_BALANCE_CKUSDT CKUSDT"
    TRANSFER_CKUSDT=$(ckusdt_from_micro "$TRANSFER_AMOUNT")
    FEE_CKUSDT=$(ckusdt_from_micro "$TRANSFER_FEE")
    echo "   Required: $TRANSFER_CKUSDT CKUSDT for transfer + $FEE_CKUSDT CKUSDT for fee"
    exit 1
fi

# Convert subaccount hex to array format
SUBACCOUNT_ARRAY=$(hex_to_subaccount_array "$SUBACCOUNT_ID")
TRANSFER_AMOUNT_CKUSDT=$(ckusdt_from_micro "$TRANSFER_AMOUNT")

echo -e "\n${MONEY} Sending $TRANSFER_AMOUNT_CKUSDT CKUSDT to deposit address..."

# Make the ICRC-1 transfer
TRANSFER_RESULT=$(dfx canister --network "$NETWORK" call "$CKUSDT_CANISTER_ID" icrc1_transfer "
(record {
  to = record {
    owner = principal \"$ICSI_CANISTER_ID\";
    subaccount = opt vec { $SUBACCOUNT_ARRAY }
  };
  amount = $TRANSFER_AMOUNT : nat;
  fee = opt ($TRANSFER_FEE : nat);
  memo = null;
  from_subaccount = null;
  created_at_time = null;
})" 2>&1)

if echo "$TRANSFER_RESULT" | grep -q "Ok"; then
    BLOCK_HEIGHT=$(echo "$TRANSFER_RESULT" | sed -n 's/.*Ok = \([0-9_]*\).*/\1/p' | tr -d '_')
    echo -e "${CHECK} Transfer successful! Block height: $BLOCK_HEIGHT"
elif echo "$TRANSFER_RESULT" | grep -q "InsufficientFunds"; then
    echo -e "${CROSS} Transfer failed: Insufficient funds"
    AVAILABLE_BALANCE=$(echo "$TRANSFER_RESULT" | sed -n 's/.*balance = \([0-9_]*\).*/\1/p' | tr -d '_')
    if [ -n "$AVAILABLE_BALANCE" ]; then
        AVAILABLE_CKUSDT=$(ckusdt_from_micro "$AVAILABLE_BALANCE")
        echo "   Your available balance: $AVAILABLE_CKUSDT CKUSDT"
    fi
    exit 1
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

if echo "$TRANSACTIONS_RESULT" | grep -q "CKUSDT"; then
    echo -e "${CHECK} Found CKUSDT transactions in ICSI canister"
    
    # Get recent CKUSDT transactions
    echo -e "\n${CHART} Recent CKUSDT transactions:"
    echo "$TRANSACTIONS_RESULT" | grep -A 10 -B 5 "CKUSDT" | head -20
else
    echo -e "${YELLOW} No CKUSDT transactions found yet. Transaction may still be processing."
fi

echo -e "\n${CHECK} CKUSDT deposit test completed!"
echo "Note: If no transactions appear immediately, try running again in a few minutes."
echo "The canister indexes transactions periodically."