# ICSI Scripts

This directory contains scripts for managing and testing the ICP Subaccount Indexer (ICSI) canister.

## Scripts

### 1. deploy-mainnet.sh

Deploy or upgrade the ICSI canister on the Internet Computer mainnet.

**Usage:**

```bash
# Deploy a new canister
./.maintain/deploy-mainnet.sh deploy

# Upgrade an existing canister
./.maintain/deploy-mainnet.sh upgrade
```

**Features:**

- Automatically creates a CUSTODIAN identity if it doesn't exist
- Uses CUSTODIAN identity for both deployment and canister custodian role
- Checks ICP balance before deployment (minimum 0.5 ICP required)
- Converts ICP to cycles and creates canister with sufficient cycles (800B)
- Uses production settings (500-second polling interval)
- Builds the canister before deployment using `pnpm run build:canister`
- Saves deployment information to `deployment-info.json`
- Supports both initial deployment and upgrades
- Shows final canister status and Candid interface URL

### 2. Test Scripts (in packages/icsi-lib/test/scripts/)

#### generateWallet.ts

Generates a new test wallet with mnemonic and addresses.

**Usage:**

```bash
# From root directory
pnpm run lib:generate:wallet
```

**Features:**

- Generates a new 12-word mnemonic
- Creates principal ID and account identifier
- Saves wallet info to `.env.test` and `test-wallet-info.json`

#### testICPDeposit.sh

Tests ICP deposits to the ICSI canister with balance validation.

**Usage:**

```bash
# From root directory
pnpm run lib:test:icp
```

**Features:**

- Validates sender has sufficient ICP balance (0.001 ICP + fee)
- Sends 0.001 ICP to a deposit address
- Monitors the transaction indexing
- Displays balance and transaction details

#### testUSDCDeposit.sh

Tests USDC (ckUSDC) deposits to the ICSI canister.

**Usage:**

```bash
# From root directory
pnpm run lib:test:usdc
```

**Features:**

- Validates sender has sufficient ckUSDC balance
- Sends 0.1 ckUSDC to a deposit address (with 0.01 ckUSDC fee)
- Monitors the transaction indexing
- Displays balance and transaction details

#### testUSDTDeposit.sh

Tests USDT (ckUSDT) deposits to the ICSI canister.

**Usage:**

```bash
# From root directory
pnpm run lib:test:usdt
```

**Features:**

- Validates sender has sufficient ckUSDT balance
- Sends 0.1 ckUSDT to a deposit address (with 0.01 ckUSDT fee)
- Monitors the transaction indexing
- Displays balance and transaction details

#### testWebhook.ts

Tests webhook functionality for deposit notifications.

**Usage:**

```bash
# From root directory
pnpm run lib:test:webhook

# To keep the webhook URL configured after stopping:
pnpm run lib:test:webhook -- --keep-webhook
```

**Features:**

- Creates a local Express server to receive webhooks
- Uses ngrok to expose the local server to the internet
- Automatically configures the webhook URL in the canister
- Displays all received webhook notifications
- Option to keep or reset the webhook URL on exit

## Setup

### Prerequisites

1. **Install dependencies:**

   ```bash
   # From root directory
   pnpm install
   ```

2. **Fund your CUSTODIAN identity** (for deployment):

   - The script will create a CUSTODIAN identity if it doesn't exist
   - Fund this identity with at least 0.5 ICP for deployment
   - The script will show you the principal to fund

3. **Generate test wallet** (for testing):
   ```bash
   pnpm run lib:generate:wallet
   ```
   This creates a `.env.test` file with test wallet credentials.

## Testing Workflow

1. **Deploy/Upgrade Canister:**

   ```bash
   ./.maintain/deploy-mainnet.sh deploy
   ```

2. **Start Webhook Listener:**

   ```bash
   pnpm run lib:test:webhook
   ```

3. **In another terminal, test deposits:**

   ```bash
   # Test ICP deposits
   pnpm run lib:test:icp

   # Test ckUSDC deposits
   pnpm run lib:test:usdc

   # Test ckUSDT deposits
   pnpm run lib:test:usdt
   ```

4. **Monitor the webhook terminal** to see the deposit notifications

## Important Notes

### Balance Validation

All deposit test scripts include balance validation to prevent common errors:

- **ICP**: Requires at least 0.001 ICP + 0.0001 ICP fee
- **ckUSDC**: Requires at least 0.1 ckUSDC + 0.01 ckUSDC fee
- **ckUSDT**: Requires at least 0.1 ckUSDT + 0.01 ckUSDT fee
- **ckBTC**: Requires at least 0.0001 ckBTC + 10 satoshi fee

The scripts will check your balance before attempting transfers and provide clear error messages if insufficient funds are detected.

### Common Issues

1. **Insufficient Balance**: The most common error. Scripts now validate balances before transfers.
2. **Wrong Wallet**: Ensure you're using the correct seed phrase in your `.env` file.
3. **Network Issues**: Transactions typically take 15-30 seconds to be indexed.

### Security

- Always keep your seed phrase secure and never commit it to version control
- Use test wallets only - never use production wallets for testing
- The webhook server requires ngrok to be accessible from the IC
