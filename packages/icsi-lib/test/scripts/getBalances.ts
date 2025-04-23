import { agent, USER_VAULT_CANISTER_ID } from './config';
import {
  getRegisteredTokens,
  getSubaccountId,
  getUserVaultTransactions,
} from '../../src';
import { Principal } from '@dfinity/principal';
import { StoredTransactions } from '../../src/userVault.did';

/**
 * Get balances for all subaccounts that have a balance
 */
async function getBalances() {
  try {
    // Get the list of registered tokens
    const tokensResult = await getRegisteredTokens(agent, [
      Principal.fromText(USER_VAULT_CANISTER_ID),
    ]);

    if ('Err' in tokensResult) {
      console.error(`Error getting registered tokens: ${tokensResult.Err}`);
      return;
    }

    const tokens = tokensResult.Ok;
    console.log(`Found ${tokens.length} registered tokens`);

    // Track accounts with balances
    const accountsWithBalances: Array<{
      token: string;
      subaccountId: string;
      balance: string;
      transactionsCount: number;
    }> = [];

    // Check each token
    for (const [tokenPrincipal, tokenName] of tokens) {
      console.log(
        `\nChecking token: ${tokenName} (${tokenPrincipal.toString()})`
      );

      try {
        // Get the subaccount ID for this token
        const subaccountIdResult = await getSubaccountId(agent, [
          Principal.fromText(USER_VAULT_CANISTER_ID),
          tokenPrincipal,
        ]);

        if ('Err' in subaccountIdResult) {
          console.log(
            `Error getting subaccount ID: ${subaccountIdResult.Err.message}`
          );
          continue;
        }

        const subaccountId = subaccountIdResult.Ok;

        // Get transactions for this subaccount
        const transactionsResult = await getUserVaultTransactions(agent, [
          Principal.fromText(USER_VAULT_CANISTER_ID),
          subaccountId,
          [], // Empty array for start index (most recent transactions)
          BigInt(100), // Number of transactions to fetch
        ]);

        if ('Err' in transactionsResult) {
          console.log(
            `Error getting transactions: ${transactionsResult.Err.message}`
          );
          continue;
        }

        const transactions = transactionsResult.Ok;

        // Check if there are any non-swept deposits
        let balance = BigInt(0);
        let hasBalance = false;

        for (const tx of transactions) {
          // Check if transaction is not swept
          if (tx.sweep_status && 'NotSwept' in tx.sweep_status) {
            hasBalance = true;

            // Try to extract balance from transaction
            if (tx.operation && tx.operation[0] && 'Mint' in tx.operation[0]) {
              balance += tx.operation[0].Mint.amount.e8s;
            } else if (
              tx.operation &&
              tx.operation[0] &&
              'Transfer' in tx.operation[0]
            ) {
              balance += tx.operation[0].Transfer.amount.e8s;
            }
          }
        }

        if (hasBalance) {
          accountsWithBalances.push({
            token: tokenName,
            subaccountId: subaccountId,
            balance: balance.toString(),
            transactionsCount: transactions.length,
          });

          console.log(`  Found balance in subaccount for token ${tokenName}`);
          console.log(`  Subaccount ID: ${subaccountId}`);
          console.log(`  Estimated balance: ${balance.toString()}`);
          console.log(`  Transaction count: ${transactions.length}`);
        } else {
          console.log(`  No balance found for token ${tokenName}`);
        }
      } catch (error: any) {
        console.error(`Error processing token ${tokenName}:`, error.message);
      }
    }

    // Summary
    console.log('\n=== Summary of Accounts with Balances ===');
    if (accountsWithBalances.length === 0) {
      console.log('No accounts with balances found');
    } else {
      for (const account of accountsWithBalances) {
        console.log(`Token: ${account.token}`);
        console.log(`Subaccount ID: ${account.subaccountId}`);
        console.log(`Balance: ${account.balance}`);
        console.log(`Transactions: ${account.transactionsCount}`);
        console.log('---');
      }
    }
  } catch (error: any) {
    console.error('Error getting balances:', error.message);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  getBalances()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default getBalances;
