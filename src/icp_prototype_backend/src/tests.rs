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

        let transactions = list_transactions();
        assert_eq!(transactions.len(), 50);
    }

    #[test]
    fn list_transactions_with_more_than_100_transactions() {
        populate_transactions(150, None); // Assuming this populates 150 transactions

        let transactions = list_transactions();
        assert_eq!(transactions.len(), 100);
    }

    #[test]
    fn clear_transactions_with_specific_count() {
        populate_transactions(100, None);

        let cleared = clear_transactions(Some(50), None).unwrap();
        assert_eq!(cleared.len(), 50);
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
    fn clear_transactions_edge_cases() {
        populate_transactions(10, None);

        // Edge case 1: up_to_count is larger than the total transactions
        let cleared = clear_transactions(Some(50), None).unwrap();
        assert_eq!(cleared.len(), 0); // Assuming all transactions are cleared

        // Edge case 2: up_to_timestamp is before any stored transaction
        let early_timestamp = Timestamp::from_nanos(1); // Example early timestamp
        populate_transactions(10, None); // Repopulate transactions after they were all cleared
        let cleared = clear_transactions(None, Some(early_timestamp)).unwrap();
        assert_eq!(cleared.len(), 10); // Assuming no transactions are removed because all are after the timestamp
    }
}
