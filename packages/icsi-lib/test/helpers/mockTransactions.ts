import { StoredTransactions, TokenType } from '../../src/userVault.did';

export function createMockStoredTransaction(
  overrides: Partial<StoredTransactions> = {}
): StoredTransactions {
  return {
    index: BigInt(1),
    token_type: { ICP: null },
    operation: [
      {
        Mint: {
          amount: { e8s: BigInt(1000000) },
          to: new Uint8Array([1, 2, 3]),
        },
      },
    ],
    sweep_status: { NotSwept: null },
    created_at_time: { timestamp_nanos: BigInt(1234567890) },
    memo: BigInt(0),
    tx_hash: 'hash1',
    token_ledger_canister_id: [],
    icrc1_memo: [],
    ...overrides,
  };
}
