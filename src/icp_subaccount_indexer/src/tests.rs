#[cfg(test)]
mod tests {
    use crate::types::*;
    use crate::*;
    use icrc_ledger_types::icrc1::transfer::TransferArg;
    use once_cell::sync::Lazy;

    impl TimerManagerTrait for TimerManager {
        fn set_timer(_interval: std::time::Duration) -> TimerId {
            TimerId::default()
        }

        fn clear_timer(_timer_id: TimerId) {}
    }

    static STATIC_PRINCIPAL: Lazy<std::sync::Mutex<Principal>> = Lazy::new(|| {
        std::sync::Mutex::new(Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap())
    });

    impl CanisterApiManagerTrait for CanisterApiManager {
        fn id() -> Principal {
            *STATIC_PRINCIPAL.lock().unwrap()
        }
    }

    // Happy path implementation - returns success
    #[cfg(feature = "happy_path")]
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

        async fn transfer(
            _args: TransferArgs,
            _token_ledger_canister_id: Principal,
        ) -> Result<BlockIndex, String> {
            Ok(1)
        }

        async fn icrc1_transfer(
            _args: TransferArg,
            _token_ledger_canister_id: Principal,
        ) -> Result<candid::Nat, String> {
            Ok(candid::Nat::from(1u64))
        }
    }

    // Sad path implementation - returns errors
    #[cfg(feature = "sad_path")]
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

        async fn transfer(
            _args: TransferArgs,
            _token_ledger_canister_id: Principal,
        ) -> Result<BlockIndex, String> {
            Err("transfer failed".to_string())
        }

        async fn icrc1_transfer(
            _args: TransferArg,
            _token_ledger_canister_id: Principal,
        ) -> Result<candid::Nat, String> {
            Err("transfer failed".to_string())
        }
    }

    // Default test implementation when no features are enabled
    #[cfg(not(any(feature = "happy_path", feature = "sad_path")))]
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

        async fn transfer(
            _args: TransferArgs,
            _token_ledger_canister_id: Principal,
        ) -> Result<BlockIndex, String> {
            Ok(1)
        }

        async fn icrc1_transfer(
            _args: TransferArg,
            _token_ledger_canister_id: Principal,
        ) -> Result<candid::Nat, String> {
            Ok(candid::Nat::from(1u64))
        }
    }

    fn setup_principals() -> (AccountIdentifier, AccountIdentifier, AccountIdentifier) {
        // Setup CUSTODIAN_PRINCIPAL with a valid Principal
        let custodian_principal = *STATIC_PRINCIPAL.lock().unwrap();
        CUSTODIAN_PRINCIPAL.with(|cp| {
            let stored_custodian_principal = StoredPrincipal::new(custodian_principal);
            let _ = cp.borrow_mut().set(stored_custodian_principal);
        });

        // Setup principal
        PRINCIPAL.with(|principal_ref| {
            let stored_principal = StoredPrincipal::new(*STATIC_PRINCIPAL.lock().unwrap());
            let _ = principal_ref.borrow_mut().set(stored_principal);
        });

        let spender_subaccount = nonce_to_subaccount(0);
        let spender_subaccountid: AccountIdentifier = to_subaccount_id(spender_subaccount);

        let to_subaccount = nonce_to_subaccount(1);
        let to_subaccountid: AccountIdentifier = to_subaccount_id(to_subaccount);

        let from_subaccount = nonce_to_subaccount(2);
        let from_subaccountid: AccountIdentifier = to_subaccount_id(from_subaccount);

        LIST_OF_SUBACCOUNTS.with(|subaccounts| {
            let mut subaccounts_mut = subaccounts.borrow_mut();

            let account_id_hash = spender_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, spender_subaccount);

            let account_id_hash = to_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, to_subaccount);

            let account_id_hash = from_subaccountid.to_u64_hash();
            subaccounts_mut.insert(account_id_hash, from_subaccount);
        });

        (spender_subaccountid, to_subaccountid, from_subaccountid)
    }

    // Utility function to populate transactions for testing
    fn populate_transactions(count: u64, timestamp_nanos: Option<u64>) {
        let (spender_subaccountid, to_subaccountid, from_subaccountid) = setup_principals();

        let timestamp_nanos = timestamp_nanos.unwrap_or(1000);
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

                transactions_borrow.insert(
                    i,
                    StoredTransactions::new(
                        i,
                        transaction,
                        hash,
                        TokenType::ICP,
                        *STATIC_PRINCIPAL.lock().unwrap(),
                    ),
                );
            }
        });

        NEXT_BLOCK.with(|next_block_ref| {
            let _ = next_block_ref.borrow_mut().set(count);
        });
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
        let (spender_subaccountid, to_subaccountid, from_subaccountid) = setup_principals();

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
            transactions.insert(
                1,
                StoredTransactions::new(
                    1,
                    transaction,
                    hash,
                    TokenType::ICP,
                    *STATIC_PRINCIPAL.lock().unwrap(),
                ),
            );
        });
    }

    fn refund_teardown() {
        PRINCIPAL.with(|principal_ref| {
            let _ = principal_ref.borrow_mut().set(StoredPrincipal::default());
        });
        TRANSACTIONS.with(|t| t.borrow_mut().clear_new());
    }

    fn setup_sweep_environment() -> Vec<String> {
        let (spender_subaccountid, to_subaccountid, from_subaccountid) = setup_principals();

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
            let first_hash = match hash_transaction(&transaction) {
                Ok(content) => content,
                Err(_) => "HASH-IS-NOT-AVAILABLE".to_string(),
            };
            transactions.insert(
                1,
                StoredTransactions::new(
                    1,
                    transaction,
                    first_hash.clone(),
                    TokenType::ICP,
                    *STATIC_PRINCIPAL.lock().unwrap(),
                ),
            );

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
            let second_hash = match hash_transaction(&transaction) {
                Ok(content) => content,
                Err(_) => "HASH-IS-NOT-AVAILABLE".to_string(),
            };
            transactions.insert(
                2,
                StoredTransactions::new(
                    2,
                    transaction,
                    second_hash.clone(),
                    TokenType::ICP,
                    *STATIC_PRINCIPAL.lock().unwrap(),
                ),
            );

            let transaction = Transaction {
                memo: 102,
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
            let third_hash = match hash_transaction(&transaction) {
                Ok(content) => content,
                Err(_) => "HASH-IS-NOT-AVAILABLE".to_string(),
            };
            transactions.insert(
                3,
                StoredTransactions::new(
                    3,
                    transaction,
                    third_hash.clone(),
                    TokenType::ICP,
                    *STATIC_PRINCIPAL.lock().unwrap(),
                ),
            );

            vec![first_hash, second_hash, third_hash]
        })
    }

    fn teardown_sweep_environment() {
        TRANSACTIONS.with(|t| t.borrow_mut().clear_new());
        let _ = PRINCIPAL.with(|p| p.borrow_mut().set(StoredPrincipal::default()));
        let _ = CUSTODIAN_PRINCIPAL.with(|cp| cp.borrow_mut().set(StoredPrincipal::default()));
    }

    #[cfg(feature = "happy_path")]
    mod happy_path_tests {
        use super::*;
        use std::time::{SystemTime, UNIX_EPOCH};

        // Test functions for ICRC-1 account functionality
        #[test]
        fn test_icrc_account_creation() {
            let principal = *STATIC_PRINCIPAL.lock().unwrap();
            let nonce = 42u32;

            // Create ICRC account from principal and index
            let icrc_account = IcrcAccount::from_principal_and_index(principal, nonce);

            // Verify the account fields
            assert_eq!(icrc_account.owner, principal);
            assert!(icrc_account.subaccount.is_some());

            // Verify that the subaccount has the correct nonce at the end
            let subaccount = icrc_account.subaccount.unwrap();
            let mut expected_subaccount = [0u8; 32];
            let nonce_bytes = nonce.to_be_bytes();
            expected_subaccount[32 - nonce_bytes.len()..].copy_from_slice(&nonce_bytes);
            assert_eq!(subaccount, expected_subaccount);
        }

        #[test]
        fn test_icrc_account_textual_encoding_default_subaccount() {
            let principal = *STATIC_PRINCIPAL.lock().unwrap();

            // Create an account with default subaccount (all zeros)
            let icrc_account = IcrcAccount::new(principal, Some([0u8; 32]));
            let text = icrc_account.to_text();

            // For default subaccount, text should just be the principal text
            assert_eq!(text, principal.to_text());

            // Create an account with no subaccount
            let icrc_account = IcrcAccount::new(principal, None);
            let text = icrc_account.to_text();

            // For no subaccount, text should also just be the principal text
            assert_eq!(text, principal.to_text());
        }

        #[test]
        fn test_icrc_account_textual_encoding_non_default_subaccount() {
            let principal = *STATIC_PRINCIPAL.lock().unwrap();
            let nonce = 42u32;

            // Create an ICRC account with a non-default subaccount
            let icrc_account = IcrcAccount::from_principal_and_index(principal, nonce);
            let text = icrc_account.to_text();

            // Text should follow the format: <principal>-<checksum>.<subaccount_hex>
            // Verify format with the appropriate splits
            let parts: Vec<&str> = text.split('.').collect();
            assert_eq!(parts.len(), 2, "Text should contain exactly one period");

            let prefix_parts: Vec<&str> = parts[0].split('-').collect();
            assert!(
                prefix_parts.len() >= 2,
                "Text should contain at least one dash"
            );

            // Verify the principal part
            let principal_text = prefix_parts[..prefix_parts.len() - 1].join("-");
            assert_eq!(principal_text, principal.to_text());

            // Verify the checksum and subaccount are not empty
            let checksum = prefix_parts[prefix_parts.len() - 1];
            assert!(!checksum.is_empty(), "Checksum should not be empty");

            let subaccount_hex = parts[1];
            assert!(
                !subaccount_hex.is_empty(),
                "Subaccount hex should not be empty"
            );

            // Verify that our textual encoding can be parsed back correctly
            let parsed_account = IcrcAccount::from_text(&text).unwrap();
            assert_eq!(parsed_account.owner, icrc_account.owner);
            assert_eq!(parsed_account.subaccount, icrc_account.subaccount);
        }

        #[test]
        fn test_get_icrc_account_endpoint() {
            // For this test, we'll simply validate that the function returns a valid
            // ICRC account text representation that can be parsed back, rather than
            // trying to match the exact string format which depends on the principal

            // Set up a nonce
            let nonce = 42;
            LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
                let _ = nonce_ref.borrow_mut().set(nonce + 1); // Set higher than the nonce we'll use
            });

            // Create a subaccount for this nonce
            let subaccount = to_subaccount(nonce);
            let subaccountid = to_subaccount_id(subaccount);
            let account_id_hash = subaccountid.to_u64_hash();

            LIST_OF_SUBACCOUNTS.with(|list_ref| {
                list_ref.borrow_mut().insert(account_id_hash, subaccount);
            });

            // Call the function we're testing
            let result = get_icrc_account(nonce);
            assert!(result.is_ok(), "get_icrc_account should succeed");

            // Get the resulting text
            let result_text = result.unwrap();

            // Parse the account text to verify it's valid
            let parsed_account = IcrcAccount::from_text(&result_text);
            assert!(
                parsed_account.is_ok(),
                "Result should be a valid ICRC account text"
            );

            // Verify that the parsed account has the expected nonce encoded in subaccount
            let parsed = parsed_account.unwrap();

            // Create a subaccount with the expected nonce
            let mut expected_subaccount = [0u8; 32];
            let nonce_bytes = nonce.to_be_bytes();
            expected_subaccount[32 - nonce_bytes.len()..].copy_from_slice(&nonce_bytes);

            // Check the parsed account's subaccount
            match parsed.subaccount {
                Some(subaccount) => {
                    assert_eq!(
                        subaccount, expected_subaccount,
                        "Subaccount bytes should match the expected nonce"
                    );
                }
                None => {
                    // If the subaccount is None, then nonce should be 0
                    assert_eq!(nonce, 0, "If subaccount is None, nonce should be 0");
                }
            }
        }

        #[test]
        fn test_validate_icrc_account() {
            // Setup
            let principal = *STATIC_PRINCIPAL.lock().unwrap();
            let nonce = 42u32;

            // Create a valid ICRC account
            let icrc_account = IcrcAccount::from_principal_and_index(principal, nonce);
            let valid_text = icrc_account.to_text();

            // Test validation of valid account
            let result = validate_icrc_account(valid_text);
            assert!(
                result.is_ok(),
                "Valid ICRC account should validate successfully"
            );
            assert!(result.unwrap(), "Valid ICRC account should return true");

            // Test validation of just a principal (default account)
            let result = validate_icrc_account(principal.to_text());
            assert!(
                result.is_ok(),
                "Principal-only account should validate successfully"
            );
            assert!(result.unwrap(), "Principal-only account should return true");

            // Create an account and directly validate by parsing
            let mut subaccount = [0u8; 32];
            subaccount[31] = 123; // Simple non-zero subaccount
            let account = IcrcAccount::new(principal, Some(subaccount));
            let account_text = account.to_text();

            // Parse it back
            let parsed = IcrcAccount::from_text(&account_text);
            assert!(parsed.is_ok(), "Should parse a properly formatted account");
            let parsed_account = parsed.unwrap();

            // Validate the parsed account
            assert_eq!(parsed_account.owner, principal, "Owner should match");
            assert_eq!(
                parsed_account.subaccount.unwrap()[31],
                123,
                "Subaccount should match"
            );
        }

        fn the_nonce() -> u32 {
            LAST_SUBACCOUNT_NONCE.with(|nonce_ref| *nonce_ref.borrow().get())
        }

        #[test]
        fn test_canister_id_matches() {
            // Check that the slice-based constants match the text versions
            let text_ckusdc = Principal::from_text("xevnm-gaaaa-aaaar-qafnq-cai").unwrap();
            let text_ckusdt = Principal::from_text("cngnf-vqaaa-aaaar-qag4q-cai").unwrap();

            assert_eq!(CKUSDC_LEDGER_CANISTER_ID, text_ckusdc, "CKUSDC ID mismatch");
            assert_eq!(CKUSDT_LEDGER_CANISTER_ID, text_ckusdt, "CKUSDT ID mismatch");
        }

        #[test]
        fn test_add_subaccount_for_icrc1_tokens() {
            // Save original principal to restore later
            let original_principal = CanisterApiManager::id();

            // Test for ckUSDC
            {
                // Mock the CanisterApiManager
                *STATIC_PRINCIPAL.lock().unwrap() = original_principal;

                // Get current nonce
                let nonce = the_nonce();

                // Call add_subaccount with CKUSDC token type
                let result = add_subaccount(Some(TokenType::CKUSDC));
                assert!(result.is_ok(), "add_subaccount should succeed for ckUSDC");

                // Verify the result is in ICRC-1 format
                let icrc_account = IcrcAccount::from_principal_and_index(original_principal, nonce);
                let expected_text = icrc_account.to_text();
                assert_eq!(
                    result.unwrap(),
                    expected_text,
                    "Result should be ICRC-1 format for ckUSDC"
                );
            }

            // Test for ckUSDT
            {
                // Get current nonce
                let nonce = the_nonce();

                // Call add_subaccount with CKUSDT token type
                let result = add_subaccount(Some(TokenType::CKUSDT));
                assert!(result.is_ok(), "add_subaccount should succeed for ckUSDT");

                // Verify the result is in ICRC-1 format
                let icrc_account = IcrcAccount::from_principal_and_index(original_principal, nonce);
                let expected_text = icrc_account.to_text();
                assert_eq!(
                    result.unwrap(),
                    expected_text,
                    "Result should be ICRC-1 format for ckUSDT"
                );
            }
        }

        #[test]
        fn test_get_subaccountid_for_icrc1_tokens() {
            // Save original principal to restore later
            let original_principal = *STATIC_PRINCIPAL.lock().unwrap();

            // Use a fixed nonce for testing
            let nonce = 42;

            // Make sure the nonce is valid (less than max nonce)
            LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
                let _ = nonce_ref.borrow_mut().set(nonce + 1);
            });

            // Create and register the subaccount
            let subaccount = to_subaccount(nonce);
            let subaccountid = to_subaccount_id(subaccount);
            let account_id_hash = subaccountid.to_u64_hash();

            LIST_OF_SUBACCOUNTS.with(|list_ref| {
                list_ref.borrow_mut().insert(account_id_hash, subaccount);
            });

            // Now call the function we're testing with CKUSDC token type
            let result = get_subaccountid(nonce, Some(TokenType::CKUSDC));
            assert!(
                result.is_ok(),
                "get_subaccountid should succeed for CKUSDC token type"
            );

            // Get the text result
            let result_str = result.unwrap();

            // Create the expected account format for comparison
            let expected_account = IcrcAccount::from_principal_and_index(original_principal, nonce);
            let expected_text = expected_account.to_text();
            assert_eq!(
                result_str, expected_text,
                "Result should match expected ICRC account text"
            );

            // Test with CKUSDT token type
            let result = get_subaccountid(nonce, Some(TokenType::CKUSDT));
            assert!(
                result.is_ok(),
                "get_subaccountid should succeed for CKUSDT token type"
            );

            // Get the text result
            let result_str = result.unwrap();

            // Should also match the same expected text since the principal is the same
            assert_eq!(
                result_str, expected_text,
                "Result should match expected ICRC account text"
            );

            // Test with ICP token type (which should return hex)
            let result = get_subaccountid(nonce, Some(TokenType::ICP));
            assert!(
                result.is_ok(),
                "get_subaccountid should succeed for ICP token type"
            );

            // Get the text result
            let result_str = result.unwrap();

            // For ICP, this should be a hex string
            assert_eq!(
                result_str,
                subaccountid.to_hex(),
                "Result for ICP should be hex format"
            );
        }

        #[test]
        fn test_convert_to_icrc_account_success() {
            // Save original principal to restore later
            let original_principal = CanisterApiManager::id();

            // Setup
            let nonce = the_nonce();

            // Setup the subaccount
            let subaccount = to_subaccount(nonce);
            let subaccountid = to_subaccount_id(subaccount);
            let account_id_hash = subaccountid.to_u64_hash();

            LIST_OF_SUBACCOUNTS.with(|list_ref| {
                list_ref.borrow_mut().insert(account_id_hash, subaccount);
            });

            LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
                let _ = nonce_ref.borrow_mut().set(nonce + 1);
            });

            // Get the hex representation for conversion
            let hex_representation = subaccountid.to_hex();

            // Convert to ICRC-1 account
            let result = convert_to_icrc_account(hex_representation);
            assert!(
                result.is_ok(),
                "convert_to_icrc_account should succeed for existing account"
            );

            // Parse the result
            let result_str = result.unwrap();
            let parsed = IcrcAccount::from_text(&result_str);
            assert!(parsed.is_ok(), "Result should be a valid ICRC account text");

            let parsed_account = parsed.unwrap();

            // Ensure we're comparing against the same principal that CanisterApiManager::id() returns
            let canister_id = CanisterApiManager::id();
            assert_eq!(
                parsed_account.owner, canister_id,
                "Owner should match canister ID"
            );

            // Convert the expected nonce to a subaccount array
            let mut expected_subaccount = [0u8; 32];
            let nonce_bytes = nonce.to_be_bytes();
            expected_subaccount[32 - nonce_bytes.len()..].copy_from_slice(&nonce_bytes);

            // Check if the parsed subaccount matches what we expect
            // For a default subaccount (all zeros) it might be None or Some([0;32])
            match parsed_account.subaccount {
                Some(subaccount) => {
                    assert_eq!(
                        subaccount, expected_subaccount,
                        "Subaccount bytes should match"
                    );
                }
                None => {
                    // If subaccount is None, the expected subaccount should be all zeros
                    assert!(
                        expected_subaccount.iter().all(|&b| b == 0),
                        "If subaccount is None, expected subaccount should be all zeros"
                    );
                }
            }

            // Restore original principal
            *STATIC_PRINCIPAL.lock().unwrap() = original_principal;
        }

        #[test]
        fn test_get_interval_initial_value() {
            // Initially, the interval might be unset, or you can set a known value.
            let expected_seconds: u64 = 0; // Assuming 0 is the default or initial value.
            let _ =
                INTERVAL_IN_SECONDS.with(|ref_cell| ref_cell.borrow_mut().set(expected_seconds));
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
            let (spender_subaccountid, to_subaccountid, from_subaccountid) = setup_principals();

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
            let stored_transaction = StoredTransactions::new(
                index,
                transaction,
                hash,
                TokenType::ICP,
                *STATIC_PRINCIPAL.lock().unwrap(),
            );

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
            let stored_principal = StoredPrincipal::new(*STATIC_PRINCIPAL.lock().unwrap());

            assert_eq!(
                stored_principal.get_principal(),
                Some(*STATIC_PRINCIPAL.lock().unwrap())
            );
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
        async fn test_single_sweep_success() {
            let hashes = setup_sweep_environment();

            let result = single_sweep(hashes[0].to_string()).await.unwrap();

            assert_eq!(result.len(), 1);
            for res in result {
                assert!(res.contains("sweep: ok"));
            }

            teardown_sweep_environment();
        }

        #[tokio::test]
        async fn test_set_and_get_webhook_url_valid() {
            let valid_url = "https://example.com/webhook".to_string();
            let result = set_webhook_url(valid_url.clone()).await;

            assert!(result.is_ok(), "Setting a valid webhook URL should succeed");
            assert_eq!(
                result.unwrap(),
                valid_url,
                "The function should return the set URL"
            );

            // Verify that the URL was actually set
            let result = get_webhook_url();

            assert!(result.is_ok(), "Getting the webhook URL should succeed");
            assert_eq!(
                result.unwrap(),
                valid_url,
                "The function should return the correct URL"
            );
        }

        #[tokio::test]
        async fn test_sweep_subaccount_decimal_amount() {
            // Setup
            let (_, to_subaccountid, _) = setup_principals();
            let subaccountid_hex = to_subaccountid.to_hex();
            let amount = 1.25; // 1.25 ICP

            // Execute
            let result = sweep_subaccount(subaccountid_hex, amount, Some(TokenType::ICP)).await;

            // Assert
            assert!(
                result.is_ok(),
                "Sweeping subaccount with decimal amount should succeed"
            );
            assert_eq!(result.unwrap(), 1, "BlockIndex should be 1");
        }

        // New tests for multi-token support

        #[test]
        fn test_get_registered_tokens() {
            // Initially should be empty since no tokens are registered by default in tests
            let result = get_registered_tokens();
            assert!(result.is_ok(), "Getting registered tokens should succeed");

            let tokens = result.unwrap();
            // In test environment, tokens are not automatically registered
            assert_eq!(tokens.len(), 0, "Should have 0 token types initially");
        }

        #[test]
        fn test_get_transaction_token_type() {
            // Setup a transaction with specific token type
            populate_transactions(1, None);

            // Get the transaction hash from populated transactions
            let tx_hash = TRANSACTIONS.with(|t| {
                let transactions = t.borrow();
                transactions
                    .get(&1)
                    .map(|tx| tx.tx_hash.clone())
                    .unwrap_or_else(|| "HASH-IS-NOT-AVAILABLE".to_string())
            });

            // Get the transaction token type
            let result = get_transaction_token_type(tx_hash);
            assert!(
                result.is_ok(),
                "Getting transaction token type should succeed"
            );
            assert_eq!(
                result.unwrap(),
                TokenType::ICP,
                "Should return ICP token type"
            );
        }

        #[test]
        fn test_get_transaction_token_type_not_found() {
            let result = get_transaction_token_type("non-existent-hash".to_string());
            assert!(result.is_err(), "Should fail for non-existent transaction");
            assert_eq!(
                result.unwrap_err(),
                "Transaction not found",
                "Should return correct error message"
            );
        }

        #[test]
        fn test_get_token_next_block_query() {
            // This function returns the next block for a specific token
            let result = get_token_next_block_query(TokenType::CKUSDC);
            assert!(result.is_ok(), "Getting token next block should succeed");
            // Should return 1 by default
            assert_eq!(result.unwrap(), 1, "Should return default block 1");
        }

        #[test]
        fn test_get_all_token_blocks() {
            let result = get_all_token_blocks();
            assert!(result.is_ok(), "Getting all token blocks should succeed");

            let blocks = result.unwrap();
            // In production, this returns all three token types with default block 1
            // The actual behavior depends on the implementation
            assert!(blocks.len() <= 3, "Should have at most 3 token blocks");
            // All blocks should default to 1
            for (_, block) in blocks {
                assert_eq!(block, 1, "All blocks should default to 1");
            }
        }

        #[test]
        fn test_get_network() {
            // The network is set during initialization, let's test it
            let result = get_network();
            assert!(result.is_ok(), "Getting network should succeed");
            // Network could be either Local or Mainnet depending on initialization
        }

        #[test]
        fn test_get_next_block() {
            // Test getting the next block
            let result = get_next_block();
            assert!(result.is_ok(), "Getting next block should succeed");
            // Should have some default value
            assert!(result.unwrap() >= 0, "Should return a valid block number");
        }

        #[test]
        fn test_get_canister_principal() {
            let result = get_canister_principal();
            assert!(result.is_ok(), "Getting canister principal should succeed");
            // Should return the principal as a string
            let principal_str = result.unwrap();
            assert!(
                !principal_str.is_empty(),
                "Principal string should not be empty"
            );
            // Verify it's a valid principal format
            assert_eq!(principal_str, STATIC_PRINCIPAL.lock().unwrap().to_text());
        }

        #[test]
        fn test_get_transactions_count() {
            // Clear transactions first
            TRANSACTIONS.with(|t| t.borrow_mut().clear_new());

            // Initially should be 0
            let result = get_transactions_count();
            assert!(result.is_ok(), "Getting transactions count should succeed");
            assert_eq!(result.unwrap(), 0, "Should have 0 transactions initially");

            // Add some transactions
            populate_transactions(5, None);

            let result = get_transactions_count();
            assert!(result.is_ok(), "Getting transactions count should succeed");
            assert_eq!(result.unwrap(), 5, "Should have 5 transactions");
        }

        #[test]
        fn test_get_oldest_block() {
            // Clear transactions first
            TRANSACTIONS.with(|t| t.borrow_mut().clear_new());

            // Without transactions
            let result = get_oldest_block();
            assert!(result.is_ok(), "Getting oldest block should succeed");
            assert_eq!(
                result.unwrap(),
                None,
                "Should return None when no transactions"
            );

            // Add transactions starting from block 10
            TRANSACTIONS.with(|t| {
                let mut transactions = t.borrow_mut();
                for i in 10..15 {
                    let transaction = Transaction {
                        memo: i,
                        icrc1_memo: None,
                        operation: None,
                        created_at_time: Timestamp {
                            timestamp_nanos: 1000,
                        },
                    };
                    let hash = format!("hash-{}", i);
                    transactions.insert(
                        i,
                        StoredTransactions::new(
                            i,
                            transaction,
                            hash,
                            TokenType::ICP,
                            *STATIC_PRINCIPAL.lock().unwrap(),
                        ),
                    );
                }
            });

            let result = get_oldest_block();
            assert!(result.is_ok(), "Getting oldest block should succeed");
            assert_eq!(
                result.unwrap(),
                Some(10),
                "Should return Some(10) as the oldest block number"
            );
        }

        #[test]
        fn test_get_subaccount_count() {
            // Clear subaccounts first
            LIST_OF_SUBACCOUNTS.with(|s| s.borrow_mut().clear());

            // Initially should be 0
            let result = get_subaccount_count();
            assert!(result.is_ok(), "Getting subaccount count should succeed");
            assert_eq!(result.unwrap(), 0, "Should have 0 subaccounts initially");

            // Add some subaccounts
            setup_principals();

            let result = get_subaccount_count();
            assert!(result.is_ok(), "Getting subaccount count should succeed");
            assert_eq!(result.unwrap(), 3, "Should have 3 subaccounts");
        }

        #[test]
        fn test_get_nonce() {
            // Set a specific nonce
            LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
                let _ = nonce_ref.borrow_mut().set(42);
            });

            let result = get_nonce();
            assert!(result.is_ok(), "Getting nonce should succeed");
            assert_eq!(result.unwrap(), 42, "Should return the correct nonce");
        }

        #[test]
        fn test_canister_status() {
            let result = canister_status();
            assert!(result.is_ok(), "Getting canister status should succeed");

            let status = result.unwrap();
            // Status should contain operational message in JSON format
            assert!(
                status.contains("operational"),
                "Status should contain operational status"
            );
            assert!(
                status.contains("message"),
                "Status should be in JSON format with message field"
            );
        }

        #[test]
        fn test_add_subaccount_multiple_token_types() {
            // Test adding subaccounts for each token type
            let token_types = vec![
                TokenType::ICP,
                TokenType::CKUSDC,
                TokenType::CKUSDT,
                TokenType::CKBTC,
            ];

            for token_type in token_types {
                let result = add_subaccount(Some(token_type.clone()));
                assert!(
                    result.is_ok(),
                    "Adding subaccount for {:?} should succeed",
                    token_type
                );

                let address = result.unwrap();
                match token_type {
                    TokenType::ICP => {
                        // ICP addresses should be hex format (64 chars)
                        assert_eq!(address.len(), 64, "ICP address should be 64 hex chars");
                    }
                    TokenType::CKUSDC | TokenType::CKUSDT | TokenType::CKBTC => {
                        // ICRC-1 addresses should contain the canister principal
                        assert!(
                            address.contains(&STATIC_PRINCIPAL.lock().unwrap().to_text()),
                            "ICRC-1 address should contain canister principal"
                        );
                    }
                }
            }
        }

        #[tokio::test]
        async fn test_sweep_subaccount_different_tokens() {
            let (_, to_subaccountid, _) = setup_principals();
            let subaccountid_hex = to_subaccountid.to_hex();

            // Test sweeping with different token types
            let token_amounts = vec![
                (TokenType::ICP, 1.5),
                (TokenType::CKUSDC, 100.25),
                (TokenType::CKUSDT, 50.75),
            ];

            for (token_type, amount) in token_amounts {
                let result =
                    sweep_subaccount(subaccountid_hex.clone(), amount, Some(token_type.clone()))
                        .await;
                assert!(result.is_ok(), "Sweeping {:?} should succeed", token_type);
                assert_eq!(result.unwrap(), 1, "BlockIndex should be 1");
            }
        }
    }

    #[cfg(feature = "sad_path")]
    mod sad_path_tests {
        use super::*;

        static ERROR_MESSAGE: &str = "transfer failed";

        // Test functions for ICRC-1 account functionality sad paths
        #[test]
        fn test_icrc_account_parse_invalid_text() {
            // Test invalid principal format
            let invalid_principal = "invalid-principal-format";
            let result = IcrcAccount::from_text(invalid_principal);
            assert!(result.is_err(), "Parsing invalid principal should fail");

            // Test invalid format missing separator
            let invalid_format = "ryjl3-tyaaa-aaaaa-aaaba-caiabcdef"; // Missing period
            let result = IcrcAccount::from_text(invalid_format);
            assert!(
                result.is_err(),
                "Parsing invalid format without period should fail"
            );

            // Test invalid hex in subaccount
            let invalid_hex = "ryjl3-tyaaa-aaaaa-aaaba-cai-abcdef.xyz"; // 'xyz' is not valid hex
            let result = IcrcAccount::from_text(invalid_hex);
            assert!(result.is_err(), "Parsing invalid hex should fail");

            // Test invalid checksum
            // Create a valid account first
            let principal = *STATIC_PRINCIPAL.lock().unwrap();
            let mut subaccount = [0u8; 32];
            subaccount[31] = 42;
            let valid_account = IcrcAccount::new(principal, Some(subaccount));
            let valid_text = valid_account.to_text();

            // Modify the checksum part
            let parts: Vec<&str> = valid_text.split('.').collect();
            let prefix_parts: Vec<&str> = parts[0].split('-').collect();
            let invalid_checksum_text = format!(
                "{}-invchk.{}",
                prefix_parts[..prefix_parts.len() - 1].join("-"),
                parts[1]
            );

            // Parse with invalid checksum
            let result = IcrcAccount::from_text(&invalid_checksum_text);
            assert!(result.is_err(), "Parsing with invalid checksum should fail");
            assert!(
                result.unwrap_err().contains("Checksum verification failed"),
                "Error should indicate checksum verification failure"
            );
        }

        #[test]
        fn test_validate_icrc_account_invalid() {
            // Test validation with invalid account text
            let invalid_texts = vec![
                "not-a-valid-account",
                "ryjl3-tyaaa-aaaaa-aaaba-cai-checksum", // Missing period and subaccount
                "ryjl3-tyaaa-aaaaa-aaaba-cai.ZZ",       // Invalid hex in subaccount
                "-abcdef.1234",                         // Missing principal
                "ryjl3-tyaaa-aaaaa-aaaba-cai-abcdef",   // Missing period and subaccount
            ];

            for invalid_text in invalid_texts {
                let result = validate_icrc_account(invalid_text.to_string());
                assert!(
                    result.is_err(),
                    "Invalid ICRC account '{}' should fail validation",
                    invalid_text
                );
            }
        }

        #[test]
        fn test_get_icrc_account_invalid_nonce() {
            // Setup a high nonce value
            let high_nonce = 9999u32;

            // Set a lower nonce as current
            LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
                let _ = nonce_ref.borrow_mut().set(10);
            });

            // Call get_icrc_account with a nonce higher than current
            let result = get_icrc_account(high_nonce);
            assert!(
                result.is_err(),
                "get_icrc_account with invalid nonce should fail"
            );
            assert_eq!(
                result.unwrap_err().message,
                "Index out of bounds",
                "Error message should indicate index out of bounds"
            );
        }

        #[test]
        fn test_convert_to_icrc_account_invalid_hex() {
            // Setup
            let invalid_hex = "not-hex-string";

            // Call convert_to_icrc_account with invalid hex
            let result = convert_to_icrc_account(invalid_hex.to_string());
            assert!(
                result.is_err(),
                "convert_to_icrc_account with invalid hex should fail"
            );
            assert_eq!(
                result.unwrap_err().message,
                "Invalid hex encoding",
                "Error message should indicate invalid hex encoding"
            );

            // Test with hex string of wrong length
            let short_hex = "1234"; // Too short
            let result = convert_to_icrc_account(short_hex.to_string());
            assert!(
                result.is_err(),
                "convert_to_icrc_account with short hex should fail"
            );
            assert!(
                result
                    .unwrap_err()
                    .message
                    .contains("Invalid account length"),
                "Error message should indicate invalid account length"
            );
        }

        #[test]
        fn test_convert_to_icrc_account_nonexistent() {
            // Setup a valid hex string that doesn't correspond to any generated subaccount
            let nonexistent_hex =
                "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

            // Call convert_to_icrc_account with nonexistent account
            let result = convert_to_icrc_account(nonexistent_hex.to_string());
            assert!(
                result.is_err(),
                "convert_to_icrc_account with nonexistent account should fail"
            );
            assert_eq!(
                result.unwrap_err().message,
                "Account not found in generated subaccounts",
                "Error message should indicate account not found"
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

        #[tokio::test]
        async fn test_set_sweep_failed_nonexistent_hash() {
            let tx_hash = "nonexistent_hash";
            let result = set_sweep_failed(tx_hash.to_string()).await.unwrap();

            assert_eq!(result.len(), 0);
        }

        #[tokio::test]
        async fn test_single_sweep_with_failed_transfer() {
            let hashes = setup_sweep_environment();

            let result = single_sweep(hashes[0].to_string()).await.unwrap();

            assert_eq!(result.len(), 1);
            for res in result {
                if res.contains("sweep: ok") {
                    assert!(res.contains("status_update: ok"));
                } else {
                    assert!(res.contains("sweep:"));
                    assert!(res.contains("status_update:"));
                }
            }

            teardown_sweep_environment();
        }

        #[tokio::test]
        async fn test_set_sweep_failed() {
            let hashes = setup_sweep_environment();

            let result = single_sweep(hashes[0].to_string()).await.unwrap();

            assert_eq!(result.len(), 1);
            for res in result {
                assert!(res.contains("status_update: ok"));
                assert!(res.contains(ERROR_MESSAGE));
            }

            teardown_sweep_environment();
        }

        #[tokio::test]
        async fn test_set_webhook_url_invalid() {
            let invalid_urls = vec!["not_a_url", "http://", "ftp://example.com", "https://", ""];

            for invalid_url in invalid_urls {
                let result = set_webhook_url(invalid_url.to_string()).await;
                assert!(
                    result.is_err(),
                    "Setting an invalid webhook URL should fail: {}",
                    invalid_url
                );
                let error = result.unwrap_err();
                assert!(
                    error.message.contains("Invalid URL"),
                    "Error should indicate invalid URL"
                );
            }

            let result = get_webhook_url();

            assert!(result.is_ok(), "Getting the webhook URL should succeed");
            assert_eq!(
                result.unwrap(),
                String::default(),
                "The function should return the default String"
            );
        }

        #[tokio::test]
        async fn test_sweep_subaccount_nonexistent() {
            setup_sweep_environment();
            let (_, _to_subaccountid, _) = setup_principals();

            // Setup
            let nonexistent_subaccountid =
                "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
            let amount = 1.25;

            // Execute
            let result = sweep_subaccount(
                nonexistent_subaccountid.to_string(),
                amount,
                Some(TokenType::ICP),
            )
            .await;

            // Assert
            assert!(
                result.is_err(),
                "Sweeping nonexistent subaccount should fail"
            );
            assert_eq!(
                result.unwrap_err().message,
                "Subaccount not found",
                "Error message should indicate subaccount not found"
            );
            teardown_sweep_environment();
        }

        #[tokio::test]
        async fn test_sweep_subaccount_transfer_failure() {
            // Setup
            let (_, to_subaccountid, _) = setup_principals();
            let subaccountid_hex = to_subaccountid.to_hex();
            let amount = 1.25;

            // Execute
            let result = sweep_subaccount(subaccountid_hex, amount, Some(TokenType::ICP)).await;

            // Assert
            assert!(
                result.is_err(),
                "Sweeping should fail due to transfer failure"
            );
            assert_eq!(
                result.unwrap_err().message,
                "transfer failed",
                "Error message should indicate transfer failure"
            );
        }

        #[tokio::test]
        async fn test_sweep_subaccount_negative_amount() {
            // Setup
            let (_, to_subaccountid, _) = setup_principals();
            let subaccountid_hex = to_subaccountid.to_hex();
            let amount = -1.0;

            // Execute
            let result = sweep_subaccount(subaccountid_hex, amount, Some(TokenType::ICP)).await;

            // Assert
            assert!(result.is_err(), "Sweeping with negative amount should fail");
            assert_eq!(
                result.unwrap_err().message,
                "Invalid amount: overflow or negative value",
                "Error message should indicate invalid amount"
            );
        }

        #[tokio::test]
        async fn test_sweep_subaccount_overflow_amount() {
            // Setup
            let (_, to_subaccountid, _) = setup_principals();
            let subaccountid_hex = to_subaccountid.to_hex();
            let amount = f64::MAX;

            // Execute
            let result = sweep_subaccount(subaccountid_hex, amount, Some(TokenType::ICP)).await;

            // Assert
            assert!(result.is_err(), "Sweeping with overflow amount should fail");
            assert_eq!(
                result.unwrap_err().message,
                "Invalid amount: overflow or negative value",
                "Error message should indicate invalid amount"
            );
        }

        // New sad path tests for multi-token support
        #[test]
        fn test_get_transaction_token_type_invalid_id() {
            let result = get_transaction_token_type("invalid-hash-max".to_string());
            assert!(result.is_err(), "Should fail for invalid transaction ID");
            assert_eq!(
                result.unwrap_err(),
                "Transaction not found",
                "Should return correct error message"
            );
        }

        #[test]
        fn test_convert_to_icrc_account_invalid_length() {
            // Test with various invalid hex lengths
            let invalid_lengths = vec![
                "1234",                                                               // Too short
                "12345678", // Still too short
                "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12", // Too long
                "",         // Empty
            ];

            for hex in invalid_lengths {
                let result = convert_to_icrc_account(hex.to_string());
                assert!(
                    result.is_err(),
                    "convert_to_icrc_account with length {} should fail",
                    hex.len()
                );
                let error_msg = result.unwrap_err().message;
                assert!(
                    error_msg.contains("Invalid") || error_msg.contains("length"),
                    "Error should indicate invalid format"
                );
            }
        }

        #[test]
        fn test_validate_icrc_account_malformed() {
            let malformed_accounts = vec![
                "ryjl3-tyaaa-aaaaa-aaaba-cai-checksum.xyz.abc", // Multiple periods
                "ryjl3-tyaaa-aaaaa-aaaba-cai..1234",            // Double period
                ".1234",                                        // Starting with period
                "principal.",                                   // Ending with period
                "ryjl3-tyaaa-aaaaa-aaaba-cai-.1234",            // Ending dash before period
            ];

            for account in malformed_accounts {
                let result = validate_icrc_account(account.to_string());
                assert!(
                    result.is_err(),
                    "Malformed account '{}' should fail validation",
                    account
                );
            }
        }

        #[tokio::test]
        async fn test_sweep_subaccount_zero_amount() {
            let (_, to_subaccountid, _) = setup_principals();
            let subaccountid_hex = to_subaccountid.to_hex();

            let result = sweep_subaccount(subaccountid_hex, 0.0, Some(TokenType::ICP)).await;
            // In sad path tests, transfer always fails with "transfer failed"
            assert!(result.is_err(), "Sweeping should fail in sad path tests");
            let error_msg = result.unwrap_err().message;
            // In sad path, the InterCanisterCallManager returns "transfer failed"
            assert_eq!(
                error_msg, "transfer failed",
                "Should get transfer failed error"
            );
        }

        #[test]
        fn test_get_subaccountid_out_of_bounds() {
            // Set max nonce to a low value
            LAST_SUBACCOUNT_NONCE.with(|nonce_ref| {
                let _ = nonce_ref.borrow_mut().set(10);
            });

            // Try to get subaccount with nonce higher than max
            let result = get_subaccountid(20, Some(TokenType::ICP));
            assert!(result.is_err(), "Should fail for out of bounds nonce");
            assert_eq!(
                result.unwrap_err().message,
                "Index out of bounds",
                "Should return correct error message"
            );
        }

        #[test]
        fn test_clear_transactions_invalid_parameters() {
            populate_transactions(10, None);

            // Test with index that would clear all transactions
            let result = clear_transactions(Some(u64::MAX), None);
            assert!(result.is_ok(), "Should succeed but clear all transactions");
            let remaining = result.unwrap();
            assert_eq!(remaining.len(), 0, "Should have cleared all transactions");
        }

        #[tokio::test]
        async fn test_single_sweep_invalid_hash_format() {
            setup_sweep_environment();

            // Test with invalid hash formats
            let invalid_hashes = vec![
                "",                  // Empty hash
                "not-a-valid-hash",  // Invalid format
                "123",               // Too short
                " hash-with-space ", // Contains spaces
            ];

            for hash in invalid_hashes {
                let result = single_sweep(hash.to_string()).await;
                assert!(result.is_ok(), "Should return ok but with empty results");
                let sweep_results = result.unwrap();
                assert!(
                    sweep_results.is_empty()
                        || sweep_results.iter().all(|r| r.contains("not found")),
                    "Should indicate transaction not found for hash: {}",
                    hash
                );
            }

            teardown_sweep_environment();
        }

        #[test]
        fn test_get_all_token_blocks_returns_defaults() {
            let result = get_all_token_blocks();
            assert!(result.is_ok(), "Should succeed with default blocks");
            let blocks = result.unwrap();
            // In test environment, might not have all tokens registered
            assert!(blocks.len() <= 3, "Should have at most 3 token types");
            for (_, block) in blocks {
                assert_eq!(block, 1, "All should have default block 1");
            }
        }
    }
}
