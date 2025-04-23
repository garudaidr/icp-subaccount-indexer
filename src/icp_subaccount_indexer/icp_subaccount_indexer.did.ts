import type { Principal } from "@dfinity/principal";
import type { ActorMethod } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";

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
export type TokenType = { ICP: null } | { CKUSDC: null } | { CKUSDT: null };
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
  sweep_subaccount: ActorMethod<[string, number, TokenType], Result_11>;
  transform: ActorMethod<[TransformArgs], HttpResponse>;
  validate_icrc_account: ActorMethod<[string], Result_13>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
