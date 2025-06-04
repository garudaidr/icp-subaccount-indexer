# ICSI Scripts

This directory contains scripts for managing and testing the ICP Subaccount Indexer (ICSI) canister.

## Scripts

### 1. deploy-mainnet.sh

Deploy or upgrade the ICSI canister on the Internet Computer mainnet.

**Usage:**
```bash
# Deploy a new canister
./scripts/deploy-mainnet.sh deploy

# Upgrade an existing canister
./scripts/deploy-mainnet.sh upgrade
```

**Features:**
- Automatically creates a custodian identity if it doesn't exist
- Builds the canister before deployment
- Saves deployment information to `deployment-info.json`
- Supports both initial deployment and upgrades

### 2. Test Scripts (in packages/icsi-lib/test/scripts/)

#### testUSDCDeposit.ts

Tests USDC (CKUSDC) deposits to the ICSI canister.

**Usage:**
```bash
cd packages/icsi-lib
npm run test:usdc-deposit
```

**Features:**
- Uses mnemonic seed from `.env` file
- Sends 0.1 CKUSDC to a deposit address
- Monitors the transaction indexing
- Displays balance and transaction details

#### testWebhook.ts

Tests webhook functionality for deposit notifications.

**Usage:**
```bash
cd packages/icsi-lib
npm run test:webhook

# To keep the webhook URL configured after stopping:
npm run test:webhook -- --keep-webhook
```

**Features:**
- Creates a local Express server to receive webhooks
- Uses ngrok to expose the local server to the internet
- Automatically configures the webhook URL in the canister
- Displays all received webhook notifications
- Option to keep or reset the webhook URL on exit

## Setup

1. Copy the environment template:
   ```bash
   cp .env.template .env
   ```

2. Fill in your values in `.env`:
   - `SEED_PHRASE`: Your 12-word mnemonic seed phrase
   - `USER_VAULT_CANISTER_ID`: Your ICSI canister ID

3. Install dependencies:
   ```bash
   cd packages/icsi-lib
   npm install
   ```

## Testing Workflow

1. **Deploy/Upgrade Canister:**
   ```bash
   ./scripts/deploy-mainnet.sh deploy
   ```

2. **Start Webhook Listener:**
   ```bash
   cd packages/icsi-lib
   npm run test:webhook
   ```

3. **In another terminal, send USDC:**
   ```bash
   cd packages/icsi-lib
   npm run test:usdc-deposit
   ```

4. **Monitor the webhook terminal** to see the deposit notification

## Important Notes

- Ensure you have sufficient CKUSDC balance before running the deposit test
- The webhook server requires ngrok to be accessible from the IC
- Transactions typically take 15-30 seconds to be indexed
- Always keep your seed phrase secure and never commit it to version control