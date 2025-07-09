import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export interface Approve {
  fee: E8s;
  from: Uint8Array | number[];
  allowance_e8s: bigint;
  allowance: E8s;
  expected_allowance: [] | [E8s];
  expires_at: [] | [Timestamp];
  spender: Uint8Array | number[];
}
export interface Burn {
  from: Uint8Array | number[];
  amount: E8s;
  spender: [] | [Uint8Array | number[]];
}
export interface E8s {
  e8s: bigint;
}
export interface Error {
  message: string;
}
export interface HttpHeader {
  value: string;
  name: string;
}
export interface HttpResponse {
  status: bigint;
  body: Uint8Array | number[];
  headers: Array<HttpHeader>;
}
export interface Mint {
  to: Uint8Array | number[];
  amount: E8s;
}
export type Network = { Mainnet: null } | { Local: null };
export type Operation =
  | { Approve: Approve }
  | { Burn: Burn }
  | { Mint: Mint }
  | { Transfer: Transfer };
export type Result = { Ok: string } | { Err: Error };
export type Result_1 = { Ok: string } | { Err: string };
export type Result_10 = { Ok: null } | { Err: Error };
export type Result_11 = { Ok: bigint } | { Err: Error };
export type Result_12 = { Ok: Array<string> } | { Err: Error };
export type Result_13 = { Ok: boolean } | { Err: Error };
export type Result_2 = { Ok: Array<StoredTransactions> } | { Err: Error };
export type Result_3 = { Ok: bigint } | { Err: string };
export type Result_4 = { Ok: Network } | { Err: string };
export type Result_5 = { Ok: number } | { Err: string };
export type Result_6 = { Ok: [] | [bigint] } | { Err: string };
export type Result_7 = { Ok: Array<[TokenType, string]> } | { Err: string };
export type Result_8 = { Ok: TokenType } | { Err: string };
export type Result_9 = { Ok: Array<StoredTransactions> } | { Err: string };
export interface StoredTransactions {
  sweep_status: SweepStatus;
  memo: bigint;
  token_ledger_canister_id: [] | [Principal];
  icrc1_memo: [] | [Uint8Array | number[]];
  operation: [] | [Operation];
  index: bigint;
  created_at_time: Timestamp;
  tx_hash: string;
  token_type: TokenType;
}
export type SweepStatus =
  | { Swept: null }
  | { FailedToSweep: null }
  | { NotSwept: null };
export interface Timestamp {
  timestamp_nanos: bigint;
}
export type TokenType =
  | { ICP: null }
  | { CKUSDC: null }
  | { CKUSDT: null }
  | { CKBTC: null };
export interface Transfer {
  to: Uint8Array | number[];
  fee: E8s;
  from: Uint8Array | number[];
  amount: E8s;
  spender: [] | [Uint8Array | number[]];
}
export interface TransformArgs {
  context: Uint8Array | number[];
  response: HttpResponse;
}
export interface _SERVICE {
  add_subaccount: ActorMethod<[[] | [TokenType]], Result>;
  canister_status: ActorMethod<[], Result_1>;
  clear_transactions: ActorMethod<[[] | [bigint], [] | [Timestamp]], Result_2>;
  convert_to_icrc_account: ActorMethod<[string], Result>;
  get_canister_principal: ActorMethod<[], Result_1>;
  get_icrc_account: ActorMethod<[number], Result>;
  get_interval: ActorMethod<[], Result_3>;
  get_network: ActorMethod<[], Result_4>;
  get_next_block: ActorMethod<[], Result_3>;
  get_nonce: ActorMethod<[], Result_5>;
  get_oldest_block: ActorMethod<[], Result_6>;
  get_registered_tokens: ActorMethod<[], Result_7>;
  get_subaccount_count: ActorMethod<[], Result_5>;
  get_subaccountid: ActorMethod<[number, [] | [TokenType]], Result>;
  get_transaction_token_type: ActorMethod<[string], Result_8>;
  get_transactions_count: ActorMethod<[], Result_5>;
  get_webhook_url: ActorMethod<[], Result_1>;
  list_transactions: ActorMethod<[[] | [bigint]], Result_9>;
  refund: ActorMethod<[bigint], Result>;
  register_token: ActorMethod<[TokenType, string], Result_10>;
  set_interval: ActorMethod<[bigint], Result_11>;
  set_next_block: ActorMethod<[bigint], Result_11>;
  set_sweep_failed: ActorMethod<[string], Result_12>;
  set_webhook_url: ActorMethod<[string], Result>;
  single_sweep: ActorMethod<[string], Result_12>;
  sweep: ActorMethod<[], Result_12>;
  sweep_by_token_type: ActorMethod<[TokenType], Result_12>;
  sweep_subaccount: ActorMethod<[string, number, [] | [TokenType]], Result_11>;
  transform: ActorMethod<[TransformArgs], HttpResponse>;
  validate_icrc_account: ActorMethod<[string], Result_13>;
}

export const idlFactory = ({ IDL }: { IDL: any }) => {
  const Network = IDL.Variant({ Mainnet: IDL.Null, Local: IDL.Null });
  const Error = IDL.Record({ message: IDL.Text });
  const Result = IDL.Variant({ Ok: IDL.Text, Err: Error });
  const Result_1 = IDL.Variant({ Ok: IDL.Text, Err: IDL.Text });
  const Timestamp = IDL.Record({ timestamp_nanos: IDL.Nat64 });
  const SweepStatus = IDL.Variant({
    Swept: IDL.Null,
    FailedToSweep: IDL.Null,
    NotSwept: IDL.Null,
  });
  const E8s = IDL.Record({ e8s: IDL.Nat64 });
  const Approve = IDL.Record({
    fee: E8s,
    from: IDL.Vec(IDL.Nat8),
    allowance_e8s: IDL.Int64,
    allowance: E8s,
    expected_allowance: IDL.Opt(E8s),
    expires_at: IDL.Opt(Timestamp),
    spender: IDL.Vec(IDL.Nat8),
  });
  const Burn = IDL.Record({
    from: IDL.Vec(IDL.Nat8),
    amount: E8s,
    spender: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const Mint = IDL.Record({ to: IDL.Vec(IDL.Nat8), amount: E8s });
  const Transfer = IDL.Record({
    to: IDL.Vec(IDL.Nat8),
    fee: E8s,
    from: IDL.Vec(IDL.Nat8),
    amount: E8s,
    spender: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const Operation = IDL.Variant({
    Approve: Approve,
    Burn: Burn,
    Mint: Mint,
    Transfer: Transfer,
  });
  const TokenType = IDL.Variant({
    ICP: IDL.Null,
    CKUSDC: IDL.Null,
    CKUSDT: IDL.Null,
  });
  const StoredTransactions = IDL.Record({
    sweep_status: SweepStatus,
    memo: IDL.Nat64,
    token_ledger_canister_id: IDL.Opt(IDL.Principal),
    icrc1_memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    operation: IDL.Opt(Operation),
    index: IDL.Nat64,
    created_at_time: Timestamp,
    tx_hash: IDL.Text,
    token_type: TokenType,
  });
  const Result_2 = IDL.Variant({
    Ok: IDL.Vec(StoredTransactions),
    Err: Error,
  });
  const Result_3 = IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text });
  const Result_4 = IDL.Variant({ Ok: Network, Err: IDL.Text });
  const Result_5 = IDL.Variant({ Ok: IDL.Nat32, Err: IDL.Text });
  const Result_6 = IDL.Variant({ Ok: IDL.Opt(IDL.Nat64), Err: IDL.Text });
  const Result_7 = IDL.Variant({
    Ok: IDL.Vec(IDL.Tuple(TokenType, IDL.Text)),
    Err: IDL.Text,
  });
  const Result_8 = IDL.Variant({ Ok: TokenType, Err: IDL.Text });
  const Result_9 = IDL.Variant({
    Ok: IDL.Vec(StoredTransactions),
    Err: IDL.Text,
  });
  const Result_10 = IDL.Variant({ Ok: IDL.Null, Err: Error });
  const Result_11 = IDL.Variant({ Ok: IDL.Nat64, Err: Error });
  const Result_12 = IDL.Variant({ Ok: IDL.Vec(IDL.Text), Err: Error });
  const Result_13 = IDL.Variant({ Ok: IDL.Bool, Err: Error });
  const HttpHeader = IDL.Record({ value: IDL.Text, name: IDL.Text });
  const HttpResponse = IDL.Record({
    status: IDL.Nat,
    body: IDL.Vec(IDL.Nat8),
    headers: IDL.Vec(HttpHeader),
  });
  const TransformArgs = IDL.Record({
    context: IDL.Vec(IDL.Nat8),
    response: HttpResponse,
  });
  return IDL.Service({
    add_subaccount: IDL.Func([IDL.Opt(TokenType)], [Result], []),
    canister_status: IDL.Func([], [Result_1], ['query']),
    clear_transactions: IDL.Func(
      [IDL.Opt(IDL.Nat64), IDL.Opt(Timestamp)],
      [Result_2],
      []
    ),
    convert_to_icrc_account: IDL.Func([IDL.Text], [Result], []),
    get_canister_principal: IDL.Func([], [Result_1], ['query']),
    get_icrc_account: IDL.Func([IDL.Nat32], [Result], ['query']),
    get_interval: IDL.Func([], [Result_3], ['query']),
    get_network: IDL.Func([], [Result_4], ['query']),
    get_next_block: IDL.Func([], [Result_3], ['query']),
    get_nonce: IDL.Func([], [Result_5], ['query']),
    get_oldest_block: IDL.Func([], [Result_6], ['query']),
    get_registered_tokens: IDL.Func([], [Result_7], ['query']),
    get_subaccount_count: IDL.Func([], [Result_5], ['query']),
    get_subaccountid: IDL.Func(
      [IDL.Nat32, IDL.Opt(TokenType)],
      [Result],
      ['query']
    ),
    get_transaction_token_type: IDL.Func([IDL.Text], [Result_8], ['query']),
    get_transactions_count: IDL.Func([], [Result_5], ['query']),
    get_webhook_url: IDL.Func([], [Result_1], ['query']),
    list_transactions: IDL.Func([IDL.Opt(IDL.Nat64)], [Result_9], ['query']),
    refund: IDL.Func([IDL.Nat64], [Result], []),
    register_token: IDL.Func([TokenType, IDL.Text], [Result_10], []),
    set_interval: IDL.Func([IDL.Nat64], [Result_11], []),
    set_next_block: IDL.Func([IDL.Nat64], [Result_11], []),
    set_sweep_failed: IDL.Func([IDL.Text], [Result_12], []),
    set_webhook_url: IDL.Func([IDL.Text], [Result], []),
    single_sweep: IDL.Func([IDL.Text], [Result_12], []),
    sweep: IDL.Func([], [Result_12], []),
    sweep_by_token_type: IDL.Func([TokenType], [Result_12], []),
    sweep_subaccount: IDL.Func(
      [IDL.Text, IDL.Float64, IDL.Opt(TokenType)],
      [Result_11],
      []
    ),
    transform: IDL.Func([TransformArgs], [HttpResponse], ['query']),
    validate_icrc_account: IDL.Func([IDL.Text], [Result_13], ['query']),
  });
};

export const init = ({ IDL }: { IDL: any }) => {
  const Network = IDL.Variant({ Mainnet: IDL.Null, Local: IDL.Null });
  return [Network, IDL.Nat64, IDL.Nat32, IDL.Text, IDL.Text];
};
