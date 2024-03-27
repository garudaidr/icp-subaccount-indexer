use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;
use ic_cdk_macros::*;
use ic_cdk_timers::TimerId;
use serde::Serialize;
use std::cell::RefCell;
use std::collections::{hash_map::DefaultHasher, HashMap};
use std::hash::{Hash, Hasher};

mod memory;
mod tests;
mod types;

use memory::{INTERVAL_IN_SECONDS, LAST_BLOCK, PRINCIPAL, TRANSACTIONS};
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

#[derive(CandidType, Deserialize, Serialize, Clone)]
struct AccountIdentifier {
    hash: [u8; 28],
}

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
async fn init(seconds: u64, ledger_principal: String) {
    let timer_manager = TimerManager;
    let principal = Principal::from_text(&ledger_principal).expect("Invalid principal");

    INTERVAL_IN_SECONDS.with(|interval_ref| {
        let _ = interval_ref.borrow_mut().set(seconds);
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

// Enable Candid export
ic_cdk::export_candid!();
