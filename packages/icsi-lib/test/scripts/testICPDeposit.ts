import * as dotenv from 'dotenv';
import * as path from 'path';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import {
  createHostAgentAndIdentityFromSeed,
  getIdentityFromSeed,
  getTokenConfig,
  Tokens,
  getDepositAddresses,
  getWebhookUrl,
  getBalances,
  getTransactionsByTokenType,
} from '../../src';

// ICP transfer interface
const transferArg = IDL.Record({
  to: IDL.Vec(IDL.Nat8),
  fee: IDL.Record({ e8s: IDL.Nat64 }),
  memo: IDL.Nat64,
  from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  created_at_time: IDL.Opt(IDL.Record({ timestamp_nanos: IDL.Nat64 })),
  amount: IDL.Record({ e8s: IDL.Nat64 }),
});

const transferResult = IDL.Variant({
  Ok: IDL.Nat64,
  Err: IDL.Variant({
    BadFee: IDL.Record({ expected_fee: IDL.Record({ e8s: IDL.Nat64 }) }),
    InsufficientFunds: IDL.Record({ balance: IDL.Record({ e8s: IDL.Nat64 }) }),
    TxTooOld: IDL.Record({ allowed_window_nanos: IDL.Nat64 }),
    TxCreatedInFuture: IDL.Null,
    TxDuplicate: IDL.Record({ duplicate_of: IDL.Nat64 }),
  }),
});

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Convert Principal and subaccount to account identifier (32 bytes)
function principalToAccountIdentifier(
  principal: Principal,
  subaccount?: Uint8Array
): Uint8Array {
  const padding = new Uint8Array(4); // 4 bytes padding
  padding[0] = 0x0a; // account identifier prefix
  padding[1] = 0x00; // account identifier tag
  padding[2] = 0x00; // account identifier length
  padding[3] = 0x00; // account identifier checksum

  const principalBytes = principal.toUint8Array();
  const subaccountBytes = subaccount || new Uint8Array(32);

  // Account identifier = padding + principal + subaccount
  const accountId = new Uint8Array(32);

  // Hash the principal and subaccount
  const crypto = require('crypto');
  const hash = crypto.createHash('sha224');
  hash.update(padding);
  hash.update(principalBytes);
  hash.update(subaccountBytes);

  const result = hash.digest();
  // Add CRC32 checksum
  const crc32 = require('buffer-crc32');
  const checksum = crc32(result);

  const finalAccountId = new Uint8Array(32);
  finalAccountId.set(checksum, 0);
  finalAccountId.set(result.slice(0, 28), 4);

  return finalAccountId;
}

async function main() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });

  const seedPhrase = process.env.SEED_PHRASE;
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;

  if (!seedPhrase || !userVaultCanisterId) {
    throw new Error(
      'Missing required environment variables: SEED_PHRASE or USER_VAULT_CANISTER_ID'
    );
  }

  console.log('🚀 Testing ICP Deposit with ICSI Canister');
  console.log('==========================================');

  // Create identity and agent
  const agent = await createHostAgentAndIdentityFromSeed(seedPhrase);
  const identity = await getIdentityFromSeed(seedPhrase);
  const principal = identity.getPrincipal();
  console.log('✅ Identity created from seed phrase');
  console.log(`📍 Principal: ${principal.toText()}`);

  // Get ICP token config
  const icpConfig = getTokenConfig(Tokens.ICP);
  console.log(`\n💰 ICP Token Config:`);
  console.log(`   Canister ID: ${icpConfig.canisterId}`);
  console.log(`   Symbol: ${icpConfig.symbol}`);
  console.log(`   Decimals: ${icpConfig.decimals}`);

  // Get deposit addresses
  console.log('\n📬 Getting deposit addresses...');
  const depositAddresses = await getDepositAddresses(
    agent,
    userVaultCanisterId
  );
  const icpDepositAddress = depositAddresses.find(
    (addr: any) => 'ICP' in addr.tokenType
  );

  if (!icpDepositAddress) {
    throw new Error('ICP deposit address not found');
  }

  console.log(`✅ ICP Deposit Address: ${icpDepositAddress.depositAddress}`);
  console.log(`   Subaccount ID: ${icpDepositAddress.subaccountId}`);

  // Get subaccount bytes (32 bytes)
  const subaccountBytes = new Uint8Array(32);
  // The subaccountId is a number, we need to convert it to 32-byte array
  const subaccountId = BigInt(icpDepositAddress.subaccountId);
  for (let i = 0; i < 8; i++) {
    subaccountBytes[31 - i] = Number(
      (subaccountId >> BigInt(8 * i)) & BigInt(0xff)
    );
  }

  // Create ICP ledger actor
  const icpActor = Actor.createActor(
    () => {
      return IDL.Service({
        transfer: IDL.Func([transferArg], [transferResult], []),
        account_balance: IDL.Func(
          [IDL.Record({ account: IDL.Vec(IDL.Nat8) })],
          [IDL.Record({ e8s: IDL.Nat64 })],
          ['query']
        ),
      });
    },
    {
      agent,
      canisterId: icpConfig.canisterId,
    }
  );

  // Get sender's account identifier
  const senderAccountId = principalToAccountIdentifier(principal);

  // Check sender's ICP balance
  console.log('\n💸 Checking sender ICP balance...');
  const senderBalanceResult = (await icpActor.account_balance({
    account: Array.from(senderAccountId),
  })) as { e8s: bigint };

  const senderBalance = senderBalanceResult.e8s;
  const senderBalanceFormatted =
    Number(senderBalance) / Math.pow(10, icpConfig.decimals);
  console.log(`   Balance: ${senderBalanceFormatted} ICP`);

  // Minimum balance check (0.1 ICP + 0.0001 ICP fee)
  const minimumBalance = BigInt(10010000); // 0.1001 ICP in e8s
  if (senderBalance < minimumBalance) {
    console.log(
      `❌ Insufficient ICP balance. Need at least ${Number(minimumBalance) / 1e8} ICP (including fee)`
    );
    console.log(`   Current balance: ${senderBalanceFormatted} ICP`);
    console.log(`   Required: 0.1 ICP for transfer + 0.0001 ICP for fee`);
    return;
  }

  // Transfer amount (0.1 ICP)
  const transferAmount = BigInt(10000000); // 0.1 ICP (8 decimals)
  const fee = BigInt(10000); // 0.0001 ICP fee

  console.log(
    `\n💸 Sending ${Number(transferAmount) / Math.pow(10, icpConfig.decimals)} ICP to deposit address...`
  );

  // Get deposit account identifier
  const depositAccountId = principalToAccountIdentifier(
    Principal.fromText(userVaultCanisterId),
    subaccountBytes
  );

  // Make the transfer
  try {
    const transferResult = (await icpActor.transfer({
      to: Array.from(depositAccountId),
      amount: { e8s: transferAmount },
      fee: { e8s: fee },
      memo: BigInt(0),
      from_subaccount: [],
      created_at_time: [],
    })) as any;

    if ('Ok' in transferResult) {
      console.log(`✅ Transfer successful! Block height: ${transferResult.Ok}`);
    } else {
      console.log('❌ Transfer failed:', transferResult.Err);
      return;
    }
  } catch (error) {
    console.error('❌ Transfer error:', error);
    return;
  }

  // Check webhook URL
  console.log('\n🔔 Checking webhook configuration...');
  const webhookUrl = await getWebhookUrl(agent, userVaultCanisterId);
  console.log(`   Webhook URL: ${webhookUrl || 'Not configured'}`);

  // Wait for transaction to be indexed
  console.log('\n⏳ Waiting for transaction to be indexed (30 seconds)...');
  await sleep(30000);

  // Check balances
  console.log('\n💰 Checking ICSI balances...');
  const balances = await getBalances(agent, userVaultCanisterId);
  const icpBalance = balances.find((b: any) => 'ICP' in b.tokenType);

  if (icpBalance) {
    const formattedBalance =
      Number(icpBalance.amount) / Math.pow(10, icpConfig.decimals);
    console.log(`   ICP Balance: ${formattedBalance} ICP`);
  }

  // Get recent transactions
  console.log('\n📊 Fetching recent ICP transactions...');
  const transactions = await getTransactionsByTokenType(
    agent,
    userVaultCanisterId,
    { ICP: null }
  );

  if (transactions.length > 0) {
    console.log(`   Found ${transactions.length} ICP transaction(s)`);
    const latestTx = transactions[0];
    console.log(`   Latest transaction:`);
    console.log(`     - Block Index: ${latestTx.blockIndex}`);
    console.log(
      `     - Amount: ${Number(latestTx.amount) / Math.pow(10, icpConfig.decimals)} ICP`
    );
    console.log(`     - From: ${latestTx.from}`);
    console.log(`     - To: ${latestTx.to}`);
    console.log(
      `     - Timestamp: ${new Date(Number(latestTx.timestamp) / 1000000).toISOString()}`
    );
  }

  console.log('\n✅ ICP deposit test completed successfully!');
}

main().catch(console.error);
