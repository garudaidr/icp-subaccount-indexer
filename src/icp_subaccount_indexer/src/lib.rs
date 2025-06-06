use candid::{CandidType, Deserialize, Principal};
use core::future::Future;
use futures::future::join_all;
use ic_cdk::api;
use ic_cdk::api::{
    call::CallResult,
    management_canister::http_request::{
        http_request, CanisterHttpRequestArgument, HttpMethod, HttpResponse, TransformArgs,
        TransformContext,
    },
};
use ic_cdk_macros::*;
use ic_cdk_timers::TimerId;
use serde::Serialize;
use std::cell::RefCell;
use std::collections::{hash_map::DefaultHasher, HashMap};
use std::hash::{Hash, Hasher};

mod hashof;
mod ledger;
mod memory;
mod tests;
mod types;

use ledger::*;

use ic_ledger_types::{
    AccountIdentifier, BlockIndex, Memo, Subaccount, Tokens, TransferArgs,
    MAINNET_LEDGER_CANISTER_ID,
};

use types::TokenType;

use memory::{
    CONNECTED_NETWORK, CUSTODIAN_PRINCIPAL, INTERVAL_IN_SECONDS, LAST_SUBACCOUNT_NONCE, NEXT_BLOCK,
    PRINCIPAL, TOKEN_LEDGER_PRINCIPALS, TRANSACTIONS, WEBHOOK_URL,
};

// Canister IDs for ICRC tokens
// xevnm-gaaaa-aaaar-qafnq-cai
const CKUSDC_LEDGER_CANISTER_ID: Principal =
    Principal::from_slice(&[0, 0, 0, 0, 2, 48, 1, 91, 1, 1]);
// cngnf-vqaaa-aaaar-qag4q-cai
const CKUSDT_LEDGER_CANISTER_ID: Principal =
    Principal::from_slice(&[0, 0, 0, 0, 2, 48, 1, 185, 1, 1]);

use types::{
    CallerGuard, CanisterApiManager, CanisterApiManagerTrait, IcCdkSpawnManager,
    IcCdkSpawnManagerTrait, IcrcAccount, InterCanisterCallManager, InterCanisterCallManagerTrait,
    Network, Operation, QueryBlocksRequest, QueryBlocksResponse, StoredPrincipal,
    StoredTransactions, SweepStatus, TimerManager, TimerManagerTrait, Timestamp, Transaction,
};

thread_local! {
    static NETWORK: RefCell<Network> = const { RefCell::new(Network::Local) };
    static LIST_OF_SUBACCOUNTS: RefCell<HashMap<u64, Subaccount>> = RefCell::default();
    static TIMERS: RefCell<TimerId> = RefCell::default();
    static TOKEN_LEDGER_TIMERS: RefCell<HashMap<TokenType, TimerId>> = RefCell::default();
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
        return Err("Unauthorized".to_string());
    }

    ic_cdk::println!("Caller: {:?}", caller);

    let _guard = CallerGuard::new(caller)?;
    Ok(())
}

fn includes_hash(vec_to_check: &[u8]) -> bool {
    match vec_to_check.len() {
        32 => {
            let array_ref: Option<&[u8; 32]> = vec_to_check.try_into().ok();

            match array_ref {
                Some(array_ref) => {
                    let data: [u8; 32] = *array_ref;
                    let hash_key = data.to_u64_hash();

                    LIST_OF_SUBACCOUNTS.with(|subaccounts| {
                        let subaccounts_borrow = subaccounts.borrow();

                        ic_cdk::println!("hash_key: {}", hash_key);
                        subaccounts_borrow.get(&hash_key).is_some()
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
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;
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

use url::Url;

#[update]
async fn set_webhook_url(webhook_url: String) -> Result<String, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error {
            message: e.to_string(),
        }
    })?;

    // Validate the URL
    match Url::parse(&webhook_url) {
        Ok(url) => {
            // Check if the scheme is http or https
            if url.scheme() != "http" && url.scheme() != "https" {
                let error_msg = "Invalid URL scheme. Must be http or https.".to_string();
                ic_cdk::println!("URL error: {}", error_msg);
                return Err(Error { message: error_msg });
            }

            // Check if the host is present
            if url.host().is_none() {
                let error_msg = "Invalid URL. Host is missing.".to_string();
                ic_cdk::println!("URL error: {}", error_msg);
                return Err(Error { message: error_msg });
            }

            // If all checks pass, set the webhook URL
            WEBHOOK_URL.with(|webhook_url_ref| {
                let _ = webhook_url_ref.borrow_mut().set(webhook_url.clone());
            });

            Ok(webhook_url)
        }
        Err(e) => {
            let error_msg = format!("Invalid URL format: {}", e);
            ic_cdk::println!("URL error: {}", error_msg);
            Err(Error { message: error_msg })
        }
    }
}

#[query]
fn get_webhook_url() -> Result<String, String> {
    authenticate()?;
    Ok(WEBHOOK_URL.with(|webhook_url_ref| webhook_url_ref.borrow().get().to_string()))
}

#[update]
async fn set_custodian_principal(principal_text: String) -> Result<String, Error> {
    use ic_cdk::api::management_canister::main::{
        canister_status, CanisterIdRecord, CanisterStatusResponse,
    };

    let caller = api::caller();
    let canister_id = api::id();

    // Get canister status to check controllers
    let canister_status_result: Result<(CanisterStatusResponse,), _> =
        canister_status(CanisterIdRecord { canister_id }).await;

    match canister_status_result {
        Ok((status,)) => {
            let is_controller = status.settings.controllers.contains(&caller);
            if !is_controller {
                return Err(Error {
                    message: "Only controller can set custodian principal".to_string(),
                });
            }
        }
        Err(_) => {
            // Fallback: if we can't get canister status, only allow anonymous for local testing
            let network = network();
            if network != Network::Local {
                return Err(Error {
                    message: "Unable to verify controller status".to_string(),
                });
            }
        }
    }

    let custodian_principal = Principal::from_text(principal_text.clone()).map_err(|e| Error {
        message: format!("Invalid principal format: {}", e),
    })?;

    CUSTODIAN_PRINCIPAL.with(|principal_ref| {
        let stored_principal = StoredPrincipal::new(custodian_principal);
        let _ = principal_ref.borrow_mut().set(stored_principal);
    });

    Ok(format!("Custodian principal set to: {}", principal_text))
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
            None => {
                let error_msg = "Account not found".to_string();
                ic_cdk::println!("Error: {}", error_msg);
                Err(Error { message: error_msg })
            }
        }
    })
}

fn to_sweep_args(tx: &StoredTransactions) -> Result<(TransferArgs, Principal), Error> {
    let custodian_id = get_custodian_id().map_err(|e| {
        ic_cdk::println!("Error getting custodian ID: {}", e);
        Error { message: e }
    })?;
    let operation = tx.operation.as_ref().ok_or_else(|| {
        let error_msg = "Operation is None".to_string();
        ic_cdk::println!("Error: {}", error_msg);
        Error { message: error_msg }
    })?;
    match operation {
        Operation::Transfer(data) => {
            // construct sweep destination -> custodian id

            // construct sweep source of funds
            let topup_to = data.to.clone();
            let topup_to = topup_to.as_slice();
            let sweep_from = AccountIdentifier::from_slice(topup_to).map_err(|err| {
                let error_msg = format!("Error converting to to AccountIdentifier: {:?}", err);
                ic_cdk::println!("{}", error_msg);
                Error { message: error_msg }
            })?;
            let result = get_subaccount(&sweep_from);
            let sweep_source_subaccount = result.map_err(|err| {
                let error_msg = format!("Error getting from_subaccount: {}", err.message);
                ic_cdk::println!("{}", error_msg);
                Error { message: error_msg }
            })?;

            // calculate amount
            let amount = data.amount.e8s - 10_000;

            // Get the ledger canister ID for the token type
            let token_ledger_canister_id = get_token_ledger_canister_id(&tx.token_type);

            Ok((
                TransferArgs {
                    memo: Memo(0),
                    amount: Tokens::from_e8s(amount),
                    from_subaccount: Some(sweep_source_subaccount),
                    fee: Tokens::from_e8s(10_000),
                    to: custodian_id,
                    created_at_time: None,
                },
                token_ledger_canister_id,
            ))
        }
        _ => {
            let error_msg = "Operation is not a transfer".to_string();
            ic_cdk::println!("Error: {}", error_msg);
            Err(Error { message: error_msg })
        }
    } // end match
}

fn to_refund_args(tx: &StoredTransactions) -> Result<(TransferArgs, Principal), Error> {
    let operation = tx.operation.as_ref().unwrap();
    match operation {
        Operation::Transfer(data) => {
            // construct refund destination
            let topup_from = data.from.clone();
            let topup_from = topup_from.as_slice();
            let refund_to = AccountIdentifier::from_slice(topup_from).map_err(|err| {
                let error_msg = format!("Error converting from to AccountIdentifier: {:?}", err);
                ic_cdk::println!("{}", error_msg);
                Error { message: error_msg }
            })?;

            // construct refund source of funds
            let topup_to = data.to.clone();
            let topup_to = topup_to.as_slice();
            let refund_source = AccountIdentifier::from_slice(topup_to).map_err(|err| {
                let error_msg = format!("Error converting to to AccountIdentifier: {:?}", err);
                ic_cdk::println!("{}", error_msg);
                Error { message: error_msg }
            })?;
            let result = get_subaccount(&refund_source);
            let refund_source_subaccount = result.map_err(|err| {
                let error_msg = format!("Error getting to_subaccount: {}", err.message);
                ic_cdk::println!("{}", error_msg);
                Error { message: error_msg }
            })?;

            ic_cdk::println!("refund_source_subaccount: {:?}", refund_source_subaccount);

            // Get the ledger canister ID for the token type
            let token_ledger_canister_id = get_token_ledger_canister_id(&tx.token_type);

            let amount = data.amount.e8s - 10_000;
            Ok((
                TransferArgs {
                    memo: Memo(0),
                    amount: Tokens::from_e8s(amount),
                    from_subaccount: Some(refund_source_subaccount),
                    fee: Tokens::from_e8s(10_000),
                    to: refund_to,
                    created_at_time: None,
                },
                token_ledger_canister_id,
            ))
        }
        _ => {
            let error_msg = "Operation is not a transfer".to_string();
            ic_cdk::println!("Error: {}", error_msg);
            Err(Error { message: error_msg })
        }
    } // end match
}

fn update_status(tx: &StoredTransactions, status: SweepStatus) -> Result<(), Error> {
    let index = tx.index;
    let mut tx_clone = tx.clone();

    tx_clone.sweep_status = status;

    let prev_tx = TRANSACTIONS.with(|transactions_ref| {
        let mut transactions = transactions_ref.borrow_mut();
        transactions.insert(index, tx_clone)
    });

    match prev_tx {
        Some(_) => Ok(()),
        None => {
            let error_msg = format!("Transaction with index {} not found when updating", index);
            ic_cdk::println!("Error: {}", error_msg);
            Err(Error { message: error_msg })
        }
    }
}

#[cfg(not(any(test, feature = "happy_path", feature = "sad_path")))]
impl InterCanisterCallManagerTrait for InterCanisterCallManager {
    async fn query_blocks(
        ledger_principal: Principal,
        req: QueryBlocksRequest,
    ) -> CallResult<(QueryBlocksResponse,)> {
        ic_cdk::call(ledger_principal, "query_blocks", (req,)).await
    }

    async fn transfer(
        args: TransferArgs,
        token_ledger_canister_id: Principal,
    ) -> Result<BlockIndex, String> {
        match ic_ledger_types::transfer(token_ledger_canister_id, args).await {
            Ok(Ok(block_index)) => Ok(block_index),
            Ok(Err(transfer_error)) => {
                let error_message = format!("transfer error: {:?}", transfer_error);
                Err(error_message)
            }
            Err((error, message)) => {
                let error_message = format!("unexpected error: {:?}, message: {}", error, message);
                Err(error_message)
            }
        }
    }
}

fn hash_transaction(tx: &Transaction) -> Result<String, String> {
    let transfer = match &tx.operation {
        Some(Operation::Transfer(transfer)) => transfer,
        _ => unreachable!("tx.operation should always be Operation::Transfer"),
    };
    let sender_slice = transfer.from.as_slice();
    let from_account = match ledger::AccountIdentifier::from_slice(sender_slice) {
        Ok(account) => account,
        Err(e) => {
            let error_msg = format!("Failed to create from: {:?}", e);
            ic_cdk::println!("Error: {}", error_msg);
            return Err(error_msg);
        }
    };

    let receiver_slice = transfer.to.as_slice();
    let to_account = match ledger::AccountIdentifier::from_slice(receiver_slice) {
        Ok(account) => account,
        Err(e) => {
            let error_msg = format!("Failed to create to: {:?}", e);
            ic_cdk::println!("Error: {}", error_msg);
            return Err(error_msg);
        }
    };

    let spender = match &transfer.spender {
        Some(spender) => {
            let spender_slice = spender.as_slice();
            match ledger::AccountIdentifier::from_slice(spender_slice) {
                Ok(account) => Some(account),
                Err(e) => {
                    let error_msg = format!("Failed to create spender: {:?}", e);
                    ic_cdk::println!("Error: {}", error_msg);
                    return Err(error_msg);
                }
            }
        }
        None => None,
    };

    let amount = transfer.amount.e8s;
    let fee = transfer.fee.e8s;
    let memo = tx.memo;
    let created_at_time = tx.created_at_time.timestamp_nanos;

    let tx_hash = ledger::Transaction::new(
        from_account,
        to_account,
        spender,
        Tokens::from_e8s(amount),
        Tokens::from_e8s(fee),
        Memo(memo),
        ledger::TimeStamp {
            timestamp_nanos: created_at_time,
        },
    )
    .generate_hash();

    Ok(tx_hash.to_hex())
}

async fn send_webhook(tx_hash: String) -> String {
    // Retrieve the URL from WEBHOOK_URL
    let url = WEBHOOK_URL.with(|cell| cell.borrow().get().clone());

    // If the URL is empty, return immediately
    if url.is_empty() {
        return "Webhook URL is not set.".to_string();
    }

    ic_cdk::println!("Original URL: {}", url);

    // Add tx_hash as a query parameter to the URL
    let url_with_param = match Url::parse(&url) {
        Ok(mut parsed_url) => {
            parsed_url
                .query_pairs_mut()
                .append_pair("tx_hash", &tx_hash);
            parsed_url.to_string()
        }
        Err(_) => {
            return format!("Invalid webhook URL: {}", url);
        }
    };

    ic_cdk::println!("URL with tx_hash parameter: {}", url_with_param);

    let request = CanisterHttpRequestArgument {
        url: url_with_param.clone(),
        max_response_bytes: None,
        method: HttpMethod::POST,
        headers: vec![], // No need to manually add headers
        body: None,
        transform: Some(TransformContext::from_name("transform".to_string(), vec![])),
    };

    // Maximum around 2.5 bilion cycles per call.
    // Check final cost here: https://internetcomputer.org/docs/current/developer-docs/gas-cost#units-and-fiat-value
    ic_cdk::println!("Sending HTTP outcall to: {}", url_with_param);
    match http_request(request, 50_850_050_000).await {
        Ok((response,)) => match String::from_utf8(response.body) {
            Ok(str_body) => {
                ic_cdk::println!("{}", format!("{:?}", str_body));
                format!(
                    "{}. See more info of the request sent at: {}/inspect",
                    str_body, url_with_param
                )
            }
            Err(_) => "Response body is not UTF-8 encoded.".to_string(),
        },
        Err((r, m)) => {
            format!(
                "The http_request resulted in an error. RejectionCode: {:?}, Error: {}",
                r, m
            )
        }
    }
}

#[ic_cdk::query]
fn transform(args: TransformArgs) -> HttpResponse {
    args.response
}

async fn query_token_ledger(
    token_type: TokenType,
    token_principal: Principal,
    next_block: u64,
) -> u64 {
    ic_cdk::println!("Querying token ledger for {:?}", token_type);

    let req = QueryBlocksRequest {
        start: next_block,
        length: 100,
    };

    let call_result: CallResult<(QueryBlocksResponse,)> =
        InterCanisterCallManager::query_blocks(token_principal, req).await;

    let response = match call_result {
        Ok((response,)) => response,
        Err((code, msg)) => {
            ic_cdk::println!("ERROR in query_token_ledger for {:?}:", token_type);
            ic_cdk::println!("  Rejection code: {:?}", code);
            ic_cdk::println!("  Error message: {}", msg);
            ic_cdk::println!("  Token principal: {}", token_principal.to_string());
            ic_cdk::println!("  Next block: {}", next_block);
            return next_block; // Return original block count if error occurs
        }
    };

    ic_cdk::println!("Response for {:?}: {:?}", token_type, response);

    let mut first_block_hash = String::default();
    let mut block_count = next_block;
    response.blocks.iter().for_each(|block| {
        if let Some(operation) = block.transaction.operation.as_ref() {
            ic_cdk::println!("Operation for {:?}: {:?}", token_type, operation);

            let subaccount_exist = match operation {
                Operation::Approve(data) => {
                    ic_cdk::println!("Approve detected for {:?}", token_type);
                    let from = data.from.clone();
                    if includes_hash(&from) {
                        true
                    } else {
                        let spender = data.spender.clone();
                        includes_hash(&spender)
                    }
                }
                Operation::Burn(data) => {
                    ic_cdk::println!("Burn detected for {:?}", token_type);
                    let from = data.from.clone();
                    if includes_hash(&from) {
                        true
                    } else {
                        match &data.spender {
                            Some(spender) => includes_hash(spender),
                            None => false,
                        }
                    }
                }
                Operation::Mint(data) => {
                    ic_cdk::println!("Mint detected for {:?}", token_type);
                    let to = data.to.clone();
                    includes_hash(&to)
                }
                Operation::Transfer(data) => {
                    ic_cdk::println!("Transfer detected for {:?}", token_type);
                    let to = data.to.clone();
                    if includes_hash(&to) {
                        true
                    } else {
                        match &data.spender {
                            Some(spender) => includes_hash(spender),
                            None => false,
                        }
                    }
                }
            };

            if subaccount_exist {
                ic_cdk::println!("Subaccount exists for {:?}", token_type);
                TRANSACTIONS.with(|transactions_ref| {
                    let mut transactions = transactions_ref.borrow_mut();

                    let hash = match hash_transaction(&block.transaction) {
                        Ok(content) => content,
                        Err(err) => {
                            ic_cdk::println!(
                                "ERROR in query_token_ledger when hashing transaction:"
                            );
                            ic_cdk::println!("  Error message: {}", err);
                            ic_cdk::println!("  Token type: {:?}", token_type);
                            ic_cdk::println!("  Transaction: {:?}", block.transaction);
                            "HASH-IS-NOT-AVAILABLE".to_string()
                        }
                    };
                    ic_cdk::println!("Hash for {:?}: {:?}", token_type, hash);

                    let transaction = StoredTransactions::new(
                        block_count,
                        block.transaction.clone(),
                        hash.clone(),
                        token_type.clone(),
                        token_principal,
                    );

                    if !transactions.contains_key(&block_count) {
                        // Filter keys that exist
                        ic_cdk::println!("Inserting transaction for {:?}", token_type);
                        let _ = transactions.insert(block_count, transaction);

                        // Track the first block hash in the iter
                        if first_block_hash.is_empty() {
                            ic_cdk::println!(
                                "Setting webhook tx_hash for {:?}: {:?}",
                                token_type,
                                hash
                            );
                            first_block_hash = hash;
                        }
                    } else {
                        ic_cdk::println!("Transaction already exists for {:?}", token_type);
                    }
                });
            }
        };
        block_count += 1;
    });

    // If the first block hash in not empty
    // Send the webhook
    if !first_block_hash.is_empty() {
        let res = send_webhook(first_block_hash).await;
        ic_cdk::println!("HTTP Outcall result for {:?}: {}", token_type, res);
    }

    // Return the updated block count instead of modifying global state
    block_count
}

async fn call_query_blocks() {
    ic_cdk::println!("Starting periodic block checking");

    // Get the current next block value
    let next_block = NEXT_BLOCK.with(|next_block_ref| *next_block_ref.borrow().get());
    let mut icp_in_registered_tokens = false;

    // Get the default ICP ledger principal
    let default_icp_principal =
        PRINCIPAL.with(
            |stored_ref| match stored_ref.borrow().get().get_principal() {
                Some(result) => Some(result),
                None => {
                    ic_cdk::println!("ERROR in call_query_blocks:");
                    ic_cdk::println!("  ICP Principal is not set");
                    ic_cdk::println!(
                        "  This is a critical error that prevents querying the ledger"
                    );
                    None
                }
            },
        );

    if default_icp_principal.is_none() {
        return;
    }

    // Process registered token ledgers
    TOKEN_LEDGER_PRINCIPALS.with(|tl| {
        for (_, (token_type, token_principal)) in tl.borrow().iter() {
            ic_cdk::println!("Scheduling query for token type: {:?}", token_type);

            // Clone values for use in async block
            let token_type_clone = token_type.clone();
            let token_principal_clone = token_principal;
            let current_next_block = next_block;

            // Check if ICP is in registered tokens
            if token_type_clone == TokenType::ICP {
                icp_in_registered_tokens = true;

                // Process ICP directly
                IcCdkSpawnManager::run(async move {
                    let result = query_token_ledger(
                        token_type_clone.clone(),
                        token_principal_clone,
                        current_next_block,
                    )
                    .await;
                    ic_cdk::println!("ICP token ledger query completed with result: {}", result);

                    // Update the global next block value with ICP result
                    NEXT_BLOCK.with(|next_block_ref| {
                        let _ = next_block_ref.borrow_mut().set(result);
                    });
                });
            } else {
                // Process other tokens in separate tasks
                IcCdkSpawnManager::run(async move {
                    let result = query_token_ledger(
                        token_type_clone.clone(),
                        token_principal_clone,
                        current_next_block,
                    )
                    .await;
                    ic_cdk::println!(
                        "Token ledger query for {:?} completed with result: {}",
                        token_type_clone,
                        result
                    );
                });
            }
        }
    });

    // If ICP is not in registered tokens, process it with default principal
    if !icp_in_registered_tokens && default_icp_principal.is_some() {
        let icp_principal = default_icp_principal.unwrap();
        ic_cdk::println!("Processing default ICP ledger");

        let icp_result = query_token_ledger(TokenType::ICP, icp_principal, next_block).await;
        ic_cdk::println!(
            "Default ICP token ledger query completed with result: {}",
            icp_result
        );

        // Update the next block value
        let updated_block_count = icp_result;

        // Update the global next block value
        NEXT_BLOCK.with(|next_block_ref| {
            let _ = next_block_ref.borrow_mut().set(updated_block_count);
        });
    }

    ic_cdk::println!("Block checking cycle completed");
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
async fn init(
    network: Network,
    seconds: u64,
    nonce: u32,
    ledger_principal: String,
    custodian_principal: String,
) {
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

    let principal = Principal::from_text(ledger_principal).expect("Invalid ledger principal");

    PRINCIPAL.with(|principal_ref| {
        let stored_principal = StoredPrincipal::new(principal);
        let _ = principal_ref.borrow_mut().set(stored_principal);
    });

    let custodian_principal =
        Principal::from_text(custodian_principal).expect("Invalid custodian principal");

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
        let subaccountid: AccountIdentifier = to_subaccount_id(subaccount);
        let account_id_hash = subaccountid.to_u64_hash();

        // Check if this is for an ICRC-1 token and get the text representation
        let display_account_id =
            if account == CKUSDC_LEDGER_CANISTER_ID || account == CKUSDT_LEDGER_CANISTER_ID {
                let icrc_account = IcrcAccount::from_principal_and_index(account, i);
                icrc_account.to_text()
            } else {
                subaccountid.to_hex()
            };

        LIST_OF_SUBACCOUNTS.with(|list_ref| {
            // print hash + AccountIdentifier_hex or ICRC-1 textual representation
            ic_cdk::println!(
                "hash: {}, subaccountid: {}",
                account_id_hash,
                display_account_id
            );
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
    ic_cdk::println!("Running post_upgrade...");

    let _ = set_interval(500);

    reconstruct_subaccounts();
    reconstruct_network();

    // Set the current caller as custodian principal if not already set
    let caller = api::caller();
    ic_cdk::println!("Post-upgrade caller: {}", caller.to_string());

    // Check if custodian principal is already set
    let custodian_exists =
        CUSTODIAN_PRINCIPAL.with(|stored_ref| stored_ref.borrow().get().get_principal().is_some());

    if !custodian_exists {
        ic_cdk::println!(
            "Setting caller as custodian principal: {}",
            caller.to_string()
        );
        CUSTODIAN_PRINCIPAL.with(|principal_ref| {
            let stored_principal = StoredPrincipal::new(caller);
            let _ = principal_ref.borrow_mut().set(stored_principal);
        });
    } else {
        ic_cdk::println!("Custodian principal already set");
    }
}

#[query]
fn get_interval() -> Result<u64, String> {
    authenticate()?;
    Ok(INTERVAL_IN_SECONDS.with(|interval_ref| *interval_ref.borrow().get()))
}

#[update]
fn set_interval(seconds: u64) -> Result<u64, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    TIMERS.with(|timers_ref| {
        TimerManager::clear_timer(*timers_ref.borrow());
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
    let vec = hex::decode(hex).map_err(|e| {
        let error_msg = format!("String to vector conversion error: {}", e);
        ic_cdk::println!("Error: {}", error_msg);
        Error { message: error_msg }
    })?;

    let arr = vec.as_slice().try_into().map_err(|e| {
        let error_msg = format!("Vector to fixed array conversion error: {:?}", e);
        ic_cdk::println!("Error: {}", error_msg);
        Error { message: error_msg }
    })?;

    Ok(arr)
}

#[update]
fn add_subaccount(token_type: Option<TokenType>) -> Result<String, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    let nonce = nonce();
    let subaccount = to_subaccount(nonce); // needed for storing the subaccount
    let subaccountid: AccountIdentifier = to_subaccount_id(subaccount); // needed to get the hashkey & to return to user
    let account_id_hash = subaccountid.to_u64_hash();

    LIST_OF_SUBACCOUNTS.with(|list_ref| {
        list_ref.borrow_mut().insert(account_id_hash, subaccount);
    });

    LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
        let _ = nonce_ref.borrow_mut().set(nonce + 1);
    });

    // Determine the token type
    let token_type = token_type.unwrap_or(TokenType::ICP);

    // For ICRC-1 tokens (ckUSDC/ckUSDT), use the ICRC-1 textual representation
    if token_type == TokenType::CKUSDC || token_type == TokenType::CKUSDT {
        let canister_id = CanisterApiManager::id();
        let icrc_account = IcrcAccount::from_principal_and_index(canister_id, nonce);
        return Ok(icrc_account.to_text());
    }

    // Otherwise return the traditional account ID
    Ok(subaccountid.to_hex())
}

#[query]
fn get_subaccountid(nonce_param: u32, token_type: Option<TokenType>) -> Result<String, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    let current_nonce = nonce();
    if nonce_param >= current_nonce {
        let error_msg = "Index out of bounds";
        ic_cdk::println!(
            "Error: Index out of bounds: {} >= {}",
            nonce_param,
            current_nonce
        );
        return Err(Error {
            message: error_msg.to_string(),
        });
    }

    // First, get the traditional account ID for compatibility with existing code
    let subaccount = to_subaccount(nonce_param);
    let subaccountid: AccountIdentifier = to_subaccount_id(subaccount);
    let account_id_hash = subaccountid.to_u64_hash();

    LIST_OF_SUBACCOUNTS.with(|subaccounts| {
        let subaccounts_borrow = subaccounts.borrow();

        ic_cdk::println!("account_id_hash to search: {}", account_id_hash);

        // Check if the subaccount exists in our store
        match subaccounts_borrow.get(&account_id_hash) {
            Some(_) => {
                // Determine the token type
                let token_type = token_type.unwrap_or(TokenType::ICP);
                let canister_id = CanisterApiManager::id();

                // For ICRC-1 tokens (ckUSDC/ckUSDT), use the ICRC-1 textual representation
                if token_type == TokenType::CKUSDC || token_type == TokenType::CKUSDT {
                    let icrc_account =
                        IcrcAccount::from_principal_and_index(canister_id, nonce_param);
                    Ok(icrc_account.to_text())
                } else {
                    // For ICP, use the traditional account ID
                    Ok(subaccountid.to_hex())
                }
            }
            None => {
                let error_msg = "Account not found".to_string();
                ic_cdk::println!("Error: {}", error_msg);
                Err(Error { message: error_msg })
            }
        }
    })
}

#[query]
fn get_icrc_account(nonce_param: u32) -> Result<String, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    let current_nonce = nonce();
    if nonce_param >= current_nonce {
        let error_msg = "Index out of bounds";
        ic_cdk::println!(
            "Error: Index out of bounds: {} >= {}",
            nonce_param,
            current_nonce
        );
        return Err(Error {
            message: error_msg.to_string(),
        });
    }

    let principal = CanisterApiManager::id();
    let icrc_account = IcrcAccount::from_principal_and_index(principal, nonce_param);
    Ok(icrc_account.to_text())
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
    let up_to_count = up_to_count.unwrap_or(100);

    // get earliest block
    // if there are no transactions, return empty `result`
    let mut result = Vec::new();

    TRANSACTIONS.with(|transactions_ref| {
        let transactions_borrow = transactions_ref.borrow();

        ic_cdk::println!("transactions_len: {}", transactions_borrow.len());

        // If transactions_borrow.len() is less than up_to_count, return all transactions
        let skip = if transactions_borrow.len() < up_to_count {
            0
        } else {
            transactions_borrow.len() - up_to_count
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
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    // Get Data
    let up_to_index = up_to_index.unwrap_or(0);
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
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    let transaction_opt = TRANSACTIONS
        .with(|transactions_ref| transactions_ref.borrow().get(&transaction_index).clone());

    let transaction = match transaction_opt {
        Some(value) => value,
        None => {
            let error_msg = format!("Transaction index {} is not found", transaction_index);
            ic_cdk::println!("Error: {}", error_msg);
            return Err(Error { message: error_msg });
        }
    };

    // construct transfer args
    let (transfer_args, token_ledger_canister_id) = to_refund_args(&transaction)?;

    InterCanisterCallManager::transfer(transfer_args, token_ledger_canister_id)
        .await
        .map_err(|e| Error { message: e })?;

    update_status(&transaction, SweepStatus::Swept)?;

    Ok("Refund & tx update is successful".to_string())
}

#[update]
async fn sweep() -> Result<Vec<String>, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

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
            .skip(skip)
            .take(up_to_count)
            .cloned()
            .collect();
        result
    });

    for tx in txs.iter() {
        let (transfer_args, token_ledger_canister_id) = to_sweep_args(&tx.1)?;

        ic_cdk::println!(
            "transfer_args: {:?}, token_type: {:?}",
            transfer_args,
            tx.1.token_type
        );

        let future = InterCanisterCallManager::transfer(transfer_args, token_ledger_canister_id);
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

#[update]
async fn single_sweep(tx_hash_arg: String) -> Result<Vec<String>, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    let mut futures = Vec::new();

    // get relevant txs
    let txs = TRANSACTIONS.with(|transactions_ref| {
        let transactions_borrow = transactions_ref.borrow();

        // Filter transactions where tx_hash == tx_hash_arg
        let filtered_transactions: Vec<_> = transactions_borrow
            .iter()
            .filter(|(_key, value)| value.tx_hash == tx_hash_arg)
            .collect();

        filtered_transactions
    });

    for tx in txs.iter() {
        let (transfer_args, token_ledger_canister_id) = to_sweep_args(&tx.1)?;

        ic_cdk::println!(
            "transfer_args: {:?}, token_type: {:?}",
            transfer_args,
            tx.1.token_type
        );

        let future = InterCanisterCallManager::transfer(transfer_args, token_ledger_canister_id);
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

#[update]
async fn sweep_subaccount(
    subaccountid_hex: String,
    amount: f64,
    token_type: TokenType,
) -> Result<u64, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    let custodian_id = get_custodian_id().map_err(|e| {
        ic_cdk::println!("Error getting custodian ID: {}", e);
        Error { message: e }
    })?;

    let matching_subaccount = LIST_OF_SUBACCOUNTS.with(|subaccounts| {
        subaccounts
            .borrow()
            .iter()
            .find(|(_, subaccount)| {
                let subaccountid = to_subaccount_id(**subaccount);
                subaccountid.to_hex() == subaccountid_hex
            })
            .map(|(_, &subaccount)| subaccount)
    });

    let subaccount = matching_subaccount.ok_or_else(|| {
        ic_cdk::println!("Error: Subaccount with ID {} not found", subaccountid_hex);
        Error {
            message: "Subaccount not found".to_string(),
        }
    })?;

    // Convert amount to e8s, handling potential precision issues
    let amount_e8s = (amount * 100_000_000.0).round() as u64;

    // Check for potential overflow or underflow
    if amount_e8s == u64::MAX || amount < 0.0 {
        ic_cdk::println!(
            "Error: Invalid amount: {} (e8s: {}) - overflow or negative value",
            amount,
            amount_e8s
        );
        return Err(Error {
            message: "Invalid amount: overflow or negative value".to_string(),
        });
    }

    // Get the ledger canister ID for the token type
    let token_ledger_canister_id = match token_type {
        TokenType::ICP => MAINNET_LEDGER_CANISTER_ID,
        TokenType::CKUSDC => CKUSDC_LEDGER_CANISTER_ID,
        TokenType::CKUSDT => CKUSDT_LEDGER_CANISTER_ID,
    };

    let transfer_args = TransferArgs {
        memo: Memo(0),
        amount: Tokens::from_e8s(amount_e8s),
        fee: Tokens::from_e8s(10_000),
        from_subaccount: Some(subaccount),
        to: custodian_id,
        created_at_time: None,
    };

    InterCanisterCallManager::transfer(transfer_args, token_ledger_canister_id)
        .await
        .map_err(|e| Error { message: e })
}

#[update]
async fn set_sweep_failed(tx_hash_arg: String) -> Result<Vec<String>, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    let txs = TRANSACTIONS.with(|transactions_ref| {
        let transactions_borrow = transactions_ref.borrow();

        // Filter transactions where tx_hash == tx_hash_arg
        let filtered_transactions: Vec<_> = transactions_borrow
            .iter()
            .filter(|(_key, value)| value.tx_hash == tx_hash_arg)
            .collect();

        filtered_transactions
    });

    let mut results = Vec::<String>::new();

    for tx in txs.iter() {
        let status_update = update_status(&tx.1, SweepStatus::FailedToSweep);
        match status_update {
            Ok(_) => {
                results.push(format!(
                    "tx: {}, status_update: ok, new_status: {:?}",
                    tx.1.index,
                    SweepStatus::FailedToSweep
                ));
            }
            Err(e) => {
                results.push(format!("tx: {}, status_update: {}", tx.1.index, e.message));
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
    Ok("{{\"message\": \"Canister is operational\"}}".to_string())
}

#[query]
fn get_transaction_token_type(tx_hash: String) -> Result<TokenType, String> {
    authenticate()?;
    TRANSACTIONS.with(|transactions_ref| {
        let transactions_borrow = transactions_ref.borrow();
        for (_, tx) in transactions_borrow.iter() {
            if tx.tx_hash == tx_hash {
                return Ok(tx.token_type.clone());
            }
        }
        Err("Transaction not found".to_string())
    })
}

#[query]
fn get_registered_tokens() -> Result<Vec<(TokenType, String)>, String> {
    authenticate()?;
    TOKEN_LEDGER_PRINCIPALS.with(|tl| {
        let tl_borrow = tl.borrow();
        let mut result = Vec::new();
        for (_, (token_type, principal)) in tl_borrow.iter() {
            result.push((token_type.clone(), principal.to_string()));
        }
        Ok(result)
    })
}

fn get_token_ledger_canister_id(token_type: &TokenType) -> Principal {
    // First check in registered tokens
    let registered_id = TOKEN_LEDGER_PRINCIPALS.with(|tl| {
        let tl_borrow = tl.borrow();
        for (_, (registered_type, principal)) in tl_borrow.iter() {
            if registered_type == *token_type {
                return Some(principal);
            }
        }
        None
    });

    if let Some(id) = registered_id {
        return id;
    }

    // Fallback to hardcoded constants
    match token_type {
        TokenType::ICP => MAINNET_LEDGER_CANISTER_ID,
        TokenType::CKUSDC => CKUSDC_LEDGER_CANISTER_ID,
        TokenType::CKUSDT => CKUSDT_LEDGER_CANISTER_ID,
    }
}

#[update]
async fn register_token(
    token_type: TokenType,
    token_ledger_principal: String,
) -> Result<(), Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    let principal = Principal::from_text(token_ledger_principal).map_err(|e| {
        let error_msg = format!("Invalid principal: {}", e);
        ic_cdk::println!("Error: {}", error_msg);
        Error { message: error_msg }
    })?;

    // Store the token type and its ledger canister ID
    let token_id = match token_type {
        TokenType::ICP => 1,
        TokenType::CKUSDC => 2,
        TokenType::CKUSDT => 3,
    };

    TOKEN_LEDGER_PRINCIPALS.with(|tl| {
        let mut tl_mut = tl.borrow_mut();
        tl_mut.insert(token_id, (token_type, principal));
    });

    Ok(())
}

#[update]
async fn sweep_by_token_type(token_type: TokenType) -> Result<Vec<String>, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    let mut futures = Vec::new();

    // get relevant txs
    let txs = TRANSACTIONS.with(|transactions_ref| {
        let transactions_borrow = transactions_ref.borrow();

        ic_cdk::println!("transactions_len: {}", transactions_borrow.len());

        // Filter transactions where sweep_status == NotSwept and token_type matches
        let filtered_transactions: Vec<_> = transactions_borrow
            .iter()
            .filter(|(_key, value)| {
                value.sweep_status == SweepStatus::NotSwept && value.token_type == token_type
            })
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
            .skip(skip)
            .take(up_to_count)
            .cloned()
            .collect();
        result
    });

    for tx in txs.iter() {
        let (transfer_args, token_ledger_canister_id) = to_sweep_args(&tx.1)?;

        ic_cdk::println!(
            "transfer_args: {:?}, token_type: {:?}",
            transfer_args,
            tx.1.token_type
        );

        let future = InterCanisterCallManager::transfer(transfer_args, token_ledger_canister_id);
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

#[query]
fn convert_to_icrc_account(account_hex: String) -> Result<String, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    // Decode the account hex
    let account_bytes = match hex::decode(&account_hex) {
        Ok(bytes) => bytes,
        Err(_) => {
            return Err(Error {
                message: "Invalid hex encoding".to_string(),
            })
        }
    };

    if account_bytes.len() != 32 {
        return Err(Error {
            message: format!(
                "Invalid account length: {}, expected 32",
                account_bytes.len()
            ),
        });
    }

    // Try to find the nonce that generated this account
    let canister_id = CanisterApiManager::id();
    let nonce_count = nonce();

    for i in 0..nonce_count {
        let test_subaccount = to_subaccount(i);
        let test_account_id = to_subaccount_id(test_subaccount);

        if test_account_id.to_hex() == account_hex {
            // Found the matching nonce
            let icrc_account = IcrcAccount::from_principal_and_index(canister_id, i);
            return Ok(icrc_account.to_text());
        }
    }

    Err(Error {
        message: "Account not found in generated subaccounts".to_string(),
    })
}

#[query]
fn validate_icrc_account(icrc_account_text: String) -> Result<bool, Error> {
    authenticate().map_err(|e| {
        ic_cdk::println!("Authentication error: {}", e);
        Error { message: e }
    })?;

    match IcrcAccount::from_text(&icrc_account_text) {
        Ok(_) => Ok(true),
        Err(e) => Err(Error { message: e }),
    }
}

// Enable Candid export
ic_cdk::export_candid!();
