use candid::{CandidType, Deserialize};
use serde::Serialize;
use std::collections::HashMap;

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct QueryBlocksQueryRequest {
    pub start: u64,
    pub length: u64,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct Response {
    pub certificate: Option<Vec<u8>>,
    pub blocks: Vec<Block>,
    pub chain_length: u64,
    pub first_block_index: u64,
    pub archived_blocks: Vec<ArchivedBlock>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct Block {
    pub transaction: Transaction,
    pub timestamp: Timestamp,
    pub parent_hash: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct Transaction {
    pub memo: u64,
    pub icrc1_memo: Option<Vec<u8>>,
    pub operation: Option<Operation>,
    pub created_at_time: Timestamp,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct Timestamp {
    pub timestamp_nanos: u64,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum Operation {
    Approve(Approve),
    Burn(Burn),
    Mint(Mint),
    Transfer(Transfer),
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct Approve {
    pub fee: E8s,
    pub from: Vec<u8>,
    pub allowance_e8s: i64,
    pub allowance: E8s,
    pub expected_allowance: Option<E8s>,
    pub expires_at: Option<Timestamp>,
    pub spender: Vec<u8>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct Burn {
    pub from: Vec<u8>,
    pub amount: E8s,
    pub spender: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct Mint {
    pub to: Vec<u8>,
    pub amount: E8s,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct Transfer {
    pub to: Vec<u8>,
    pub fee: E8s,
    pub from: Vec<u8>,
    pub amount: E8s,
    pub spender: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct E8s {
    pub e8s: u64,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct ArchivedBlock {
    pub callback: HashMap<String, Callback>,
    pub start: u64,
    pub length: u64,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum Callback {
    Ok { blocks: Vec<Block> },
    Err(CallbackError),
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum CallbackError {
    BadFirstBlockIndex {
        requested_index: u64,
        first_valid_index: u64,
    },
    Other {
        error_message: String,
        error_code: u64,
    },
}
