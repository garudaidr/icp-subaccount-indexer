// Unit test setup - no Docker dependency
jest.setTimeout(10000);

// Add global type declarations first
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

// Simple mock configuration for unit tests
(global as any).testConfig = {
  canisterIds: {
    icp: 'rdmx6-jaaaa-aaaaa-aaadq-cai',
    ckusdc: 'rrkah-fqaaa-aaaaa-aaaaq-cai',
    ckusdt: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
    userVault: 'mock-canister-id',
  },
  dfxHost: 'http://localhost:4943',
  network: 'local',
  minterPrincipal: 'mock-principal',
  testWallet: {
    seed: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    principal: 'mock-principal',
  },
};

// Export empty to make this a module
export {};
