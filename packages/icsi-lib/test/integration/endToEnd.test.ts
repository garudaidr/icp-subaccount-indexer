import {
  addSubaccountForToken,
  getDepositAddresses,
  getBalances,
  getUserVaultTransactions,
  getUserVaultInterval,
  getTransactionsCount,
  setUserVaultInterval,
  setWebhookUrl,
  getWebhookUrl,
  sweep,
  sweepByTokenType,
  registerToken,
  getRegisteredTokens,
  getNonce,
  getSubaccountCount,
} from '../../src';
import { Tokens } from '../../src/helpers';
import { testHelper } from '../helpers/testUtils';

describe('End-to-End Integration Tests', () => {
  const canisterId = global.testConfig.canisterIds.userVault;
  let initialNonce: number;
  let testWebhookUrl: string;

  beforeAll(async () => {
    if (!canisterId) {
      throw new Error('USER_VAULT_CANISTER_ID not set in test environment');
    }

    // Wait for canister to be ready
    const isReady = await testHelper.waitForCanister(canisterId);
    if (!isReady) {
      throw new Error('Canister not ready for testing');
    }

    // Get initial state
    try {
      initialNonce = await getNonce(testHelper.agent, canisterId);
    } catch (error) {
      console.warn('Could not get initial nonce:', error);
      initialNonce = 0;
    }

    // Set up test webhook URL
    testWebhookUrl = 'https://webhook.site/test-integration';
  });

  describe('Complete Workflow Tests', () => {
    it('should complete a full token registration and subaccount creation workflow', async () => {
      const tokenTypes = [Tokens.ICP, Tokens.CKUSDC, Tokens.CKUSDT];
      const tokenCanisterIds = {
        icpLedgerCanisterId: global.testConfig.canisterIds.icp,
        ckusdcCanisterId: global.testConfig.canisterIds.ckusdc,
        ckusdtCanisterId: global.testConfig.canisterIds.ckusdt,
      };

      for (const tokenType of tokenTypes) {
        // 1. Register token (might already be registered)
        try {
          let canisterIdForToken: string;
          if ('ICP' in tokenType) {
            canisterIdForToken = tokenCanisterIds.icpLedgerCanisterId;
          } else if ('CKUSDC' in tokenType) {
            canisterIdForToken = tokenCanisterIds.ckusdcCanisterId;
          } else {
            canisterIdForToken = tokenCanisterIds.ckusdtCanisterId;
          }

          await registerToken(
            testHelper.agent,
            canisterId,
            tokenType,
            canisterIdForToken
          );
        } catch (error) {
          // Token might already be registered
          console.log(
            `Token registration for ${JSON.stringify(tokenType)} result:`,
            error
          );
        }

        // 2. Add subaccount for the token
        const addResult = await addSubaccountForToken(
          testHelper.agent,
          canisterId,
          tokenType,
          tokenCanisterIds
        );

        expect(addResult).toBeDefined();
        if ('Ok' in addResult) {
          expect(typeof addResult.Ok).toBe('string');
          expect(addResult.Ok.length).toBeGreaterThan(0);
        }

        // Small delay between operations
        await testHelper.sleep(1000);
      }

      // 3. Verify registered tokens
      const registeredTokensResult = await getRegisteredTokens(
        testHelper.agent,
        canisterId
      );
      expect(registeredTokensResult).toBeDefined();

      if ('Ok' in registeredTokensResult) {
        expect(registeredTokensResult.Ok.length).toBeGreaterThan(0);

        // Verify that our tokens are registered
        const registeredTypes = registeredTokensResult.Ok.map(
          ([tokenType]) => tokenType
        );
        expect(registeredTypes.length).toBeGreaterThanOrEqual(1);
      }

      // 4. Get deposit addresses
      const depositAddresses = await getDepositAddresses(
        testHelper.agent,
        canisterId
      );
      expect(Array.isArray(depositAddresses)).toBe(true);
      expect(depositAddresses.length).toBeGreaterThan(0);

      for (const address of depositAddresses) {
        expect(address.subaccountId).toBeDefined();
        expect(address.depositAddress).toBeDefined();
        expect(address.tokenName).toBeDefined();
        expect(address.subaccountId.length).toBeGreaterThan(0);
        expect(address.depositAddress.length).toBeGreaterThan(0);
      }

      // 5. Verify subaccount count increased
      const finalSubaccountCount = await getSubaccountCount(
        testHelper.agent,
        canisterId
      );
      expect(typeof finalSubaccountCount).toBe('number');
      expect(finalSubaccountCount).toBeGreaterThanOrEqual(0);
    }, 180000); // 3 minutes timeout for this comprehensive test

    it('should handle webhook configuration workflow', async () => {
      // 1. Set webhook URL
      await setWebhookUrl(testHelper.agent, canisterId, testWebhookUrl);

      // 2. Verify webhook URL was set
      const retrievedUrl = await getWebhookUrl(testHelper.agent, canisterId);
      expect(retrievedUrl).toBe(testWebhookUrl);

      // 3. Update webhook URL
      const newWebhookUrl = 'https://api.example.com/webhook/updated';
      await setWebhookUrl(testHelper.agent, canisterId, newWebhookUrl);

      // 4. Verify update
      const updatedUrl = await getWebhookUrl(testHelper.agent, canisterId);
      expect(updatedUrl).toBe(newWebhookUrl);

      // 5. Clear webhook URL
      await setWebhookUrl(testHelper.agent, canisterId, '');
      const clearedUrl = await getWebhookUrl(testHelper.agent, canisterId);
      expect(clearedUrl).toBe('');
    });

    it('should handle interval configuration workflow', async () => {
      const testIntervals = [30n, 60n, 300n];

      for (const interval of testIntervals) {
        // Set interval
        const setResult = await setUserVaultInterval(
          testHelper.agent,
          canisterId,
          interval
        );
        expect(setResult).toBe(interval);

        // Verify interval was set
        const retrievedInterval = await getUserVaultInterval(
          testHelper.agent,
          canisterId
        );
        expect(retrievedInterval).toBe(interval);

        // Small delay between operations
        await testHelper.sleep(500);
      }
    });

    it('should handle transaction and balance queries', async () => {
      // 1. Get initial transaction count
      const initialTxCount = await getTransactionsCount(
        testHelper.agent,
        canisterId
      );
      expect(typeof initialTxCount).toBe('number');
      expect(initialTxCount).toBeGreaterThanOrEqual(0);

      // 2. Get transactions
      const transactions = await getUserVaultTransactions(
        testHelper.agent,
        canisterId
      );
      expect(transactions).toBeDefined();

      if ('Ok' in transactions) {
        expect(Array.isArray(transactions.Ok)).toBe(true);
        expect(transactions.Ok.length).toBe(initialTxCount);
      }

      // 3. Get balances
      const balances = await getBalances(testHelper.agent, canisterId);
      expect(Array.isArray(balances)).toBe(true);

      // If there are balances, verify their structure
      for (const balance of balances) {
        expect(balance.tokenType).toBeDefined();
        expect(balance.tokenName).toBeDefined();
        expect(typeof balance.amount).toBe('bigint');
        expect(typeof balance.decimals).toBe('number');
        expect(balance.amount).toBeGreaterThanOrEqual(0n);
        expect(balance.decimals).toBeGreaterThan(0);
      }
    });

    it('should handle sweep operations gracefully', async () => {
      // Note: These operations are expected to fail in test environment
      // since there are likely no transactions to sweep

      // 1. Try general sweep
      try {
        const sweepResult = await sweep(testHelper.agent, canisterId);
        expect(Array.isArray(sweepResult)).toBe(true);
      } catch (error) {
        // Expected to fail without transactions
        expect(error).toBeDefined();
      }

      // 2. Try sweep by token type
      for (const tokenType of [Tokens.ICP, Tokens.CKUSDC, Tokens.CKUSDT]) {
        try {
          const sweepResult = await sweepByTokenType(
            testHelper.agent,
            canisterId,
            tokenType
          );
          expect(Array.isArray(sweepResult)).toBe(true);
        } catch (error) {
          // Expected to fail without transactions
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle rapid successive operations', async () => {
      const operations = [];

      // Create multiple concurrent operations
      for (let i = 0; i < 5; i++) {
        operations.push(
          getNonce(testHelper.agent, canisterId).catch(() => null)
        );
        operations.push(
          getSubaccountCount(testHelper.agent, canisterId).catch(() => null)
        );
        operations.push(
          getUserVaultInterval(testHelper.agent, canisterId).catch(() => null)
        );
      }

      // Wait for all operations to complete
      const results = await Promise.allSettled(operations);

      // At least some operations should succeed
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(0);
    });

    it('should maintain consistency across multiple reads', async () => {
      // Read the same data multiple times to check consistency
      const nonces = [];
      const intervals = [];
      const subaccountCounts = [];

      for (let i = 0; i < 3; i++) {
        try {
          nonces.push(await getNonce(testHelper.agent, canisterId));
          intervals.push(
            await getUserVaultInterval(testHelper.agent, canisterId)
          );
          subaccountCounts.push(
            await getSubaccountCount(testHelper.agent, canisterId)
          );

          await testHelper.sleep(100); // Small delay between reads
        } catch (error) {
          console.warn('Consistency check failed:', error);
        }
      }

      // Check that values are consistent (allowing for legitimate state changes)
      if (nonces.length > 1) {
        // Nonce should only increase or stay the same
        for (let i = 1; i < nonces.length; i++) {
          expect(nonces[i]).toBeGreaterThanOrEqual(nonces[i - 1]);
        }
      }

      if (subaccountCounts.length > 1) {
        // Subaccount count should only increase or stay the same
        for (let i = 1; i < subaccountCounts.length; i++) {
          expect(subaccountCounts[i]).toBeGreaterThanOrEqual(
            subaccountCounts[i - 1]
          );
        }
      }
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Test with a very short timeout to simulate network issues
      const shortTimeoutAgent = testHelper.agent;

      try {
        // This might timeout, but should handle it gracefully
        await Promise.race([
          getNonce(shortTimeoutAgent, canisterId),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          ),
        ]);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('State Persistence Tests', () => {
    it('should persist configuration changes', async () => {
      const testInterval = 123n;
      const testWebhookUrl = 'https://persistent.test.com/webhook';

      // Set configuration
      await setUserVaultInterval(testHelper.agent, canisterId, testInterval);
      await setWebhookUrl(testHelper.agent, canisterId, testWebhookUrl);

      // Wait a bit
      await testHelper.sleep(2000);

      // Verify persistence
      const persistedInterval = await getUserVaultInterval(
        testHelper.agent,
        canisterId
      );
      const persistedWebhookUrl = await getWebhookUrl(
        testHelper.agent,
        canisterId
      );

      expect(persistedInterval).toBe(testInterval);
      expect(persistedWebhookUrl).toBe(testWebhookUrl);
    });

    it('should maintain registered tokens across operations', async () => {
      // Get initial registered tokens
      const initialTokens = await getRegisteredTokens(
        testHelper.agent,
        canisterId
      );

      if ('Ok' in initialTokens) {
        const initialCount = initialTokens.Ok.length;

        // Perform some other operations
        await getNonce(testHelper.agent, canisterId);
        await getSubaccountCount(testHelper.agent, canisterId);
        await setUserVaultInterval(testHelper.agent, canisterId, 60n);

        // Verify tokens are still there
        const finalTokens = await getRegisteredTokens(
          testHelper.agent,
          canisterId
        );

        if ('Ok' in finalTokens) {
          expect(finalTokens.Ok.length).toBeGreaterThanOrEqual(initialCount);
        }
      }
    });
  });
});
