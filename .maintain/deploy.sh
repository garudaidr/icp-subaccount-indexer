#------------------------------ PART #1 DEPLOYMENT ------------------------------
# start local ICP network
dfx start --clean --background

dfx identity new minter
dfx identity use minter
export MINTER_ACCOUNT_ID=$(dfx ledger account-id)

dfx identity use default
export DEFAULT_ACCOUNT_ID=$(dfx ledger account-id)

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

dfx identity new custodian
dfx identity use custodian
export CUSTODIAN_PRINCIPAL=$(dfx identity get-principal)
echo $CUSTODIAN_PRINCIPAL

# deploy backend canister
dfx deploy icp_prototype_backend --argument "(15 : nat64, 10 : nat32  , \"ryjl3-tyaaa-aaaaa-aaaba-cai\", \"$CUSTODIAN_PRINCIPAL\")"

#------------------------------ PART #2 TESTING ------------------------------

# show current identity - default
dfx identity use default
dfx identity whoami

# show balance before transfer
dfx ledger balance $DEFAULT_ACCOUNT_ID

# create a new subaccount-id
dfx canister --network local call be2us-64aaa-aaaaa-qaabq-cai add_subaccount '()' | tr -d '[\\,"\(\)]' | grep -o '[0-9a-f]\{2\}' | tr -d '\n'

# create a new subaccount-id alternatively via ledger canister
dfx canister --network local call ryjl3-tyaaa-aaaaa-aaaba-cai account_identifier \
'(record {owner = principal "bd3sg-teaaa-aaaaa-qaaba-cai";subaccount = blob "\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01"})' --query \
| tr -d '[\\,"\(\)]' | grep -o '[0-9a-f]\{2\}' | tr -d '\n'
# a8c85a1ebb81da856134eb6da837d4ee62d1189ef201c25db50f04673126ba3e


# transfer to canister subaccount-id 001
dfx ledger transfer --network local --amount 1.25 --memo 001 a8c85a1ebb81da856134eb6da837d4ee62d1189ef201c25db50f04673126ba3e

# transfer to canister subaccount-id 002
dfx ledger transfer --network local --amount 2.75 --memo 002 b79ddc484d7c8801e5e3ae4d0480f65258ad89e7f31d3a973e278e0823553230

# transfer to custcanisterodian subaccount-id 003
dfx ledger transfer --network local --amount 1.35 --memo 003 5d0df26150362dadf5a09d8ae91d1f16824b27f75de42b8a6c378e650492f014

# test list_transactions via CandidUI

# test refund via CandidUI

# test swap via CandidUI

# check custodian balance to confirm sweep
dfx identity use custodian
dfx ledger balance 