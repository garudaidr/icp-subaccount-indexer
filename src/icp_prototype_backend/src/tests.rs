#[cfg(test)]
mod tests {
    use crate::types::*;
    use crate::*;
    use once_cell::sync::Lazy;
    use std::time::{SystemTime, UNIX_EPOCH};
    use tokio;

    impl TimerManagerTrait for TimerManager {
        fn set_timer(_interval: std::time::Duration) -> TimerId {
            TimerId::default()
        }

        fn clear_timer(_timer_id: TimerId) {}
    }

    static STATIC_PRINCIPAL: Lazy<Principal> =
        Lazy::new(|| Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap());

    // Setup function to add a predefined hash to the LIST_OF_SUBACCOUNTS for testing.
    fn setup() {
        // Setup CUSTODIAN_PRINCIPAL with a valid Principal
        let custodian_principal = STATIC_PRINCIPAL.clone();
        CUSTODIAN_PRINCIPAL.with(|cp| {
            let stored_custodian_principal = StoredPrincipal::new(custodian_principal.clone());
            let _ = cp.borrow_mut().set(stored_custodian_principal);
        });

        let subaccount = Subaccount([
            168, 200, 90, 30, 187, 129, 218, 133, 97, 52, 235, 109, 168, 55, 212, 238, 98, 209, 24,
            158, 242, 1, 194, 93, 181, 15, 4, 103, 49, 38, 186, 62,
        ]);
        let subaccountid: AccountIdentifier = to_subaccount_id(subaccount.clone());
        let account_id_hash = subaccountid.to_u64_hash();
        ic_cdk::println!("hash_key: {}", account_id_hash);

        // Insert the test hash into LIST_OF_SUBACCOUNTS.
        LIST_OF_SUBACCOUNTS.with(|list_ref| {
            list_ref.borrow_mut().insert(account_id_hash, subaccount);
        });
    }

    // Teardown function to clear the LIST_OF_SUBACCOUNTS after each test.
    fn teardown() {
        LIST_OF_SUBACCOUNTS.with(|subaccounts| {
            subaccounts.borrow_mut().clear();
        });
    }

    impl CanisterApiManagerTrait for CanisterApiManager {
        fn id() -> Principal {
            STATIC_PRINCIPAL.clone()
        }
    }

    #[test]
    fn test_get_interval_initial_value() {
        // Initially, the interval might be unset, or you can set a known value.
        let expected_seconds: u64 = 0; // Assuming 0 is the default or initial value.
        let _ = INTERVAL_IN_SECONDS.with(|ref_cell| ref_cell.borrow_mut().set(expected_seconds));
        assert_eq!(
            get_interval().unwrap(),
            expected_seconds,
            "The interval should initially match the expected default or set value."
        );
    }

    #[test]
    fn test_set_and_get_interval() {
        let new_seconds: u64 = 10;
        assert!(
            set_interval(new_seconds).is_ok(),
            "Setting the interval should succeed."
        );

        // Assert the interval was set correctly.
        assert_eq!(
            get_interval().unwrap(),
            new_seconds,
            "The interval retrieved by get_interval should match the newly set value."
        );
    }

    #[test]
    fn test_set_interval_clears_previous_timer() {
        // Set an initial interval and timer.
        let initial_seconds: u64 = 5;
        set_interval(initial_seconds).unwrap();

        // Set a new interval and timer, which should clear the previous one.
        let new_seconds: u64 = 10;
        set_interval(new_seconds).unwrap();

        // Verify the interval was updated.
        assert_eq!(
            get_interval().unwrap(),
            new_seconds,
            "The interval should be updated to the new value."
        );
    }

    #[test]
    fn create_stored_transactions() {
        // Setup CUSTODIAN_PRINCIPAL with a valid Principal
        let custodian_principal = STATIC_PRINCIPAL.clone();
        CUSTODIAN_PRINCIPAL.with(|cp| {
            let stored_custodian_principal = StoredPrincipal::new(custodian_principal.clone());
            let _ = cp.borrow_mut().set(stored_custodian_principal);
        });

        // Setup principal
        PRINCIPAL.with(|principal_ref| {
            let stored_principal = StoredPrincipal::new(*STATIC_PRINCIPAL);
            let _ = principal_ref.borrow_mut().set(stored_principal);
        });

        let spender_subaccount = nonce_to_subaccount(0);
        let spender_subaccountid: AccountIdentifier = to_subaccount_id(spender_subaccount.clone());

        let to_subaccount = nonce_to_subaccount(1);
        let to_subaccountid: AccountIdentifier = to_subaccount_id(to_subaccount.clone());

        let from_subaccount = nonce_to_subaccount(2);
        let from_subaccountid: AccountIdentifier = to_subaccount_id(from_subaccount.clone());

        LIST_OF_SUBACCOUNTS.with(|subaccounts| {
            let mut subaccounts_mut = subaccounts.borrow_mut();

            let account_id_hash = spender_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, spender_subaccount);

            let account_id_hash = to_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, to_subaccount);

            let account_id_hash = from_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, from_subaccount);
        });

        let index = 1;
        let memo = 12345;
        let icrc1_memo = Some(vec![1, 2, 3, 4]);
        let operation = Some(Operation::Transfer(Transfer {
            to: hex_str_to_vec(&to_subaccountid.to_hex()).unwrap(),
            fee: E8s { e8s: 100 },
            from: hex_str_to_vec(&from_subaccountid.to_hex()).unwrap(),
            amount: E8s { e8s: 10000 },
            spender: Some(hex_str_to_vec(&spender_subaccountid.to_hex()).unwrap()),
        }));
        let created_at_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos() as u64; // Simplified timestamp

        let transaction = Transaction {
            memo,
            icrc1_memo: icrc1_memo.clone(),
            operation: operation.clone(),
            created_at_time: Timestamp {
                timestamp_nanos: created_at_time,
            },
        };

        let hash = match hash_transaction(&transaction) {
            Ok(content) => content,
            Err(_) => "HASH-IS-NOT-AVAILABLE".to_string(),
        };
        let stored_transaction = StoredTransactions::new(index, transaction, hash);

        assert_eq!(stored_transaction.index, index);
        assert_eq!(stored_transaction.memo, memo);
        assert_eq!(stored_transaction.icrc1_memo, icrc1_memo);
        assert_eq!(stored_transaction.operation, operation);
        assert_eq!(
            stored_transaction.created_at_time,
            Timestamp {
                timestamp_nanos: created_at_time
            }
        );
    }

    #[test]
    fn create_and_retrieve_stored_principal() {
        let stored_principal = StoredPrincipal::new(STATIC_PRINCIPAL.clone());

        assert_eq!(stored_principal.get_principal(), Some(*STATIC_PRINCIPAL));
    }

    // Utility function to populate transactions for testing
    fn populate_transactions(count: u64, timestamp_nanos: Option<u64>) {
        // Setup CUSTODIAN_PRINCIPAL with a valid Principal
        let custodian_principal = STATIC_PRINCIPAL.clone();
        CUSTODIAN_PRINCIPAL.with(|cp| {
            let stored_custodian_principal = StoredPrincipal::new(custodian_principal.clone());
            let _ = cp.borrow_mut().set(stored_custodian_principal);
        });

        // Setup principal
        PRINCIPAL.with(|principal_ref| {
            let stored_principal = StoredPrincipal::new(*STATIC_PRINCIPAL);
            let _ = principal_ref.borrow_mut().set(stored_principal);
        });

        let spender_subaccount = nonce_to_subaccount(0);
        let spender_subaccountid: AccountIdentifier = to_subaccount_id(spender_subaccount.clone());

        let to_subaccount = nonce_to_subaccount(1);
        let to_subaccountid: AccountIdentifier = to_subaccount_id(to_subaccount.clone());

        let from_subaccount = nonce_to_subaccount(2);
        let from_subaccountid: AccountIdentifier = to_subaccount_id(from_subaccount.clone());

        LIST_OF_SUBACCOUNTS.with(|subaccounts| {
            let mut subaccounts_mut = subaccounts.borrow_mut();

            let account_id_hash = spender_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, spender_subaccount);

            let account_id_hash = to_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, to_subaccount);

            let account_id_hash = from_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, from_subaccount);
        });

        let timestamp_nanos = match timestamp_nanos {
            Some(count) => count,
            None => 1000,
        };
        TRANSACTIONS.with(|transactions_ref| {
            let mut transactions_borrow = transactions_ref.borrow_mut();
            for i in 1..=count {
                let transaction = Transaction {
                    memo: i,
                    icrc1_memo: None,
                    operation: Some(Operation::Transfer(Transfer {
                        to: hex_str_to_vec(&to_subaccountid.to_hex()).unwrap(),
                        fee: E8s { e8s: 100 },
                        from: hex_str_to_vec(&from_subaccountid.to_hex()).unwrap(),
                        amount: E8s { e8s: 10000 },
                        spender: Some(hex_str_to_vec(&spender_subaccountid.to_hex()).unwrap()),
                    })),
                    created_at_time: Timestamp { timestamp_nanos },
                };

                let hash = match hash_transaction(&transaction) {
                    Ok(content) => content,
                    Err(_) => "HASH-IS-NOT-AVAILABLE".to_string(),
                };

                transactions_borrow.insert(i, StoredTransactions::new(i, transaction, hash));
            }
        });

        NEXT_BLOCK.with(|next_block_ref| {
            let _ = next_block_ref.borrow_mut().set(count);
        });
    }

    #[test]
    fn list_transactions_with_less_than_100_transactions() {
        populate_transactions(50, None); // Assuming this populates 50 transactions

        let transactions = list_transactions(None);
        assert_eq!(transactions.unwrap().len(), 50);
    }

    #[test]
    fn list_transactions_with_more_than_100_transactions() {
        populate_transactions(150, None); // Assuming this populates 150 transactions

        let transactions = list_transactions(None);
        assert_eq!(transactions.unwrap().len(), 100);
    }

    #[test]
    fn list_transactions_with_specific_number_transactions() {
        populate_transactions(150, None); // Assuming this populates 150 transactions

        let transactions = list_transactions(Some(80));
        assert_eq!(transactions.unwrap().len(), 80);

        let transactions = list_transactions(Some(150));
        assert_eq!(transactions.unwrap().len(), 150);
    }

    #[test]
    fn clear_transactions_with_specific_timestamp() {
        let nanos = 100000;

        let specific_timestamp = Timestamp::from_nanos(nanos);
        populate_transactions(100, None);

        let cleared = clear_transactions(None, Some(specific_timestamp)).unwrap();
        assert_eq!(cleared.len(), 0);
    }

    #[test]
    fn clear_transactions_with_similar_timestamp() {
        let nanos = 100000;

        let specific_timestamp = Timestamp::from_nanos(nanos);
        populate_transactions(100, Some(nanos));

        let cleared = clear_transactions(None, Some(specific_timestamp)).unwrap();
        assert_eq!(cleared.len(), 0);
    }

    #[test]
    fn clear_transactions_with_none_parameters() {
        populate_transactions(100, None);

        let cleared = clear_transactions(None, None).unwrap();
        assert_eq!(cleared.len(), 100); // Assuming no transactions are removed
    }

    #[test]
    fn clear_transactions_with_specific_index() {
        // Assuming each transaction has a unique index
        populate_transactions(100, None);

        // Clear transactions up to a specific index, excluding transactions with a higher index
        let cleared = clear_transactions(Some(50), None).unwrap();
        assert_eq!(
            cleared.len(),
            50,
            "Expected 50 transactions to remain after clearing up to index 50"
        );
    }

    #[test]
    fn clear_transactions_with_multiple_criteria() {
        populate_transactions(100, Some(50000)); // Populate 100 transactions, all with the same timestamp for simplicity

        // Clear transactions with a count less than 80 and a timestamp less than 60000 nanoseconds
        let cleared = clear_transactions(Some(80), Some(Timestamp::from_nanos(60000))).unwrap();
        // This assumes that the criteria are combined with an OR logic, not AND
        assert_eq!(
            cleared.len(),
            0,
            "Expected 0 transactions to remain after applying multiple clear criteria"
        );
    }

    #[test]
    fn clear_transactions_at_exact_timestamp() {
        populate_transactions(100, Some(100000)); // Populate transactions with a specific timestamp

        // Clear transactions with a timestamp exactly equal to one of the transactions' timestamps
        let cleared = clear_transactions(None, Some(Timestamp::from_nanos(100000))).unwrap();
        // Depending on implementation, this may remove all transactions if they're considered "up to and including" the given timestamp
        assert!(
            cleared.is_empty(),
            "Expected all transactions to be cleared with a timestamp exactly matching the filter"
        );
    }

    #[test]
    fn clear_transactions_edge_cases() {
        populate_transactions(10, None);

        // Edge case 1: up_to_index is larger than the total transactions
        let cleared = clear_transactions(Some(50), None).unwrap();
        assert_eq!(cleared.len(), 0); // Assuming all transactions are cleared

        // Edge case 2: up_to_timestamp is before any stored transaction
        let early_timestamp = Timestamp::from_nanos(1); // Example early timestamp
        populate_transactions(10, None); // Repopulate transactions after they were all cleared
        let cleared = clear_transactions(None, Some(early_timestamp)).unwrap();
        assert_eq!(cleared.len(), 10); // Assuming no transactions are removed because all are after the timestamp
    }

    #[test]
    fn stress_test_for_large_number_of_transactions() {
        let large_number = 10_000; // Example large number of transactions
        populate_transactions(large_number, None);

        let transactions = list_transactions(None);
        assert_eq!(
            transactions.unwrap().len(),
            100,
            "Expected to list only the last 100 transactions from a large dataset"
        );

        let cleared = clear_transactions(Some(large_number / 2), None).unwrap();
        // Expecting half of the transactions to be cleared
        assert_eq!(
            cleared.len(),
            (large_number / 2) as usize,
            "Expected a maximum of 100 transactions to be returned after clearing a large number"
        );
    }

    impl InterCanisterCallManagerTrait for InterCanisterCallManager {
        async fn query_blocks(
            _ledger_principal: Principal,
            _req: QueryBlocksRequest,
        ) -> CallResult<(QueryBlocksResponse,)> {
            let response = QueryBlocksResponse {
                certificate: None,       // Assuming no certificate for this example
                blocks: vec![],          // Assuming no blocks for this example
                chain_length: 0,         // Example value
                first_block_index: 0,    // Example value
                archived_blocks: vec![], // Assuming no archived blocks for this example
            };
            Ok((response,))
        }

        async fn transfer(_args: TransferArgs) -> Result<BlockIndex, String> {
            Ok(1)
        }
    }

    impl IcCdkSpawnManagerTrait for IcCdkSpawnManager {
        fn run<F: 'static + Future<Output = ()>>(_future: F) {}
    }

    fn nonce_to_subaccount(nonce: u32) -> Subaccount {
        let mut subaccount = Subaccount([0; 32]);
        let nonce_bytes = nonce.to_be_bytes(); // Converts u32 to an array of 4 bytes
        subaccount.0[32 - nonce_bytes.len()..].copy_from_slice(&nonce_bytes); // Aligns the bytes at the end of the array
        subaccount
    }

    fn hex_str_to_vec(hex_str: &str) -> Result<Vec<u8>, std::num::ParseIntError> {
        (0..hex_str.len())
            .step_by(2)
            .map(|i| u8::from_str_radix(&hex_str[i..i + 2], 16))
            .collect()
    }

    fn refund_setup() {
        // Setup CUSTODIAN_PRINCIPAL with a valid Principal
        let custodian_principal = STATIC_PRINCIPAL.clone();
        CUSTODIAN_PRINCIPAL.with(|cp| {
            let stored_custodian_principal = StoredPrincipal::new(custodian_principal.clone());
            let _ = cp.borrow_mut().set(stored_custodian_principal);
        });

        // Setup principal
        PRINCIPAL.with(|principal_ref| {
            let stored_principal = StoredPrincipal::new(*STATIC_PRINCIPAL);
            let _ = principal_ref.borrow_mut().set(stored_principal);
        });

        let spender_subaccount = nonce_to_subaccount(0);
        let spender_subaccountid: AccountIdentifier = to_subaccount_id(spender_subaccount.clone());

        let to_subaccount = nonce_to_subaccount(1);
        let to_subaccountid: AccountIdentifier = to_subaccount_id(to_subaccount.clone());

        let from_subaccount = nonce_to_subaccount(2);
        let from_subaccountid: AccountIdentifier = to_subaccount_id(from_subaccount.clone());

        LIST_OF_SUBACCOUNTS.with(|subaccounts| {
            let mut subaccounts_mut = subaccounts.borrow_mut();

            let account_id_hash = spender_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, spender_subaccount);

            let account_id_hash = to_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, to_subaccount);

            let account_id_hash = from_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, from_subaccount);
        });

        // Setup transactions
        TRANSACTIONS.with(|t| {
            let mut transactions = t.borrow_mut();

            let transaction = Transaction {
                memo: 123,
                icrc1_memo: None,
                operation: Some(Operation::Transfer(Transfer {
                    to: hex_str_to_vec(&to_subaccountid.to_hex()).unwrap(),
                    fee: E8s { e8s: 100 },
                    from: hex_str_to_vec(&from_subaccountid.to_hex()).unwrap(),
                    amount: E8s { e8s: 10000 },
                    spender: Some(hex_str_to_vec(&spender_subaccountid.to_hex()).unwrap()),
                })),
                created_at_time: Timestamp { timestamp_nanos: 0 },
            };
            let hash = match hash_transaction(&transaction) {
                Ok(content) => content,
                Err(_) => "HASH-IS-NOT-AVAILABLE".to_string(),
            };
            transactions.insert(1, StoredTransactions::new(1, transaction, hash));
        });
    }

    fn refund_teardown() {
        PRINCIPAL.with(|principal_ref| {
            let _ = principal_ref.borrow_mut().set(StoredPrincipal::default());
        });
        TRANSACTIONS.with(|t| t.borrow_mut().clear_new());
    }

    #[tokio::test]
    async fn test_refund_valid_transaction() {
        refund_setup();

        // Your refund test logic for a valid transaction
        let result = refund(1);
        assert!(
            result.await.is_ok(),
            "Refund should succeed for a valid transaction"
        );

        refund_teardown();
    }

    #[tokio::test]
    async fn test_refund_nonexistent_transaction() {
        refund_setup();

        // Attempt to refund a transaction that doesn't exist
        let result = refund(999); // Assuming transaction with index 999 does not exist
        assert!(
            result.await.is_err(),
            "Refund should fail for a non-existent transaction"
        );

        refund_teardown();
    }

    fn setup_sweep_environment() {
        // Setup CUSTODIAN_PRINCIPAL with a valid Principal
        let custodian_principal = STATIC_PRINCIPAL.clone();
        CUSTODIAN_PRINCIPAL.with(|cp| {
            let stored_custodian_principal = StoredPrincipal::new(custodian_principal.clone());
            let _ = cp.borrow_mut().set(stored_custodian_principal);
        });

        // Setup PRINCIPAL with a valid Principal
        PRINCIPAL.with(|p| {
            let stored_principal = StoredPrincipal::new(STATIC_PRINCIPAL.clone());
            let _ = p.borrow_mut().set(stored_principal);
        });

        let spender_subaccount = nonce_to_subaccount(0);
        let spender_subaccountid: AccountIdentifier = to_subaccount_id(spender_subaccount.clone());

        let to_subaccount = nonce_to_subaccount(1);
        let to_subaccountid: AccountIdentifier = to_subaccount_id(to_subaccount.clone());

        let from_subaccount = nonce_to_subaccount(2);
        let from_subaccountid: AccountIdentifier = to_subaccount_id(from_subaccount.clone());

        LIST_OF_SUBACCOUNTS.with(|subaccounts| {
            let mut subaccounts_mut = subaccounts.borrow_mut();

            let account_id_hash = spender_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, spender_subaccount);

            let account_id_hash = to_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, to_subaccount);

            let account_id_hash = from_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, from_subaccount);
        });

        // Populate TRANSACTIONS with a mixture of swept and not swept transactions
        TRANSACTIONS.with(|t| t.borrow_mut().clear_new());

        TRANSACTIONS.with(|t| {
            let mut transactions = t.borrow_mut();

            let transaction = Transaction {
                memo: 100,
                icrc1_memo: None,
                operation: Some(Operation::Transfer(Transfer {
                    to: hex_str_to_vec(&to_subaccountid.to_hex()).unwrap(),
                    fee: E8s { e8s: 100 },
                    from: hex_str_to_vec(&from_subaccountid.to_hex()).unwrap(),
                    amount: E8s { e8s: 10000 },
                    spender: Some(hex_str_to_vec(&spender_subaccountid.to_hex()).unwrap()),
                })),
                created_at_time: Timestamp { timestamp_nanos: 0 },
            };
            let hash = match hash_transaction(&transaction) {
                Ok(content) => content,
                Err(_) => "HASH-IS-NOT-AVAILABLE".to_string(),
            };
            transactions.insert(1, StoredTransactions::new(1, transaction, hash));

            let transaction = Transaction {
                memo: 101,
                icrc1_memo: None,
                operation: Some(Operation::Transfer(Transfer {
                    to: hex_str_to_vec(&to_subaccountid.to_hex()).unwrap(),
                    fee: E8s { e8s: 100 },
                    from: hex_str_to_vec(&from_subaccountid.to_hex()).unwrap(),
                    amount: E8s { e8s: 10000 },
                    spender: Some(hex_str_to_vec(&spender_subaccountid.to_hex()).unwrap()),
                })),
                created_at_time: Timestamp { timestamp_nanos: 0 },
            };
            let hash = match hash_transaction(&transaction) {
                Ok(content) => content,
                Err(_) => "HASH-IS-NOT-AVAILABLE".to_string(),
            };
            transactions.insert(2, StoredTransactions::new(2, transaction, hash));
        });
    }

    fn teardown_sweep_environment() {
        TRANSACTIONS.with(|t| t.borrow_mut().clear_new());
        let _ = PRINCIPAL.with(|p| p.borrow_mut().set(StoredPrincipal::default()));
        let _ = CUSTODIAN_PRINCIPAL.with(|cp| cp.borrow_mut().set(StoredPrincipal::default()));
    }

    #[tokio::test]
    async fn test_sweep_successful_sweep() {
        setup_sweep_environment();

        let result = sweep();
        assert!(result.await.is_ok(), "Sweeping should be successful.");

        TRANSACTIONS.with(|t| {
            assert!(
                t.borrow()
                    .iter()
                    .all(|(_, tx)| tx.sweep_status == SweepStatus::Swept),
                "All transactions should be marked as Swept."
            );
        });

        teardown_sweep_environment();
    }

    #[tokio::test]
    async fn test_sweep_no_custodian_principal_set() {
        setup_sweep_environment();
        // Unset the custodian principal
        let _ = CUSTODIAN_PRINCIPAL.with(|cp| cp.borrow_mut().set(StoredPrincipal::default()));

        let result = sweep();
        assert!(
            result.await.is_err(),
            "Sweeping should fail without a set custodian principal."
        );

        teardown_sweep_environment();
    }

    #[tokio::test]
    async fn test_sweep_no_transactions_to_sweep() {
        setup_sweep_environment();
        // Clear transactions to simulate no transactions to sweep
        TRANSACTIONS.with(|t| t.borrow_mut().clear_new());

        let result = sweep();
        assert!(
            result.await.is_ok(),
            "Sweeping should succeed even with no transactions to sweep."
        );

        teardown_sweep_environment();
    }
}
