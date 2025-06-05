# ICSI Scripts Guideline

> **⚠️ DEPRECATION NOTICE**: This documentation describes legacy scripts. For modern testing and deployment, please refer to:
>
> - **Testing**: See `packages/icsi-lib/test/scripts/` and [Testing Guide](../TESTING_GUIDE.md)
> - **Deployment**: Use `scripts/deploy-mainnet.sh` for mainnet deployments
> - **Migration Guide**: See [DEPRECATED.md](./DEPRECATED.md)

This document serves as a comprehensive walkthrough to deploy and interact with the ICSI canister on the Internet Computer mainnet and local network using legacy scripts.

## Prerequisites

1. **Internet Identity (II)**: Acquire your Internet Identity via [Internet Identity](https://identity.ic0.app/). It's recommended to use a password manager like Bitwarden with Chrome extension for passkey activation.

2. **NNS Login**: Access the [NNS Dapp](https://nns.ic0.app/) and log in.

3. **ICP Tokens**: Top up at least 2.0 ICP tokens to your NNS-II address. Navigate to `Tokens > Internet Computer` in the NNS Dapp.

4. **DFX CLI**: Install the DFINITY Canister SDK (DFX) on your system. Follow the guide at [Installing tools | Internet Computer](https://internetcomputer.org/docs/current/developer-docs/getting-started/install/).

5. **Git and Rust**: Ensure you have Git and Rust installed on your system.

## Deployment Process

### 1. Create a New Identity

Create a new identity locally using `dfx`:

```bash
dfx identity new custodian_name
```

Verify and manage identities:

```bash
dfx identity whoami
dfx identity list
dfx identity use some_idname
```

Export the principal address to an environment variable:

```bash
export CUSTODIAN_PRINCIPAL=$(dfx identity get-principal)
```

### 2. Create a New Canister via NNS Dashboard

1. Create a new canister through the NNS Dashboard.
2. Add cycles to the canister.
3. Add the controller using the `custodian_principal` obtained earlier.

### 3. Clone the Project

```bash
git clone git@github.com:garudaidr/icp-subaccount-indexer-prototype.git
cd icp-subaccount-indexer-prototype
```

### 4. Configure `canister_ids.json`

Create or modify `canister_ids.json` in the project root:

```json
{
  "icp_subaccount_indexer": {
    "ic": "upy4y-myaaa-aaaaal-qjbxa-cai"
  }
}
```

Replace the canister ID with the one from your NNS dashboard.

### 5. Prepare for Deployment

Sync the local wallet to the mainnet:

```bash
dfx identity --network ic deploy-wallet <canister_id>
```

Convert ICP to cycles:

```bash
dfx cycles convert 0.3 --network ic
```

### 6. Deploy the Canister

Use the `deploy.sh` script for deployment:

```bash
# Deploy to mainnet (IC network)
./deploy.sh --network ic

# Deploy to local network
./deploy.sh --network local

# For a clean local deployment
./deploy.sh --network local --clean
```

Alternatively, you can use the dfx command directly:

```bash
dfx deploy icp_subaccount_indexer --network ic --no-wallet --argument "(variant { Mainnet }, 15 : nat64, 10 : nat32, \"ryjl3-tyaaa-aaaaa-aaaba-cai\", \"$CUSTODIAN_PRINCIPAL\")"
```

Note: If you encounter issues with the `wasm32-unknown-unknown` target, install it:

```bash
rustup target add wasm32-unknown-unknown
```

### 7. Post-Deployment Setup

Export the Canister ID:

```bash
export CANISTER_ID=<your_canister_id>
```

Initialize the poller:

```bash
dfx canister --network ic call $CANISTER_ID set_interval '(1)'
```

Set the starting block to avoid querying from 0:

```bash
dfx canister --network ic call $CANISTER_ID set_next_block '(12110174)'
```

Verify the current block:

```bash
dfx canister --network ic call $CANISTER_ID get_next_block '()'
```

## Testing and Interaction

### Using `test.sh`

The `test.sh` script provides a comprehensive test suite:

```bash
# Run tests with deployment
./test.sh --network local

# Run tests without deployment
./test.sh --network local --skip-deploy
```

### Using `index.js`

The `index.js` file offers an interactive CLI for canister interaction:

1. Interactive mode:

   ```bash
   node index.js
   ```

2. CLI mode:

   ```bash
   # Add a subaccount
   node index.js --cli add_subaccount

   # Set webhook URL
   node index.js --cli set_webhook_url https://example.com/webhook
   ```

### Manual CLI Testing

Test methods using the format:

```bash
dfx canister --network ic call $CANISTER_ID <method_name> '<argument>'
```

Examples:

```bash
# Check canister status
dfx canister --network ic call $CANISTER_ID canister_status '()'

# Sweep funds
dfx canister --network ic call $CANISTER_ID sweep '()'

# Check balance
dfx ledger --network ic balance

# Transfer out (deduct 0.0001 for fee)
dfx ledger transfer --network ic --amount 0.5098 --memo 0 5c8aea1a5c6b871125c5b876688f2c28483a37314717750f2175156742fd08d8
```

## Identity Management

### Exporting Identity

```bash
dfx identity export <identity_name>
```

### Importing Identity

```bash
dfx identity import <identity_name> <pem_file>
```

List and switch identities:

```bash
dfx identity list
dfx identity use <some_id>
```

## Troubleshooting

If the initial deployment doesn't set the principal ID or ledger ID correctly, modify the `post_upgrade()` function in your Rust code:

```rust
async fn post_upgrade() {
    let custodian_principal = "".to_string(); // fill this ""
    let custodian_principal = Principal::from_text(&custodian_principal).expect("Invalid custodian principal");
    CUSTODIAN_PRINCIPAL.with(|principal_ref| {
        let stored_principal = StoredPrincipal::new(custodian_principal);
        let _ = principal_ref.borrow_mut().set(stored_principal);
    });

    let ledger_principal = "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string();
    let principal = Principal::from_text(&ledger_principal).expect("Invalid ledger principal");
    PRINCIPAL.with(|principal_ref| {
        let stored_principal = StoredPrincipal::new(principal);
        let _ = principal_ref.borrow_mut().set(stored_principal);
    });

    ic_cdk::println!("running post_upgrade...");
    reconstruct_subaccounts();
    reconstruct_network();
}
```

This comprehensive guide should help you deploy, test, and interact with your ICSI canister effectively.
