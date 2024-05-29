# Run deploy script
./deploy.sh

# Show current identity - default
dfx identity use default
dfx identity whoami

# Show balance before transfer
dfx ledger balance $DEFAULT_ACCOUNT_ID

# Create a new subaccount-id
dfx canister --network local call be2us-64aaa-aaaaa-qaabq-cai add_subaccount '()' | tr -d '[\\,"\(\)]' | grep -o '[0-9a-f]\{2\}' | tr -d '\n'

# Create a new subaccount-id alternatively via ledger canister
dfx canister --network local call ryjl3-tyaaa-aaaaa-aaaba-cai account_identifier \
'(record {owner = principal "bd3sg-teaaa-aaaaa-qaaba-cai";subaccount = blob "\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01"})' --query \
| tr -d '[\\,"\(\)]' | grep -o '[0-9a-f]\{2\}' | tr -d '\n'
# a8c85a1ebb81da856134eb6da837d4ee62d1189ef201c25db50f04673126ba3e


# Transfer to canister subaccount-id 001
dfx ledger transfer --network local --amount 1.25 --memo 001 65f5bd3e9f479217d8ed2ae8bbdb9310a0f5d01a34dffba94d305274c002b88d

# Transfer to canister subaccount-id 002
dfx ledger transfer --network local --amount 2.75 --memo 002 b79ddc484d7c8801e5e3ae4d0480f65258ad89e7f31d3a973e278e0823553230

# Transfer to custodian subaccount-id 003
dfx ledger transfer --network local --amount 1.35 --memo 003 5d0df26150362dadf5a09d8ae91d1f16824b27f75de42b8a6c378e650492f014

# test list_transactions via CandidUI

# test refund via CandidUI

# test swap via CandidUI

# Check custodian balance to confirm sweep
dfx identity use custodian
dfx ledger balance 