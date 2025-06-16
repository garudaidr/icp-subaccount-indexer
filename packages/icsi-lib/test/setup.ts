import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from test environment
config({ path: join(__dirname, '../.env.test') });

// Set default timeout for all tests
jest.setTimeout(120000);

// Global test configuration
global.testConfig = {
  canisterIds: {
    icp: process.env.ICP_CANISTER_ID || 'rdmx6-jaaaa-aaaaa-aaadq-cai',
    ckusdc: process.env.CKUSDC_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai',
    ckusdt: process.env.CKUSDT_CANISTER_ID || 'ryjl3-tyaaa-aaaaa-aaaba-cai',
    userVault: process.env.USER_VAULT_CANISTER_ID || '',
  },
  dfxHost: process.env.DFX_HOST || 'http://localhost:4943',
  network: process.env.DFX_NETWORK || 'local',
  minterPrincipal: process.env.MINTER_PRINCIPAL || '',
  testWallet: {
    seed: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    principal: '',
  },
};

// Add global type declarations
declare global {
  var testConfig: {
    canisterIds: {
      icp: string;
      ckusdc: string;
      ckusdt: string;
      userVault: string;
    };
    dfxHost: string;
    network: string;
    minterPrincipal: string;
    testWallet: {
      seed: string;
      principal: string;
    };
  };
}
