import { HttpAgent, Actor } from '@dfinity/agent';
import {
  setUserVaultInterval,
  addSubaccount,
  addSubaccountForToken,
  setWebhookUrl,
  registerToken,
  clearTransactions,
  refund,
  sweep,
  sweepByTokenType,
  sweepSubaccountId,
  convertToIcrcAccount,
  validateIcrcAccount,
  singleSweep,
  setSweepFailed,
} from '../../src/update';
import { Tokens } from '../../src/helpers';

jest.mock('@dfinity/agent');

describe('Update Functions', () => {
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
      set_interval: jest.fn(),
      add_subaccount: jest.fn(),
      set_webhook_url: jest.fn(),
      register_token: jest.fn(),
      clear_transactions: jest.fn(),
      refund: jest.fn(),
      sweep: jest.fn(),
      sweep_by_token_type: jest.fn(),
      sweep_subaccount_id: jest.fn(),
      convert_to_icrc_account: jest.fn(),
      validate_icrc_account: jest.fn(),
      single_sweep: jest.fn(),
      set_sweep_failed: jest.fn(),
    };

    (Actor.createActor as jest.Mock).mockReturnValue(mockActor);
  });

  describe('setUserVaultInterval', () => {
    it('should set valid intervals', async () => {
      const intervals = [10n, 30n, 60n, 300n, 500n];

      for (const interval of intervals) {
        mockActor.set_interval.mockResolvedValue(interval);

        const result = await setUserVaultInterval(
          mockAgent,
          canisterId,
          interval
        );

        expect(result).toBe(interval);
        expect(mockActor.set_interval).toHaveBeenCalledWith(interval);
      }
    });

    it('should handle zero interval', async () => {
      mockActor.set_interval.mockResolvedValue(0n);

      const result = await setUserVaultInterval(mockAgent, canisterId, 0n);

      expect(result).toBe(0n);
    });

    it('should throw on empty canister ID', async () => {
      await expect(setUserVaultInterval(mockAgent, '', 60n)).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('addSubaccount', () => {
    it('should add a new ICP subaccount', async () => {
      const mockResult = { Ok: 'subaccount-id-123' };
      mockActor.add_subaccount.mockResolvedValue(mockResult);

      const result = await addSubaccount(mockAgent, canisterId);

      expect(result).toEqual(mockResult);
      expect(mockActor.add_subaccount).toHaveBeenCalledWith([{ ICP: null }]);
    });

    it('should handle Result with Err', async () => {
      const errorResult = { Err: { message: 'Failed to add subaccount' } };
      mockActor.add_subaccount.mockResolvedValue(errorResult);

      const result = await addSubaccount(mockAgent, canisterId);

      expect(result).toEqual(errorResult);
    });

    it('should throw on empty canister ID', async () => {
      await expect(addSubaccount(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('addSubaccountForToken', () => {
    it('should add subaccounts for different token types', async () => {
      const tokenTypes = [Tokens.ICP, Tokens.CKUSDC, Tokens.CKUSDT];

      for (const tokenType of tokenTypes) {
        const mockResult = { Ok: `subaccount-${tokenType}` };
        mockActor.add_subaccount.mockResolvedValue(mockResult);
        mockActor.register_token.mockResolvedValue({ Ok: null });

        const result = await addSubaccountForToken(
          mockAgent,
          canisterId,
          tokenType,
          {
            icpLedgerCanisterId: 'icp-ledger-id',
            ckusdcCanisterId: 'ckusdc-id',
            ckusdtCanisterId: 'ckusdt-id',
          }
        );

        expect(result).toEqual(mockResult);
        expect(mockActor.add_subaccount).toHaveBeenCalledWith([tokenType]);
      }
    });

    it('should handle missing custom canister IDs', async () => {
      const mockResult = { Ok: 'subaccount-id' };
      mockActor.add_subaccount.mockResolvedValue(mockResult);

      const result = await addSubaccountForToken(
        mockAgent,
        canisterId,
        Tokens.ICP
      );

      expect(result).toEqual(mockResult);
    });

    it('should throw on empty canister ID', async () => {
      await expect(
        addSubaccountForToken(mockAgent, '', Tokens.ICP)
      ).rejects.toThrow('User Vault Canister ID is undefined.');
    });
  });

  describe('setWebhookUrl', () => {
    it('should set valid webhook URLs', async () => {
      const urls = [
        'https://example.com/webhook',
        'https://api.test.com/notify',
      ];

      for (const url of urls) {
        mockActor.set_webhook_url.mockResolvedValue(undefined);

        await setWebhookUrl(mockAgent, canisterId, url);

        expect(mockActor.set_webhook_url).toHaveBeenCalledWith(url);
      }
    });

    it('should handle empty webhook URL', async () => {
      mockActor.set_webhook_url.mockResolvedValue(undefined);

      await setWebhookUrl(mockAgent, canisterId, '');

      expect(mockActor.set_webhook_url).toHaveBeenCalledWith('');
    });

    it('should throw on empty canister ID', async () => {
      await expect(
        setWebhookUrl(mockAgent, '', 'https://example.com')
      ).rejects.toThrow('User Vault Canister ID is undefined.');
    });
  });

  describe('registerToken', () => {
    it('should register different token types', async () => {
      const tokenConfigs = [
        { type: Tokens.ICP, canisterId: 'icp-ledger-id' },
        { type: Tokens.CKUSDC, canisterId: 'ckusdc-id' },
        { type: Tokens.CKUSDT, canisterId: 'ckusdt-id' },
      ];

      for (const config of tokenConfigs) {
        const mockResult = { Ok: null };
        mockActor.register_token.mockResolvedValue(mockResult);

        const result = await registerToken(
          mockAgent,
          canisterId,
          config.type,
          config.canisterId
        );

        expect(result).toEqual(mockResult);
        expect(mockActor.register_token).toHaveBeenCalledWith(
          config.type,
          config.canisterId
        );
      }
    });

    it('should handle Result with Err', async () => {
      const errorResult = { Err: { message: 'Token already registered' } };
      mockActor.register_token.mockResolvedValue(errorResult);

      const result = await registerToken(
        mockAgent,
        canisterId,
        Tokens.ICP,
        'icp-ledger-id'
      );

      expect(result).toEqual(errorResult);
    });

    it('should throw on empty canister ID', async () => {
      await expect(
        registerToken(mockAgent, '', Tokens.ICP, 'icp-ledger-id')
      ).rejects.toThrow('User Vault Canister ID is undefined.');
    });
  });

  describe('clearTransactions', () => {
    it('should clear transactions without parameters', async () => {
      const mockResult = [{ tx_hash: 'hash1' }, { tx_hash: 'hash2' }];
      mockActor.clear_transactions.mockResolvedValue(mockResult);

      const result = await clearTransactions(mockAgent, canisterId);

      expect(result).toEqual(mockResult);
      expect(mockActor.clear_transactions).toHaveBeenCalledWith([], []);
    });

    it('should clear transactions with index parameter', async () => {
      const mockResult = [];
      mockActor.clear_transactions.mockResolvedValue(mockResult);

      const result = await clearTransactions(mockAgent, canisterId, 10n);

      expect(result).toEqual(mockResult);
      expect(mockActor.clear_transactions).toHaveBeenCalledWith([10n], []);
    });

    it('should clear transactions with timestamp parameter', async () => {
      const timestamp = { timestamp_nanos: BigInt(Date.now() * 1_000_000) };
      const mockResult = [];
      mockActor.clear_transactions.mockResolvedValue(mockResult);

      const result = await clearTransactions(
        mockAgent,
        canisterId,
        undefined,
        timestamp
      );

      expect(result).toEqual(mockResult);
      expect(mockActor.clear_transactions).toHaveBeenCalledWith(
        [],
        [timestamp]
      );
    });

    it('should throw on empty canister ID', async () => {
      await expect(clearTransactions(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('refund', () => {
    it('should handle refund requests', async () => {
      const amounts = [1000n, 100000n];

      for (const amount of amounts) {
        const mockResult = `refund-tx-${amount}`;
        mockActor.refund.mockResolvedValue(mockResult);

        const result = await refund(mockAgent, canisterId, amount);

        expect(result).toBe(mockResult);
        expect(mockActor.refund).toHaveBeenCalledWith(amount);
      }
    });

    it('should handle zero amount', async () => {
      mockActor.refund.mockResolvedValue('refund-tx-0');

      const result = await refund(mockAgent, canisterId, 0n);

      expect(result).toBe('refund-tx-0');
    });

    it('should throw on empty canister ID', async () => {
      await expect(refund(mockAgent, '', 1000n)).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('sweep', () => {
    it('should perform sweep operation', async () => {
      const mockResult = [{ tx_hash: 'sweep1' }, { tx_hash: 'sweep2' }];
      mockActor.sweep.mockResolvedValue(mockResult);

      const result = await sweep(mockAgent, canisterId);

      expect(result).toEqual(mockResult);
      expect(mockActor.sweep).toHaveBeenCalled();
    });

    it('should handle empty sweep result', async () => {
      mockActor.sweep.mockResolvedValue([]);

      const result = await sweep(mockAgent, canisterId);

      expect(result).toEqual([]);
    });

    it('should throw on empty canister ID', async () => {
      await expect(sweep(mockAgent, '')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('sweepByTokenType', () => {
    it('should sweep by different token types', async () => {
      const tokenTypes = [Tokens.ICP, Tokens.CKUSDC, Tokens.CKUSDT];

      for (const tokenType of tokenTypes) {
        const mockResult = [{ tx_hash: `sweep-${tokenType}` }];
        mockActor.sweep_by_token_type.mockResolvedValue(mockResult);

        const result = await sweepByTokenType(mockAgent, canisterId, tokenType);

        expect(result).toEqual(mockResult);
        expect(mockActor.sweep_by_token_type).toHaveBeenCalledWith(tokenType);
      }
    });

    it('should handle empty sweep result', async () => {
      mockActor.sweep_by_token_type.mockResolvedValue([]);

      const result = await sweepByTokenType(mockAgent, canisterId, Tokens.ICP);

      expect(result).toEqual([]);
    });

    it('should throw on empty canister ID', async () => {
      await expect(sweepByTokenType(mockAgent, '', Tokens.ICP)).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('sweepSubaccountId', () => {
    it('should handle sweep from specific subaccount', async () => {
      const subaccountId = 'subaccount-123';
      const amount = 0.001;

      mockActor.sweep_subaccount_id.mockResolvedValue(undefined);

      await sweepSubaccountId(
        mockAgent,
        canisterId,
        subaccountId,
        amount,
        Tokens.ICP
      );

      expect(mockActor.sweep_subaccount_id).toHaveBeenCalledWith(
        subaccountId,
        amount,
        Tokens.ICP
      );
    });

    it('should handle different token types', async () => {
      const subaccountId = 'subaccount-123';
      const amount = 0.1;
      const tokenTypes = [Tokens.ICP, Tokens.CKUSDC, Tokens.CKUSDT];

      for (const tokenType of tokenTypes) {
        mockActor.sweep_subaccount_id.mockResolvedValue(undefined);

        await sweepSubaccountId(
          mockAgent,
          canisterId,
          subaccountId,
          amount,
          tokenType
        );

        expect(mockActor.sweep_subaccount_id).toHaveBeenCalledWith(
          subaccountId,
          amount,
          tokenType
        );
      }
    });

    it('should throw on empty canister ID', async () => {
      await expect(
        sweepSubaccountId(mockAgent, '', 'subaccount', 0.001, Tokens.ICP)
      ).rejects.toThrow('User Vault Canister ID is undefined.');
    });
  });

  describe('convertToIcrcAccount', () => {
    it('should convert subaccount ID to ICRC account', async () => {
      const subaccountId = 'subaccount-123';
      const mockResult = { Ok: 'icrc-account-123' };
      mockActor.convert_to_icrc_account.mockResolvedValue(mockResult);

      const result = await convertToIcrcAccount(
        mockAgent,
        canisterId,
        subaccountId
      );

      expect(result).toEqual(mockResult);
      expect(mockActor.convert_to_icrc_account).toHaveBeenCalledWith(
        subaccountId
      );
    });

    it('should handle Result with Err', async () => {
      const errorResult = { Err: { message: 'Invalid subaccount ID' } };
      mockActor.convert_to_icrc_account.mockResolvedValue(errorResult);

      const result = await convertToIcrcAccount(
        mockAgent,
        canisterId,
        'invalid'
      );

      expect(result).toEqual(errorResult);
    });

    it('should throw on empty canister ID', async () => {
      await expect(
        convertToIcrcAccount(mockAgent, '', 'subaccount')
      ).rejects.toThrow('User Vault Canister ID is undefined.');
    });
  });

  describe('validateIcrcAccount', () => {
    it('should validate ICRC account formats', async () => {
      const testAccounts = [
        { account: 'rdmx6-jaaaa-aaaaa-aaadq-cai.1', expected: true },
        { account: 'invalid-format', expected: false },
        { account: '', expected: false },
      ];

      for (const test of testAccounts) {
        mockActor.validate_icrc_account.mockResolvedValue(test.expected);

        const isValid = await validateIcrcAccount(
          mockAgent,
          canisterId,
          test.account
        );

        expect(isValid).toBe(test.expected);
        expect(mockActor.validate_icrc_account).toHaveBeenCalledWith(
          test.account
        );
      }
    });

    it('should throw on empty canister ID', async () => {
      await expect(
        validateIcrcAccount(mockAgent, '', 'some-account')
      ).rejects.toThrow('User Vault Canister ID is undefined.');
    });
  });

  describe('singleSweep', () => {
    it('should handle single sweep by transaction hash', async () => {
      const txHash = 'transaction-hash-123';
      const mockResult = [{ tx_hash: 'sweep-result' }];
      mockActor.single_sweep.mockResolvedValue(mockResult);

      const result = await singleSweep(mockAgent, canisterId, txHash);

      expect(result).toEqual(mockResult);
      expect(mockActor.single_sweep).toHaveBeenCalledWith(txHash);
    });

    it('should handle empty result', async () => {
      mockActor.single_sweep.mockResolvedValue([]);

      const result = await singleSweep(mockAgent, canisterId, 'hash');

      expect(result).toEqual([]);
    });

    it('should throw on empty canister ID', async () => {
      await expect(singleSweep(mockAgent, '', 'hash')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });

  describe('setSweepFailed', () => {
    it('should set sweep status to failed', async () => {
      const txHash = 'transaction-hash-123';
      const mockResult = [{ tx_hash: txHash, status: 'failed' }];
      mockActor.set_sweep_failed.mockResolvedValue(mockResult);

      const result = await setSweepFailed(mockAgent, canisterId, txHash);

      expect(result).toEqual(mockResult);
      expect(mockActor.set_sweep_failed).toHaveBeenCalledWith(txHash);
    });

    it('should handle empty result', async () => {
      mockActor.set_sweep_failed.mockResolvedValue([]);

      const result = await setSweepFailed(mockAgent, canisterId, 'hash');

      expect(result).toEqual([]);
    });

    it('should throw on empty canister ID', async () => {
      await expect(setSweepFailed(mockAgent, '', 'hash')).rejects.toThrow(
        'User Vault Canister ID is undefined.'
      );
    });
  });
});
