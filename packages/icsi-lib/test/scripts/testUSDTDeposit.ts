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

// CKUSDT transfer interface (same as CKUSDC)
const transferArg = IDL.Record({
  to: IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  }),
  fee: IDL.Opt(IDL.Nat),
  memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
  from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  created_at_time: IDL.Opt(IDL.Nat64),
  amount: IDL.Nat,
});

const transferResult = IDL.Variant({
  Ok: IDL.Nat,
  Err: IDL.Variant({
    GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
    TemporarilyUnavailable: IDL.Null,
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    TooOld: IDL.Null,
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
  }),
});

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  console.log('🚀 Testing USDT Deposit with ICSI Canister');
  console.log('==========================================');

  // Create identity and agent
  const agent = await createHostAgentAndIdentityFromSeed(seedPhrase);
  const identity = await getIdentityFromSeed(seedPhrase);
  const principal = identity.getPrincipal();
  console.log('✅ Identity created from seed phrase');
  console.log(`📍 Principal: ${principal.toText()}`);

  // Get CKUSDT token config
  const ckusdtConfig = getTokenConfig(Tokens.CKUSDT);
  console.log(`\n💰 CKUSDT Token Config:`);
  console.log(`   Canister ID: ${ckusdtConfig.canisterId}`);
  console.log(`   Symbol: ${ckusdtConfig.symbol}`);
  console.log(`   Decimals: ${ckusdtConfig.decimals}`);

  // Get deposit addresses
  console.log('\n📬 Getting deposit addresses...');
  const depositAddresses = await getDepositAddresses(
    agent,
    userVaultCanisterId
  );
  const ckusdtDepositAddress = depositAddresses.find(
    (addr: any) => 'CKUSDT' in addr.tokenType
  );

  if (!ckusdtDepositAddress) {
    throw new Error('CKUSDT deposit address not found');
  }

  console.log(
    `✅ CKUSDT Deposit Address: ${ckusdtDepositAddress.depositAddress}`
  );
  console.log(`   Subaccount ID: ${ckusdtDepositAddress.subaccountId}`);

  // Convert deposit address to principal and subaccount
  const depositPrincipal = Principal.fromText(
    ckusdtDepositAddress.depositAddress
  );

  // Get subaccount bytes (32 bytes)
  const subaccountBytes = new Uint8Array(32);
  // The subaccountId is a number, we need to convert it to 32-byte array
  const subaccountId = BigInt(ckusdtDepositAddress.subaccountId);
  for (let i = 0; i < 8; i++) {
    subaccountBytes[31 - i] = Number(
      (subaccountId >> BigInt(8 * i)) & BigInt(0xff)
    );
  }

  // Create CKUSDT actor
  const ckusdtActor = Actor.createActor(
    () => {
      return IDL.Service({
        icrc1_transfer: IDL.Func([transferArg], [transferResult], []),
        icrc1_balance_of: IDL.Func(
          [
            IDL.Record({
              owner: IDL.Principal,
              subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
            }),
          ],
          [IDL.Nat],
          ['query']
        ),
      });
    },
    {
      agent,
      canisterId: ckusdtConfig.canisterId,
    }
  );

  // Check sender's CKUSDT balance
  console.log('\n💸 Checking sender CKUSDT balance...');
  const senderBalance = (await ckusdtActor.icrc1_balance_of({
    owner: principal,
    subaccount: [],
  })) as bigint;

  const senderBalanceFormatted =
    Number(senderBalance) / Math.pow(10, ckusdtConfig.decimals);
  console.log(`   Balance: ${senderBalanceFormatted} CKUSDT`);

  // Minimum balance check (0.1 CKUSDT + fee)
  const transferAmount = BigInt(100000); // 0.1 CKUSDT (6 decimals)
  const fee = BigInt(10); // CKUSDT fee
  const minimumBalance = transferAmount + fee;

  if (senderBalance < minimumBalance) {
    console.log(
      `❌ Insufficient CKUSDT balance. Need at least ${Number(minimumBalance) / Math.pow(10, ckusdtConfig.decimals)} CKUSDT`
    );
    console.log(`   Current balance: ${senderBalanceFormatted} CKUSDT`);
    console.log(
      `   Required: ${Number(transferAmount) / Math.pow(10, ckusdtConfig.decimals)} CKUSDT for transfer + ${Number(fee) / Math.pow(10, ckusdtConfig.decimals)} CKUSDT for fee`
    );
    return;
  }

  console.log(
    `\n💸 Sending ${Number(transferAmount) / Math.pow(10, ckusdtConfig.decimals)} CKUSDT to deposit address...`
  );

  // Make the transfer
  try {
    const transferResult = (await ckusdtActor.icrc1_transfer({
      to: {
        owner: Principal.fromText(userVaultCanisterId),
        subaccount: [subaccountBytes],
      },
      amount: transferAmount,
      fee: [fee],
      memo: [],
      from_subaccount: [],
      created_at_time: [],
    })) as any;

    if ('Ok' in transferResult) {
      console.log(`✅ Transfer successful! Block height: ${transferResult.Ok}`);
    } else {
      console.log('❌ Transfer failed:', transferResult.Err);
      if ('InsufficientFunds' in transferResult.Err) {
        const balance = transferResult.Err.InsufficientFunds.balance;
        console.log(
          `   Your balance: ${Number(balance) / Math.pow(10, ckusdtConfig.decimals)} CKUSDT`
        );
      }
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
  const ckusdtBalance = balances.find((b: any) => 'CKUSDT' in b.tokenType);

  if (ckusdtBalance) {
    const formattedBalance =
      Number(ckusdtBalance.amount) / Math.pow(10, ckusdtConfig.decimals);
    console.log(`   CKUSDT Balance: ${formattedBalance} CKUSDT`);
  }

  // Get recent transactions
  console.log('\n📊 Fetching recent CKUSDT transactions...');
  const transactions = await getTransactionsByTokenType(
    agent,
    userVaultCanisterId,
    { CKUSDT: null }
  );

  if (transactions.length > 0) {
    console.log(`   Found ${transactions.length} CKUSDT transaction(s)`);
    const latestTx = transactions[0];
    console.log(`   Latest transaction:`);
    console.log(`     - Block Index: ${latestTx.blockIndex}`);
    console.log(
      `     - Amount: ${Number(latestTx.amount) / Math.pow(10, ckusdtConfig.decimals)} CKUSDT`
    );
    console.log(`     - From: ${latestTx.from}`);
    console.log(`     - To: ${latestTx.to}`);
    console.log(
      `     - Timestamp: ${new Date(Number(latestTx.timestamp) / 1000000).toISOString()}`
    );
  }

  console.log('\n✅ USDT deposit test completed successfully!');
}

main().catch(console.error);
