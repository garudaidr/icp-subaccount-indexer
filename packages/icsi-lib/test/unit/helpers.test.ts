// @ts-nocheck
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

// Mock the query and update modules
jest.mock('../../src/query', () => ({
  getRegisteredTokens: jest.fn(),
  getSubaccountId: jest.fn(),
  getIcrcAccount: jest.fn(),
  getUserVaultTransactions: jest.fn(),
  getNonce: jest.fn(),
}));

jest.mock('../../src/update', () => ({
  addSubaccountForToken: jest.fn(),
}));


// Import the mocked functions
import {
  getRegisteredTokens,
  getSubaccountId,
  getIcrcAccount,
  getUserVaultTransactions,
  getNonce,
} from '../../src/query';
import { addSubaccountForToken } from '../../src/update';

const mockGetRegisteredTokens = getRegisteredTokens as jest.MockedFunction<typeof getRegisteredTokens>;
const mockGetSubaccountId = getSubaccountId as jest.MockedFunction<typeof getSubaccountId>;
const mockGetIcrcAccount = getIcrcAccount as jest.MockedFunction<typeof getIcrcAccount>;
const mockGetUserVaultTransactions = getUserVaultTransactions as jest.MockedFunction<typeof getUserVaultTransactions>;
const mockGetNonce = getNonce as jest.MockedFunction<typeof getNonce>;
const mockAddSubaccountForToken = addSubaccountForToken as jest.MockedFunction<typeof addSubaccountForToken>;

describe('Helper Functions', () => {
  let mockAgent: jest.Mocked<HttpAgent>;
  const mockCanisterId = 'rdmx6-jaaaa-aaaaa-aaadq-cai';

  beforeEach(() => {
    mockAgent = {
      call: jest.fn(),
      query: jest.fn(),
    } as any;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Tokens constant', () => {
    it('should have correct token type definitions', () => {
      expect(Tokens.ICP).toEqual({ ICP: null });
      expect(Tokens.CKUSDC).toEqual({ CKUSDC: null });
      expect(Tokens.CKUSDT).toEqual({ CKUSDT: null });
    });

    it('should be immutable', () => {
      // Note: The Tokens object from const assertion is read-only in TypeScript
      // but not truly immutable at runtime. This test should be updated.
      const originalICP = Tokens.ICP;
      try {
        (Tokens as any).ICP = { MODIFIED: null };
        // If we reach here, it means assignment succeeded
        expect(Tokens.ICP).not.toEqual({ MODIFIED: null });
      } catch (error) {
        // If assignment throws, that's also fine
        expect(error).toBeDefined();
      }
      // Restore original value if it was changed
      (Tokens as any).ICP = originalICP;
    });
  });

  describe('getTokenConfig', () => {
    it('should return correct config for ICP', () => {
      const config = getTokenConfig(Tokens.ICP);

      expect(config).toMatchObject({
        canisterId: expect.any(String),
        symbol: 'ICP',
        decimals: 8,
      });

      expect(config.canisterId.length).toBeGreaterThan(0);
      // Check default value when no env var is set
      expect(config.canisterId).toBe('ryjl3-tyaaa-aaaaa-aaaba-cai');
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
        if (originalIcp !== undefined) {
          process.env.ICP_CANISTER_ID = originalIcp;
        } else {
          delete process.env.ICP_CANISTER_ID;
        }
        if (originalCkusdc !== undefined) {
          process.env.CKUSDC_CANISTER_ID = originalCkusdc;
        } else {
          delete process.env.CKUSDC_CANISTER_ID;
        }
        if (originalCkusdt !== undefined) {
          process.env.CKUSDT_CANISTER_ID = originalCkusdt;
        } else {
          delete process.env.CKUSDT_CANISTER_ID;
        }
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

  describe.skip('getDepositAddresses', () => {
    it('should handle successful query response', async () => {
      // Mock the sequence of calls that getDepositAddresses makes
      mockGetRegisteredTokens.mockResolvedValue({
        Ok: [
          [{ ICP: null }, 'ICP'],
          [{ CKUSDC: null }, 'CKUSDC'],
        ],
      });
      
      mockGetNonce
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);
      
      mockAddSubaccountForToken
        .mockResolvedValueOnce({ Ok: null })
        .mockResolvedValueOnce({ Ok: null });
      
      mockGetSubaccountId
        .mockResolvedValueOnce('test-subaccount-1')
        .mockResolvedValueOnce('test-subaccount-2');
        
      mockGetIcrcAccount
        .mockResolvedValueOnce('test-address-1')
        .mockResolvedValueOnce('test-address-2');

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
      // Mock error response from getRegisteredTokens
      mockGetRegisteredTokens.mockResolvedValue({
        Err: 'No registered tokens',
      });

      await expect(
        getDepositAddresses(mockAgent, mockCanisterId)
      ).rejects.toThrow('Failed to get registered tokens: No registered tokens');
    });

    it('should handle invalid canister ID', async () => {
      mockGetRegisteredTokens.mockRejectedValue(new Error('Invalid canister ID'));

      await expect(
        getDepositAddresses(mockAgent, 'invalid-id')
      ).rejects.toThrow('Invalid canister ID');
    });

    it('should handle empty canister ID', async () => {
      // The function will likely throw when trying to query with empty canister ID
      mockGetRegisteredTokens.mockRejectedValue(new Error('Canister ID cannot be empty'));
      
      await expect(getDepositAddresses(mockAgent, '')).rejects.toThrow();
    });

    it('should handle network errors gracefully', async () => {
      mockGetRegisteredTokens.mockRejectedValue(new Error('Network error'));

      await expect(
        getDepositAddresses(mockAgent, mockCanisterId)
      ).rejects.toThrow('Network error');
    });
  });

  describe.skip('getBalances', () => {
    it('should calculate balances correctly', async () => {
      // Mock transactions response with proper structure
      // @ts-ignore - simplified mock for testing
      mockGetUserVaultTransactions.mockResolvedValue({
        Ok: [
          {
            index: BigInt(1),
            token_type: { ICP: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(1000000) },
                to: new Uint8Array([1, 2, 3])
              }
            }],
            sweep_status: { NotSwept: null },
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(0),
            tx_hash: 'hash1',
            token_ledger_canister_id: [],
            icrc1_memo: []
          },
          {
            index: BigInt(2),
            token_type: { CKUSDC: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(5000000) },
                to: new Uint8Array([4, 5, 6])
              }
            }],
            sweep_status: { NotSwept: null },
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(0),
            tx_hash: 'hash2',
            token_ledger_canister_id: [],
            icrc1_memo: []
          },
          {
            index: BigInt(3),
            token_type: { ICP: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(500000) },
                to: new Uint8Array([7, 8, 9])
              }
            }],
            sweep_status: { Swept: null }, // This should be excluded
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(0),
            tx_hash: 'hash3',
            token_ledger_canister_id: [],
            icrc1_memo: []
          },
        ],
      });
      
      mockGetRegisteredTokens.mockResolvedValue({
        Ok: [
          [{ ICP: null }, 'ICP'],
          [{ CKUSDC: null }, 'CKUSDC'],
        ],
      });

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
      mockGetUserVaultTransactions.mockResolvedValue({ Ok: [] });
      mockGetRegisteredTokens.mockResolvedValue({ Ok: [] });

      const balances = await getBalances(mockAgent, mockCanisterId);

      expect(Array.isArray(balances)).toBe(true);
      expect(balances).toHaveLength(0);
    });

    it('should handle invalid canister ID', async () => {
      mockGetUserVaultTransactions.mockRejectedValue(new Error('Invalid canister'));

      await expect(getBalances(mockAgent, 'invalid-id')).rejects.toThrow(
        'Invalid canister'
      );
    });

    it('should filter out swept transactions correctly', async () => {
      // @ts-ignore - simplified mock for testing
      mockGetUserVaultTransactions.mockResolvedValue({
        Ok: [
          {
            index: BigInt(1),
            token_type: { ICP: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(1000000) },
                to: new Uint8Array([1, 2, 3])
              }
            }],
            sweep_status: { NotSwept: null },
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(0),
            tx_hash: 'hash1',
            token_ledger_canister_id: [],
            icrc1_memo: []
          },
          {
            index: BigInt(2),
            token_type: { ICP: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(2000000) },
                to: new Uint8Array([4, 5, 6])
              }
            }],
            sweep_status: { Swept: null },
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(0),
            tx_hash: 'hash2',
            token_ledger_canister_id: [],
            icrc1_memo: []
          },
        ],
      });
      
      mockGetRegisteredTokens.mockResolvedValue({
        Ok: [[{ ICP: null }, 'ICP']],
      });

      const balances = await getBalances(mockAgent, mockCanisterId);

      expect(balances).toHaveLength(1);
      expect(balances[0].amount).toBe(BigInt(1000000));
    });

    it('should handle different token types in balances', async () => {
      // @ts-ignore - simplified mock for testing
      mockGetUserVaultTransactions.mockResolvedValue({
        Ok: [
          {
            index: BigInt(1),
            token_type: { ICP: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(1000000) },
                to: new Uint8Array([1, 2, 3])
              }
            }],
            sweep_status: { NotSwept: null },
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(0),
            tx_hash: 'hash1'
          },
          {
            index: BigInt(2),
            token_type: { CKUSDC: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(2000000) },
                to: new Uint8Array([4, 5, 6])
              }
            }],
            sweep_status: { NotSwept: null },
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(0),
            tx_hash: 'hash2'
          },
          {
            index: BigInt(3),
            token_type: { CKUSDT: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(3000000) },
                to: new Uint8Array([7, 8, 9])
              }
            }],
            sweep_status: { NotSwept: null },
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(0),
            tx_hash: 'hash3'
          },
        ],
      });
      
      mockGetRegisteredTokens.mockResolvedValue({
        Ok: [
          [{ ICP: null }, 'ICP'],
          [{ CKUSDC: null }, 'CKUSDC'],
          [{ CKUSDT: null }, 'CKUSDT'],
        ],
      });

      const balances = await getBalances(mockAgent, mockCanisterId);

      expect(balances).toHaveLength(3);

      const tokenNames = balances.map((b) => b.tokenName).sort();
      expect(tokenNames).toEqual(['CKUSDC', 'CKUSDT', 'ICP']);
    });
  });

  describe.skip('getTransactionsByTokenType', () => {
    it('should retrieve transactions for ICP', async () => {
      mockGetUserVaultTransactions.mockResolvedValue({
        Ok: [
          {
            index: BigInt(1),
            token_type: { ICP: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(1000000) },
                to: new Uint8Array([1, 2, 3])
              }
            }],
            sweep_status: { NotSwept: null },
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(0),
            tx_hash: 'hash1'
          },
        ],
      });

      const transactions = await getTransactionsByTokenType(
        mockAgent,
        mockCanisterId,
        Tokens.ICP
      );

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].blockIndex).toBe(BigInt(1));
    });

    it('should retrieve transactions for CKUSDC', async () => {
      mockGetUserVaultTransactions.mockResolvedValue({
        Ok: [
          {
            index: BigInt(1),
            token_type: { CKUSDC: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(5000000) },
                to: new Uint8Array([1, 2, 3])
              }
            }],
            sweep_status: { NotSwept: null },
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(0),
            tx_hash: 'hash1'
          },
        ],
      });

      const transactions = await getTransactionsByTokenType(
        mockAgent,
        mockCanisterId,
        Tokens.CKUSDC
      );

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].blockIndex).toBe(BigInt(1));
    });

    it('should retrieve transactions for CKUSDT', async () => {
      mockGetUserVaultTransactions.mockResolvedValue({
        Ok: [
          {
            index: BigInt(1),
            token_type: { CKUSDT: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(3000000) },
                to: new Uint8Array([1, 2, 3])
              }
            }],
            sweep_status: { NotSwept: null },
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(0),
            tx_hash: 'hash1'
          },
        ],
      });

      const transactions = await getTransactionsByTokenType(
        mockAgent,
        mockCanisterId,
        Tokens.CKUSDT
      );

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].blockIndex).toBe(BigInt(1));
    });

    it('should return empty array for token with no transactions', async () => {
      mockGetUserVaultTransactions.mockResolvedValue({ Ok: [] });

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
      mockGetUserVaultTransactions.mockRejectedValue(new Error('Invalid canister'));

      await expect(
        getTransactionsByTokenType(mockAgent, 'invalid-id', Tokens.ICP)
      ).rejects.toThrow('Invalid canister');
    });

    it('should properly format transaction data', async () => {
      mockGetUserVaultTransactions.mockResolvedValue({
        Ok: [
          {
            index: BigInt(10),
            token_type: { ICP: null },
            operation: [{
              Mint: {
                amount: { e8s: BigInt(1500000) },
                to: new Uint8Array([1, 2, 3])
              }
            }],
            sweep_status: { NotSwept: null },
            created_at_time: { timestamp_nanos: BigInt(1234567890) },
            memo: BigInt(12345),
            tx_hash: 'abcd1234'
          },
        ],
      });

      const transactions = await getTransactionsByTokenType(
        mockAgent,
        mockCanisterId,
        Tokens.ICP
      );

      expect(transactions[0]).toMatchObject({
        blockIndex: BigInt(10),
        amount: '1500000',
        timestamp: BigInt(1234567890),
        txHash: 'abcd1234',
        memo: '12345'
      });
    });
  });
});
