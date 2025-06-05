import { agent, USER_VAULT_CANISTER_ID } from './config';
import {
  getRegisteredTokens,
  addSubaccountForToken,
  getSubaccountId,
  getIcrcAccount,
  getTransactionsCount,
  getNonce,
} from '../../src';

/**
 * Get deposit addresses for all registered token types
 */
async function getDepositAddresses() {
  try {
    // Get the list of registered tokens
    const tokens = await getRegisteredTokens(agent, USER_VAULT_CANISTER_ID);

    if ('Err' in tokens) {
      console.error(`Error getting registered tokens: ${tokens.Err}`);
      return;
    }

    const tokenList = tokens.Ok;
    console.log(`Found ${tokenList.length} registered tokens:`);

    // For each token, create a subaccount and get its deposit address
    for (const [tokenType, tokenName] of tokenList) {
      console.log(
        `\nProcessing token: ${tokenName} (${JSON.stringify(tokenType)})`
      );

      const nonce = await getNonce(agent, USER_VAULT_CANISTER_ID);
      let index = 0;

      if ('Ok' in nonce) {
        index = nonce.Ok;
        console.log(`Subaccount nonce: ${nonce.Ok}`);
      } else {
        console.log(`Error getting subaccount nonce: ${nonce.Err}`);
      }

      // Create a subaccount for the token if it doesn't exist
      try {
        const result = await addSubaccountForToken(
          agent,
          USER_VAULT_CANISTER_ID,
          tokenType
        );

        if ('Ok' in result) {
          console.log(`Created subaccount: ${result.Ok}`);
        } else {
          console.log(`Error creating subaccount: ${result.Err.message}`);
        }
      } catch (error: any) {
        console.log(
          `Subaccount already exists or error creating: ${error.message}`
        );
      }

      // Get the subaccount ID for this token
      const subaccountIdResult = await getSubaccountId(
        agent,
        USER_VAULT_CANISTER_ID,
        index, // Using index since we need to provide an index
        tokenType
      );

      if ('Err' in subaccountIdResult) {
        console.log(
          `Error getting subaccount ID: ${subaccountIdResult.Err.message}`
        );
        continue;
      }

      const subaccountId = subaccountIdResult.Ok;
      console.log(`Subaccount ID: ${subaccountId}`);

      // Get the ICRC account for deposits
      const icrcAccountResult = await getIcrcAccount(
        agent,
        USER_VAULT_CANISTER_ID,
        index // Using index since we need to provide an index
      );

      if ('Err' in icrcAccountResult) {
        console.log(
          `Error getting ICRC account: ${icrcAccountResult.Err.message}`
        );
        continue;
      }

      const icrcAccount = icrcAccountResult.Ok;
      console.log(`Deposit address for ${tokenName}:`);
      console.log(`  Account: ${icrcAccount}`);

      // Get transaction count for this subaccount
      const txCountResult = await getTransactionsCount(
        agent,
        USER_VAULT_CANISTER_ID
      );

      if ('Err' in txCountResult) {
        console.log(`Error getting transaction count: ${txCountResult.Err}`);
      } else {
        console.log(`  Transaction count: ${txCountResult.Ok}`);
      }
    }
  } catch (error: any) {
    console.error('Error getting deposit addresses:', error.message);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  getDepositAddresses()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default getDepositAddresses;
