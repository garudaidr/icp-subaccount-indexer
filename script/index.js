import HDKey from "hdkey";
import dotenv from 'dotenv';
import * as bip39 from "bip39";
import Secp256k1 from "secp256k1";
import fetch from 'isomorphic-fetch';
import { replica, HttpAgent } from 'ic0';
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

dotenv.config(); 

const DERIVATION_PATH = "m/44'/223'/0'/0";

const getIdentityFromSeed = (mnemonic, index = 0) => {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const masterKey = HDKey.fromMasterSeed(seed);

    // Derive the private and public keys using the BIP44 derivation path.
    const { privateKey } = masterKey.derive(`${DERIVATION_PATH}/${index}`);
    const publicKey = Secp256k1.publicKeyCreate(privateKey, false);

    return Secp256k1KeyIdentity.fromKeyPair(publicKey, privateKey);
};

function createHostAgentAndIdentityFromSeed(
    seedPhrase,
    host = "http://127.0.0.1:8000", // this points to local replica
) {
    const identity = getIdentityFromSeed(seedPhrase);

    console.log("Identity: ", identity.getPrincipal().toText());

    // Initialize and return the HttpAgent with the generated identity.
    return new HttpAgent({
        host,
        identity,
        fetch,
        verifyQuerySignatures: false,
    });
}

function hex_to_bytes(hex) {
    return hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
}

function bytes_to_hex(bytes) {
    return Array.prototype.map.call(bytes, x => ('00' + x.toString(16)).slice(-2)).join('');
}

(async () => {
    // const custodian_principal_hex = process.env.CUSTODIAN_PRINCIPAL_HEX;
    const canister_id = process.env.CANISTER_ID;
    const custodian_seed = process.env.CUSTODIAN_SEED;
    const agent = createHostAgentAndIdentityFromSeed(custodian_seed);
    const ic = replica(agent, { local: true });
    const custodian = ic(canister_id);

    const ledgerCanisterId= "ryjl3-tyaaa-aaaaa-aaaba-cai";
    const ledger = ic(ledgerCanisterId);

    const indexCanisterId = "qhbym-qaaaa-aaaaa-aaafq-cai";
    const index = ic(indexCanisterId);

    // Specify the method you want to test
    const test_method = 'add_subaccount';

    switch (test_method) {

        case 'get_account_identifier_transactions':
            const args = {
                account_identifier: '5c8aea1a5c6b871125c5b876688f2c28483a37314717750f2175156742fd08d8',
                start: [],
                max_results: 100,
            };
            
            let response = await index.call("get_account_identifier_transactions", args);
            
            console.log(response);
            
            response.Ok.transactions.forEach ( (tx) => {
                console.log(tx.transaction);
                console.log(tx.transaction.operation);
            });

            break;

        case 'query_blocks':
            console.log("Testing query_blocks method:");
            let result = await ledger.call('query_blocks', { start: 1, length: 1 }); // 11998744

            console.log(result);

            // console.log(result.archived_blocks[0].callback);

            result.blocks.forEach(block => {

                if (block.transaction.operation[0].Transfer == undefined) {
                    return;
                }

                console.log(block.timestamp);

                let trans = block.transaction;
                console.log(trans);

                let tx = block.transaction.operation[0].Transfer;
                console.log(tx);

                // amount
                let amount = tx.amount.e8s;
                console.log(`amount: ${amount}`);

                // source subaccountid
                let source_bytes = tx.from;
                let source = bytes_to_hex(source_bytes);
                console.log(`source: ${source}`);

                // destination subaccountid
                let destination_bytes = tx.to;
                let destination = bytes_to_hex(destination_bytes);
                console.log(`destination: ${destination}`);

            });

            break;
        case 'add_subaccount':
            console.log("Testing add_subaccount method:");
            console.log(await custodian.call('add_subaccount')); // ok
            break;
        case 'get_network':
            console.log("Testing get_network method:");
            console.log(await custodian.call('get_network')); // ok 
            break;
        case 'set_next_block':
            console.log("Testing set_next_block method:");
            console.log(await custodian.call('set_next_block', 12341790)); // ok
            break;
        case 'get_next_block':
            console.log("Testing get_next_block method:");
            console.log(await custodian.call('get_next_block')); // ok
            break;
        case 'set_interval':
            console.log("Testing set_interval method:");
            console.log(await custodian.call('set_interval', 1000)); // ok
            break;
        case 'get_interval':
            console.log("Testing get_interval method:");
            console.log(await custodian.call('get_interval')); // ok
            break;
        case 'get_nonce':
            console.log("Testing get_nonce method:");
            console.log(await custodian.call('get_nonce')); // ok
            break;
        case 'get_canister_principal':
            console.log("Testing get_canister_principal method:");
            console.log(await custodian.call('get_canister_principal')); // ok
            break;
        case 'get_subaccountid':
            console.log("Testing get_subaccountid method:");
            console.log(await custodian.call('get_subaccountid', 14));
            break;
        case 'get_subaccount_count':
            console.log("Testing get_subaccount_count method:");
            console.log(await custodian.call('get_subaccount_count'));
            break;
        case 'get_transactions_count':
            console.log("Testing get_transactions_count method:");
            console.log(await custodian.call('get_transactions_count'));
            break;
        case 'get_oldest_block':
            console.log("Testing get_oldest_block method:");
            console.log(await custodian.call('get_oldest_block'));
            break;
        case 'list_transactions':
            console.log("Testing list_transactions method:");
            // console.log(await custodian.call('list_transactions', []));
            const res = await custodian.call('list_transactions', []);

            // console.log(res);

            const op = res.Ok[3].sweep_status;

            console.log(op);

            // if (op[0]){
            //     // console.log(op[0]);
            //     console.log(`to: ${op[0].Transfer.to}`);
            //     console.log(`fee.e8s: ${op[0].Transfer.fee.e8s}`);
            //     console.log(`from: ${op[0].Transfer.from}`);
            //     console.log(`amount.e8s: ${op[0].Transfer.amount.e8s}`);
            // }
            
            break;
        case 'clear_transactions':
            console.log("Testing clear_transactions method:");
            console.log(await custodian.call('clear_transactions', { up_to_index: 100 }));
            break;
        case 'refund':
            console.log("Testing refund method:");
            console.log(await custodian.call('refund', 1));
            break;
        case 'sweep':
            console.log("Testing sweep method:");
            console.log(await custodian.call('sweep'));
            break;
        case 'canister_status':
            console.log("Testing canister_status method:");
            console.log(await custodian.call('canister_status'));
            break;
        case 'get_webhook_url':
            console.log("Testing get_webhook_url method:");
            console.log(await custodian.call('get_webhook_url'));
            break;
        case 'set_webhook_url':
            console.log("Testing set_webhook_url method:");
            console.log(await custodian.call('set_webhook_url', 'https://dbf3-45-38-189-1.ngrok-free.app'));
            break;
        default:
            console.log("Invalid test method specified.");
    }
})();