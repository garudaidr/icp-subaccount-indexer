import * as dotenv from 'dotenv';
import {
  createHostAgentAndIdentityFromSeed,
  createHostAgentAndIdentityFromPrivateKey,
} from '../../src/utils';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Environment variable configuration with defaults
export const SEED_PHRASE = process.env.SEED_PHRASE || '';
export const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
export const USER_VAULT_CANISTER_ID =
  process.env.USER_VAULT_CANISTER_ID || 'y3hne-ryaaa-aaaag-aucea-cai';
export const HOST = process.env.HOST || 'https://ic0.app';

// For devnet testing, allow override of default values
export const DEVNET_CANISTER_ID =
  process.env.DEVNET_CANISTER_ID || USER_VAULT_CANISTER_ID;

/**
 * Creates an authenticated agent using environment variables
 * Supports both seed phrases and private keys
 * @returns {HttpAgent} Configured agent with identity
 */
export function createAgent() {
  console.log(`🔧 Using canister: ${DEVNET_CANISTER_ID}`);
  console.log(`🌐 Using host: ${HOST}`);

  let agent;

  if (PRIVATE_KEY) {
    // Use private key if provided
    console.log(`🔑 Using private key: ${PRIVATE_KEY.substring(0, 8)}...`);
    agent = createHostAgentAndIdentityFromPrivateKey(PRIVATE_KEY, HOST);
  } else if (SEED_PHRASE) {
    // Fall back to seed phrase
    console.log(
      `🔑 Using seed phrase: ${SEED_PHRASE.split(' ').slice(0, 3).join(' ')}...`
    );
    agent = createHostAgentAndIdentityFromSeed(SEED_PHRASE, HOST);
  } else {
    throw new Error(
      'No authentication method provided. Set either SEED_PHRASE or PRIVATE_KEY in your .env file.'
    );
  }

  // Fetch root key for local development
  if (HOST !== 'https://ic0.app') {
    // Only fetch the root key when not on mainnet
    agent.fetchRootKey().catch((err) => {
      console.warn('Warning: Failed to fetch root key:', err.message);
    });
  }

  return agent;
}

/**
 * Print configuration information for debugging
 */
export function printConfig() {
  console.log('📋 Configuration:');
  console.log(`   Canister ID: ${DEVNET_CANISTER_ID}`);
  console.log(`   Host: ${HOST}`);

  // Show authentication method being used
  if (PRIVATE_KEY) {
    console.log(
      `   Private key: ${PRIVATE_KEY.substring(0, 8)}... (${PRIVATE_KEY.length} chars)`
    );
    console.log('   ✅ Using PRIVATE_KEY from environment');
  } else if (SEED_PHRASE) {
    console.log(
      `   Seed phrase: ${SEED_PHRASE.split(' ').slice(0, 3).join(' ')}... (${SEED_PHRASE.split(' ').length} words)`
    );
    if (process.env.SEED_PHRASE) {
      console.log('   ✅ Using SEED_PHRASE from environment');
    } else {
      console.log(
        '   ⚠️  Using default test seed phrase (may be unauthorized)'
      );
    }
  } else {
    console.log('   ❌ No authentication method configured!');
    console.log(
      '   Please set either SEED_PHRASE or PRIVATE_KEY in your .env file'
    );
  }

  // Show canister ID source
  if (process.env.USER_VAULT_CANISTER_ID || process.env.DEVNET_CANISTER_ID) {
    console.log('   ✅ Using canister ID from environment');
  } else {
    console.log('   ⚠️  Using default devnet canister ID');
  }
}
