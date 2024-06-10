# Context

This document serves as a walkthrough to deploy a canister on the mainnet.

# Steps

## 1. Acquire Internet Identities (II)

Get your Internet Identities via [Internet Identity](https://identity.ic0.app/). I recommend having a Bitwarden account and the Bitwarden Chrome extension installed for passkey activation.

## 2. Login to NNS

Login to NNS via [NNS Dapp](https://nns.ic0.app/).

## 3. Top Up ICP Tokens

Top up some 2.0 ICP tokens to your NNS-II address. This can be done on the panel `Tokens > Internet Computer`.

![Step 3 Image 1](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/jjFfeOQ_3gaVyfYQpbfcj6tg.png)
![Step 3 Image 2](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/FUjcWhLmdOvixYa27Rr4KP2O.png)
![Step 3 Image 3](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/qIz_Z_wbsuGV8Pp8bydVgXDr.png)

## 4. Install DFX CLI

Install DFX CLI on your system using this guide: [Installing tools | Internet Computer](https://internetcomputer.org/docs/current/developer-docs/getting-started/install/).

## 5. Create a New Identity

Create a new identity locally using `dfx`:

```bash
dfx identity new custodian_name
```

This will generate a passphrase that you should save somewhere secure. Ensure you have selected the right `identity` via this command:

```bash
dfx identity whoami

# To see a list of identities on this machine
dfx identity list

# To switch identity
dfx identity use some_idname
```

Get the `principal address` of the currently active identity:

```bash
dfx identity get-principal
# This will print e.g., pztcx-5wpjw-ko6rv-3cjff-466eb-4ywbn-a5jww-rs6yy-ypk4a-ceqfb-nqe
```

Export this to an environment variable `CUSTODIAN_PRINCIPAL`:

```bash
export CUSTODIAN_PRINCIPAL=$(dfx identity get-principal)
```

We will use this to deploy our canister later.

## 6. Create a New Canister via NNS Dashboard

![Step 6 Image 1](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/G5K9p_LwapPyqM3Bzy2JjHzZ.png)

Add cycles:

![Step 6 Image 2](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/q8-kVjxwdEsaakPhruA8QZ4Q.png)

Add the controller using the `custodian_principal` that we obtained locally:

![Step 6 Image 3](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/zH2oPeqfQxtwl5gKVJ6ZpCtx.png)

## 7. Clone the Project Locally

Make sure you already have Git and Rust installed:

```bash
git clone git@github.com:garudaidr/icp-subaccount-indexer-prototype.git
```

## 8. Add `canister_ids.json`

Within your project’s root directory, add or adjust the following file `canister_ids.json`:

```json
{
  "icp_prototype_backend": {
    "ic": "upy4y-myaaa-aaaal-qjbxa-cai"
  }
}
```

Replace the `canister_id` that can be retrieved from the canister panel on the NNS dashboard. For example, `upy4y-myaaa-aaaal-qjbxa-cai`.

![Step 8 Image](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/o51MT4pSrFDoNNB1I3k25HQR.png)

Sync the local wallet to the mainnet:

```bash
dfx identity --network ic deploy-wallet <canister_id>
```

Convert ICP to cycles:

```bash
dfx cycles convert 0.3 --network ic
```

## 9. Run the Deployment Command

Ensure the currently active identity is the correct `custodian` identity linked as the controller on NNS from previous steps. Don’t forget to export the value for `CUSTODIAN_PRINCIPAL` using the sub-step from step 5.

```bash
dfx deploy icp_prototype_backend --network ic --no-wallet --argument "(variant { Mainnet }, 15 : nat64, 10 : nat32, \"ryjl3-tyaaa-aaaaa-aaaba-cai\", \"$(echo $CUSTODIAN_PRINCIPAL)\")"
```

Some roadblocks you may encounter:

- The `wasm32-unknown-unknown` target may not be installed:

```bash
rustup target add wasm32-unknown-unknown
```

## 10. Copy URL & CanisterID

Upon success, it will generate a URL, e.g., `https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=uiz2m-baaaa-aaaal-qjbxq-cai`. Sometimes, due to network issues, you may encounter a stuck process that needs to be canceled and re-run.

## 11. Initiate Poller & Set Recent Block

Export the Canister ID to a shell environment variable:

```bash
export CANISTER_ID=<canister_id>

# e.g.
# export CANISTER_ID=g5nrt-myaaa-aaaap-qhluq-cai
```

The poller needs to be `jumpstarted` by setting the poller interval:

```bash
dfx canister --network ic call $(echo $CANISTER_ID) set_interval '(1)'
```

![Step 11 Image 1](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/QvPA9K1d2Ou2UJpfoA2lSGVv.png)

Set `next_block` to avoid querying from 0. The most recent block number can be checked here: [ICP Transactions](https://dashboard.internetcomputer.org/).

![Step 11 Image 2](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/uLm32y56Vd9TVdc8Wfqk07op.png)

```bash
dfx canister --network ic call $(echo $CANISTER_ID) set_next_block '(12110174)'
```

To check the ongoing `next_block`:

```bash
dfx canister --network ic call $(echo $CANISTER_ID) get_next_block '()'
```

![Step 11 Image 3](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/FbauUfzLAs-kjbY9wFjcxGX9.png)

## 12. Test via CLI

This part of the operation is to be done by [vianny@garuda.to](https://jagad.slab.com/users/3lzumybg). To test methods on your canister, use the format: `dfx canister --network ic call <canister_id> <method_name> '<argument>'`.

```bash
dfx canister --network ic call $(echo $CANISTER_ID) canister_status '()'
```

![Step 12 Image 1](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/nhIH2eC-Wvhq7AgnZeXSFmZD.png)

To sweep:

```bash
dfx canister --network ic call $(echo $CANISTER_ID) sweep '()'
```

![Step 12 Image 2](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/ZmJTtRz46_87a6bCIkzM8Gmj.png)

To check the balance:

```bash
dfx ledger --network ic balance
```

![Step 12 Image 3](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/JjGQoCWOXzAasOzEZxO5OpKl.png)

To transfer out (make sure to deduct `0.0001` for the fee, otherwise it will fail):

```bash
dfx ledger transfer --network ic --amount <amount-fee> --memo <any_number> <withdraw_address>
```

If the previous balance was 0.5099, the amount to withdraw should be 0.5098:

```bash
dfx ledger transfer --network ic --amount 0.5098 --memo 0 5c8aea1a5c6b871125c5b876688f2c28483a37314717750f2175156742fd08d8
```

![Step 12 Image 4](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/vbcfmy7VMLGZCsH9

ffOWYgO5.png)

Upon successful transfer, you will get the response: "Transfer sent at block height 12110251".

## 13. Exporting Identity

There may be a need to export the identity from the deployer to an operator.

### 13.1 Exporting Identity

```bash
dfx identity export <identity_name>
```

Example:

```bash
dfx identity export user
```

Copy the printed text into `<some_file.pem>`.

### 13.2 Importing Identity

```bash
dfx identity import <identity_name> <pem_file>
```

Example:

```bash
dfx identity import user2 user2.pem
```

![Step 13.2 Image](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/rmOZbqRVhCbISTuPAdNaRQXZ.png)

You can check if the identities are already listed:

```bash
dfx identity list
```

![Step 13.2 Image 2](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/GkOFwgxMYBO1AtbMuSJgxsbg.png)

Don’t forget to switch identity as needed via the command:

```bash
dfx identity use <some_id>
```

Example:

```bash
dfx identity use user2
```

![Step 13.2 Image 3](https://slabstatic.com/prod/uploads/nq0f6x9q/posts/images/preload/Ksjodxv-Z96akrzNWE8SfHBU.png)

# Note

Hardcode the principal ID if the initial deployment doesn't properly set it:

```rust
let custodian_principal = "".to_string(); // fill this ""

let custodian_principal =
    Principal::from_text(&custodian_principal).expect("Invalid custodian principal");

CUSTODIAN_PRINCIPAL.with(|principal_ref| {
    let stored_principal = StoredPrincipal::new(custodian_principal);
    let _ = principal_ref.borrow_mut().set(stored_principal);
});
```

Put the above code in the `async fn post_upgrade()` function.

Set the ledger ID if it is not set in the initial deployment:

```rust
let ledger_principal = "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string();

let principal = Principal::from_text(&ledger_principal).expect("Invalid ledger principal");

PRINCIPAL.with(|principal_ref| {
    let stored_principal = StoredPrincipal::new(principal);
    let _ = principal_ref.borrow_mut().set(stored_principal);
});

ic_cdk::println!("running post_upgrade...");
reconstruct_subaccounts();
reconstruct_network();
```

Put the above code in the `async fn post_upgrade()` function.
