# ICP Sub-Account Indexer

## Overview
The ICP sub-account indexer canister provides methods that allow organization to primarily carry several operations:
- To generate sub-account-id in the form of hex_string
- To track incoming ICP-token transfer into created sub-account-ids
- To manage ICP-tokens that reside in the sub-account-ids

## Canister Methods
The canister provides several methods to assist with ICP-token deposit management. The complete methods can be observed inside
[Candid File](https://github.com/garudaidr/icp-subaccount-indexer/blob/main/src/icp_prototype_backend/icp_prototype_backend.did)

```
add_subaccount : () -> (variant { Ok : text; Err : Error });
```
This method returns sub-account-id in hex_string format. 

```
sweep : () -> (variant { Ok : vec text; Err : Error });
```
This method forwards ICP-token that are sitting on each sub-account-ids

```
single_sweep : (text) -> (variant { Ok : vec text; Err : Error });
```
This method forwards ICP-token that was transacted within a single tx_hash provided in the argument

## Usage
The complete step-by-step guide to deploy the Canister are outline on this [Deployment Guide](https://github.com/garudaidr/icp-subaccount-indexer/blob/main/canister-deployment-guideline.md)

## Research Documents
The following are some of the research documents during specification design:

[Subaccount Derivation Mechanism](https://jagad.slab.com/posts/subaccount-derivation-mechanism-ebwjd334)

[Sweeping Mechanism](https://jagad.slab.com/posts/sweeping-subaccounts-to-user-vaults-main-principal-m2pjvc1t)