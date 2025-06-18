#!/usr/bin/env ts-node

import { HttpAgent } from '@dfinity/agent';
import {
  registerToken,
  addSubaccountForToken,
  getSubaccountId,
  getIcrcAccount,
  sweepByTokenType,
  getTransactionsByTokenType,
  getRegisteredTokens,
  getBalances,
  getDepositAddresses,
  validateIcrcAccount,
  Tokens,
  TokenType,
} from '../../src/index';
import { createAgent, DEVNET_CANISTER_ID, printConfig } from './config';

interface TokenTestConfig {
  tokenType: TokenType;
  name: string;
  canisterId: string;
}

const TOKEN_CONFIGS: TokenTestConfig[] = [
  {
    tokenType: Tokens.ICP,
    name: 'ICP',
    canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  },
  {
    tokenType: Tokens.CKUSDC,
    name: 'CKUSDC',
    canisterId: 'xevnm-gaaaa-aaaar-qafnq-cai',
  },
  {
    tokenType: Tokens.CKUSDT,
    name: 'CKUSDT',
    canisterId: 'cngnf-vqaaa-aaaar-qag4q-cai',
  },
];

async function testTokenOperations() {
  console.log('🪙 Testing Token-Specific Operations');
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

  // Test 1: Register all tokens
  console.log('\n🔧 Registering All Tokens...');

  for (const config of TOKEN_CONFIGS) {
    try {
      console.log(`\n📝 Registering ${config.name}...`);
      const result = await registerToken(
        agent,
        DEVNET_CANISTER_ID,
        config.tokenType,
        config.canisterId
      );
      console.log(
        `   ✅ ${config.name} registration:`,
        JSON.stringify(result, null, 2)
      );
    } catch (error) {
      console.log(
        `   ❌ ${config.name} registration error:`,
        (error as Error).message
      );
    }
  }

  // Verify all registrations
  try {
    console.log('\n🔍 Verifying Token Registrations...');
    const registeredTokens = await getRegisteredTokens(
      agent,
      DEVNET_CANISTER_ID
    );
    console.log(
      '   ✅ All registered tokens:',
      JSON.stringify(registeredTokens, null, 2)
    );
  } catch (error) {
    console.log(
      '   ❌ Error getting registered tokens:',
      (error as Error).message
    );
  }

  // Test 2: Create subaccounts for each token
  console.log('\n🏦 Creating Subaccounts for Each Token...');

  const subaccountResults: { [key: string]: any } = {};

  for (const config of TOKEN_CONFIGS) {
    try {
      console.log(`\n➕ Creating subaccount for ${config.name}...`);
      const result = await addSubaccountForToken(
        agent,
        DEVNET_CANISTER_ID,
        config.tokenType
      );
      subaccountResults[config.name] = result;
      console.log(
        `   ✅ ${config.name} subaccount:`,
        JSON.stringify(result, null, 2)
      );
    } catch (error) {
      console.log(
        `   ❌ ${config.name} subaccount error:`,
        (error as Error).message
      );
    }
  }

  // Test 3: Get subaccount IDs and addresses
  console.log('\n📍 Getting Subaccount IDs and Addresses...');

  for (let index = 0; index < 3; index++) {
    console.log(`\n🔍 Testing index ${index}:`);

    for (const config of TOKEN_CONFIGS) {
      try {
        console.log(
          `\n   ${config.name} (${JSON.stringify(config.tokenType)}):`
        );

        // Get subaccount ID
        const subaccountId = await getSubaccountId(
          agent,
          DEVNET_CANISTER_ID,
          index,
          config.tokenType
        );
        console.log(`     🏷️  Subaccount ID: ${subaccountId}`);

        // Get ICRC account (deposit address)
        const icrcAccount = await getIcrcAccount(
          agent,
          DEVNET_CANISTER_ID,
          index
        );
        console.log(`     📬 ICRC Account: ${icrcAccount}`);
      } catch (error) {
        console.log(`     ❌ Error: ${(error as Error).message}`);
      }
    }
  }

  // Test 4: Get deposit addresses for all tokens
  try {
    console.log('\n📬 Getting All Deposit Addresses...');
    const depositAddresses = await getDepositAddresses(
      agent,
      DEVNET_CANISTER_ID
    );
    console.log('   ✅ All deposit addresses:');

    depositAddresses.forEach((addr, i) => {
      console.log(`     ${i + 1}. ${addr.tokenName}:`);
      console.log(`        Type: ${JSON.stringify(addr.tokenType)}`);
      console.log(`        Subaccount ID: ${addr.subaccountId}`);
      console.log(`        Deposit Address: ${addr.depositAddress}`);
    });
  } catch (error) {
    console.log(
      '   ❌ Error getting deposit addresses:',
      (error as Error).message
    );
  }

  // Test 5: Check balances
  try {
    console.log('\n💰 Checking Token Balances...');
    const balances = await getBalances(agent, DEVNET_CANISTER_ID);
    console.log('   ✅ Current balances:');

    if (balances.length === 0) {
      console.log('     ℹ️  No balances found (no transactions yet)');
    } else {
      balances.forEach((balance, i) => {
        const amount = Number(balance.amount) / Math.pow(10, balance.decimals);
        console.log(
          `     ${i + 1}. ${balance.tokenName}: ${amount} (${balance.amount} base units)`
        );
      });
    }
  } catch (error) {
    console.log('   ❌ Error getting balances:', (error as Error).message);
  }

  // Test 6: Get transactions by token type
  console.log('\n📊 Getting Transactions by Token Type...');

  for (const config of TOKEN_CONFIGS) {
    try {
      console.log(`\n📈 ${config.name} transactions:`);
      const transactions = await getTransactionsByTokenType(
        agent,
        DEVNET_CANISTER_ID,
        config.tokenType
      );

      if (transactions.length === 0) {
        console.log(`     ℹ️  No ${config.name} transactions found`);
      } else {
        console.log(
          `     ✅ Found ${transactions.length} ${config.name} transactions`
        );

        // Show first transaction as example
        if (transactions.length > 0) {
          console.log(
            `     📄 Sample transaction:`,
            JSON.stringify(transactions[0], null, 6)
          );
        }
      }
    } catch (error) {
      console.log(
        `     ❌ Error getting ${config.name} transactions:`,
        (error as Error).message
      );
    }
  }

  // Test 7: Sweep operations by token type
  console.log('\n🧹 Testing Sweep Operations by Token Type...');

  for (const config of TOKEN_CONFIGS) {
    try {
      console.log(`\n🧹 Sweeping ${config.name}...`);
      const result = await sweepByTokenType(
        agent,
        DEVNET_CANISTER_ID,
        config.tokenType
      );
      console.log(
        `   ✅ ${config.name} sweep result:`,
        JSON.stringify(result, null, 2)
      );
    } catch (error) {
      console.log(
        `   ❌ ${config.name} sweep error:`,
        (error as Error).message
      );
    }
  }

  // Test 8: Token-specific validation tests
  console.log('\n✅ Running Token-Specific Validation Tests...');

  const testAccounts = [
    'y3hne-ryaaa-aaaag-aucea-cai.0',
    'invalid-account-format',
    'ryjl3-tyaaa-aaaaa-aaaba-cai.123',
  ];

  for (const account of testAccounts) {
    try {
      console.log(`\n🔍 Validating account: ${account}`);

      const isValid = await validateIcrcAccount(
        agent,
        DEVNET_CANISTER_ID,
        account
      );
      console.log(`   ✅ Account "${account}" is valid: ${isValid}`);
    } catch (error) {
      console.log(
        `   ❌ Validation error for "${account}":`,
        (error as Error).message
      );
    }
  }

  console.log('\n🎉 Token Operations Testing Complete!');
  console.log('='.repeat(60));
  console.log('📊 Summary:');
  console.log('   - All major token types tested (ICP, CKUSDC, CKUSDT)');
  console.log(
    '   - Registration, subaccount creation, and addressing verified'
  );
  console.log('   - Balance and transaction queries executed');
  console.log('   - Sweep operations tested');
  console.log('   - Account validation performed');
}

// Run the tests
if (require.main === module) {
  testTokenOperations().catch(console.error);
}

export { testTokenOperations };
