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
export type Result_1 = { Ok: Array<StoredTransactions> } | { Err: Error };
export type Result_2 = { Ok: bigint } | { Err: Error };
export type Result_3 = { Ok: Array<string> } | { Err: Error };
export interface StoredTransactions {
  sweep_status: SweepStatus;
  memo: bigint;
  icrc1_memo: [] | [Uint8Array | number[]];
  operation: [] | [Operation];
  index: bigint;
  created_at_time: Timestamp;
  tx_hash: string;
}
export type SweepStatus =
  | { Swept: null }
  | { FailedToSweep: null }
  | { NotSwept: null };
export interface Timestamp {
  timestamp_nanos: bigint;
}
export interface Transfer {
  to: Uint8Array | number[];
  fee: E8s;
  from: Uint8Array | number[];
  amount: E8s;
  spender: [] | [Uint8Array | number[]];
}
export interface _SERVICE {
  add_subaccount: ActorMethod<[], Result>;
  canister_status: ActorMethod<[], Result>;
  clear_transactions: ActorMethod<[[] | [bigint], [] | [Timestamp]], Result_1>;
  get_canister_principal: ActorMethod<[], string>;
  get_interval: ActorMethod<[], Result_2>;
  get_network: ActorMethod<[], Network>;
  get_next_block: ActorMethod<[], bigint>;
  get_nonce: ActorMethod<[], number>;
  get_oldest_block: ActorMethod<[], [] | [bigint]>;
  get_subaccount_count: ActorMethod<[], number>;
  get_subaccountid: ActorMethod<[number], Result>;
  get_transactions_count: ActorMethod<[], number>;
  list_transactions: ActorMethod<[[] | [bigint]], Array<StoredTransactions>>;
  refund: ActorMethod<[bigint], Result>;
  set_interval: ActorMethod<[bigint], Result_2>;
  set_next_block: ActorMethod<[bigint], Result_2>;
  sweep: ActorMethod<[], Result_3>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
