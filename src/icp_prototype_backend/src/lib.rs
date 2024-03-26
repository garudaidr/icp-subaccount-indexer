use candid::{CandidType, Deserialize};
use ic_cdk::api::call::CallResult;
use ic_cdk_macros::*;
use serde::Serialize;
use std::cell::RefCell;

mod memory;
mod types;

use memory::{INTERVAL_IN_SECONDS, PRINCIPAL};
use types::{QueryBlocksQueryRequest, Response};

thread_local! {
    static LIST_OF_SUBACCOUNTS: RefCell<Vec<AccountIdentifier>> = RefCell::default();
    static TIMERS: RefCell<ic_cdk_timers::TimerId> = RefCell::default();
}

#[derive(CandidType, Deserialize, Serialize)]
struct Error {
    message: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
struct AccountIdentifier {
    hash: [u8; 28],
}

async fn call_query_blocks() {
    let ledger_principal = PRINCIPAL.with(|stored_ref| stored_ref.borrow().get().clone());

    if ledger_principal.get_principal().is_none() {
        ic_cdk::println!("Principal is not set");
        return;
    }

    let ledger_principal = ledger_principal.get_principal().unwrap();

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
async fn init(seconds: u64, ledger_principal: String) {
    let principal = Principal::from_text(&ledger_principal).expect("Invalid principal");

    INTERVAL_IN_SECONDS.with(|interval_ref| {
        let _ = interval_ref.borrow_mut().set(seconds);
    });

    PRINCIPAL.with(|principal_ref| {
        let stored_principal = StoredPrincipal::new(principal);
        let _ = principal_ref.borrow_mut().set(stored_principal);
    });

    let interval = std::time::Duration::from_secs(seconds);
    ic_cdk::println!("Starting a periodic task with interval {:?}", interval);
    let timer_id = ic_cdk_timers::set_timer_interval(interval, || {
        ic_cdk::spawn(call_query_blocks());
    });

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

// Enable Candid export
ic_cdk::export_candid!();
