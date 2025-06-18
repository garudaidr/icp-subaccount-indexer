#!/usr/bin/env ts-node

import { HttpAgent } from '@dfinity/agent';
import {
  getUserVaultTransactions,
  getUserVaultInterval,
  getTransactionsCount,
  getNonce,
  getSubaccountCount,
  getSubaccountId,
  getWebhookUrl,
  getCanisterPrincipal,
  getIcrcAccount,
  getNetwork,
  getNextBlock,
  getOldestBlock,
  getRegisteredTokens,
  getTransactionTokenType,
  getDepositAddresses,
  getBalances,
  getTransactionsByTokenType,
  Tokens,
} from '../../src/index';
import { createAgent, DEVNET_CANISTER_ID, printConfig } from './config';
import { formatResult } from './utils';

async function testQueryFunctions() {
  console.log('🚀 Testing Query Functions with Devnet Canister');
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

  // Test cases array for organized testing
  const testCases = [
    {
      name: 'getUserVaultInterval',
      fn: () => getUserVaultInterval(agent, DEVNET_CANISTER_ID),
      description: 'Get polling interval for the vault',
    },
    {
      name: 'getTransactionsCount',
      fn: () => getTransactionsCount(agent, DEVNET_CANISTER_ID),
      description: 'Get total number of transactions',
    },
    {
      name: 'getNonce',
      fn: () => getNonce(agent, DEVNET_CANISTER_ID),
      description: 'Get current nonce value',
    },
    {
      name: 'getSubaccountCount',
      fn: () => getSubaccountCount(agent, DEVNET_CANISTER_ID),
      description: 'Get total number of subaccounts',
    },
    {
      name: 'getWebhookUrl',
      fn: () => getWebhookUrl(agent, DEVNET_CANISTER_ID),
      description: 'Get configured webhook URL',
    },
    {
      name: 'getCanisterPrincipal',
      fn: () => getCanisterPrincipal(agent, DEVNET_CANISTER_ID),
      description: 'Get canister principal',
    },
    {
      name: 'getNetwork',
      fn: () => getNetwork(agent, DEVNET_CANISTER_ID),
      description: 'Get network configuration (Mainnet/Local)',
    },
    {
      name: 'getNextBlock',
      fn: () => getNextBlock(agent, DEVNET_CANISTER_ID),
      description: 'Get next block to be processed',
    },
    {
      name: 'getOldestBlock',
      fn: () => getOldestBlock(agent, DEVNET_CANISTER_ID),
      description: 'Get oldest block processed',
    },
    {
      name: 'getRegisteredTokens',
      fn: () => getRegisteredTokens(agent, DEVNET_CANISTER_ID),
      description: 'Get all registered tokens',
    },
  ];

  // Execute basic query tests
  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Testing: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);

      const result = await testCase.fn();
      console.log(`   ✅ Result:`, formatResult(result));
    } catch (error) {
      console.log(`   ❌ Error:`, (error as Error).message);
    }
  }

  // Test functions that require additional parameters
  console.log('\n🔍 Testing functions with parameters...');

  // Test getUserVaultTransactions
  try {
    console.log('\n📊 Testing getUserVaultTransactions (last 10)');
    const transactions = await getUserVaultTransactions(
      agent,
      DEVNET_CANISTER_ID,
      BigInt(10)
    );
    console.log('   ✅ Transactions:', formatResult(transactions));
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test getUserVaultTransactions (all)
  try {
    console.log('\n📊 Testing getUserVaultTransactions (all)');
    const allTransactions = await getUserVaultTransactions(
      agent,
      DEVNET_CANISTER_ID
    );
    console.log(
      '   ✅ All Transactions count:',
      'Ok' in allTransactions ? allTransactions.Ok.length : 'Error'
    );
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test getSubaccountId for different token types
  const tokenTypes = [Tokens.ICP, Tokens.CKUSDC, Tokens.CKUSDT];

  for (const tokenType of tokenTypes) {
    try {
      console.log(
        `\n🏦 Testing getSubaccountId for ${JSON.stringify(tokenType)}`
      );
      const subaccountId = await getSubaccountId(
        agent,
        DEVNET_CANISTER_ID,
        0,
        tokenType
      );
      console.log(`   ✅ Subaccount ID:`, subaccountId);
    } catch (error) {
      console.log(`   ❌ Error:`, (error as Error).message);
    }
  }

  // Test getIcrcAccount
  try {
    console.log('\n🔗 Testing getIcrcAccount (index 0)');
    const icrcAccount = await getIcrcAccount(agent, DEVNET_CANISTER_ID, 0);
    console.log('   ✅ ICRC Account:', icrcAccount);
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test getTransactionTokenType (if there are transactions)
  try {
    console.log('\n🎯 Testing getTransactionTokenType');
    const transactions = await getUserVaultTransactions(
      agent,
      DEVNET_CANISTER_ID,
      BigInt(1)
    );

    if ('Ok' in transactions && transactions.Ok.length > 0) {
      const firstTx = transactions.Ok[0];
      const tokenType = await getTransactionTokenType(
        agent,
        DEVNET_CANISTER_ID,
        firstTx.tx_hash
      );
      console.log(
        `   ✅ Token type for tx ${firstTx.tx_hash}:`,
        JSON.stringify(tokenType)
      );
    } else {
      console.log('   ℹ️  No transactions found to test with');
    }
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test helper functions
  console.log('\n🛠️  Testing Helper Functions...');

  try {
    console.log('\n📍 Testing getDepositAddresses');
    const depositAddresses = await getDepositAddresses(
      agent,
      DEVNET_CANISTER_ID
    );
    console.log('   ✅ Deposit Addresses:', formatResult(depositAddresses));
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  try {
    console.log('\n💰 Testing getBalances');
    const balances = await getBalances(agent, DEVNET_CANISTER_ID);
    console.log('   ✅ Balances:', formatResult(balances));
  } catch (error) {
    console.log('   ❌ Error:', (error as Error).message);
  }

  // Test getTransactionsByTokenType for each token
  for (const tokenType of tokenTypes) {
    try {
      console.log(
        `\n📈 Testing getTransactionsByTokenType for ${JSON.stringify(tokenType)}`
      );
      const tokenTransactions = await getTransactionsByTokenType(
        agent,
        DEVNET_CANISTER_ID,
        tokenType
      );
      console.log(
        `   ✅ ${JSON.stringify(tokenType)} transactions count:`,
        tokenTransactions.length
      );

      if (tokenTransactions.length > 0) {
        console.log(
          '   📄 Sample transaction:',
          formatResult(tokenTransactions[0])
        );
      }
    } catch (error) {
      console.log(`   ❌ Error:`, (error as Error).message);
    }
  }

  console.log('\n🎉 Query Functions Testing Complete!');
  console.log('='.repeat(60));
}

// Run the tests
if (require.main === module) {
  testQueryFunctions().catch(console.error);
}

export { testQueryFunctions };
