# ICSI Testing Guide

This guide will walk you through testing the ICP Subaccount Indexer (ICSI) canister with USDC deposits and webhook functionality.

## Prerequisites

1. **dfx** - Internet Computer SDK
2. **pnpm** - Package manager
3. **ICP wallet** with some ICP for fees
4. **CKUSDC tokens** for testing deposits

## Step 1: Generate Test Wallet

First, generate a new test wallet for isolated testing:

```bash
cd packages/icsi-lib
pnpm test:generate-wallet
```

This will:

- Generate a new 12-word mnemonic seed phrase
- Create `.env.test` with the test wallet credentials
- Display the principal ID and account ID for funding

**Example output:**

```
🔑 ICP Test Wallet Generator
============================

📝 Generated Mnemonic (12 words):
   word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12

🆔 Principal ID:
   xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxx

💳 Account Identifier:
   xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxx

💾 Test wallet saved to: .env.test
```

## Step 2: Fund Test Wallet

Send funds to your test wallet:

1. **For ICP**: Send to the Account Identifier displayed
2. **For CKUSDC**: Send to the Principal ID displayed

You'll need:

- At least 0.001 ICP for transaction fees
- At least 0.1 CKUSDC for testing deposits

## Step 3: Deploy ICSI Canister

Deploy a new ICSI canister or upgrade an existing one:

```bash
# From project root
./scripts/deploy-mainnet.sh deploy

# Or to upgrade existing canister
./scripts/deploy-mainnet.sh upgrade
```

Save the canister ID from the output.

## Step 4: Configure Environment

Update your `.env.test` file:

```bash
cd packages/icsi-lib
cp .env.test .env

# Edit .env and add your canister ID:
USER_VAULT_CANISTER_ID="your-canister-id-here"
```

## Step 5: Test Webhook Functionality

Start the webhook test server in one terminal:

```bash
cd packages/icsi-lib
pnpm test:webhook
```

This will:

- Start a local Express server on port 3000
- Create an ngrok tunnel for public access
- Configure the webhook URL in your ICSI canister
- Display the public webhook URL

**Keep this terminal running!**

## Step 6: Test USDC Deposit

In a new terminal, run the USDC deposit test:

```bash
cd packages/icsi-lib
pnpm test:usdc-deposit
```

This will:

- Send 0.1 CKUSDC to a deposit address
- Wait for the transaction to be indexed (30 seconds)
- Display the balance and transaction details

## Step 7: Verify Webhook Notification

Check the webhook terminal to see the deposit notification:

```json
📨 Webhook received:
{
  "eventType": "deposit",
  "tokenType": "CKUSDC",
  "amount": "100000",
  "from": "...",
  "to": "...",
  "blockIndex": "12345",
  "timestamp": "1234567890000"
}
```

## Testing Workflow Summary

1. **Generate wallet**: `pnpm test:generate-wallet`
2. **Fund wallet** with ICP and CKUSDC
3. **Deploy canister**: `./scripts/deploy-mainnet.sh deploy`
4. **Configure** `.env` with canister ID
5. **Start webhook**: `pnpm test:webhook` (keep running)
6. **Test deposit**: `pnpm test:usdc-deposit` (new terminal)
7. **Verify** webhook notification

## Troubleshooting

### "Insufficient CKUSDC balance"

- Ensure you have at least 0.1 CKUSDC in your test wallet
- Check the principal ID matches your funded wallet

### "Canister not found"

- Verify the USER_VAULT_CANISTER_ID in .env is correct
- Ensure the canister is deployed on mainnet

### "Webhook not received"

- Check the webhook server is still running
- Verify ngrok tunnel is active
- Wait at least 30 seconds for indexing

### Build errors

- Run `pnpm install` in packages/icsi-lib
- Run `pnpm build` to compile TypeScript

## Security Notes

- **Never use test wallets for real funds**
- Test mnemonics are stored in plain text
- Always use separate wallets for testing
- Keep your production seed phrases secure

## Additional Test Scripts

Other available test scripts in `packages/icsi-lib/test/scripts/`:

- `registerTokens.ts` - Register ICP, CKUSDC, CKUSDT
- `getDepositAddresses.ts` - Get all deposit addresses
- `getBalances.ts` - Check all token balances
- `sweepAll.ts` - Sweep tokens from subaccounts
- `clearTransactions.ts` - Clear transaction history

Run any script with:

```bash
pnpm test:script test/scripts/scriptName.ts
```
