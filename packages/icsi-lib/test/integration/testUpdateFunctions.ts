#!/usr/bin/env ts-node

import { HttpAgent } from '@dfinity/agent';
import {
  refund,
  setUserVaultInterval,
  sweep,
  sweepByTokenType,
  addSubaccount,
  addSubaccountForToken,
  clearTransactions,
  setWebhookUrl,
  registerToken,
  sweepSubaccountId,
  convertToIcrcAccount,
  validateIcrcAccount,
  singleSweep,
  setSweepFailed,
  getUserVaultInterval,
  getNonce,
  getRegisteredTokens,
  getUserVaultTransactions,
  getWebhookUrl,
  Tokens,
} from '../../src/index';
import { createAgent, DEVNET_CANISTER_ID, printConfig } from './config';

async function testUpdateFunctions() {
  console.log('🚀 Testing Update Functions with Devnet Canister');
  console.log('='.repeat(60));
  console.log(
    '⚠️  WARNING: These are update calls that will modify canister state!'
  );
  console.log('='.repeat(60));

  // Print configuration information
  printConfig();
  console.log('');

  let agent: HttpAgent;

  try {
    // Create agent using environment variables
    agent = createAgent();
    console.log('✅ Agent created successfully');
  } catch (error) {
    console.error('❌ Failed to create agent:', error);
    return;
  }

  // Store original state for potential restoration
  let originalInterval: bigint | undefined;
  let originalWebhookUrl: string | undefined;

  try {
    originalInterval = await getUserVaultInterval(agent, DEVNET_CANISTER_ID);
    console.log(`📊 Original interval: ${originalInterval}`);
  } catch (error) {
    console.log(
      '📊 Could not get original interval:',
      (error as Error).message
    );
  }

  try {
    originalWebhookUrl = await getWebhookUrl(agent, DEVNET_CANISTER_ID);
    console.log(`🔗 Original webhook URL: ${originalWebhookUrl}`);
  } catch (error) {
    console.log(
      '🔗 Could not get original webhook URL:',
      (error as Error).message
    );
  }

  // Test 1: Register Token Functions
  console.log('\n🔧 Testing Token Registration...');

  const tokenTypes = [Tokens.ICP, Tokens.CKUSDC, Tokens.CKUSDT];
  const tokenCanisterIds = {
    ICP: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
    CKUSDC: 'xevnm-gaaaa-aaaar-qafnq-cai',
    CKUSDT: 'cngnf-vqaaa-aaaar-qag4q-cai',
  };

  for (const tokenType of tokenTypes) {
    try {
      console.log(
        `\n📝 Testing registerToken for ${JSON.stringify(tokenType)}`
      );

      let canisterId: string = '';
      if ('ICP' in tokenType) canisterId = tokenCanisterIds.ICP;
      else if ('CKUSDC' in tokenType) canisterId = tokenCanisterIds.CKUSDC;
      else if ('CKUSDT' in tokenType) canisterId = tokenCanisterIds.CKUSDT;
      else throw new Error(`Unknown token type: ${JSON.stringify(tokenType)}`);

      const result = await registerToken(
        agent,
        DEVNET_CANISTER_ID,
        tokenType,
        canisterId
      );
      console.log(
        `   ✅ Registration result:`,
        JSON.stringify(result, null, 2)
      );
    } catch (error) {
      console.log(`   ❌ Error:`, (error as Error).message);
    }
  }

  // Verify registrations
  try {
    console.log('\n🔍 Verifying token registrations...');
    const registeredTokens = await getRegisteredTokens(
      agent,
      DEVNET_CANISTER_ID
    );
    console.log(
      '   ✅ Registered tokens:',
      JSON.stringify(registeredTokens, null, 2)
    );
  } catch (error) {
    console.log(
      '   ❌ Error getting registered tokens:',
      (error as Error).message
    );
  }

  // Test 2: Subaccount Management
  console.log('\n🏦 Testing Subaccount Management...');

  // Test addSubaccount (basic ICP subaccount)
  try {
    console.log('\n➕ Testing addSubaccount (ICP)');
    const result = await addSubaccount(agent, DEVNET_CANISTER_ID);
    console.log(
      '   ✅ Add subaccount result:',
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test addSubaccountForToken for each token type
  for (const tokenType of tokenTypes) {
    try {
      console.log(
        `\n➕ Testing addSubaccountForToken for ${JSON.stringify(tokenType)}`
      );
      const result = await addSubaccountForToken(
        agent,
        DEVNET_CANISTER_ID,
        tokenType
      );
      console.log(
        `   ✅ Add subaccount result:`,
        JSON.stringify(result, null, 2)
      );
    } catch (error) {
      console.log(`   ❌ Error:`, (error as Error).message);
    }
  }

  // Test 3: Configuration Updates
  console.log('\n⚙️  Testing Configuration Updates...');

  // Test setUserVaultInterval
  try {
    console.log('\n⏱️  Testing setUserVaultInterval');
    const testInterval = BigInt(60); // 60 seconds for testing
    const result = await setUserVaultInterval(
      agent,
      DEVNET_CANISTER_ID,
      testInterval
    );
    console.log(`   ✅ Set interval result: ${result}`);

    // Verify the change
    const newInterval = await getUserVaultInterval(agent, DEVNET_CANISTER_ID);
    console.log(`   📊 New interval: ${newInterval}`);
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test setWebhookUrl
  try {
    console.log('\n🔗 Testing setWebhookUrl');
    const testWebhookUrl = 'https://test-webhook.example.com/webhook';
    const result = await setWebhookUrl(
      agent,
      DEVNET_CANISTER_ID,
      testWebhookUrl
    );
    console.log(
      `   ✅ Set webhook URL result:`,
      JSON.stringify(result, null, 2)
    );

    // Verify the change
    const newWebhookUrl = await getWebhookUrl(agent, DEVNET_CANISTER_ID);
    console.log(`   🔗 New webhook URL: ${newWebhookUrl}`);
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test 4: ICRC Account Functions
  console.log('\n🔄 Testing ICRC Account Functions...');

  // Test validateIcrcAccount
  const testAccounts = [
    'y3hne-ryaaa-aaaag-aucea-cai',
    'invalid-account',
    'ryjl3-tyaaa-aaaaa-aaaba-cai.1',
  ];

  for (const account of testAccounts) {
    try {
      console.log(`\n✅ Testing validateIcrcAccount: ${account}`);
      const isValid = await validateIcrcAccount(
        agent,
        DEVNET_CANISTER_ID,
        account
      );
      console.log(`   ✅ Is valid: ${isValid}`);
    } catch (error) {
      console.log(`   ❌ Error:`, (error as Error).message);
    }
  }

  // Test convertToIcrcAccount
  try {
    console.log('\n🔄 Testing convertToIcrcAccount');
    const testSubaccountId = 'test-subaccount-id';
    const result = await convertToIcrcAccount(
      agent,
      DEVNET_CANISTER_ID,
      testSubaccountId
    );
    console.log('   ✅ Convert result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test 5: Sweep Functions
  console.log('\n🧹 Testing Sweep Functions...');

  // Test sweep (all tokens)
  try {
    console.log('\n🧹 Testing sweep (all tokens)');
    const result = await sweep(agent, DEVNET_CANISTER_ID);
    console.log('   ✅ Sweep result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test sweepByTokenType for each token
  for (const tokenType of tokenTypes) {
    try {
      console.log(
        `\n🧹 Testing sweepByTokenType for ${JSON.stringify(tokenType)}`
      );
      const result = await sweepByTokenType(
        agent,
        DEVNET_CANISTER_ID,
        tokenType
      );
      console.log(`   ✅ Sweep result:`, JSON.stringify(result, null, 2));
    } catch (error) {
      console.log(`   ❌ Error:`, (error as Error).message);
    }
  }

  // Test sweepSubaccountId (if we have any transactions)
  try {
    console.log('\n🧹 Testing sweepSubaccountId');
    const transactions = await getUserVaultTransactions(
      agent,
      DEVNET_CANISTER_ID,
      BigInt(1)
    );

    if ('Ok' in transactions && transactions.Ok.length > 0) {
      const firstTx = transactions.Ok[0];
      // Use a minimal amount for testing
      const result = await sweepSubaccountId(
        agent,
        DEVNET_CANISTER_ID,
        'test-subaccount',
        0.001,
        firstTx.token_type
      );
      console.log(
        '   ✅ Sweep subaccount result:',
        JSON.stringify(result, null, 2)
      );
    } else {
      console.log(
        '   ℹ️  No transactions found, testing with minimal parameters'
      );
      const result = await sweepSubaccountId(
        agent,
        DEVNET_CANISTER_ID,
        'test-subaccount',
        0.001
      );
      console.log(
        '   ✅ Sweep subaccount result:',
        JSON.stringify(result, null, 2)
      );
    }
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test singleSweep (if we have transactions)
  try {
    console.log('\n🎯 Testing singleSweep');
    const transactions = await getUserVaultTransactions(
      agent,
      DEVNET_CANISTER_ID,
      BigInt(1)
    );

    if ('Ok' in transactions && transactions.Ok.length > 0) {
      const firstTx = transactions.Ok[0];
      const result = await singleSweep(
        agent,
        DEVNET_CANISTER_ID,
        firstTx.tx_hash
      );
      console.log(
        `   ✅ Single sweep result for tx ${firstTx.tx_hash}:`,
        JSON.stringify(result, null, 2)
      );
    } else {
      console.log('   ℹ️  No transactions found to test single sweep');
    }
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test setSweepFailed (if we have transactions)
  try {
    console.log('\n❌ Testing setSweepFailed');
    const transactions = await getUserVaultTransactions(
      agent,
      DEVNET_CANISTER_ID,
      BigInt(1)
    );

    if ('Ok' in transactions && transactions.Ok.length > 0) {
      const firstTx = transactions.Ok[0];
      const result = await setSweepFailed(
        agent,
        DEVNET_CANISTER_ID,
        firstTx.tx_hash
      );
      console.log(
        `   ✅ Set sweep failed result for tx ${firstTx.tx_hash}:`,
        JSON.stringify(result, null, 2)
      );
    } else {
      console.log('   ℹ️  No transactions found to test set sweep failed');
    }
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test 6: Refund Function
  try {
    console.log('\n💰 Testing refund');
    const refundAmount = BigInt(1000); // Small amount for testing
    const result = await refund(agent, DEVNET_CANISTER_ID, refundAmount);
    console.log('   ✅ Refund result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test 7: clearTransactions (be careful with this one!)
  console.log('\n⚠️  Testing clearTransactions (with safety limits)...');

  try {
    console.log('\n🗑️  Testing clearTransactions with timestamp limit');
    // Only clear very old transactions by setting a timestamp far in the past
    const oldTimestamp = {
      timestamp_nanos:
        BigInt(Date.now() - 365 * 24 * 60 * 60 * 1000) * BigInt(1000000),
    };
    const result = await clearTransactions(
      agent,
      DEVNET_CANISTER_ID,
      undefined,
      oldTimestamp
    );
    console.log(
      '   ✅ Clear transactions result:',
      JSON.stringify(result, null, 2)
    );
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Restore original settings if possible
  console.log('\n🔄 Attempting to restore original settings...');

  if (originalInterval) {
    try {
      await setUserVaultInterval(agent, DEVNET_CANISTER_ID, originalInterval);
      console.log(`✅ Restored original interval: ${originalInterval}`);
    } catch (error) {
      console.log(
        '❌ Could not restore original interval:',
        (error as Error).message
      );
    }
  }

  if (originalWebhookUrl) {
    try {
      await setWebhookUrl(agent, DEVNET_CANISTER_ID, originalWebhookUrl);
      console.log(`✅ Restored original webhook URL: ${originalWebhookUrl}`);
    } catch (error) {
      console.log(
        '❌ Could not restore original webhook URL:',
        (error as Error).message
      );
    }
  }

  console.log('\n🎉 Update Functions Testing Complete!');
  console.log('='.repeat(60));
  console.log(
    '⚠️  Note: Some state changes may have been made to the canister.'
  );
  console.log('   Review the results and restore settings manually if needed.');
}

// Run the tests
if (require.main === module) {
  testUpdateFunctions().catch(console.error);
}

export { testUpdateFunctions };
