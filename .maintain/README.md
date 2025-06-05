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

#### generateWallet.ts

Generates a new test wallet with mnemonic and addresses.

**Usage:**

```bash
cd packages/icsi-lib
pnpm run generate:wallet
```

**Features:**

- Generates a new 12-word mnemonic
- Creates principal ID and account identifier
- Saves wallet info to `.env.test` and `test-wallet-info.json`

#### testICPDeposit.ts

Tests ICP deposits to the ICSI canister with balance validation.

**Usage:**

```bash
cd packages/icsi-lib
pnpm run test:icp-deposit
```

**Features:**

- Validates sender has sufficient ICP balance (0.1 ICP + fee)
- Sends 0.1 ICP to a deposit address
- Monitors the transaction indexing
- Displays balance and transaction details

#### testUSDCDeposit.ts

Tests USDC (CKUSDC) deposits to the ICSI canister.

**Usage:**

```bash
cd packages/icsi-lib
pnpm run test:usdc-deposit
```

**Features:**

- Validates sender has sufficient CKUSDC balance
- Sends 0.1 CKUSDC to a deposit address
- Monitors the transaction indexing
- Displays balance and transaction details

#### testUSDTDeposit.ts

Tests USDT (CKUSDT) deposits to the ICSI canister.

**Usage:**

```bash
cd packages/icsi-lib
pnpm run test:usdt-deposit
```

**Features:**

- Validates sender has sufficient CKUSDT balance
- Sends 0.1 CKUSDT to a deposit address
- Monitors the transaction indexing
- Displays balance and transaction details

#### testWebhook.ts

Tests webhook functionality for deposit notifications.

**Usage:**

```bash
cd packages/icsi-lib
pnpm run test:webhook

# To keep the webhook URL configured after stopping:
pnpm run test:webhook -- --keep-webhook
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
   pnpm install
   ```

## Testing Workflow

1. **Deploy/Upgrade Canister:**

   ```bash
   ./scripts/deploy-mainnet.sh deploy
   ```

2. **Start Webhook Listener:**

   ```bash
   cd packages/icsi-lib
   pnpm run test:webhook
   ```

3. **In another terminal, send USDC:**

   ```bash
   cd packages/icsi-lib
   pnpm run test:usdc-deposit
   ```

4. **Monitor the webhook terminal** to see the deposit notification

## Important Notes

### Balance Validation

All deposit test scripts include balance validation to prevent common errors:

- **ICP**: Requires at least 0.1 ICP + 0.0001 ICP fee
- **CKUSDC**: Requires at least 0.1 CKUSDC + fee
- **CKUSDT**: Requires at least 0.1 CKUSDT + fee

The scripts will check your balance before attempting transfers and provide clear error messages if insufficient funds are detected.

### Common Issues

1. **Insufficient Balance**: The most common error. Scripts now validate balances before transfers.
2. **Wrong Wallet**: Ensure you're using the correct seed phrase in your `.env` file.
3. **Network Issues**: Transactions typically take 15-30 seconds to be indexed.

### Security

- Always keep your seed phrase secure and never commit it to version control
- Use test wallets only - never use production wallets for testing
- The webhook server requires ngrok to be accessible from the IC
