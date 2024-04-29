# start local ICP network
dfx start --clean --background

dfx identity new minter
dfx identity use minter
export MINTER_ACCOUNT_ID=$(dfx ledger account-id)

dfx identity use default
export DEFAULT_ACCOUNT_ID=$(dfx ledger account-id)

dfx identity new custodian
dfx identity use custodian
export CUSTODIAN_PRINCIPAL=$(dfx identity get-principal)
echo $CUSTODIAN_PRINCIPAL

dfx deploy --specified-id ryjl3-tyaaa-aaaaa-aaaba-cai icp_ledger_canister --argument "
  (variant {
    Init = record {
      minting_account = \"$MINTER_ACCOUNT_ID\";
      initial_values = vec {
        record {
          \"$DEFAULT_ACCOUNT_ID\";
          record {
            e8s = 10_000_000_000 : nat64;
          };
        };
      };
      send_whitelist = vec {};
      transfer_fee = opt record {
        e8s = 10_000 : nat64;
      };
      token_symbol = opt \"LICP\";
      token_name = opt \"Local ICP\";
    }
  })
"

# deploy index canister
dfx deploy icp_index_canister --specified-id qhbym-qaaaa-aaaaa-aaafq-cai --argument '(record {ledger_id = principal "ryjl3-tyaaa-aaaaa-aaaba-cai"})'

dfx deploy icp_prototype_backend --argument "(15 : nat64, 10 : nat32  , \"ryjl3-tyaaa-aaaaa-aaaba-cai\", \"$CUSTODIAN_PRINCIPAL\")"

# show current identity - default
dfx identity use default
dfx identity whoami

# show balance before transfer
dfx ledger balance $DEFAULT_ACCOUNT_ID

# create a new subaccount-id
dfx canister --network local call be2us-64aaa-aaaaa-qaabq-cai add_subaccount '()' | tr -d '[\\,"\(\)]' | grep -o '[0-9a-f]\{2\}' | tr -d '\n'

# create a new subaccount-id alternatively via ledger canister
dfx canister --network local call ryjl3-tyaaa-aaaaa-aaaba-cai account_identifier \
'(record {owner = principal "xyxs7-kj3vb-expvh-s4xcy-4lztk-beh3x-hszie-gzacr-zwq7n-x5nvp-cqe";subaccount = blob "\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01"})' --query \
| tr -d '[\\,"\(\)]' | grep -o '[0-9a-f]\{2\}' | tr -d '\n'
# d4ca21b8146775096697d95483697f0510efa958d177189ddb3cb1dd530d4670

dfx canister --network local call ryjl3-tyaaa-aaaaa-aaaba-cai account_identifier \
'(record {owner = principal "xyxs7-kj3vb-expvh-s4xcy-4lztk-beh3x-hszie-gzacr-zwq7n-x5nvp-cqe";subaccount = blob "\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\02"})' --query \
| tr -d '[\\,"\(\)]' | grep -o '[0-9a-f]\{2\}' | tr -d '\n'
# c5429aef37e6545324fb3425e770c7007aa2953287249a5a7311abd3f36799df

dfx canister --network local call ryjl3-tyaaa-aaaaa-aaaba-cai account_identifier \
'(record {owner = principal "xyxs7-kj3vb-expvh-s4xcy-4lztk-beh3x-hszie-gzacr-zwq7n-x5nvp-cqe";subaccount = blob "\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\03"})' --query \
| tr -d '[\\,"\(\)]' | grep -o '[0-9a-f]\{2\}' | tr -d '\n'
# b84c1d3331a948677d40ab367e337246b506e91db01881eb7e05004175d7404e


# transfer to custodian subaccount-id 001
dfx ledger transfer --network local --amount 1.25 --memo 001 d4ca21b8146775096697d95483697f0510efa958d177189ddb3cb1dd530d4670

# transfer to custodian subaccount-id 002
dfx ledger transfer --network local --amount 2.75 --memo 002 c5429aef37e6545324fb3425e770c7007aa2953287249a5a7311abd3f36799df

# transfer to custodian subaccount-id 003
dfx ledger transfer --network local --amount 1.35 --memo 003 b84c1d3331a948677d40ab367e337246b506e91db01881eb7e05004175d7404e

# set interval to 5 sec

# call list_transactions

# refund tx
dfx canister --network local call be2us-64aaa-aaaaa-qaabq-cai refund '(1: nat64)' 