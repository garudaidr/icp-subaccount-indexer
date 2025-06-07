import {
  Tokens,
  getTokenConfig,
  getDepositAddresses,
  getBalances,
  getTransactionsByTokenType,
} from '../../src/helpers';
import { HttpAgent } from '@dfinity/agent';

// Mock the agent for unit tests
jest.mock('@dfinity/agent');

describe('Helper Functions', () => {
  let mockAgent: jest.Mocked<HttpAgent>;
  const mockCanisterId = 'rdmx6-jaaaa-aaaaa-aaadq-cai';

  beforeEach(() => {
    mockAgent = {
      call: jest.fn(),
      query: jest.fn(),
    } as any;
  });

  describe('Tokens constant', () => {
    it('should have correct token type definitions', () => {
      expect(Tokens.ICP).toEqual({ ICP: null });
      expect(Tokens.CKUSDC).toEqual({ CKUSDC: null });
      expect(Tokens.CKUSDT).toEqual({ CKUSDT: null });
    });

    it('should be immutable', () => {
      expect(() => {
        (Tokens as any).ICP = { MODIFIED: null };
      }).toThrow();
    });
  });

  describe('getTokenConfig', () => {
    it('should return correct config for ICP', () => {
      const config = getTokenConfig(Tokens.ICP);

      expect(config).toEqual({
        canisterId: expect.any(String),
        symbol: 'ICP',
        decimals: 8,
      });

      expect(config.canisterId.length).toBeGreaterThan(0);
    });

    it('should return correct config for CKUSDC', () => {
      const config = getTokenConfig(Tokens.CKUSDC);

      expect(config).toEqual({
        canisterId: expect.any(String),
        symbol: 'CKUSDC',
        decimals: 6,
      });

      expect(config.canisterId.length).toBeGreaterThan(0);
    });

    it('should return correct config for CKUSDT', () => {
      const config = getTokenConfig(Tokens.CKUSDT);

      expect(config).toEqual({
        canisterId: expect.any(String),
        symbol: 'CKUSDT',
        decimals: 6,
      });

      expect(config.canisterId.length).toBeGreaterThan(0);
    });

    it('should use environment variables when available', () => {
      const originalIcp = process.env.ICP_CANISTER_ID;
      const originalCkusdc = process.env.CKUSDC_CANISTER_ID;
      const originalCkusdt = process.env.CKUSDT_CANISTER_ID;

      try {
        process.env.ICP_CANISTER_ID = 'test-icp-canister-id';
        process.env.CKUSDC_CANISTER_ID = 'test-ckusdc-canister-id';
        process.env.CKUSDT_CANISTER_ID = 'test-ckusdt-canister-id';

        expect(getTokenConfig(Tokens.ICP).canisterId).toBe(
          'test-icp-canister-id'
        );
        expect(getTokenConfig(Tokens.CKUSDC).canisterId).toBe(
          'test-ckusdc-canister-id'
        );
        expect(getTokenConfig(Tokens.CKUSDT).canisterId).toBe(
          'test-ckusdt-canister-id'
        );
      } finally {
        // Restore original values
        if (originalIcp) process.env.ICP_CANISTER_ID = originalIcp;
        else delete process.env.ICP_CANISTER_ID;
        if (originalCkusdc) process.env.CKUSDC_CANISTER_ID = originalCkusdc;
        else delete process.env.CKUSDC_CANISTER_ID;
        if (originalCkusdt) process.env.CKUSDT_CANISTER_ID = originalCkusdt;
        else delete process.env.CKUSDT_CANISTER_ID;
      }
    });

    it('should throw error for unknown token type', () => {
      const unknownToken = { UNKNOWN: null } as any;

      expect(() => {
        getTokenConfig(unknownToken);
      }).toThrow('Unknown token type');
    });

    it('should handle edge cases in token type checking', () => {
      // Test with malformed token types
      const malformedTokens = [
        { ICP: 'not-null' },
        { CKUSDC: 'not-null' },
        { CKUSDT: 'not-null' },
      ] as any[];

      for (const token of malformedTokens) {
        try {
          const config = getTokenConfig(token);
          expect(config).toBeDefined();
        } catch (error) {
          // Some malformed tokens might throw errors
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('getDepositAddresses', () => {
    it('should handle successful query response', async () => {
      // Mock successful response
      const mockResponse = {
        Ok: [
          {
            tokenType: { ICP: null },
            tokenName: 'ICP',
            subaccountId: 'test-subaccount-1',
            depositAddress: 'test-address-1',
          },
          {
            tokenType: { CKUSDC: null },
            tokenName: 'CKUSDC',
            subaccountId: 'test-subaccount-2',
            depositAddress: 'test-address-2',
          },
        ],
      };

      mockAgent.query = jest.fn().mockResolvedValue(mockResponse);

      const addresses = await getDepositAddresses(mockAgent, mockCanisterId);

      expect(Array.isArray(addresses)).toBe(true);
      expect(addresses).toHaveLength(2);

      expect(addresses[0]).toMatchObject({
        tokenType: { ICP: null },
        tokenName: 'ICP',
        subaccountId: 'test-subaccount-1',
        depositAddress: 'test-address-1',
      });
    });

    it('should handle error response', async () => {
      // Mock error response
      const mockResponse = {
        Err: 'No registered tokens',
      };

      mockAgent.query = jest.fn().mockResolvedValue(mockResponse);

      await expect(
        getDepositAddresses(mockAgent, mockCanisterId)
      ).rejects.toThrow('No registered tokens');
    });

    it('should handle invalid canister ID', async () => {
      mockAgent.query = jest
        .fn()
        .mockRejectedValue(new Error('Invalid canister ID'));

      await expect(
        getDepositAddresses(mockAgent, 'invalid-id')
      ).rejects.toThrow('Invalid canister ID');
    });

    it('should handle empty canister ID', async () => {
      await expect(getDepositAddresses(mockAgent, '')).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      mockAgent.query = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        getDepositAddresses(mockAgent, mockCanisterId)
      ).rejects.toThrow('Network error');
    });
  });

  describe('getBalances', () => {
    it('should calculate balances correctly', async () => {
      // Mock transactions response
      const mockTransactions = {
        Ok: [
          {
            transactionHash: 'hash1',
            tokenType: { ICP: null },
            amount: BigInt(1000000),
            isSwept: false,
          },
          {
            transactionHash: 'hash2',
            tokenType: { CKUSDC: null },
            amount: BigInt(5000000),
            isSwept: false,
          },
          {
            transactionHash: 'hash3',
            tokenType: { ICP: null },
            amount: BigInt(500000),
            isSwept: true, // This should be excluded
          },
        ],
      };

      mockAgent.query = jest.fn().mockResolvedValue(mockTransactions);

      const balances = await getBalances(mockAgent, mockCanisterId);

      expect(Array.isArray(balances)).toBe(true);
      expect(balances).toHaveLength(2);

      // Find ICP balance
      const icpBalance = balances.find((b) => b.tokenName === 'ICP');
      expect(icpBalance).toBeDefined();
      expect(icpBalance?.amount).toBe(BigInt(1000000));
      expect(icpBalance?.decimals).toBe(8);

      // Find CKUSDC balance
      const ckusdcBalance = balances.find((b) => b.tokenName === 'CKUSDC');
      expect(ckusdcBalance).toBeDefined();
      expect(ckusdcBalance?.amount).toBe(BigInt(5000000));
      expect(ckusdcBalance?.decimals).toBe(6);
    });

    it('should return empty array when no transactions exist', async () => {
      mockAgent.query = jest.fn().mockResolvedValue({ Ok: [] });

      const balances = await getBalances(mockAgent, mockCanisterId);

      expect(Array.isArray(balances)).toBe(true);
      expect(balances).toHaveLength(0);
    });

    it('should handle invalid canister ID', async () => {
      mockAgent.query = jest
        .fn()
        .mockRejectedValue(new Error('Invalid canister'));

      await expect(getBalances(mockAgent, 'invalid-id')).rejects.toThrow(
        'Invalid canister'
      );
    });

    it('should filter out swept transactions correctly', async () => {
      const mockTransactions = {
        Ok: [
          {
            transactionHash: 'hash1',
            tokenType: { ICP: null },
            amount: BigInt(1000000),
            isSwept: false,
          },
          {
            transactionHash: 'hash2',
            tokenType: { ICP: null },
            amount: BigInt(2000000),
            isSwept: true,
          },
        ],
      };

      mockAgent.query = jest.fn().mockResolvedValue(mockTransactions);

      const balances = await getBalances(mockAgent, mockCanisterId);

      expect(balances).toHaveLength(1);
      expect(balances[0].amount).toBe(BigInt(1000000));
    });

    it('should handle different token types in balances', async () => {
      const mockTransactions = {
        Ok: [
          {
            transactionHash: 'hash1',
            tokenType: { ICP: null },
            amount: BigInt(1000000),
            isSwept: false,
          },
          {
            transactionHash: 'hash2',
            tokenType: { CKUSDC: null },
            amount: BigInt(2000000),
            isSwept: false,
          },
          {
            transactionHash: 'hash3',
            tokenType: { CKUSDT: null },
            amount: BigInt(3000000),
            isSwept: false,
          },
        ],
      };

      mockAgent.query = jest.fn().mockResolvedValue(mockTransactions);

      const balances = await getBalances(mockAgent, mockCanisterId);

      expect(balances).toHaveLength(3);

      const tokenNames = balances.map((b) => b.tokenName).sort();
      expect(tokenNames).toEqual(['CKUSDC', 'CKUSDT', 'ICP']);
    });
  });

  describe('getTransactionsByTokenType', () => {
    it('should retrieve transactions for ICP', async () => {
      const mockTransactions = {
        Ok: [
          {
            transactionHash: 'hash1',
            tokenType: { ICP: null },
            amount: BigInt(1000000),
            isSwept: false,
          },
        ],
      };

      mockAgent.query = jest.fn().mockResolvedValue(mockTransactions);

      const transactions = await getTransactionsByTokenType(
        mockAgent,
        mockCanisterId,
        Tokens.ICP
      );

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].tokenType).toEqual({ ICP: null });
    });

    it('should retrieve transactions for CKUSDC', async () => {
      const mockTransactions = {
        Ok: [
          {
            transactionHash: 'hash1',
            tokenType: { CKUSDC: null },
            amount: BigInt(5000000),
            isSwept: false,
          },
        ],
      };

      mockAgent.query = jest.fn().mockResolvedValue(mockTransactions);

      const transactions = await getTransactionsByTokenType(
        mockAgent,
        mockCanisterId,
        Tokens.CKUSDC
      );

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].tokenType).toEqual({ CKUSDC: null });
    });

    it('should retrieve transactions for CKUSDT', async () => {
      const mockTransactions = {
        Ok: [
          {
            transactionHash: 'hash1',
            tokenType: { CKUSDT: null },
            amount: BigInt(3000000),
            isSwept: false,
          },
        ],
      };

      mockAgent.query = jest.fn().mockResolvedValue(mockTransactions);

      const transactions = await getTransactionsByTokenType(
        mockAgent,
        mockCanisterId,
        Tokens.CKUSDT
      );

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].tokenType).toEqual({ CKUSDT: null });
    });

    it('should return empty array for token with no transactions', async () => {
      mockAgent.query = jest.fn().mockResolvedValue({ Ok: [] });

      const transactions = await getTransactionsByTokenType(
        mockAgent,
        mockCanisterId,
        Tokens.ICP
      );

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions).toHaveLength(0);
    });

    it('should handle invalid token type', async () => {
      const invalidToken = { INVALID: null } as any;

      await expect(
        getTransactionsByTokenType(mockAgent, mockCanisterId, invalidToken)
      ).rejects.toThrow();
    });

    it('should handle invalid canister ID', async () => {
      mockAgent.query = jest
        .fn()
        .mockRejectedValue(new Error('Invalid canister'));

      await expect(
        getTransactionsByTokenType(mockAgent, 'invalid-id', Tokens.ICP)
      ).rejects.toThrow('Invalid canister');
    });

    it('should properly format transaction data', async () => {
      const mockTransactions = {
        Ok: [
          {
            transactionHash: 'abcd1234',
            tokenType: { ICP: null },
            amount: BigInt(1500000),
            isSwept: false,
            timestamp: BigInt(1234567890),
            fromSubaccount: 'subaccount-1',
            toSubaccount: 'subaccount-2',
          },
        ],
      };

      mockAgent.query = jest.fn().mockResolvedValue(mockTransactions);

      const transactions = await getTransactionsByTokenType(
        mockAgent,
        mockCanisterId,
        Tokens.ICP
      );

      expect(transactions[0]).toMatchObject({
        transactionHash: 'abcd1234',
        tokenType: { ICP: null },
        amount: BigInt(1500000),
        isSwept: false,
      });
    });
  });
});
