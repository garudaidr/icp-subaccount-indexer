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
    Operation, QueryBlocksQueryRequest, Response, StoredPrincipal, StoredTransactions,
    TimerManager, TimerManagerTrait, Timestamp,
};

thread_local! {
    static LIST_OF_SUBACCOUNTS: RefCell<HashMap<u64, AccountIdentifier>> = RefCell::default();
    static TIMERS: RefCell<TimerId> = RefCell::default();
}

#[derive(Debug, CandidType, Deserialize, Serialize)]
struct Error {
    message: String,
}

// TODO: remove after testing
const CUSTODIAN_PRINCIPAL_ID: &str =
    "lvwvg-vchlg-pkyl5-hjj4h-ddnro-w5dqq-rvrew-ujp46-7mzgf-ea4ns-2qe";

fn hash_to_u64(hash: &[u8; 32]) -> u64 {
    let mut hasher = DefaultHasher::new();
    hash.hash(&mut hasher);
    hasher.finish()
}

fn includes_hash(vec_to_check: &Vec<u8>) -> bool {
    match vec_to_check.len() {
        32 => {
            let slice = &vec_to_check[..];
            let array_ref: Option<&[u8; 32]> = slice.try_into().ok();

            ic_cdk::println!("got here #1");

            match array_ref {
                Some(array_ref) => {
                    ic_cdk::println!("got here #2");
                    let hash_key = hash_to_u64(array_ref);
                    ic_cdk::println!("got here #3");
                    // LIST_OF_SUBACCOUNTS.with(|subaccounts| subaccounts.borrow().contains_key(&hash_key))
                    LIST_OF_SUBACCOUNTS.with(|subaccounts| {
                        let subaccounts_borrow = subaccounts.borrow();

                        ic_cdk::println!("hash_key: {}", hash_key);
                        match subaccounts_borrow.get(&hash_key) {
                            Some(_) => true,
                            None => false,
                        }
                    })
                }
                None => false,
            }
        }
        other => {
            ic_cdk::println!("vec_to_check len: {}", other);
            false
        }
    }
}

#[update]
async fn set_last_block(block: u64) {
    LAST_BLOCK.with(|last_block_ref| {
        let _ = last_block_ref.borrow_mut().set(block);
    });
}

#[query]
fn get_last_block() -> u64 {
    LAST_BLOCK.with(|last_block_ref| *last_block_ref.borrow().get())
}

async fn call_query_blocks() {
    ic_cdk::println!("Calling query_blocks");
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

    ic_cdk::println!("Response: {:?}", response);

    let mut block_count = last_block;
    response.blocks.iter().for_each(|block| {
        block.transaction.operation.as_ref().map(|operation| {
            ic_cdk::println!("Operation: {:?}", operation);

            let subaccount_exist = match operation {
                Operation::Approve(data) => {
                    ic_cdk::println!("Approve detected");
                    let from = data.from.clone();
                    if includes_hash(&from) {
                        true
                    } else {
                        let spender = data.spender.clone();
                        includes_hash(&spender)
                    }
                }
                Operation::Burn(data) => {
                    ic_cdk::println!("Burn detected");
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
                    ic_cdk::println!("Mint detected");
                    let to = data.to.clone();
                    includes_hash(&to)
                }
                Operation::Transfer(data) => {
                    ic_cdk::println!("Transfer detected");
                    let to = data.to.clone();
                    if includes_hash(&to) {
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
                    let mut transactions = transactions_ref.borrow_mut();
                    let transaction =
                        StoredTransactions::new(block_count, block.transaction.clone());
                    if !transactions.contains_key(&block_count) {
                        // Filter keys that exist
                        ic_cdk::println!("Inserting transaction");
                        let _ = transactions.insert(block_count, transaction);
                    }
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
        let account_id_hash = hash_to_u64(&account_id.to_address());
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
fn add_subaccount() -> String {
    let account = Principal::from_text(CUSTODIAN_PRINCIPAL_ID).expect("Invalid principal");
    ic_cdk::println!("Reconstructing subaccounts for account: {:?}", account);

    let nonce = get_nonce();

    let subaccount = convert_to_subaccount(nonce);
    let subaccountid: AccountIdentifier = AccountIdentifier::new(account, Some(subaccount));
    let account_id_hash = hash_to_u64(&subaccountid.to_address());
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
    let account_id_hash = hash_to_u64(&subaccountid.to_address());
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
        let account_id_hash = hash_to_u64(&subaccountid.to_address());

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

#[query]
fn get_transactions_count() -> u32 {
    TRANSACTIONS.with(|transactions_ref| transactions_ref.borrow().len() as u32)
}

#[query]
fn list_transactions() -> Vec<Option<StoredTransactions>> {
    TRANSACTIONS.with(|transactions_ref| {
        let transactions_borrow = transactions_ref.borrow();
        let mut result = Vec::new();
        let start = if transactions_borrow.len() > 100 {
            transactions_borrow.len() - 100
        } else {
            0
        };
        for i in start..transactions_borrow.len() {
            result.push(transactions_borrow.get(&i).clone());
        }
        result
    })
}

#[update]
fn clear_transactions(
    up_to_count: Option<u64>,
    up_to_timestamp: Option<Timestamp>,
) -> Result<Vec<Option<StoredTransactions>>, Error> {
    // Get Data
    let up_to_count = match up_to_count {
        Some(count) => count,
        None => 0,
    };
    let up_to_timestamp = match up_to_timestamp {
        Some(timestamp) => timestamp,
        None => Timestamp::from_nanos(0),
    };

    TRANSACTIONS.with(|transactions_ref| {
        // Collect keys that are less than the cutoff
        let mut transactions_borrow = transactions_ref.borrow_mut();
        let keys_to_remove: Vec<u64> = transactions_borrow
            .range(..up_to_count)
            .filter(|transaction| {
                up_to_timestamp.timestamp_nanos != 0 // If timestamp is not set, don't filter
                    && transaction.1.created_at_time.timestamp_nanos <= up_to_timestamp.timestamp_nanos
            })
            .map(|(k, _)| k)
            .collect();

        // Remove elements with those keys
        for key in keys_to_remove {
            transactions_borrow.remove(&key);
        }

        Ok(list_transactions())
    })
}

#[update]
fn refund(subaccount_id: String, hash: String) -> Result<String, Error> {
    Ok(format!(
        "{{\"message\": \"Refund issued for hash: {} in subaccount: {}\"}}",
        hash, subaccount_id
    ))
}

#[update]
fn sweep_user_vault(to_hash: String) -> Result<String, Error> {
    // Stub implementation - Return a success message
    Ok(format!(
        "{{\"message\": \"Sweeped user vault up to hash: {}\"}}",
        to_hash
    ))
}

#[query]
fn canister_status() -> Result<String, Error> {
    // Stub implementation - Return a placeholder JSON response
    Ok(format!("{{\"message\": \"Canister is operational\"}}"))
}

// Enable Candid export
ic_cdk::export_candid!();
