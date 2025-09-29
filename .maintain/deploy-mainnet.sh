#!/bin/bash

# Deploy or Upgrade ICSI Canister on Mainnet
# Usage: ./.maintain/deploy-mainnet.sh [deploy|upgrade]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
MODE=${1:-deploy}
NETWORK="ic"
POLLING_INTERVAL=500  # Initial interval (500 seconds = ~8 minutes) adjust as needed
BLOCK_BATCH_SIZE=0    # Initial nonce
ICP_LEDGER_CANISTER="ryjl3-tyaaa-aaaaa-aaaba-cai"
REQUIRED_CYCLES=800000000000  # 800B cycles for large WASM deployment
REQUIRED_ICP=0.5      # Minimum ICP needed for deployment

echo -e "${GREEN}ICSI Canister Mainnet Deployment/Upgrade Script${NC}"
echo -e "${YELLOW}Mode: $MODE${NC}"
echo -e "${YELLOW}Network: $NETWORK${NC}"

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo -e "${RED}Error: dfx is not installed${NC}"
    exit 1
fi

# Check if CUSTODIAN identity exists
if ! dfx identity list | grep -q "CUSTODIAN"; then
    echo -e "${YELLOW}Creating CUSTODIAN identity...${NC}"
    dfx identity new CUSTODIAN
fi

# Use CUSTODIAN identity for both deployment and custodian role
dfx identity use CUSTODIAN
CUSTODIAN_PRINCIPAL=$(dfx identity get-principal)
echo -e "${GREEN}CUSTODIAN Principal: $CUSTODIAN_PRINCIPAL${NC}"

# Set environment variable to suppress security warnings
export DFX_WARNING=-mainnet_plaintext_identity

# Check ICP balance
echo -e "${YELLOW}Checking ICP balance...${NC}"
ICP_BALANCE=$(dfx ledger --network $NETWORK balance | awk '{print $1}')
if (( $(echo "$ICP_BALANCE < $REQUIRED_ICP" | bc -l) )); then
    echo -e "${RED}Error: Insufficient ICP balance. Need at least $REQUIRED_ICP ICP, have $ICP_BALANCE ICP${NC}"
    echo -e "${YELLOW}Please fund your CUSTODIAN identity: $CUSTODIAN_PRINCIPAL${NC}"
    exit 1
fi

echo -e "${GREEN}ICP Balance: $ICP_BALANCE ICP${NC}"

# Build the canister
echo -e "${YELLOW}Building canister...${NC}"
pnpm run build:canister

if [ "$MODE" = "deploy" ]; then
    echo -e "${YELLOW}Deploying new canister to mainnet...${NC}"
    
    # Convert ICP to cycles
    echo -e "${YELLOW}Converting $REQUIRED_ICP ICP to cycles...${NC}"
    dfx cycles convert --amount=$REQUIRED_ICP --network $NETWORK
    
    # Create canister with sufficient cycles
    echo -e "${YELLOW}Creating canister with $REQUIRED_CYCLES cycles...${NC}"
    dfx canister create icp_subaccount_indexer --network $NETWORK --with-cycles $REQUIRED_CYCLES
    
    # Deploy with initialization arguments  
    echo -e "${YELLOW}Deploying canister code...${NC}"
    echo "yes" | dfx deploy icp_subaccount_indexer \
        --network $NETWORK \
        --argument "(variant { Mainnet }, $POLLING_INTERVAL : nat64, $BLOCK_BATCH_SIZE : nat32, \"$ICP_LEDGER_CANISTER\", \"$CUSTODIAN_PRINCIPAL\")"
    
    echo -e "${GREEN}Deployment complete!${NC}"
    
elif [ "$MODE" = "upgrade" ]; then
    echo -e "${YELLOW}Upgrading existing canister on mainnet...${NC}"
    
    # Get canister ID from canister_ids.json
    CANISTER_ID=$(jq -r '.icp_subaccount_indexer.ic' canister_ids.json)
    
    if [ -z "$CANISTER_ID" ] || [ "$CANISTER_ID" = "null" ] || [ "$CANISTER_ID" = "" ]; then
        echo -e "${RED}Error: Canister ID not found in canister_ids.json${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Upgrading canister: $CANISTER_ID${NC}"
    
    # Check canister status and cycles
    echo -e "${YELLOW}Checking canister status...${NC}"
    dfx canister status $CANISTER_ID --network $NETWORK
    
    # Upgrade the canister with explicit arguments
    echo -e "${YELLOW}Upgrading canister code...${NC}"
    echo "yes" | dfx canister install $CANISTER_ID \
        --network $NETWORK \
        --mode upgrade \
        --argument "(variant { Mainnet }, $POLLING_INTERVAL : nat64, $BLOCK_BATCH_SIZE : nat32, \"$ICP_LEDGER_CANISTER\", \"$CUSTODIAN_PRINCIPAL\")"
    
    echo -e "${GREEN}Upgrade complete!${NC}"
    
else
    echo -e "${RED}Error: Invalid mode. Use 'deploy' or 'upgrade'${NC}"
    exit 1
fi

# Get canister info
CANISTER_ID=$(dfx canister id icp_subaccount_indexer --network $NETWORK)
echo -e "${GREEN}Canister ID: $CANISTER_ID${NC}"
echo -e "${GREEN}Candid Interface: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$CANISTER_ID${NC}"

# Show final canister status
echo -e "${YELLOW}Final canister status:${NC}"
dfx canister status $CANISTER_ID --network $NETWORK

# Save deployment info
echo -e "${YELLOW}Saving deployment info...${NC}"
cat > deployment-info.json <<EOF
{
  "canisterId": "$CANISTER_ID",
  "network": "$NETWORK",
  "custodianPrincipal": "$CUSTODIAN_PRINCIPAL",
  "deploymentTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "mode": "$MODE"
}
EOF

echo -e "${GREEN}Deployment info saved to deployment-info.json${NC}"