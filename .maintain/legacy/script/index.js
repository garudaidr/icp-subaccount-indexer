import HDKey from "hdkey";
import dotenv from "dotenv";
import * as bip39 from "bip39";
import Secp256k1 from "secp256k1";
import fetch from "isomorphic-fetch";
import { replica, HttpAgent } from "ic0";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

import readline from "readline";
import { execSync } from "child_process";

dotenv.config();

const DERIVATION_PATH = "m/44'/223'/0'/0";

const getIdentityFromSeed = (mnemonic, index = 0) => {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const masterKey = HDKey.fromMasterSeed(seed);
  const { privateKey } = masterKey.derive(`${DERIVATION_PATH}/${index}`);
  const publicKey = Secp256k1.publicKeyCreate(privateKey, false);
  return Secp256k1KeyIdentity.fromKeyPair(publicKey, privateKey);
};

function createHostAgentAndIdentityFromSeed(
  seedPhrase,
  host = "http://127.0.0.1:8000",
) {
  const identity = getIdentityFromSeed(seedPhrase);
  console.log("Identity: ", identity.getPrincipal().toText());
  return new HttpAgent({ host, identity, fetch, verifyQuerySignatures: false });
}

const canister_id = process.env.CANISTER_ID;
const custodian_seed = process.env.CUSTODIAN_SEED;
const agent = createHostAgentAndIdentityFromSeed(custodian_seed);
const ic = replica(agent, { local: true });
const custodian = ic(canister_id);

const ledgerCanisterId = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const ledger = ic(ledgerCanisterId);

const indexCanisterId = "qhbym-qaaaa-aaaaa-aaafq-cai";
const index = ic(indexCanisterId);

async function runTest(method, ...args) {
  console.log(`Testing ${method} method:`);
  try {
    const result = await custodian.call(method, ...args);
    console.log(result);
    return result;
  } catch (error) {
    console.error(`Error in ${method}:`, error);
  }
}

async function transferICP(amount, memo, to) {
  const command = `dfx ledger transfer --network local --amount ${amount} --memo ${memo} ${to}`;
  try {
    const output = execSync(command, { encoding: "utf-8" });
    console.log("Transfer output:", output);
  } catch (error) {
    console.error("Transfer error:", error.message);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function promptUser() {
  rl.question(
    `
Choose a test to run:
1. get_account_identifier_transactions
2. query_blocks
3. add_subaccount
4. get_network
5. set_next_block
6. get_next_block
7. set_interval
8. get_interval
9. get_nonce
10. get_canister_principal
11. get_subaccountid
12. get_subaccount_count
13. get_transactions_count
14. get_oldest_block
15. list_transactions
16. clear_transactions
17. refund
18. sweep
19. canister_status
20. get_webhook_url
21. set_webhook_url
22. Transfer ICP
23. Exit
Enter your choice: `,
    async (choice) => {
      switch (choice) {
        case "1":
          await runTest("get_account_identifier_transactions", {
            account_identifier:
              "5c8aea1a5c6b871125c5b876688f2c28483a37314717750f2175156742fd08d8",
            start: [],
            max_results: 100,
          });
          break;
        case "2":
          await runTest("query_blocks", { start: 1, length: 1 });
          break;
        case "3":
          await runTest("add_subaccount");
          break;
        case "4":
          await runTest("get_network");
          break;
        case "5":
          rl.question("Enter block number: ", async (block) => {
            await runTest("set_next_block", parseInt(block));
            promptUser();
          });
          return;
        case "6":
          await runTest("get_next_block");
          break;
        case "7":
          rl.question("Enter interval in milliseconds: ", async (interval) => {
            await runTest("set_interval", parseInt(interval));
            promptUser();
          });
          return;
        case "8":
          await runTest("get_interval");
          break;
        case "9":
          await runTest("get_nonce");
          break;
        case "10":
          await runTest("get_canister_principal");
          break;
        case "11":
          rl.question("Enter nonce: ", async (nonce) => {
            await runTest("get_subaccountid", parseInt(nonce));
            promptUser();
          });
          return;
        case "12":
          await runTest("get_subaccount_count");
          break;
        case "13":
          await runTest("get_transactions_count");
          break;
        case "14":
          await runTest("get_oldest_block");
          break;
        case "15":
          await runTest("list_transactions", []);
          break;
        case "16":
          rl.question("Enter up_to_index (optional): ", async (index) => {
            await runTest(
              "clear_transactions",
              index ? { up_to_index: parseInt(index) } : {},
            );
            promptUser();
          });
          return;
        case "17":
          rl.question("Enter transaction index: ", async (index) => {
            await runTest("refund", parseInt(index));
            promptUser();
          });
          return;
        case "18":
          await runTest("sweep");
          break;
        case "19":
          await runTest("canister_status");
          break;
        case "20":
          await runTest("get_webhook_url");
          break;
        case "21":
          rl.question("Enter webhook URL: ", async (url) => {
            await runTest("set_webhook_url", url);
            promptUser();
          });
          return;
        case "22":
          rl.question("Enter amount: ", (amount) => {
            rl.question("Enter memo: ", (memo) => {
              rl.question("Enter destination address: ", async (to) => {
                await transferICP(amount, memo, to);
                promptUser();
              });
            });
          });
          return;
        case "23":
          rl.close();
          process.exit(0);
        default:
          console.log("Invalid choice. Please try again.");
      }
      promptUser();
    },
  );
}

async function handleCommandLineArgs(args) {
  if (args.length > 0) {
    const method = args[0];
    const params = args.slice(1);

    switch (method) {
      case "add_subaccount":
        return await runTest("add_subaccount");
      case "set_webhook_url":
        if (params.length === 1) {
          return await runTest("set_webhook_url", params[0]);
        } else {
          console.error("URL parameter is required for set_webhook_url");
          process.exit(1);
        }
      default:
        console.error("Unknown method:", method);
        process.exit(1);
    }
  } else {
    console.error("No method specified");
    process.exit(1);
  }
}

// Main function to handle the execution mode
async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--cli") {
    // CLI mode
    await handleCommandLineArgs(args.slice(1));
    process.exit(0); // Ensure the process exits after CLI command execution
  } else {
    // Interactive mode
    promptUser();
  }
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
