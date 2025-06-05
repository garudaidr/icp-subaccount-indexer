use candid::{CandidType, Deserialize, Principal};
use core::future::Future;
use ic_cdk::api::call::CallResult;
use ic_cdk_timers::TimerId;
use ic_ledger_types::{BlockIndex, TransferArgs};
use ic_stable_structures::{
    memory_manager::VirtualMemory,
    storable::{Bound, Storable},
    DefaultMemoryImpl,
};
use icrc_ledger_types::icrc1::transfer::TransferArg;
use serde::Serialize;
use std::cell::RefCell;
use std::collections::BTreeSet;
use std::{borrow::Cow, collections::HashMap};

pub struct State {
    pending_requests: BTreeSet<Principal>,
}

thread_local! {
    pub static STATE: RefCell<State> = const { RefCell::new(State{pending_requests: BTreeSet::new()}) };
}

// CallerGuard section was inspired by or directly uses work done by AlphaCQ
// Their original work can be found at https://github.com/AlphaCQ/IC_Utils

#[derive(Deserialize, CandidType, Clone)]
pub struct CallerGuard {
    principal: Principal,
}

impl CallerGuard {
    pub fn new(principal: Principal) -> Result<Self, String> {
        STATE.with(|state| {
            let pending_requests = &mut state.borrow_mut().pending_requests;
            if pending_requests.contains(&principal) {
                let error_msg = format!(
                    "Already processing a request for principal {:?}",
                    &principal
                );
                ic_cdk::println!("Error: {}", error_msg);
                return Err(error_msg);
            }
            pending_requests.insert(principal);
            Ok(Self { principal })
        })
    }

    fn _unlock(principal: &Principal) {
        STATE.with(|state| {
            let _flag = state.borrow_mut().pending_requests.remove(principal);
        })
    }
}

impl Drop for CallerGuard {
    fn drop(&mut self) {
        STATE.with(|state| {
            state.borrow_mut().pending_requests.remove(&self.principal);
        })
    }
}

#[derive(CandidType, Deserialize, Serialize, Debug, Copy, Clone, PartialEq)]
pub enum Network {
    Mainnet,
    Local,
}

impl Storable for Network {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        match candid::encode_one(self) {
            Ok(bytes) => Cow::Owned(bytes),
            Err(e) => {
                let error_msg = format!("CRITICAL ERROR encoding Network: {:?}", e);
                ic_cdk::println!("{}", error_msg);
                // Still panic but with more detailed error info
                panic!("Failed to encode Network: {:?}", e);
            }
        }
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        match candid::decode_one(bytes.as_ref()) {
            Ok(decoded) => decoded,
            Err(e) => {
                let error_msg = format!("CRITICAL ERROR decoding Network: {:?}", e);
                ic_cdk::println!("{}", error_msg);
                // Still panic but with more debug info
                panic!("Failed to decode Network: {:?}", e);
            }
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: MAX_VALUE_SIZE,
        is_fixed_size: false,
    };
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct QueryBlocksRequest {
    pub start: u64,
    pub length: u64,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct Icrc1TransferRequest {
    pub transfer_args: TransferArg,
    pub sweeped_index: Option<u64>,
}

impl Icrc1TransferRequest {
    fn _new(transfer_args: TransferArg, sweeped_index: Option<u64>) -> Self {
        Self {
            transfer_args,
            sweeped_index,
        }
    }
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct ToRecord {
    owner: Principal,
    subaccount: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum Icrc1TransferResponse {
    Ok(u64),
    Err(Error),
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum Error {
    Generic(GenericErrorRecord),
    TemporarilyUnavailable,
    BadBurn(BadBurnRecord),
    Duplicate(DuplicateRecord),
    BadFee(BadFeeRecord),
    CreatedInFuture(CreatedInFutureRecord),
    TooOld,
    InsufficientFunds(InsufficientFundsRecord),
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct GenericErrorRecord {
    message: String,
    error_code: u64,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct BadBurnRecord {
    min_burn_amount: u64,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct DuplicateRecord {
    duplicate_of: u64,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct BadFeeRecord {
    expected_fee: u64,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct CreatedInFutureRecord {
    ledger_time: u64,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct InsufficientFundsRecord {
    balance: u64,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct QueryBlocksResponse {
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
impl Timestamp {
    pub fn from_nanos(timestamp_nanos: u64) -> Self {
        Self { timestamp_nanos }
    }
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

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub enum SweepStatus {
    Swept,
    FailedToSweep,
    NotSwept,
}

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq, Eq, Hash)]
#[allow(clippy::upper_case_acronyms)]
pub enum TokenType {
    ICP,
    CKUSDC,
    CKUSDT,
}

impl Storable for TokenType {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        match candid::encode_one(self) {
            Ok(bytes) => Cow::Owned(bytes),
            Err(e) => {
                let error_msg = format!("CRITICAL ERROR encoding TokenType {:?}: {:?}", self, e);
                ic_cdk::println!("{}", error_msg);
                // Still panic to maintain fail-fast for critical operations
                panic!("Failed to encode TokenType: {:?}", e);
            }
        }
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        match candid::decode_one(bytes.as_ref()) {
            Ok(decoded) => decoded,
            Err(e) => {
                let error_msg = format!("CRITICAL ERROR decoding TokenType from bytes: {:?}", e);
                ic_cdk::println!("{}", error_msg);
                // Still panic but with more debug info
                panic!("Failed to decode TokenType: {:?}", e);
            }
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: MAX_VALUE_SIZE,
        is_fixed_size: false,
    };
}

#[derive(Debug, CandidType, Deserialize, Serialize, Clone)]
pub struct StoredTransactionsV1 {
    pub index: u64,
    pub memo: u64,
    pub icrc1_memo: Option<Vec<u8>>,
    pub operation: Option<Operation>,
    pub created_at_time: Timestamp,
    pub sweep_status: SweepStatus,
    pub tx_hash: String,
    pub token_type: TokenType,
    pub token_ledger_canister_id: Option<Principal>,
}

#[derive(Debug, CandidType, Deserialize, Serialize, Clone)]
pub struct StoredTransactionsV2 {
    pub index: u64,
    pub memo: u64,
    pub icrc1_memo: Option<Vec<u8>>,
    pub operation: Option<Operation>,
    pub created_at_time: Timestamp,
    pub sweep_status: SweepStatus,
    pub tx_hash: String,
    pub token_type: TokenType,
    pub token_ledger_canister_id: Option<Principal>,
}

impl From<StoredTransactionsV1> for StoredTransactionsV2 {
    fn from(v1: StoredTransactionsV1) -> Self {
        Self {
            index: v1.index,
            memo: v1.memo,
            icrc1_memo: v1.icrc1_memo,
            operation: v1.operation,
            created_at_time: v1.created_at_time,
            sweep_status: v1.sweep_status,
            tx_hash: v1.tx_hash,
            token_type: TokenType::ICP, // Default to ICP for v1 transactions
            token_ledger_canister_id: None, // No canister ID in v1
        }
    }
}

// Type alias for backward compatibility
pub type StoredTransactions = StoredTransactionsV2;

impl StoredTransactionsV2 {
    pub fn new(
        index: u64,
        transaction: Transaction,
        hash: String,
        token_type: TokenType,
        token_ledger_canister_id: Principal,
    ) -> Self {
        Self {
            index,
            memo: transaction.memo,
            icrc1_memo: transaction.icrc1_memo,
            operation: transaction.operation,
            created_at_time: transaction.created_at_time,
            sweep_status: SweepStatus::NotSwept,
            tx_hash: hash,
            token_type,
            token_ledger_canister_id: Some(token_ledger_canister_id),
        }
    }
}

#[derive(CandidType, Deserialize, Serialize, Clone, Default)]
pub struct StoredPrincipal {
    principal: Option<Principal>,
}

impl StoredPrincipal {
    pub fn new(principal: Principal) -> Self {
        Self {
            principal: Some(principal),
        }
    }

    pub fn get_principal(&self) -> Option<Principal> {
        self.principal
    }
}

const MAX_VALUE_SIZE: u32 = 500;
impl Storable for StoredTransactionsV1 {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        match candid::encode_one(self) {
            Ok(bytes) => Cow::Owned(bytes),
            Err(e) => {
                let error_msg = format!(
                    "CRITICAL ERROR encoding StoredTransactionsV1 with index {}: {:?}",
                    self.index, e
                );
                ic_cdk::println!("{}", error_msg);
                panic!("Failed to encode StoredTransactionsV1: {:?}", e);
            }
        }
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        match candid::decode_one(bytes.as_ref()) {
            Ok(decoded) => decoded,
            Err(e) => {
                let error_msg = format!("CRITICAL ERROR decoding StoredTransactionsV1: {:?}", e);
                ic_cdk::println!("{}", error_msg);
                panic!("Failed to decode StoredTransactionsV1: {:?}", e);
            }
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: MAX_VALUE_SIZE,
        is_fixed_size: false,
    };
}

impl Storable for StoredTransactionsV2 {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        match candid::encode_one(self) {
            Ok(bytes) => Cow::Owned(bytes),
            Err(e) => {
                let error_msg = format!("CRITICAL ERROR encoding StoredTransactionsV2 with index {} and token type {:?}: {:?}", 
                    self.index, self.token_type, e);
                ic_cdk::println!("{}", error_msg);
                panic!("Failed to encode StoredTransactionsV2: {:?}", e);
            }
        }
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        // First try to decode as V2 (current version)
        match candid::decode_one(bytes.as_ref()) {
            Ok(decoded) => decoded,
            Err(e) => {
                // If that fails, try to decode as V1 and convert
                let error_msg = format!("Failed to decode as StoredTransactionsV2: {:?}", e);
                ic_cdk::println!("{}", error_msg);
                ic_cdk::println!("Attempting to decode as StoredTransactionsV1...");

                match candid::decode_one::<StoredTransactionsV1>(bytes.as_ref()) {
                    Ok(v1) => {
                        ic_cdk::println!(
                            "Successfully decoded as StoredTransactionsV1 with index {}, upgrading to V2",
                            v1.index
                        );
                        StoredTransactionsV2::from(v1)
                    }
                    Err(e2) => {
                        let critical_error = format!(
                            "CRITICAL ERROR: Failed to decode as StoredTransactionsV1: {:?}. Original V2 error: {:?}",
                            e2, e
                        );
                        ic_cdk::println!("{}", critical_error);
                        panic!("Failed to decode StoredTransactionsV2 as either V2 or V1 format");
                    }
                }
            }
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: MAX_VALUE_SIZE,
        is_fixed_size: false,
    };
}

impl Storable for StoredPrincipal {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        match candid::encode_one(self) {
            Ok(bytes) => Cow::Owned(bytes),
            Err(e) => {
                let error_msg = format!(
                    "CRITICAL ERROR encoding StoredPrincipal {:?}: {:?}",
                    self.principal, e
                );
                ic_cdk::println!("{}", error_msg);
                // Still panic but with more debug info
                panic!("Failed to encode StoredPrincipal: {:?}", e);
            }
        }
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        match candid::decode_one(bytes.as_ref()) {
            Ok(decoded) => decoded,
            Err(e) => {
                let error_msg = format!("CRITICAL ERROR decoding StoredPrincipal: {:?}", e);
                ic_cdk::println!("{}", error_msg);
                // Still panic but with more debug info
                panic!("Failed to decode StoredPrincipal: {:?}", e);
            }
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: MAX_VALUE_SIZE,
        is_fixed_size: false,
    };
}

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

pub trait TimerManagerTrait {
    fn set_timer(interval: std::time::Duration) -> TimerId;
    fn clear_timer(timer_id: TimerId);
}

pub struct TimerManager;

pub trait CanisterApiManagerTrait {
    fn id() -> Principal;
}

pub struct CanisterApiManager;

pub trait InterCanisterCallManagerTrait {
    async fn query_blocks(
        ledger_principal: Principal,
        req: QueryBlocksRequest,
    ) -> CallResult<(QueryBlocksResponse,)>;

    async fn transfer(
        args: TransferArgs,
        token_ledger_canister_id: Principal,
    ) -> Result<BlockIndex, String>;
}

pub struct InterCanisterCallManager;

pub trait IcCdkSpawnManagerTrait {
    fn run<F: 'static + Future<Output = ()>>(future: F);
}

pub struct IcCdkSpawnManager;

// ICRC-1 Account implementation
#[derive(Debug, Clone, CandidType, Deserialize, Serialize, PartialEq, Eq)]
pub struct IcrcAccount {
    pub owner: Principal,
    pub subaccount: Option<[u8; 32]>,
}

impl IcrcAccount {
    /// Create a new account with the given principal and optional subaccount
    #[allow(dead_code)]
    pub fn new(owner: Principal, subaccount: Option<[u8; 32]>) -> Self {
        Self { owner, subaccount }
    }

    /// Create an account from a principal and a subaccount index
    pub fn from_principal_and_index(principal: Principal, index: u32) -> Self {
        let mut subaccount = [0; 32];
        let index_bytes = index.to_be_bytes();
        subaccount[32 - index_bytes.len()..].copy_from_slice(&index_bytes);
        Self {
            owner: principal,
            subaccount: Some(subaccount),
        }
    }

    /// Check if a subaccount is the default one (all zeroes)
    fn is_default_subaccount(subaccount: &[u8; 32]) -> bool {
        subaccount.iter().all(|&b| b == 0)
    }

    /// Base32 encoding (lowercase, no padding) for the checksum
    fn base32_encode_lowercase(input: &[u8]) -> String {
        // RFC4648 Base32 alphabet
        const ALPHABET: &[u8] = b"abcdefghijklmnopqrstuvwxyz234567";

        let mut result = String::new();
        let mut bits = 0u16;
        let mut bit_count = 0;

        for &byte in input {
            bits = (bits << 8) | (byte as u16);
            bit_count += 8;

            while bit_count >= 5 {
                bit_count -= 5;
                let index = ((bits >> bit_count) & 0x1F) as usize;
                result.push(ALPHABET[index] as char);
            }
        }

        // Handle remaining bits if any
        if bit_count > 0 {
            let index = ((bits << (5 - bit_count)) & 0x1F) as usize;
            result.push(ALPHABET[index] as char);
        }

        result
    }

    /// Convert the account to its textual representation according to ICRC-1 spec
    pub fn to_text(&self) -> String {
        if let Some(subaccount) = self.subaccount {
            // If subaccount is all zeros, just return the principal text
            if Self::is_default_subaccount(&subaccount) {
                return self.owner.to_text();
            }

            // Calculate checksum (CRC-32 of concatenated principal and subaccount bytes)
            let principal_bytes = self.owner.as_slice();
            let mut hasher = crc32fast::Hasher::new();
            hasher.update(principal_bytes);
            hasher.update(&subaccount);
            let checksum_value = hasher.finalize();

            // Convert checksum to big-endian bytes
            let checksum_bytes = checksum_value.to_be_bytes();

            // Encode checksum in Base32 lowercase
            let checksum_encoded = Self::base32_encode_lowercase(&checksum_bytes);

            // Encode subaccount as hex and remove leading zeros
            let subaccount_hex = hex::encode(subaccount);
            let trimmed_hex = subaccount_hex.trim_start_matches('0');

            // If all bytes were zero (which should not happen here since we checked earlier),
            // we should have at least one digit
            let subaccount_hex_trimmed = if trimmed_hex.is_empty() {
                "0"
            } else {
                trimmed_hex
            };

            // Construct the textual representation
            format!(
                "{}-{}.{}",
                self.owner.to_text(),
                checksum_encoded,
                subaccount_hex_trimmed
            )
        } else {
            // Default subaccount
            self.owner.to_text()
        }
    }

    /// Parse a textual representation of an ICRC-1 account
    pub fn from_text(text: &str) -> Result<Self, String> {
        // Check if it's just a principal (default account)
        if !text.contains('-') || !text.contains('.') {
            let owner = Principal::from_text(text).map_err(|e| {
                let error_msg = format!("Invalid principal format: {}", e);
                ic_cdk::println!("Error: {}", error_msg);
                error_msg
            })?;
            return Ok(Self {
                owner,
                subaccount: None,
            });
        }

        // Parse non-default account format
        let parts: Vec<&str> = text.split('.').collect();
        if parts.len() != 2 {
            let error_msg = format!(
                "Invalid account format: missing '.' separator in '{}'",
                text
            );
            ic_cdk::println!("Error: {}", error_msg);
            return Err(error_msg);
        }

        let prefix_parts: Vec<&str> = parts[0].split('-').collect();
        if prefix_parts.len() < 2 {
            let error_msg = format!(
                "Invalid account format: missing '-' separator in '{}'",
                parts[0]
            );
            ic_cdk::println!("Error: {}", error_msg);
            return Err(error_msg);
        }

        // The principal is everything before the last dash
        let principal_text = prefix_parts[..prefix_parts.len() - 1].join("-");
        let owner = Principal::from_text(&principal_text).map_err(|e| {
            let error_msg = format!("Invalid principal format in '{}': {}", principal_text, e);
            ic_cdk::println!("Error: {}", error_msg);
            error_msg
        })?;

        // The checksum is the part after the last dash
        let _checksum_text = prefix_parts[prefix_parts.len() - 1];

        // The subaccount is the part after the dot
        let subaccount_hex = parts[1];

        // Decode the subaccount hex
        let mut subaccount = [0; 32];
        let decoded = hex::decode(subaccount_hex).map_err(|e| {
            let error_msg = format!(
                "Invalid subaccount hex encoding '{}': {}",
                subaccount_hex, e
            );
            ic_cdk::println!("Error: {}", error_msg);
            error_msg
        })?;

        if decoded.len() > 32 {
            let error_msg = format!(
                "Subaccount too long: {} bytes (max 32 bytes)",
                decoded.len()
            );
            ic_cdk::println!("Error: {}", error_msg);
            return Err(error_msg);
        }

        // Put the decoded bytes at the end of the array
        let start_idx = 32 - decoded.len();
        subaccount[start_idx..].copy_from_slice(&decoded);

        // Calculate the expected checksum
        let principal_bytes = owner.as_slice();
        let mut hasher = crc32fast::Hasher::new();
        hasher.update(principal_bytes);
        hasher.update(&subaccount);
        let checksum_value = hasher.finalize();
        let checksum_bytes = checksum_value.to_be_bytes();

        // Encode the calculated checksum
        let calculated_checksum = Self::base32_encode_lowercase(&checksum_bytes);

        // Verify the checksum
        if calculated_checksum != _checksum_text {
            let error_msg = format!(
                "Checksum verification failed. Expected: {}, Got: {}",
                calculated_checksum, _checksum_text
            );
            ic_cdk::println!("Error: {}", error_msg);
            return Err(error_msg);
        }

        Ok(Self {
            owner,
            subaccount: Some(subaccount),
        })
    }
}
