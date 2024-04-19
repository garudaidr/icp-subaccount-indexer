#[cfg(test)]
mod tests {
    use crate::types::*;
    use crate::*;

    impl TimerManagerTrait for TimerManager {
        fn set_timer(&self, _interval: std::time::Duration) -> TimerId {
            TimerId::default()
        }

        fn clear_timer(&self, _timer_id: TimerId) {}
    }

    // Setup function to add a predefined hash to the LIST_OF_SUBACCOUNTS for testing.
    fn setup() {
        let hash = [1u8; 32];
        let hash_u64 = hash_to_u64(&hash);
        let account_identifier = AccountIdentifier { hash: [1u8; 28] }; // Force a compatible hash.

        // Insert the test hash into LIST_OF_SUBACCOUNTS.
        LIST_OF_SUBACCOUNTS.with(|subaccounts| {
            subaccounts
                .borrow_mut()
                .insert(hash_u64, account_identifier);
        });
    }

    // Teardown function to clear the LIST_OF_SUBACCOUNTS after each test.
    fn teardown() {
        LIST_OF_SUBACCOUNTS.with(|subaccounts| {
            subaccounts.borrow_mut().clear();
        });
    }

    #[test]
    fn test_includes_hash_found() {
        setup();

        // Test hash that matches the setup.
        let test_hash = vec![1u8; 32];
        assert!(
            includes_hash(&test_hash),
            "includes_hash should return true for a hash present in the list"
        );

        teardown();
    }

    #[test]
    fn test_includes_hash_not_found() {
        setup();

        // Test hash that does not match any in the setup.
        let test_hash = vec![2u8; 32];
        assert!(
            !includes_hash(&test_hash),
            "includes_hash should return false for a hash not present in the list"
        );

        teardown();
    }

    #[test]
    fn test_includes_hash_invalid_length() {
        setup();

        // Test hash with an invalid length.
        let test_hash = vec![1u8; 31];
        assert!(
            !includes_hash(&test_hash),
            "includes_hash should return false for a hash with an incorrect length"
        );

        teardown();
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

    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn create_stored_transactions() {
        let index = 1;
        let memo = 12345;
        let icrc1_memo = Some(vec![1, 2, 3, 4]);
        let operation = Some(Operation::Mint(Mint {
            to: vec![],
            amount: E8s { e8s: 1000 },
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

        let stored_transaction = StoredTransactions::new(index, transaction);

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
        let principal = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();

        let stored_principal = StoredPrincipal::new(principal.clone());

        assert_eq!(stored_principal.get_principal(), Some(principal));
    }

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

    // Utility function to populate transactions for testing
    fn populate_transactions(count: u64, timestamp_nanos: Option<u64>) {
        let timestamp_nanos = match timestamp_nanos {
            Some(count) => count,
            None => 1000,
        };
        TRANSACTIONS.with(|transactions_ref| {
            let mut transactions_borrow = transactions_ref.borrow_mut();
            for i in 0..count {
                transactions_borrow.insert(
                    i,
                    StoredTransactions::new(
                        i,
                        Transaction {
                            memo: i,
                            icrc1_memo: None,
                            operation: None,
                            created_at_time: Timestamp { timestamp_nanos },
                        },
                    ),
                );
            }
        });
    }

    #[test]
    fn list_transactions_with_less_than_100_transactions() {
        populate_transactions(50, None); // Assuming this populates 50 transactions

        let transactions = list_transactions(None);
        assert_eq!(transactions.len(), 50);
    }

    #[test]
    fn list_transactions_with_more_than_100_transactions() {
        populate_transactions(150, None); // Assuming this populates 150 transactions

        let transactions = list_transactions(None);
        assert_eq!(transactions.len(), 100);
    }

    #[test]
    fn list_transactions_with_specific_number_transactions() {
        populate_transactions(150, None); // Assuming this populates 150 transactions

        let transactions = list_transactions(Some(80));
        assert_eq!(transactions.len(), 80);

        let transactions = list_transactions(Some(150));
        assert_eq!(transactions.len(), 150);
    }

    #[test]
    fn clear_transactions_with_specific_count() {
        populate_transactions(100, None);

        let cleared = clear_transactions(Some(50), None, None).unwrap();
        assert_eq!(cleared.len(), 50);
    }

    #[test]
    fn clear_transactions_with_specific_timestamp() {
        let nanos = 100000;

        let specific_timestamp = Timestamp::from_nanos(nanos);
        populate_transactions(100, None);

        let cleared = clear_transactions(None, None, Some(specific_timestamp)).unwrap();
        assert_eq!(cleared.len(), 0);
    }

    #[test]
    fn clear_transactions_with_similar_timestamp() {
        let nanos = 100000;

        let specific_timestamp = Timestamp::from_nanos(nanos);
        populate_transactions(100, Some(nanos));

        let cleared = clear_transactions(None, None, Some(specific_timestamp)).unwrap();
        assert_eq!(cleared.len(), 0);
    }

    #[test]
    fn clear_transactions_with_none_parameters() {
        populate_transactions(100, None);

        let cleared = clear_transactions(None, None, None).unwrap();
        assert_eq!(cleared.len(), 100); // Assuming no transactions are removed
    }

    #[test]
    fn clear_transactions_with_specific_index() {
        // Assuming each transaction has a unique index
        populate_transactions(100, None);

        // Clear transactions up to a specific index, excluding transactions with a higher index
        let cleared = clear_transactions(None, Some(50), None).unwrap();
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
        let cleared =
            clear_transactions(Some(80), None, Some(Timestamp::from_nanos(60000))).unwrap();
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
        let cleared = clear_transactions(None, None, Some(Timestamp::from_nanos(100000))).unwrap();
        // Depending on implementation, this may remove all transactions if they're considered "up to and including" the given timestamp
        assert!(
            cleared.is_empty(),
            "Expected all transactions to be cleared with a timestamp exactly matching the filter"
        );
    }

    #[test]
    fn clear_transactions_edge_cases() {
        populate_transactions(10, None);

        // Edge case 1: up_to_count is larger than the total transactions
        let cleared = clear_transactions(Some(50), None, None).unwrap();
        assert_eq!(cleared.len(), 0); // Assuming all transactions are cleared

        // Edge case 2: up_to_timestamp is before any stored transaction
        let early_timestamp = Timestamp::from_nanos(1); // Example early timestamp
        populate_transactions(10, None); // Repopulate transactions after they were all cleared
        let cleared = clear_transactions(None, None, Some(early_timestamp)).unwrap();
        assert_eq!(cleared.len(), 10); // Assuming no transactions are removed because all are after the timestamp
    }

    #[test]
    fn stress_test_for_large_number_of_transactions() {
        let large_number = 10_000; // Example large number of transactions
        populate_transactions(large_number, None);

        let transactions = list_transactions(None);
        assert_eq!(
            transactions.len(),
            100,
            "Expected to list only the last 100 transactions from a large dataset"
        );

        let cleared = clear_transactions(Some(large_number / 2), None, None).unwrap();
        // Expecting half of the transactions to be cleared and only up to 100 of the remaining half to be returned
        assert!(
            cleared.len() <= 100,
            "Expected a maximum of 100 transactions to be returned after clearing a large number"
        );
    }

    impl InterCanisterCallManagerTrait for InterCanisterCallManager {
        async fn query_blocks(
            &self,
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

        async fn icrc1_transfer(
            &self,
            _ledger_principal: Principal,
            _req: Icrc1TransferRequest,
        ) -> CallResult<(Icrc1TransferResponse,)> {
            // Example: A successful transfer response with a transaction ID
            let response = Icrc1TransferResponse::Ok(12345); // Example transaction ID
            Ok((response,))
        }
    }

    fn refund_setup() {
        // Setup principal
        let principal = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        PRINCIPAL.with(|principal_ref| {
            let stored_principal = StoredPrincipal::new(principal);
            let _ = principal_ref.borrow_mut().set(stored_principal);
        });

        let to = [1u8; 32];
        let from = [2u8; 32];
        let spender = [3u8; 32];

        LIST_OF_SUBACCOUNTS.with(|subaccounts| {
            let mut subaccounts_mut = subaccounts.borrow_mut();

            let account_id_hash = hash_to_u64(&to);
            ic_cdk::println!("to_hash_key: {}", account_id_hash);
            let account_id = AccountIdentifier { hash: [1u8; 28] }; // Force a compatible hash.
            subaccounts_mut.insert(account_id_hash, account_id);

            let account_id_hash = hash_to_u64(&from);
            ic_cdk::println!("from_hash_key: {}", account_id_hash);
            let account_id = AccountIdentifier { hash: [2u8; 28] }; // Force a compatible hash.
            subaccounts_mut.insert(account_id_hash, account_id);

            let account_id_hash = hash_to_u64(&spender);
            ic_cdk::println!("spender_hash_key: {}", account_id_hash);
            let account_id = AccountIdentifier { hash: [3u8; 28] }; // Force a compatible hash.
            subaccounts_mut.insert(account_id_hash, account_id);
        });

        // Setup transactions
        TRANSACTIONS.with(|t| {
            let mut transactions = t.borrow_mut();
            transactions.insert(
                1,
                StoredTransactions {
                    index: 1,
                    memo: 123,
                    icrc1_memo: None,
                    operation: Some(Operation::Transfer(Transfer {
                        to: to.into(),
                        fee: E8s { e8s: 100 },
                        from: from.into(),
                        amount: E8s { e8s: 1000 },
                        spender: Some(spender.into()),
                    })),
                    created_at_time: Timestamp { timestamp_nanos: 0 },
                },
            );
        });
    }

    fn refund_teardown() {
        PRINCIPAL.with(|principal_ref| {
            let _ = principal_ref.borrow_mut().set(StoredPrincipal::default());
        });
        TRANSACTIONS.with(|t| t.borrow_mut().clear_new());
    }

    #[test]
    fn test_refund_valid_transaction() {
        refund_setup();

        // Your refund test logic for a valid transaction
        let result = refund(1);
        assert!(
            result.is_ok(),
            "Refund should succeed for a valid transaction"
        );

        refund_teardown();
    }

    #[test]
    fn test_refund_unset_principal() {
        refund_setup();
        // Unset the principal to simulate the error condition
        PRINCIPAL.with(|principal_ref| {
            let _ = principal_ref.borrow_mut().set(StoredPrincipal::default());
        });

        let result = refund(1);
        assert!(
            result.is_err(),
            "Refund should fail if the principal is not set"
        );

        refund_teardown();
    }

    #[test]
    fn test_refund_nonexistent_transaction() {
        refund_setup();

        // Attempt to refund a transaction that doesn't exist
        let result = refund(999); // Assuming transaction with index 999 does not exist
        assert!(
            result.is_err(),
            "Refund should fail for a non-existent transaction"
        );

        refund_teardown();
    }
}
