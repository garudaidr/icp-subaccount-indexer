use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;
use ic_cdk_macros::*;
use serde::Serialize;
use std::cell::RefCell;

mod types;

use types::Response;

thread_local! {
    static INTERVAL_IN_SECONDS: RefCell<u64> = RefCell::default();
    static TIMERS: RefCell<ic_cdk_timers::TimerId> = RefCell::default();
}

#[derive(CandidType, Deserialize, Serialize)]
struct Error {
    message: String,
}

#[derive(CandidType, Deserialize, Serialize, Clone)]
struct QueryBlocksQueryRequest {
    start: u64,
    length: u64,
}

const LEDGER_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

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
async fn init() {
    let seconds = 15;
    INTERVAL_IN_SECONDS.with(|interval_ref| {
        interval_ref.replace(seconds);
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
    INTERVAL_IN_SECONDS.with(|interval_ref| Ok(interval_ref.borrow().clone()))
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
        seconds_ref.replace(seconds);
    });

    Ok(seconds)
}

// Enable Candid export
ic_cdk::export_candid!();
