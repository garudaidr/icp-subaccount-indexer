import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { generateMnemonic } from 'bip39';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { Principal } from '@dfinity/principal';
import { createIdentityFromSeed } from '../../src/utils/identity';

async function generateTestWallet() {
  console.log('🔑 ICP Test Wallet Generator');
  console.log('============================\n');

  // Generate new mnemonic
  const mnemonic = generateMnemonic();
  console.log('📝 Generated Mnemonic (12 words):');
  console.log(`   ${mnemonic}\n`);

  // Create identity from mnemonic
  const identity = await createIdentityFromSeed(mnemonic);
  const principal = identity.getPrincipal();

  console.log('🆔 Principal ID:');
  console.log(`   ${principal.toText()}\n`);

  // Generate account identifier (for ICP transfers)
  // ICP uses account identifiers, not principals for transfers
  const accountId = Principal.selfAuthenticating(
    identity.getPublicKey().toDer()
  ).toText();

  console.log('💳 Account Identifier:');
  console.log(`   ${accountId}\n`);

  // Save to test wallet file
  const testWalletPath = path.join(__dirname, '../../.env.test');
  const envContent = `# Test Wallet - Generated ${new Date().toISOString()}
# ⚠️  FOR TESTING ONLY - DO NOT USE FOR REAL FUNDS ⚠️

# Test wallet mnemonic
TEST_SEED_PHRASE="${mnemonic}"

# Test wallet principal
TEST_PRINCIPAL="${principal.toText()}"

# Test wallet account ID
TEST_ACCOUNT_ID="${accountId}"

# Copy your canister ID here
USER_VAULT_CANISTER_ID=""

# Optional settings
HOST=https://ic0.app
WEBHOOK_TEST_PORT=3000
`;

  fs.writeFileSync(testWalletPath, envContent);
  console.log('💾 Test wallet saved to: .env.test\n');

  console.log('📋 Instructions:');
  console.log('1. Send test funds to this wallet:');
  console.log(`   - Principal: ${principal.toText()}`);
  console.log(`   - For ICP transfers, use account ID: ${accountId}`);
  console.log('2. Add your USER_VAULT_CANISTER_ID to .env.test');
  console.log('3. Run tests with: npm run test:usdc-deposit\n');

  console.log('⚠️  SECURITY WARNING:');
  console.log('This wallet is for testing only. Never use it for real funds!');
  console.log('The mnemonic is stored in plain text in .env.test\n');

  // Also create a JSON file with wallet details
  const walletInfo = {
    mnemonic,
    principal: principal.toText(),
    accountId,
    publicKey: identity.getPublicKey().toDer().toString('hex'),
    createdAt: new Date().toISOString(),
    warning: 'FOR TESTING ONLY - DO NOT USE FOR REAL FUNDS',
  };

  const walletInfoPath = path.join(__dirname, '../../test-wallet-info.json');
  fs.writeFileSync(walletInfoPath, JSON.stringify(walletInfo, null, 2));
  console.log('📄 Wallet info also saved to: test-wallet-info.json');
}

generateTestWallet().catch(console.error);
