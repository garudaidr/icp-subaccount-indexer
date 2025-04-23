import * as dotenv from 'dotenv';
import { createHostAgentAndIdentityFromSeed } from '../../src/utils';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Verify required environment variables
const requiredEnvVars = ['SEED_PHRASE', 'USER_VAULT_CANISTER_ID'];
const missingEnvVars = requiredEnvVars.filter((env) => !process.env[env]);

if (missingEnvVars.length > 0) {
  console.error(
    `Error: Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
  console.error(
    'Please create a .env file based on .env.example with your configuration'
  );
  process.exit(1);
}

// Export environment variables with proper types
export const SEED_PHRASE = process.env.SEED_PHRASE!;
export const USER_VAULT_CANISTER_ID = process.env.USER_VAULT_CANISTER_ID!;
export const HOST = process.env.HOST || 'https://ic0.app';

// Create an agent using the seed phrase and host
export const agent = createHostAgentAndIdentityFromSeed(SEED_PHRASE, HOST);
