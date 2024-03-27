use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;
use ic_cdk_macros::*;
use serde::Serialize;
use std::cell::RefCell;
use std::collections::{hash_map::DefaultHasher, HashMap};
use std::hash::{Hash, Hasher};

mod memory;
mod types;
mod account_identifier;

use account_identifier::{ AccountIdentifier, Subaccount, to_hex_string};

use memory::{INTERVAL_IN_SECONDS, LAST_SUBACCOUNT_NONCE};
use types::{QueryBlocksQueryRequest, Response};

thread_local! {
    static LIST_OF_SUBACCOUNTS: RefCell<HashMap<u64, AccountIdentifier>> = RefCell::default();
    static TIMERS: RefCell<ic_cdk_timers::TimerId> = RefCell::default();
}

#[derive(CandidType, Deserialize, Serialize)]
struct Error {
    message: String,
}

#[derive(CandidType, Deserialize, Serialize)]
struct InitArgs {
    seconds: Option<u64>,
    nonce: Option<u32>,
}

fn hash_to_u64(hash: &[u8; 28]) -> u64 {
    let mut hasher = DefaultHasher::new();
    hash.hash(&mut hasher);
    hasher.finish()
}

// TODO: change to stable memory not constant added from init
const LEDGER_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const CUSTODIAN_PRINCIPAL_ID: &str = "lvwvg-vchlg-pkyl5-hjj4h-ddnro-w5dqq-rvrew-ujp46-7mzgf-ea4ns-2qe";

async fn call_query_blocks() {
    let ledger_principal = Principal::from_text(LEDGER_CANISTER_ID).expect("Invalid principal");
    let req = QueryBlocksQueryRequest {
        start: 0,
        length: 100,
    };
    let call_result: CallResult<(Response,)> =
        ic_cdk::call(ledger_principal, "query_blocks", (req,)).await;

    let _ = call_result.map_err(|e| {
        ic_cdk::println!("An error occurred: {:?}", e);
    });
}

#[ic_cdk::init]
async fn init(args: InitArgs) {
    INTERVAL_IN_SECONDS.with(|interval_ref| {
        let _ = interval_ref.borrow_mut().set(args.seconds.unwrap_or(15));
    });

    LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
        let _ = nonce_ref.borrow_mut().set(args.nonce.unwrap_or(0));
    });

    let interval = std::time::Duration::from_secs(args.seconds.unwrap_or(15));
    ic_cdk::println!("Starting a periodic task with interval {:?}", interval);
    let timer_id = ic_cdk_timers::set_timer_interval(interval, || {
        ic_cdk::spawn(call_query_blocks());
    });

    TIMERS.with(|timers_ref| {
        timers_ref.replace(timer_id);
    });

    reconstruct_subaccounts();
}

fn reconstruct_subaccounts() {
    let nonce: u32 = get_nonce();
    let account = ic_cdk::caller();
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
    TIMERS.with(|timers_ref| {
        let timer_id = timers_ref.borrow().clone();
        ic_cdk_timers::clear_timer(timer_id);
    });

    let interval = std::time::Duration::from_secs(seconds);
    ic_cdk::println!("Starting a periodic task with interval {:?}", interval);
    let new_timer_id = ic_cdk_timers::set_timer_interval(interval, || {
        ic_cdk::spawn(call_query_blocks());
    });
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
    ic_cdk::println!("subaccountid: {:?}", to_hex_string(subaccountid.to_address()));
    to_hex_string(subaccountid.to_address())
}

#[query]
fn get_subaccountid(nonce: u32) -> Result<String, Error> {
    LIST_OF_SUBACCOUNTS.with(|subaccounts| {
        let subaccounts_borrow = subaccounts.borrow();
        
        for (key, value) in subaccounts_borrow.iter() {
            ic_cdk::println!("key: {}, value: {}", key, to_hex_string(value.to_address()) );
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

#[cfg(test)]
mod tests {
    use super::*;

    // #[test]
    // fn test_increment_nonce() {
    //     let nonce = increment_nonce();
    //     assert_eq!(nonce, 1);
    // }

    #[test]
    fn test_convert_to_subaccount() {
        let nonce = 1;
        let subaccount = convert_to_subaccount(nonce);
        assert_eq!(subaccount.0[28..32], [0, 0, 0, 1]);
    }

    // #[test]
    // fn test_account_id() {
    //     let account_id = account_id();
    //     let hex = to_hex_string(account_id.to_address());
    //     assert_eq!(hex.len(), 64);
    // }
}

// Enable Candid export
ic_cdk::export_candid!();