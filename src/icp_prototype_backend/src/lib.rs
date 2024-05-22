use candid::{CandidType, Deserialize, Principal};
use core::future::Future;
use futures::future::join_all;
use ic_cdk::api;
use ic_cdk::api::call::CallResult;
use ic_cdk_macros::*;
use ic_cdk_timers::TimerId;
use serde::Serialize;
use std::cell::RefCell;
use std::collections::{hash_map::DefaultHasher, HashMap};
use std::hash::{Hash, Hasher};
use serde_cbor;
use sha2::{Sha256, Digest};

mod memory;
mod tests;
mod types;

use ic_ledger_types;
use ic_ledger_types::{
    AccountIdentifier, BlockIndex, Memo, Subaccount, Tokens, TransferArgs,
    MAINNET_LEDGER_CANISTER_ID,
};

use memory::{
    CONNECTED_NETWORK, CUSTODIAN_PRINCIPAL, INTERVAL_IN_SECONDS, LAST_SUBACCOUNT_NONCE, NEXT_BLOCK, PRINCIPAL,
    TRANSACTIONS,
};
use types::{
    Network, CanisterApiManager, CanisterApiManagerTrait, IcCdkSpawnManager, IcCdkSpawnManagerTrait,
    InterCanisterCallManager, InterCanisterCallManagerTrait, Operation, QueryBlocksRequest,
    QueryBlocksResponse, StoredPrincipal, StoredTransactions, SweepStatus, TimerManager,
    TimerManagerTrait, Timestamp, CallerGuard, Transaction,
};

thread_local! {
    static NETWORK: RefCell<Network> = RefCell::new(Network::Local);
    static LIST_OF_SUBACCOUNTS: RefCell<HashMap<u64, Subaccount>> = RefCell::default();
    static TIMERS: RefCell<TimerId> = RefCell::default();
}

#[derive(Debug, CandidType, Deserialize, Serialize)]
struct Error {
    message: String,
}

trait ToU64Hash {
    fn to_u64_hash(&self) -> u64;
}

impl ToU64Hash for [u8; 32] {
    fn to_u64_hash(&self) -> u64 {
        let mut hasher = DefaultHasher::new();
        self.hash(&mut hasher);
        hasher.finish()
    }
}

impl ToU64Hash for AccountIdentifier {
    fn to_u64_hash(&self) -> u64 {
        let bytes = from_hex(&self.to_hex()).unwrap();
        let mut hasher = DefaultHasher::new();
        bytes.hash(&mut hasher);
        hasher.finish()
    }
}

fn network() -> Network {
    NETWORK.with(|net| *net.borrow())
}

#[query]
fn get_network() -> Result<Network, String> {
    authenticate()?;
    Ok(network())
}

fn authenticate() -> Result<(), String> {
    let network = network();
    if network == Network::Local {
        return Ok(());
    }

    let caller = api::caller();

    let custodian_principal_opt =
        CUSTODIAN_PRINCIPAL.with(|stored_ref| stored_ref.borrow().get().clone());
    let custodian_principal = custodian_principal_opt
        .get_principal()
        .ok_or("Failed to get custodian principal")?;

    if caller != custodian_principal {
        return Err("Unauthorized".to_string()) 
    }

    ic_cdk::println!("Caller: {:?}", caller);

    let _guard = CallerGuard::new(caller).map_err(|e| e)?;
    Ok(())
}

fn includes_hash(vec_to_check: &Vec<u8>) -> bool {
    match vec_to_check.len() {
        32 => {
            let slice = &vec_to_check[..];
            let array_ref: Option<&[u8; 32]> = slice.try_into().ok();

            match array_ref {
                Some(array_ref) => {
                    let data: [u8; 32] = *array_ref;
                    let hash_key = data.to_u64_hash();

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
async fn set_next_block(block: u64) -> Result<u64, Error> {
    authenticate().map_err(|e| Error { message: e })?;
    NEXT_BLOCK.with(|next_block_ref| {
        let _ = next_block_ref.borrow_mut().set(block);
    });
    Ok(block)
}

#[query]
fn get_next_block() -> Result<u64, String> {
    authenticate()?;
    Ok(NEXT_BLOCK.with(|next_block_ref| *next_block_ref.borrow().get()))
}

#[cfg(not(test))]
impl IcCdkSpawnManagerTrait for IcCdkSpawnManager {
    fn run<F: 'static + Future<Output = ()>>(future: F) {
        ic_cdk::spawn(future);
    }
}

fn get_subaccount(accountid: &AccountIdentifier) -> Result<Subaccount, Error> {
    LIST_OF_SUBACCOUNTS.with(|subaccounts| {
        let subaccounts_borrow = subaccounts.borrow();
        let account_id_hash = accountid.to_u64_hash();
        // find matching hashkey
        match subaccounts_borrow.get(&account_id_hash) {
            Some(value) => Ok(*value),
            None => Err(Error {
                message: "Account not found".to_string(),
            }),
        }
    })
}

fn to_sweep_args(tx: &StoredTransactions) -> Result<TransferArgs, Error> {
    let custodian_id = get_custodian_id().map_err(|e| Error { message: e })?;
    let operation = tx.operation.as_ref().ok_or(Error {
        message: "Operation is None".to_string(),
    })?;
    match operation {
        Operation::Transfer(data) => {
            // construct sweep destination -> custodian id

            // construct sweep source of funds
            let topup_to = data.to.clone();
            let topup_to = topup_to.as_slice();
            let sweep_from = AccountIdentifier::from_slice(topup_to).map_err(|err| {
                ic_cdk::println!("Error: {:?}", err);
                Error {
                    message: "Error converting to to AccountIdentifier".to_string(),
                }
            })?;
            let result = get_subaccount(&sweep_from);
            let sweep_source_subaccount = result.map_err(|err| {
                ic_cdk::println!("Error: {:?}", err);
                Error {
                    message: "Error getting from_subaccount".to_string(),
                }
            })?;

            // calculate amount
            let amount = data.amount.e8s - 10_000;

            Ok(TransferArgs {
                memo: Memo(0),
                amount: Tokens::from_e8s(amount),
                from_subaccount: Some(sweep_source_subaccount),
                fee: Tokens::from_e8s(10_000),
                to: custodian_id,
                created_at_time: None,
            })
        }
        _ => Err(Error {
            message: "Operation is not a transfer".to_string(),
        }),
    } // end match
}

fn to_refund_args(tx: &StoredTransactions) -> Result<TransferArgs, Error> {
    let operation = tx.operation.as_ref().unwrap();
    match operation {
        Operation::Transfer(data) => {

            // construct refund destination
            let topup_from = data.from.clone();
            let topup_from = topup_from.as_slice();
            let refund_to = AccountIdentifier::from_slice(topup_from).map_err(|err|{
                ic_cdk::println!("Error: {:?}", err);
                Error {message: "Error converting from to AccountIdentifier".to_string(),}
            })?;

            // construct refund source of funds
            let topup_to = data.to.clone();
            let topup_to = topup_to.as_slice();
            let refund_source = AccountIdentifier::from_slice(topup_to).map_err(|err|{
                ic_cdk::println!("Error: {:?}", err);
                Error {message: "Error converting to to AccountIdentifier".to_string(),}
            })?;
            let result = get_subaccount(&refund_source);
            let refund_source_subaccount = result.map_err(|err|{
                ic_cdk::println!("Error: {:?}", err);
                Error {message: "Error getting to_subaccount".to_string(),}
            })?;

            ic_cdk::println!("refund_source_subaccount: {:?}", refund_source_subaccount);

            let amount = data.amount.e8s - 10_000;
            Ok(TransferArgs {
                memo: Memo(0),
                amount: Tokens::from_e8s(amount),
                from_subaccount: Some(refund_source_subaccount),
                fee: Tokens::from_e8s(10_000),
                to: refund_to,
                created_at_time: None,
            })
        },
        _ => Err(Error {message: "Operation is not a transfer".to_string(),}),
    } // end match
}

fn update_status(tx: &StoredTransactions, status: SweepStatus) -> Result<(), Error> {
    let mut tx = tx.clone();

    tx.sweep_status = status;

    let prev_tx = TRANSACTIONS.with(|transactions_ref| {
        let mut transactions = transactions_ref.borrow_mut();
        transactions.insert(tx.index, tx)
    });

    match prev_tx {
        Some(_) => Ok(()),
        None => Err(Error {
            message: "Transaction not found when updating".to_string(),
        }),
    }
}

#[cfg(not(test))]
impl InterCanisterCallManagerTrait for InterCanisterCallManager {
    async fn query_blocks(
        ledger_principal: Principal,
        req: QueryBlocksRequest,
    ) -> CallResult<(QueryBlocksResponse,)> {
        ic_cdk::call(ledger_principal, "query_blocks", (req,)).await
    }

    async fn transfer(args: TransferArgs) -> Result<BlockIndex, String> {
        match ic_ledger_types::transfer(MAINNET_LEDGER_CANISTER_ID, args).await {
            Ok(Ok(block_index)) => Ok(block_index),
            Ok(Err(transfer_error)) => {
                let error_message = format!("transfer error: {:?}", transfer_error);
                Err(error_message)
            },
            Err((error, message)) => {
                let error_message = format!("unexpected error: {:?}, message: {}", error, message);
                Err(error_message)
            }
        }
    }
}

fn hash_transaction(tx: &Transaction) -> String {
    let serialized = serde_cbor::ser::to_vec_packed(&tx).unwrap();

    // Print the serialized CBOR data in hexadecimal format
    println!("Serialized Transaction (CBOR): {:?}", hex::encode(&serialized));

    let mut state = Sha256::new();
    state.update(&serialized);

    let result = state.finalize();
    format!("{:x}", result)
}

async fn call_query_blocks() {
    ic_cdk::println!("Calling query_blocks");
    let ledger_principal = PRINCIPAL.with(|stored_ref| stored_ref.borrow().get().clone());

    let next_block = NEXT_BLOCK.with(|next_block_ref| next_block_ref.borrow().get().clone());

    let ledger_principal = match ledger_principal.get_principal() {
        Some(result) => result,
        None => {
            ic_cdk::println!("Principal is not set");
            return;
        }
    };

    let req = QueryBlocksRequest {
        start: next_block,
        length: 100,
    };

    let call_result: CallResult<(QueryBlocksResponse,)> =
        InterCanisterCallManager::query_blocks(ledger_principal, req).await;

    let response = match call_result {
        Ok((response,)) => response,
        Err(_) => {
            ic_cdk::println!("query_blocks error occurred");
            return;
        }
    };

    ic_cdk::println!("Response: {:?}", response);

    let mut block_count = next_block;
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
                ic_cdk::println!("Subaccount exists");
                TRANSACTIONS.with(|transactions_ref| {
                    let mut transactions = transactions_ref.borrow_mut();

                    let hash = hash_transaction(&block.transaction);
                    ic_cdk::println!("Hash: {:?}", hash);
                    let transaction =
                    StoredTransactions::new(block_count, block.transaction.clone(), hash);

                    if !transactions.contains_key(&block_count) {
                        // Filter keys that exist
                        ic_cdk::println!("Inserting transaction");
                        let _ = transactions.insert(block_count, transaction);
                    } else {
                        ic_cdk::println!("Transaction already exists");
                    }
                });
            }
        });
        block_count += 1;
    });

    let _ = NEXT_BLOCK.with(|next_block_ref| next_block_ref.borrow_mut().set(block_count));
}

#[cfg(not(test))]
impl CanisterApiManagerTrait for CanisterApiManager {
    fn id() -> Principal {
        api::id()
    }
}

#[cfg(not(test))]
impl TimerManagerTrait for TimerManager {
    fn set_timer(interval: std::time::Duration) -> TimerId {
        ic_cdk::println!("Starting a periodic task with interval {:?}", interval);
        ic_cdk_timers::set_timer_interval(interval, || {
            IcCdkSpawnManager::run(call_query_blocks());
        })
    }

    fn clear_timer(timer_id: TimerId) {
        ic_cdk_timers::clear_timer(timer_id);
    }
}

#[ic_cdk::init]
async fn init(network: Network, seconds: u64, nonce: u32, ledger_principal: String, custodian_principal: String) {
    NETWORK.with(|net| {
        *net.borrow_mut() = network;
    });

    CONNECTED_NETWORK.with(|network_ref| {
        let _ = network_ref.borrow_mut().set(network);
    });    
    
    INTERVAL_IN_SECONDS.with(|interval_ref| {
        let _ = interval_ref.borrow_mut().set(seconds);
    });

    LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
        let _ = nonce_ref.borrow_mut().set(nonce);
    });

    let principal = Principal::from_text(&ledger_principal).expect("Invalid ledger principal");

    PRINCIPAL.with(|principal_ref| {
        let stored_principal = StoredPrincipal::new(principal);
        let _ = principal_ref.borrow_mut().set(stored_principal);
    });

    let custodian_principal =
        Principal::from_text(&custodian_principal).expect("Invalid custodian principal");

    CUSTODIAN_PRINCIPAL.with(|principal_ref| {
        let stored_principal = StoredPrincipal::new(custodian_principal);
        let _ = principal_ref.borrow_mut().set(stored_principal);
    });

    let interval = std::time::Duration::from_secs(seconds);
    let timer_id = TimerManager::set_timer(interval);

    TIMERS.with(|timers_ref| {
        timers_ref.replace(timer_id);
    });

    reconstruct_subaccounts();
}

fn reconstruct_subaccounts() {
    let nonce: u32 = nonce();
    let account = CanisterApiManager::id();

    ic_cdk::println!("Reconstructing subaccounts for account: {:?}", account);
    for i in 0..nonce {
        ic_cdk::println!("nonce: {}", i);
        let subaccount = to_subaccount(i);
        let subaccountid: AccountIdentifier = to_subaccount_id(subaccount.clone());
        let account_id_hash = subaccountid.to_u64_hash();

        LIST_OF_SUBACCOUNTS.with(|list_ref| {
            // print hash + AccountIdentifier_hex
            ic_cdk::println!("hash: {}, subaccountid: {}", account_id_hash, subaccountid.to_hex());
            list_ref.borrow_mut().insert(account_id_hash, subaccount);
        });
    }
}

fn get_stable_network() -> Network {
    CONNECTED_NETWORK.with(|network_ref| *network_ref.borrow().get())
}

fn reconstruct_network() {
    let network = get_stable_network();
    NETWORK.with(|net| {
        *net.borrow_mut() = network;
    });
}

#[ic_cdk::post_upgrade]
async fn post_upgrade() {
    ic_cdk::println!("running post_upgrade...");
    reconstruct_subaccounts();
    reconstruct_network();
}

#[query]
fn get_interval() -> Result<u64, String> {
    authenticate()?;
    Ok(INTERVAL_IN_SECONDS.with(|interval_ref| *interval_ref.borrow().get()))
}

#[update]
fn set_interval(seconds: u64) -> Result<u64, Error> {

    authenticate().map_err(|e| Error { message: e })?;

    TIMERS.with(|timers_ref| {
        TimerManager::clear_timer(timers_ref.borrow().clone());
    });

    let interval = std::time::Duration::from_secs(seconds);
    let new_timer_id = TimerManager::set_timer(interval);

    TIMERS.with(|timers_ref| {
        timers_ref.replace(new_timer_id);
    });

    INTERVAL_IN_SECONDS.with(|seconds_ref| {
        let _ = seconds_ref.borrow_mut().set(seconds);
    });

    Ok(seconds)
}

fn nonce() -> u32 {
    LAST_SUBACCOUNT_NONCE.with(|nonce_ref| *nonce_ref.borrow().get())
}

#[query]
fn get_nonce() -> Result<u32, String> {
    authenticate()?;
    Ok(nonce())
}

#[query]
fn get_canister_principal() -> Result<String, String> {
    authenticate()?;
    Ok(CanisterApiManager::id().to_string())
}

fn to_subaccount(nonce: u32) -> Subaccount {
    let mut subaccount = Subaccount([0; 32]);
    let nonce_bytes = nonce.to_be_bytes(); // Converts u32 to an array of 4 bytes
    subaccount.0[32 - nonce_bytes.len()..].copy_from_slice(&nonce_bytes); // Aligns the bytes at the end of the array
    subaccount
}

fn to_subaccount_id(subaccount: Subaccount) -> AccountIdentifier {
    let principal_id = CanisterApiManager::id();
    AccountIdentifier::new(&principal_id, &subaccount)
}

fn from_hex(hex: &str) -> Result<[u8; 32], Error> {
    let vec = hex::decode(hex).map_err(|_| Error {
        message: "string to vector conversion error".to_string(),
    })?;

    let arr = vec.as_slice().try_into().map_err(|_| Error {
        message: "vector to fix array conversion error".to_string(),
    })?;

    Ok(arr)
}

#[update]
fn add_subaccount() -> Result<String, Error> {

    authenticate().map_err(|e| Error { message: e })?;

    let nonce = nonce();
    let subaccount = to_subaccount(nonce); // needed for storing the subaccount
    let subaccountid: AccountIdentifier = to_subaccount_id(subaccount.clone()); // needed to get the hashkey & to return to user
    let account_id_hash = subaccountid.to_u64_hash();

    LIST_OF_SUBACCOUNTS.with(|list_ref| {
        list_ref.borrow_mut().insert(account_id_hash, subaccount);
    });

    LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
        let _ = nonce_ref.borrow_mut().set(nonce + 1);
    });

    Ok(subaccountid.to_hex())
}

#[query]
fn get_subaccountid(nonce: u32) -> Result<String, Error> {
    authenticate().map_err(|e| Error { message: e })?;
    LIST_OF_SUBACCOUNTS.with(|subaccounts| {
        let subaccounts_borrow = subaccounts.borrow();

        if nonce as usize >= subaccounts_borrow.len() {
            return Err(Error {
                message: "Index out of bounds".to_string(),
            });
        }

        let subaccount = to_subaccount(nonce);
        let subaccountid: AccountIdentifier = to_subaccount_id(subaccount.clone());
        let account_id_hash = subaccountid.to_u64_hash();

        ic_cdk::println!("account_id_hash to search: {}", account_id_hash);

        // find matching hashkey
        match subaccounts_borrow.get(&account_id_hash) {
            Some(_) => Ok(subaccountid.to_hex()),
            None => Err(Error {
                message: "Account not found".to_string(),
            }),
        }
    })
}

#[query]
fn get_subaccount_count() -> Result<u32, String> {
    authenticate()?;
    Ok(LIST_OF_SUBACCOUNTS.with(|subaccounts| subaccounts.borrow().len() as u32))
}

#[query]
fn get_transactions_count() -> Result<u32, String> {
    authenticate()?;
    Ok(TRANSACTIONS.with(|transactions_ref| transactions_ref.borrow().len() as u32))
}

#[query]
fn get_oldest_block() -> Result<Option<u64>, String> {
    authenticate()?;
    Ok(TRANSACTIONS.with(|transactions_ref| {
        let transactions_borrow = transactions_ref.borrow();
        transactions_borrow.iter().next().map(|(key, _value)| key)
    }))
}

#[query]
fn list_transactions(up_to_count: Option<u64>) -> Result<Vec<StoredTransactions>, String> {
    authenticate()?;

    // process argument
    let up_to_count = match up_to_count {
        Some(count) => count,
        None => 100, // Default is 100
    };

    // get earliest block
    // if there are no transactions, return empty `result`
    let mut result = Vec::new();

    TRANSACTIONS.with(|transactions_ref| {
        let transactions_borrow = transactions_ref.borrow();

        ic_cdk::println!("transactions_len: {}", transactions_borrow.len());

        // If transactions_borrow.len() is less than up_to_count, return all transactions
        let skip = if (transactions_borrow.len() as u64) < up_to_count {
            0
        } else {
            (transactions_borrow.len() as u64) - up_to_count
        };

        ic_cdk::println!("skip: {}", skip);
        transactions_borrow
            .iter()
            .skip(skip as usize)
            .take(up_to_count as usize)
            .for_each(|(_key, value)| {
                result.push(value.clone());
            });
    });

    Ok(result)
}

#[update]
fn clear_transactions(
    up_to_index: Option<u64>,
    up_to_timestamp: Option<Timestamp>,
) -> Result<Vec<StoredTransactions>, Error> {

    authenticate().map_err(|e| Error { message: e })?;

    // Get Data
    let up_to_index = match up_to_index {
        Some(index) => index,
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
            .iter()
            .filter(|transaction| {
                // If up_to_index is set then remove transactions with a index less than up_to_index
                // If up_to_timestamp is set then remove transactions with a timestamp less than up_to_timestamp
                (up_to_index != 0 && transaction.1.index <= up_to_index)
                    || (up_to_timestamp.timestamp_nanos != 0
                        && transaction.1.created_at_time.timestamp_nanos
                            <= up_to_timestamp.timestamp_nanos)
            })
            .map(|(k, _)| k)
            .collect();

        // Remove elements with those keys
        for key in keys_to_remove {
            transactions_borrow.remove(&key);
        }

        let mut result = Vec::new();
        transactions_borrow.iter().for_each(|(_key, value)| {
            result.push(value.clone());
        });
        Ok(result)
    })
}

#[update]
async fn refund(transaction_index: u64) -> Result<String, Error> {

    authenticate().map_err(|e| Error { message: e })?;

    let transaction_opt = TRANSACTIONS
        .with(|transactions_ref| transactions_ref.borrow().get(&transaction_index).clone());

    let transaction = match transaction_opt {
        Some(value) => value,
        None => {
            return Err(Error {
                message: "Transaction index is not found".to_string(),
            });
        }
    };

    // construct transfer args
    let transfer_args = to_refund_args(&transaction)?;

    InterCanisterCallManager::transfer(transfer_args)
        .await
        .map_err(|e| Error { message: e })?;

    update_status(&transaction, SweepStatus::Swept)?;

    Ok("Refund & tx update is successful".to_string())
}

#[update]
async fn sweep() -> Result<Vec<String>, Error> {

    authenticate().map_err(|e| Error { message: e })?;

    let mut futures = Vec::new();

    // get relevant txs
    let txs = TRANSACTIONS.with(|transactions_ref| {
        let transactions_borrow = transactions_ref.borrow();

        ic_cdk::println!("transactions_len: {}", transactions_borrow.len());

        // Filter transactions where sweep_status == NotSwept
        let filtered_transactions: Vec<_> = transactions_borrow
            .iter()
            .filter(|(_key, value)| value.sweep_status == SweepStatus::NotSwept)
            .collect();

        // If filtered_transactions.len() is less than up_to_count, return all transactions
        // max concurrent calls allowed by the IC is 500
        let up_to_count = 100;
        let skip = if filtered_transactions.len() < up_to_count {
            0
        } else {
            filtered_transactions.len() - up_to_count
        };

        ic_cdk::println!("skip: {}", skip);
        let result: Vec<_> = filtered_transactions
            .iter()
            .skip(skip as usize)
            .take(up_to_count as usize)
            .cloned()
            .collect();
        result
    });

    for tx in txs.iter() {
        let transfer_args = to_sweep_args(&tx.1)?;

        ic_cdk::println!("transfer_args: {:?}", transfer_args);

        let future = InterCanisterCallManager::transfer(transfer_args);
        futures.push(future);
    }

    let responses = join_all(futures).await;

    let mut results = Vec::<String>::new();

    // Trigger subsequent process here
    for (index, response) in responses.iter().enumerate() {
        let tx = txs[index].1.clone();
        match response {
            Ok(_) => {
                let status_update = update_status(&tx, SweepStatus::Swept);
                if status_update.is_ok() {
                    results.push(format!("tx: {}, sweep: ok, status_update: ok", tx.index));
                } else {
                    results.push(format!(
                        "tx: {}, sweep: ok, status_update: {}",
                        tx.index,
                        status_update.unwrap_err().message
                    ));
                }
            }
            Err(e) => {
                let status_update = update_status(&tx, SweepStatus::FailedToSweep);
                if status_update.is_ok() {
                    results.push(format!("tx: {}, sweep: {}, status_update: ok", tx.index, e));
                } else {
                    results.push(format!(
                        "tx: {}, sweep: {}, status_update: {}",
                        tx.index,
                        e,
                        status_update.unwrap_err().message
                    ));
                }
            }
        }
    }

    Ok(results)
}

fn get_custodian_id() -> Result<AccountIdentifier, String> {
    let custodian_principal_opt =
        CUSTODIAN_PRINCIPAL.with(|stored_ref| stored_ref.borrow().get().clone());
    let custodian_principal = custodian_principal_opt
        .get_principal()
        .ok_or("Failed to get principal")?;
    let subaccount = Subaccount([0; 32]);
    Ok(AccountIdentifier::new(&custodian_principal, &subaccount))
}

#[query]
fn canister_status() -> Result<String, String> {
    authenticate()?;
    Ok(format!("{{\"message\": \"Canister is operational\"}}"))
}

// Enable Candid export
ic_cdk::export_candid!();
