import { agent, USER_VAULT_CANISTER_ID } from './config';
import { registerToken } from '../../..';
import { Principal } from '@dfinity/principal';

/**
 * Register tokens with their respective ledger canister IDs
 */
async function registerTokens() {
  try {
    console.log('Registering tokens with their ledger canister IDs...');

    // Token IDs from Rust code
    const ICP_LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
    const CKUSDC_LEDGER_CANISTER_ID = 'xevnm-gaaaa-aaaar-qafnq-cai';
    const CKUSDT_LEDGER_CANISTER_ID = 'cngnf-vqaaa-aaaar-qag4q-cai';
    const CKBTC_LEDGER_CANISTER_ID = 'mxzaz-hqaaa-aaaar-qaada-cai';

    // Define token types - ensuring they're properly converted for candid
    const ICP = Object.freeze({ ICP: null });
    const CKUSDC = Object.freeze({ CKUSDC: null });
    const CKUSDT = Object.freeze({ CKUSDT: null });
    const CKBTC = Object.freeze({ CKBTC: null });

    // Register ICP token
    console.log(
      `\nRegistering ICP with ledger canister ID: ${ICP_LEDGER_CANISTER_ID}`
    );
    try {
      const icpResult = await registerToken(
        agent,
        USER_VAULT_CANISTER_ID,
        ICP,
        ICP_LEDGER_CANISTER_ID
      );

      if ('Ok' in icpResult) {
        console.log('✅ ICP token registered successfully');
      } else {
        console.log(`❌ Error registering ICP token: ${icpResult.Err.message}`);
      }
    } catch (error: any) {
      console.error(`Error registering ICP token: ${error.message}`);
    }

    // Register CKUSDC token
    console.log(
      `\nRegistering CKUSDC with ledger canister ID: ${CKUSDC_LEDGER_CANISTER_ID}`
    );
    try {
      const ckusdcResult = await registerToken(
        agent,
        USER_VAULT_CANISTER_ID,
        CKUSDC,
        CKUSDC_LEDGER_CANISTER_ID
      );

      if ('Ok' in ckusdcResult) {
        console.log('✅ CKUSDC token registered successfully');
      } else {
        console.log(
          `❌ Error registering CKUSDC token: ${ckusdcResult.Err.message}`
        );
      }
    } catch (error: any) {
      console.error(`Error registering CKUSDC token: ${error.message}`);
    }

    // Register CKUSDT token
    console.log(
      `\nRegistering CKUSDT with ledger canister ID: ${CKUSDT_LEDGER_CANISTER_ID}`
    );
    try {
      const ckusdtResult = await registerToken(
        agent,
        USER_VAULT_CANISTER_ID,
        CKUSDT,
        CKUSDT_LEDGER_CANISTER_ID
      );

      if ('Ok' in ckusdtResult) {
        console.log('✅ CKUSDT token registered successfully');
      } else {
        console.log(
          `❌ Error registering CKUSDT token: ${ckusdtResult.Err.message}`
        );
      }
    } catch (error: any) {
      console.error(`Error registering CKUSDT token: ${error.message}`);
    }

    // Register CKBTC token
    console.log(
      `\nRegistering CKBTC with ledger canister ID: ${CKBTC_LEDGER_CANISTER_ID}`
    );
    try {
      const ckbtcResult = await registerToken(
        agent,
        USER_VAULT_CANISTER_ID,
        CKBTC,
        CKBTC_LEDGER_CANISTER_ID
      );

      if ('Ok' in ckbtcResult) {
        console.log('✅ CKBTC token registered successfully');
      } else {
        console.log(
          `❌ Error registering CKBTC token: ${ckbtcResult.Err.message}`
        );
      }
    } catch (error: any) {
      console.error(`Error registering CKBTC token: ${error.message}`);
    }

    console.log(
      '\nToken registration complete. Now you can create subaccounts for these tokens.'
    );
  } catch (error: any) {
    console.error('Error during token registration process:', error.message);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  registerTokens()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default registerTokens;
