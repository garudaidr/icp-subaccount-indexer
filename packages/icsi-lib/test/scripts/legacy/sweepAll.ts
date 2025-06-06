import { agent, USER_VAULT_CANISTER_ID } from './config';
import {
  getRegisteredTokens,
  sweep,
  sweepByTokenType,
  getSubaccountId,
  sweepSubaccountId,
} from '../../..';
import { Principal } from '@dfinity/principal';

/**
 * Script to sweep all tokens from all subaccounts
 */
async function sweepAll() {
  try {
    console.log('Sweeping all tokens from all subaccounts...');

    // Method 1: Sweep all subaccounts at once
    console.log('\nMethod 1: Sweeping all subaccounts at once');
    try {
      const result = await sweep(agent, USER_VAULT_CANISTER_ID);

      if ('Ok' in result) {
        console.log('Sweep result:', result.Ok);
      } else {
        console.log('Sweep error:', result.Err.message);
      }
    } catch (error: any) {
      console.error('Error sweeping all:', error.message);
    }

    // Method 2: Sweep by token type
    console.log('\nMethod 2: Sweeping by token type');
    const tokensResult = await getRegisteredTokens(
      agent,
      USER_VAULT_CANISTER_ID
    );

    if ('Err' in tokensResult) {
      console.error(`Error getting registered tokens: ${tokensResult.Err}`);
      return;
    }

    const tokens = tokensResult.Ok;

    for (const [tokenPrincipal, tokenName] of tokens) {
      console.log(
        `\nSweeping token: ${tokenName} (${tokenPrincipal.toString()})`
      );
      try {
        const result = await sweepByTokenType(
          agent,
          USER_VAULT_CANISTER_ID,
          tokenPrincipal
        );

        if ('Ok' in result) {
          console.log('Sweep result:', result.Ok);
        } else {
          console.log('Sweep error:', result.Err.message);
        }
      } catch (error: any) {
        console.error(`Error sweeping token ${tokenName}:`, error.message);
      }
    }

    // Method 3: Sweep individual subaccounts
    console.log('\nMethod 3: Sweeping individual subaccounts');
    for (const [tokenType, tokenName] of tokens) {
      try {
        const subaccountIdResult = await getSubaccountId(
          agent,
          USER_VAULT_CANISTER_ID,
          0, // Using index 0 as the default
          tokenType // Pass the token type
        );

        if ('Err' in subaccountIdResult) {
          console.log(
            `Error getting subaccount ID: ${subaccountIdResult.Err.message}`
          );
          continue;
        }

        const subaccountId = subaccountIdResult.Ok;

        console.log(
          `Sweeping subaccount for token ${tokenName} (${tokenType.toString()})`
        );
        const result = await sweepSubaccountId(
          agent,
          USER_VAULT_CANISTER_ID,
          subaccountId,
          0.0, // passing 0.0 as a float64 to sweep all
          tokenType // Pass the token type
        );

        if ('Ok' in result) {
          console.log('Sweep result:', result.Ok);
        } else {
          console.log('Sweep error:', result.Err.message);
        }
      } catch (error: any) {
        console.error(
          `Error sweeping subaccount for token ${tokenName}:`,
          error.message
        );
      }
    }

    console.log('\nAll sweep operations completed.');
  } catch (error: any) {
    console.error('Error in sweepAll:', error.message);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  sweepAll()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default sweepAll;
