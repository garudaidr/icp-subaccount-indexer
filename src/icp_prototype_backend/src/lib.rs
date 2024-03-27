use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;
use ic_cdk_macros::*;
use ic_cdk_timers::TimerId;
use serde::Serialize;
use std::cell::RefCell;
use std::collections::{hash_map::DefaultHasher, HashMap};
use std::hash::{Hash, Hasher};

mod account_identifier;
mod memory;
mod tests;
mod types;

use account_identifier::{to_hex_string, AccountIdentifier, Subaccount};

use memory::{INTERVAL_IN_SECONDS, LAST_BLOCK, LAST_SUBACCOUNT_NONCE, PRINCIPAL, TRANSACTIONS};
use types::{
    E8s, Mint, Operation, QueryBlocksQueryRequest, Response, StoredPrincipal, StoredTransactions,
    TimerManager, TimerManagerTrait, Timestamp, Transaction,
};

thread_local! {
    static LIST_OF_SUBACCOUNTS: RefCell<HashMap<u64, AccountIdentifier>> = RefCell::default();
    static TIMERS: RefCell<TimerId> = RefCell::default();
}

#[derive(Debug, CandidType, Deserialize, Serialize)]
struct Error {
    message: String,
}

// TODO: change to stable memory not constant added from init
const CUSTODIAN_PRINCIPAL_ID: &str =
    "lvwvg-vchlg-pkyl5-hjj4h-ddnro-w5dqq-rvrew-ujp46-7mzgf-ea4ns-2qe";

fn hash_to_u64(hash: &[u8; 28]) -> u64 {
    let mut hasher = DefaultHasher::new();
    hash.hash(&mut hasher);
    hasher.finish()
}

fn includes_hash(vec_to_check: &Vec<u8>) -> bool {
    if vec_to_check.len() != 28 {
        return false;
    }

    let hash_slice = vec_to_check.as_slice();
    let hash_to_check: &[u8; 28] = match hash_slice.try_into() {
        Ok(arr) => arr,
        Err(_) => return false,
    };

    let hash_key = hash_to_u64(hash_to_check);
    LIST_OF_SUBACCOUNTS.with(|subaccounts| subaccounts.borrow().contains_key(&hash_key))
}

async fn call_query_blocks() {
    let ledger_principal = PRINCIPAL.with(|stored_ref| stored_ref.borrow().get().clone());

    let last_block = LAST_BLOCK.with(|last_block_ref| last_block_ref.borrow().get().clone());

    let ledger_principal = match ledger_principal.get_principal() {
        Some(result) => result,
        None => {
            ic_cdk::println!("Principal is not set");
            return;
        }
    };

    let req = QueryBlocksQueryRequest {
        start: last_block,
        length: 100,
    };
    let call_result: CallResult<(Response,)> =
        ic_cdk::call(ledger_principal, "query_blocks", (req,)).await;

    let response = match call_result {
        Ok((response,)) => response,
        Err(_) => {
            ic_cdk::println!("An error occurred");
            return;
        }
    };

    let mut block_count = last_block;
    response.blocks.iter().for_each(|block| {
        block.transaction.operation.as_ref().map(|operation| {
            let subaccount_exist = match operation {
                Operation::Approve(data) => {
                    let from = data.from.clone();
                    if includes_hash(&from) {
                        true
                    } else {
                        let spender = data.spender.clone();
                        includes_hash(&spender)
                    }
                }
                Operation::Burn(data) => {
                    let from = data.from.clone();
                    if includes_hash(&from) {
                        true
                    } else {
                        match &data.spender {
                            Some(spender) => includes_hash(&spender),
                            None => false,
                        }
                    }
                }
                Operation::Mint(data) => {
                    let to = data.to.clone();
                    includes_hash(&to)
                }
                Operation::Transfer(data) => {
                    let from = data.from.clone();
                    let to = data.to.clone();
                    if includes_hash(&from) {
                        true
                    } else if includes_hash(&to) {
                        true
                    } else {
                        match &data.spender {
                            Some(spender) => includes_hash(&spender),
                            None => false,
                        }
                    }
                }
            };

            if subaccount_exist {
                TRANSACTIONS.with(|transactions_ref| {
                    let transactions = transactions_ref.borrow_mut();
                    let transaction =
                        StoredTransactions::new(block_count, block.transaction.clone());
                    transactions.set(block_count, &transaction);
                });
            }
        });
        block_count += 1;
    });

    let _ = LAST_BLOCK.with(|last_block_ref| last_block_ref.borrow_mut().set(block_count));
}

#[cfg(not(test))]
impl TimerManagerTrait for TimerManager {
    fn set_timer(&self, interval: std::time::Duration) -> TimerId {
        ic_cdk::println!("Starting a periodic task with interval {:?}", interval);
        ic_cdk_timers::set_timer_interval(interval, || {
            ic_cdk::spawn(call_query_blocks());
        })
    }

    fn clear_timer(&self, timer_id: TimerId) {
        ic_cdk_timers::clear_timer(timer_id);
    }
}

#[ic_cdk::init]
async fn init(seconds: u64, nonce: u32, ledger_principal: String) {
    let timer_manager = TimerManager;
    let principal = Principal::from_text(&ledger_principal).expect("Invalid principal");

    INTERVAL_IN_SECONDS.with(|interval_ref| {
        let _ = interval_ref.borrow_mut().set(seconds);
    });

    LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
        let _ = nonce_ref.borrow_mut().set(nonce);
    });

    PRINCIPAL.with(|principal_ref| {
        let stored_principal = StoredPrincipal::new(principal);
        let _ = principal_ref.borrow_mut().set(stored_principal);
    });

    let interval = std::time::Duration::from_secs(seconds);
    let timer_id = timer_manager.set_timer(interval);

    TIMERS.with(|timers_ref| {
        timers_ref.replace(timer_id);
    });

    reconstruct_subaccounts();
}

fn reconstruct_subaccounts() {
    let nonce: u32 = get_nonce();
    let account = Principal::from_text(CUSTODIAN_PRINCIPAL_ID).expect("Invalid principal");
    ic_cdk::println!("Reconstructing subaccounts for account: {:?}", account);
    for i in 0..nonce {
        ic_cdk::println!("nonce: {}", i);
        let subaccount = convert_to_subaccount(i);
        let account_id = AccountIdentifier::new(account, Some(subaccount));
        let account_id_hash = hash_to_u64(&account_id.hash);
        LIST_OF_SUBACCOUNTS.with(|list_ref| {
            list_ref.borrow_mut().insert(account_id_hash, account_id);
        });
    }
}

#[ic_cdk::post_upgrade]
async fn post_upgrade() {
    ic_cdk::println!("running post_upgrade...");
    reconstruct_subaccounts();
}

#[query]
fn get_interval() -> Result<u64, Error> {
    INTERVAL_IN_SECONDS.with(|interval_ref| Ok(*interval_ref.borrow().get()))
}

#[update]
fn set_interval(seconds: u64) -> Result<u64, Error> {
    let timer_manager = TimerManager;
    TIMERS.with(|timers_ref| {
        timer_manager.clear_timer(timers_ref.borrow().clone());
    });

    let interval = std::time::Duration::from_secs(seconds);
    let new_timer_id = timer_manager.set_timer(interval);

    TIMERS.with(|timers_ref| {
        timers_ref.replace(new_timer_id);
    });

    INTERVAL_IN_SECONDS.with(|seconds_ref| {
        let _ = seconds_ref.borrow_mut().set(seconds);
    });

    Ok(seconds)
}

#[query]
fn get_nonce() -> u32 {
    LAST_SUBACCOUNT_NONCE.with(|nonce_ref| *nonce_ref.borrow().get())
}

fn convert_to_subaccount(nonce: u32) -> Subaccount {
    let mut subaccount = Subaccount([0; 32]);
    let nonce_bytes = nonce.to_be_bytes(); // Converts u32 to an array of 4 bytes
    subaccount.0[32 - nonce_bytes.len()..].copy_from_slice(&nonce_bytes); // Aligns the bytes at the end of the array
    subaccount
}

#[update]
fn account_id() -> String {
    let account = Principal::from_text(CUSTODIAN_PRINCIPAL_ID).expect("Invalid principal");
    ic_cdk::println!("Reconstructing subaccounts for account: {:?}", account);

    let nonce = get_nonce();

    let subaccount = convert_to_subaccount(nonce);
    let subaccountid: AccountIdentifier = AccountIdentifier::new(account, Some(subaccount));
    let account_id_hash = hash_to_u64(&subaccountid.hash);
    LIST_OF_SUBACCOUNTS.with(|list_ref| {
        list_ref.borrow_mut().insert(account_id_hash, subaccountid);
    });

    LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
        let _ = nonce_ref.borrow_mut().set(nonce + 1);
    });

    to_hex_string(subaccountid.to_address())
}

#[query]
fn test_hashing(nonce: u32) -> String {
    let account = Principal::from_text(CUSTODIAN_PRINCIPAL_ID).expect("Invalid principal");
    let subaccount = convert_to_subaccount(nonce);
    let subaccountid: AccountIdentifier = AccountIdentifier::new(account, Some(subaccount));
    let account_id_hash = hash_to_u64(&subaccountid.hash);
    ic_cdk::println!("account_id_hash: {}", account_id_hash);
    ic_cdk::println!(
        "subaccountid: {:?}",
        to_hex_string(subaccountid.to_address())
    );
    to_hex_string(subaccountid.to_address())
}

#[query]
fn get_subaccountid(nonce: u32) -> Result<String, Error> {
    LIST_OF_SUBACCOUNTS.with(|subaccounts| {
        let subaccounts_borrow = subaccounts.borrow();

        for (key, value) in subaccounts_borrow.iter() {
            ic_cdk::println!("key: {}, value: {}", key, to_hex_string(value.to_address()));
        }

        if nonce as usize >= subaccounts_borrow.len() {
            return Err(Error {
                message: "Index out of bounds".to_string(),
            });
        }
        // recreate key<u4> from index
        let account = Principal::from_text(CUSTODIAN_PRINCIPAL_ID).expect("Invalid principal");
        let subaccount = convert_to_subaccount(nonce);
        let subaccountid: AccountIdentifier = AccountIdentifier::new(account, Some(subaccount));
        let account_id_hash = hash_to_u64(&subaccountid.hash);

        ic_cdk::println!("account_id_hash to search: {}", account_id_hash);

        // get the account id from the list
        match subaccounts_borrow.get(&account_id_hash) {
            Some(account_id) => Ok(to_hex_string(account_id.to_address())),
            None => Err(Error {
                message: "Account not found".to_string(),
            }),
        }
    })
}

#[query]
fn get_subaccount_count() -> u32 {
    LIST_OF_SUBACCOUNTS.with(|subaccounts| subaccounts.borrow().len() as u32)
}

// Enable Candid export
ic_cdk::export_candid!();
