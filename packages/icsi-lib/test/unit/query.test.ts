import { HttpAgent, Actor } from '@dfinity/agent';
import {
  getUserVaultTransactions,
  getUserVaultInterval,
  getTransactionsCount,
  getNonce,
  getSubaccountCount,
  getSubaccountId,
  getWebhookUrl,
  getCanisterPrincipal,
  getIcrcAccount,
  getNetwork,
  getNextBlock,
  getOldestBlock,
  getRegisteredTokens,
  getTransactionTokenType,
} from '../../src/query';
import { Tokens } from '../../src/helpers';

jest.mock('@dfinity/agent');

describe('Query Functions', () => {
  let mockAgent: jest.Mocked<HttpAgent>;
  let mockActor: any;
  const canisterId = 'test-canister-id';

  beforeEach(() => {
    jest.clearAllMocks();

    mockAgent = {
      call: jest.fn(),
      query: jest.fn(),
      readState: jest.fn(),
      fetchRootKey: jest.fn(),
    } as any;

    mockActor = {
      list_transactions: jest.fn(),
      get_interval: jest.fn(),
      get_transactions_count: jest.fn(),
      get_nonce: jest.fn(),
      get_subaccount_count: jest.fn(),
      get_subaccount_id: jest.fn(),
      get_webhook_url: jest.fn(),
      get_canister_principal: jest.fn(),
      get_icrc_account: jest.fn(),
      get_network: jest.fn(),
      get_next_block: jest.fn(),
      get_oldest_block: jest.fn(),
      get_registered_tokens: jest.fn(),
      get_transaction_token_type: jest.fn(),
    };

    (Actor.createActor as jest.Mock).mockReturnValue(mockActor);
  });

  describe('getUserVaultTransactions', () => {
    it('should retrieve transactions without upToIndex', async () => {
      const mockTransactions = {
        Ok: [
          {
            sweep_status: { NotSwept: null },
            memo: 123n,
            token_ledger_canister_id: [],
            icrc1_memo: [],
            operation: [],
            index: 0n,
            created_at_time: { timestamp_nanos: 1234567890n },
            tx_hash: 'hash123',
            token_type: { ICP: null },
          },
        ],
      };
      mockActor.list_transactions.mockResolvedValue(mockTransactions);

      const result = await getUserVaultTransactions(mockAgent, canisterId);

      expect(result).toEqual(mockTransactions);
      expect(mockActor.list_transactions).toHaveBeenCalledWith([]);
      expect(Actor.createActor).toHaveBeenCalledWith(expect.any(Function), {
        agent: mockAgent,
        canisterId,
      });
    });

    it('should retrieve transactions with upToIndex', async () => {
      const mockTransactions = { Ok: [] };
      mockActor.list_transactions.mockResolvedValue(mockTransactions);

      const result = await getUserVaultTransactions(mockAgent, canisterId, 10n);

      expect(result).toEqual(mockTransactions);
      expect(mockActor.list_transactions).toHaveBeenCalledWith([10n]);
    });

    it('should handle Result with Err', async () => {
      const errorResult = { Err: 'Something went wrong' };
      mockActor.list_transactions.mockResolvedValue(errorResult);

      const result = await getUserVaultTransactions(mockAgent, canisterId);

      expect(result).toEqual(errorResult);
    });

    it('should throw on empty canister ID', async () => {
      await expect(getUserVaultTransactions(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getUserVaultInterval', () => {
    it('should retrieve the interval value', async () => {
      const mockInterval = 500n;
      mockActor.get_interval.mockResolvedValue(mockInterval);

      const interval = await getUserVaultInterval(mockAgent, canisterId);

      expect(interval).toBe(mockInterval);
      expect(mockActor.get_interval).toHaveBeenCalled();
    });

    it('should throw on empty canister ID', async () => {
      await expect(getUserVaultInterval(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getTransactionsCount', () => {
    it('should retrieve transaction count', async () => {
      const mockCount = 42;
      mockActor.get_transactions_count.mockResolvedValue(mockCount);

      const count = await getTransactionsCount(mockAgent, canisterId);

      expect(count).toBe(mockCount);
      expect(mockActor.get_transactions_count).toHaveBeenCalled();
    });

    it('should throw on empty canister ID', async () => {
      await expect(getTransactionsCount(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getNonce', () => {
    it('should retrieve nonce value', async () => {
      const mockNonce = 5;
      mockActor.get_nonce.mockResolvedValue(mockNonce);

      const nonce = await getNonce(mockAgent, canisterId);

      expect(nonce).toBe(mockNonce);
      expect(mockActor.get_nonce).toHaveBeenCalled();
    });

    it('should throw on empty canister ID', async () => {
      await expect(getNonce(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getSubaccountCount', () => {
    it('should retrieve subaccount count', async () => {
      const mockCount = 10;
      mockActor.get_subaccount_count.mockResolvedValue(mockCount);

      const count = await getSubaccountCount(mockAgent, canisterId);

      expect(count).toBe(mockCount);
      expect(mockActor.get_subaccount_count).toHaveBeenCalled();
    });

    it('should throw on empty canister ID', async () => {
      await expect(getSubaccountCount(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getSubaccountId', () => {
    it('should retrieve subaccount ID for ICP', async () => {
      const mockResult = { Ok: 'subaccount-id-123' };
      mockActor.get_subaccount_id.mockResolvedValue(mockResult);

      const result = await getSubaccountId(
        mockAgent,
        canisterId,
        0,
        Tokens.ICP
      );

      expect(result).toEqual(mockResult);
      expect(mockActor.get_subaccount_id).toHaveBeenCalledWith(0, Tokens.ICP);
    });

    it('should handle Result with Err', async () => {
      const errorResult = { Err: { message: 'Subaccount not found' } };
      mockActor.get_subaccount_id.mockResolvedValue(errorResult);

      const result = await getSubaccountId(
        mockAgent,
        canisterId,
        999,
        Tokens.ICP
      );

      expect(result).toEqual(errorResult);
    });

    it('should handle different token types', async () => {
      const tokenTypes = [Tokens.ICP, Tokens.CKUSDC, Tokens.CKUSDT];

      for (const tokenType of tokenTypes) {
        const mockResult = { Ok: `subaccount-${tokenType}` };
        mockActor.get_subaccount_id.mockResolvedValue(mockResult);

        const result = await getSubaccountId(
          mockAgent,
          canisterId,
          0,
          tokenType
        );

        expect(result).toEqual(mockResult);
        expect(mockActor.get_subaccount_id).toHaveBeenCalledWith(0, tokenType);
      }
    });

    it('should throw on empty canister ID', async () => {
      await expect(
        getSubaccountId(mockAgent, '', 0, Tokens.ICP)
      ).rejects.toThrow('User Vault Canister ID is undefined.');
    });
  });

  describe('getWebhookUrl', () => {
    it('should retrieve webhook URL', async () => {
      const mockUrl = 'https://example.com/webhook';
      mockActor.get_webhook_url.mockResolvedValue(mockUrl);

      const url = await getWebhookUrl(mockAgent, canisterId);

      expect(url).toBe(mockUrl);
      expect(mockActor.get_webhook_url).toHaveBeenCalled();
    });

    it('should handle empty webhook URL', async () => {
      mockActor.get_webhook_url.mockResolvedValue('');

      const url = await getWebhookUrl(mockAgent, canisterId);

      expect(url).toBe('');
    });

    it('should throw on empty canister ID', async () => {
      await expect(getWebhookUrl(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getCanisterPrincipal', () => {
    it('should retrieve canister principal', async () => {
      const mockPrincipal = 'rdmx6-jaaaa-aaaaa-aaadq-cai';
      mockActor.get_canister_principal.mockResolvedValue(mockPrincipal);

      const principal = await getCanisterPrincipal(mockAgent, canisterId);

      expect(principal).toBe(mockPrincipal);
      expect(mockActor.get_canister_principal).toHaveBeenCalled();
    });

    it('should throw on empty canister ID', async () => {
      await expect(getCanisterPrincipal(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getIcrcAccount', () => {
    it('should retrieve ICRC account', async () => {
      const mockResult = { Ok: 'icrc-account-123' };
      mockActor.get_icrc_account.mockResolvedValue(mockResult);

      const result = await getIcrcAccount(mockAgent, canisterId, 0);

      expect(result).toEqual(mockResult);
      expect(mockActor.get_icrc_account).toHaveBeenCalledWith(0);
    });

    it('should handle Result with Err', async () => {
      const errorResult = { Err: { message: 'Account not found' } };
      mockActor.get_icrc_account.mockResolvedValue(errorResult);

      const result = await getIcrcAccount(mockAgent, canisterId, -1);

      expect(result).toEqual(errorResult);
    });

    it('should throw on empty canister ID', async () => {
      await expect(getIcrcAccount(mockAgent, '', 0)).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getNetwork', () => {
    it('should retrieve network type - Mainnet', async () => {
      const mockNetwork = { Mainnet: null };
      mockActor.get_network.mockResolvedValue(mockNetwork);

      const network = await getNetwork(mockAgent, canisterId);

      expect(network).toEqual(mockNetwork);
      expect(mockActor.get_network).toHaveBeenCalled();
    });

    it('should retrieve network type - Local', async () => {
      const mockNetwork = { Local: null };
      mockActor.get_network.mockResolvedValue(mockNetwork);

      const network = await getNetwork(mockAgent, canisterId);

      expect(network).toEqual(mockNetwork);
      expect(mockActor.get_network).toHaveBeenCalled();
    });

    it('should throw on empty canister ID', async () => {
      await expect(getNetwork(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getNextBlock', () => {
    it('should retrieve next block', async () => {
      const mockNextBlock = 12345n;
      mockActor.get_next_block.mockResolvedValue(mockNextBlock);

      const nextBlock = await getNextBlock(mockAgent, canisterId);

      expect(nextBlock).toBe(mockNextBlock);
      expect(mockActor.get_next_block).toHaveBeenCalled();
    });

    it('should handle zero block', async () => {
      mockActor.get_next_block.mockResolvedValue(0n);

      const nextBlock = await getNextBlock(mockAgent, canisterId);

      expect(nextBlock).toBe(0n);
    });

    it('should throw on empty canister ID', async () => {
      await expect(getNextBlock(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getOldestBlock', () => {
    it('should retrieve oldest block', async () => {
      const mockOldestBlock = 100n;
      mockActor.get_oldest_block.mockResolvedValue(mockOldestBlock);

      const oldestBlock = await getOldestBlock(mockAgent, canisterId);

      expect(oldestBlock).toBe(mockOldestBlock);
      expect(mockActor.get_oldest_block).toHaveBeenCalled();
    });

    it('should handle undefined oldest block', async () => {
      mockActor.get_oldest_block.mockResolvedValue(undefined);

      const oldestBlock = await getOldestBlock(mockAgent, canisterId);

      expect(oldestBlock).toBeUndefined();
    });

    it('should throw on empty canister ID', async () => {
      await expect(getOldestBlock(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getRegisteredTokens', () => {
    it('should retrieve registered tokens', async () => {
      const mockResult = {
        Ok: [
          [{ ICP: null }, 'ryjl3-tyaaa-aaaaa-aaaba-cai'],
          [{ CKUSDC: null }, 'xevnm-gaaaa-aaaar-qafnq-cai'],
          [{ CKUSDT: null }, 'cngnf-vqaaa-aaaar-qag4q-cai'],
        ],
      };
      mockActor.get_registered_tokens.mockResolvedValue(mockResult);

      const result = await getRegisteredTokens(mockAgent, canisterId);

      expect(result).toEqual(mockResult);
      expect(mockActor.get_registered_tokens).toHaveBeenCalled();
    });

    it('should handle Result with Err', async () => {
      const errorResult = { Err: 'Failed to get tokens' };
      mockActor.get_registered_tokens.mockResolvedValue(errorResult);

      const result = await getRegisteredTokens(mockAgent, canisterId);

      expect(result).toEqual(errorResult);
    });

    it('should throw on empty canister ID', async () => {
      await expect(getRegisteredTokens(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('getTransactionTokenType', () => {
    it('should retrieve transaction token type', async () => {
      const mockResult = { Ok: { ICP: null } };
      mockActor.get_transaction_token_type.mockResolvedValue(mockResult);

      const result = await getTransactionTokenType(
        mockAgent,
        canisterId,
        'hash123'
      );

      expect(result).toEqual(mockResult);
      expect(mockActor.get_transaction_token_type).toHaveBeenCalledWith(
        'hash123'
      );
    });

    it('should handle Result with Err', async () => {
      const errorResult = { Err: 'Transaction not found' };
      mockActor.get_transaction_token_type.mockResolvedValue(errorResult);

      const result = await getTransactionTokenType(
        mockAgent,
        canisterId,
        'non-existent'
      );

      expect(result).toEqual(errorResult);
    });

    it('should throw on empty canister ID', async () => {
      await expect(
        getTransactionTokenType(mockAgent, '', 'hash123')
      ).rejects.toThrow('User Vault Canister ID is undefined.');
    });
  });
});
