import { HttpAgent } from '@dfinity/agent';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import {
  createHostAgentAndIdentityFromSeed,
  getIdentityFromSeed,
} from '../../src/utils';
import { Principal } from '@dfinity/principal';

export class TestHelper {
  private static instance: TestHelper;
  public agent: HttpAgent;
  public identity: Secp256k1KeyIdentity;
  public principal: Principal;

  private constructor() {
    // Initialize with test wallet
    const identity = getIdentityFromSeed(global.testConfig.testWallet.seed);
    const agent = createHostAgentAndIdentityFromSeed(
      global.testConfig.testWallet.seed,
      global.testConfig.dfxHost
    );

    this.agent = agent;
    this.identity = identity;
    this.principal = identity.getPrincipal();

    // Update global test config
    global.testConfig.testWallet.principal = this.principal.toString();
  }

  static getInstance(): TestHelper {
    if (!TestHelper.instance) {
      TestHelper.instance = new TestHelper();
    }
    return TestHelper.instance;
  }

  async waitForCanister(canisterId: string, maxRetries = 30): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(
          `${global.testConfig.dfxHost}/_/api/v2/canister/${canisterId}/module_hash`
        );
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Canister not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
  }

  async waitForTransactionToBeIndexed(
    checkFunction: () => Promise<boolean>,
    maxRetries = 60,
    intervalMs = 2000
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await checkFunction();
        if (result) {
          return true;
        }
      } catch (error) {
        // Continue trying
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return false;
  }

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  generateRandomAmount(min: number = 0.001, max: number = 1): number {
    return Math.random() * (max - min) + min;
  }

  convertToE8s(amount: number): bigint {
    return BigInt(Math.floor(amount * 100_000_000));
  }

  convertFromE8s(amount: bigint): number {
    return Number(amount) / 100_000_000;
  }
}

export const testHelper = TestHelper.getInstance();

// Common test data
export const testData = {
  validAmounts: [0.001, 0.1, 1.0, 10.5],
  invalidAmounts: [-1, 0, Number.NaN, Number.POSITIVE_INFINITY],
  validIntervals: [10n, 30n, 60n, 300n, 500n],
  invalidIntervals: [0n, -1n],
  webhookUrls: {
    valid: ['https://example.com/webhook', 'https://api.test.com/notify'],
    invalid: ['not-a-url', 'ftp://invalid.com', ''],
  },
};

// Mock data generators
export function generateMockTransaction() {
  return {
    amount: testHelper.generateRandomAmount(),
    from: testHelper.principal.toString(),
    to: 'mock-subaccount-id',
    memo: BigInt(Math.floor(Math.random() * 1000000)),
  };
}
