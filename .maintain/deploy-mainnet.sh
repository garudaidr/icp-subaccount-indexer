#!/bin/bash

# Deploy or Upgrade ICSI Canister on Mainnet
# Usage: ./scripts/deploy-mainnet.sh [deploy|upgrade]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
MODE=${1:-deploy}
NETWORK="ic"
POLLING_INTERVAL=15
BLOCK_BATCH_SIZE=10
ICP_LEDGER_CANISTER="ryjl3-tyaaa-aaaaa-aaaba-cai"

echo -e "${GREEN}ICSI Canister Mainnet Deployment/Upgrade Script${NC}"
echo -e "${YELLOW}Mode: $MODE${NC}"
echo -e "${YELLOW}Network: $NETWORK${NC}"

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo -e "${RED}Error: dfx is not installed${NC}"
    exit 1
fi

# Check if custodian identity exists
if ! dfx identity list | grep -q "custodian"; then
    echo -e "${YELLOW}Creating custodian identity...${NC}"
    dfx identity new custodian
fi

# Get custodian principal
dfx identity use custodian
CUSTODIAN_PRINCIPAL=$(dfx identity get-principal)
echo -e "${GREEN}Custodian Principal: $CUSTODIAN_PRINCIPAL${NC}"

# Switch back to default identity for deployment
dfx identity use default

# Build the canister
echo -e "${YELLOW}Building canister...${NC}"
dfx build icp_subaccount_indexer --network $NETWORK

if [ "$MODE" = "deploy" ]; then
    echo -e "${YELLOW}Deploying new canister to mainnet...${NC}"
    
    # Deploy with initialization arguments
    dfx deploy icp_subaccount_indexer \
        --network $NETWORK \
        --no-wallet \
        --argument "(variant { Mainnet }, $POLLING_INTERVAL : nat64, $BLOCK_BATCH_SIZE : nat32, \"$ICP_LEDGER_CANISTER\", \"$CUSTODIAN_PRINCIPAL\")"
    
    echo -e "${GREEN}Deployment complete!${NC}"
    
elif [ "$MODE" = "upgrade" ]; then
    echo -e "${YELLOW}Upgrading existing canister on mainnet...${NC}"
    
    # Get canister ID from canister_ids.json
    CANISTER_ID=$(jq -r '.icp_subaccount_indexer.ic' canister_ids.json)
    
    if [ -z "$CANISTER_ID" ] || [ "$CANISTER_ID" = "null" ]; then
        echo -e "${RED}Error: Canister ID not found in canister_ids.json${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Upgrading canister: $CANISTER_ID${NC}"
    
    # Upgrade the canister
    dfx canister install icp_subaccount_indexer \
        --network $NETWORK \
        --mode upgrade \
        --no-wallet
    
    echo -e "${GREEN}Upgrade complete!${NC}"
    
else
    echo -e "${RED}Error: Invalid mode. Use 'deploy' or 'upgrade'${NC}"
    exit 1
fi

# Get canister info
CANISTER_ID=$(dfx canister id icp_subaccount_indexer --network $NETWORK)
echo -e "${GREEN}Canister ID: $CANISTER_ID${NC}"
echo -e "${GREEN}Canister URL: https://$CANISTER_ID.raw.ic0.app${NC}"

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