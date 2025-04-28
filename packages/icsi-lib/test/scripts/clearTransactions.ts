import { agent, USER_VAULT_CANISTER_ID } from './config';
import { clearTransactions } from '../../src';

/**
 * Script to clear all transactions from the canister
 */
async function clearAllTransactions() {
  try {
    console.log(
      `Attempting to clear all transactions from canister ${USER_VAULT_CANISTER_ID}...`
    );

    // Use the clearTransactions function with no parameters to clear all transactions
    const result = await clearTransactions(
      agent,
      USER_VAULT_CANISTER_ID,
      undefined, // No specific index limit, clear all
      undefined // No specific timestamp limit, clear all
    );

    if ('Err' in result) {
      console.error(`Error clearing transactions: ${result.Err.message}`);
      return;
    }

    console.log(`Successfully cleared transactions!`);
    console.log(`Remaining transactions: ${result.Ok.length}`);
  } catch (error: any) {
    console.error(
      'Unhandled error during transaction clearing:',
      error.message
    );
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  clearAllTransactions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default clearAllTransactions;
