import * as dotenv from 'dotenv';
import * as path from 'path';
// @ts-ignore - Bypass TypeScript check for Express import
import express from 'express';
import * as ngrok from 'ngrok';
import {
  createHostAgentAndIdentityFromSeed,
  getIdentityFromSeed,
  setWebhookUrl,
  getWebhookUrl,
} from '../../src';

interface WebhookPayload {
  eventType: string;
  tokenType: string;
  amount: string;
  from: string;
  to: string;
  blockIndex: string;
  timestamp: string;
  transactionHash?: string;
}

// Token configuration for formatting
const TOKEN_CONFIGS = {
  ICP: { symbol: 'ICP', decimals: 8 },
  CKUSDC: { symbol: 'USDC', decimals: 6 },
  CKUSDT: { symbol: 'USDT', decimals: 6 },
};

function formatTokenAmount(amount: string, tokenType: string): string {
  const config = TOKEN_CONFIGS[tokenType as keyof typeof TOKEN_CONFIGS];
  if (!config) return `${amount} ${tokenType}`;
  
  const numAmount = Number(amount) / Math.pow(10, config.decimals);
  return `${numAmount.toFixed(config.decimals)} ${config.symbol}`;
}

function getTokenEmoji(tokenType: string): string {
  switch (tokenType) {
    case 'ICP': return '⚡';
    case 'CKUSDC': return '💵';
    case 'CKUSDT': return '💴';
    default: return '💰';
  }
}

async function main() {
  dotenv.config({ path: path.join(__dirname, '../../.env') });

  const seedPhrase = process.env.SEED_PHRASE;
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  const port = process.env.WEBHOOK_TEST_PORT || 3000;

  if (!seedPhrase || !userVaultCanisterId) {
    throw new Error(
      'Missing required environment variables: SEED_PHRASE or USER_VAULT_CANISTER_ID'
    );
  }

  console.log('🪝 ICSI Webhook Testing Tool');
  console.log('============================');

  // Create Express server for webhook endpoint
  const app = express();
  app.use(express.json());

  const receivedWebhooks: WebhookPayload[] = [];

  // Webhook endpoint
  app.post('/webhook', (req: express.Request, res: express.Response) => {
    const payload: WebhookPayload = req.body;
    const emoji = getTokenEmoji(payload.tokenType);
    const formattedAmount = formatTokenAmount(payload.amount, payload.tokenType);
    const timestamp = new Date(Number(payload.timestamp) / 1000000);
    
    console.log('\n🔔 WEBHOOK RECEIVED!');
    console.log('==================');
    console.log(`${emoji} Token: ${payload.tokenType}`);
    console.log(`💰 Amount: ${formattedAmount}`);
    console.log(`📦 Block: ${payload.blockIndex}`);
    console.log(`⏰ Time: ${timestamp.toISOString()}`);
    console.log(`📨 Event: ${payload.eventType}`);
    console.log(`📍 From: ${payload.from}`);
    console.log(`📍 To: ${payload.to}`);
    if (payload.transactionHash) {
      console.log(`🔗 Hash: ${payload.transactionHash}`);
    }
    console.log('==================');
    
    // Also log raw payload for debugging
    console.log('\n📋 Raw payload:');
    console.log(JSON.stringify(payload, null, 2));

    receivedWebhooks.push(payload);

    res.status(200).json({
      status: 'received',
      message: 'Webhook processed successfully',
      tokenType: payload.tokenType,
      amount: formattedAmount,
    });
  });

  // Status endpoint
  app.get('/status', (req: express.Request, res: express.Response) => {
    const tokenSummary = receivedWebhooks.reduce((acc, webhook) => {
      const tokenType = webhook.tokenType;
      if (!acc[tokenType]) {
        acc[tokenType] = { count: 0, totalAmount: 0 };
      }
      acc[tokenType].count++;
      acc[tokenType].totalAmount += Number(webhook.amount);
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);

    res.json({
      status: 'running',
      webhooksReceived: receivedWebhooks.length,
      tokenSummary,
      recentWebhooks: receivedWebhooks.slice(-5).map(webhook => ({
        tokenType: webhook.tokenType,
        amount: formatTokenAmount(webhook.amount, webhook.tokenType),
        blockIndex: webhook.blockIndex,
        timestamp: new Date(Number(webhook.timestamp) / 1000000).toISOString(),
        eventType: webhook.eventType,
      })),
      allWebhooks: receivedWebhooks,
    });
  });

  // Start server
  const server = app.listen(port, () => {
    console.log(`✅ Webhook server running on port ${port}`);
  });

  try {
    // Create ngrok tunnel
    console.log('\n🚇 Creating ngrok tunnel...');
    const ngrokUrl = await ngrok.connect({
      addr: port,
      region: 'us',
    });
    console.log(`✅ Ngrok tunnel created: ${ngrokUrl}`);

    const webhookUrl = `${ngrokUrl}/webhook`;
    console.log(`📍 Webhook URL: ${webhookUrl}`);

    // Create identity and agent
    const agent = await createHostAgentAndIdentityFromSeed(seedPhrase);
    const identity = await getIdentityFromSeed(seedPhrase);
    console.log('\n✅ Identity created from seed phrase');

    // Get current webhook URL
    console.log('\n📌 Checking current webhook URL...');
    const currentWebhookUrl = await getWebhookUrl(agent, userVaultCanisterId);
    console.log(`   Current URL: ${currentWebhookUrl || 'Not configured'}`);

    // Set new webhook URL
    console.log('\n🔧 Setting webhook URL...');
    await setWebhookUrl(agent, userVaultCanisterId, webhookUrl);
    console.log('✅ Webhook URL set successfully');

    // Verify webhook URL was set
    const verifyUrl = await getWebhookUrl(agent, userVaultCanisterId);
    console.log(`   Verified URL: ${verifyUrl}`);

    console.log('\n📊 Webhook Test Server Info:');
    console.log('============================');
    console.log(`Local server: http://localhost:${port}`);
    console.log(`Public URL: ${ngrokUrl}`);
    console.log(`Webhook endpoint: ${webhookUrl}`);
    console.log(`Status endpoint: ${ngrokUrl}/status`);

    console.log('\n⏳ Waiting for webhooks...');
    console.log('💡 To trigger webhooks, run these commands in separate terminals:');
    console.log('');
    console.log('   💵 USDC Test:');
    console.log('      pnpm lib:test:usdc');
    console.log('');
    console.log('   💴 USDT Test:');
    console.log('      pnpm lib:test:usdt');
    console.log('');
    console.log('   ⚡ ICP Test:');
    console.log('      pnpm lib:test:icp');
    console.log('');
    console.log('   📊 All Tests:');
    console.log('      pnpm lib:test:all');
    console.log('');
    console.log('🕐 Wait ~30 seconds after each deposit for indexing');
    console.log('🛑 Press Ctrl+C to stop the server\n');

    // Keep server running
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');

      // Reset webhook URL (optional)
      const resetWebhook = process.argv[2] !== '--keep-webhook';
      if (resetWebhook) {
        console.log('🔧 Resetting webhook URL...');
        await setWebhookUrl(agent, userVaultCanisterId, '');
        console.log('✅ Webhook URL reset');
      }

      console.log(
        `\n📊 Summary: Received ${receivedWebhooks.length} webhook(s)`
      );
      if (receivedWebhooks.length > 0) {
        console.log('\n🎯 Webhook Summary:');
        console.log('==================');
        receivedWebhooks.forEach((webhook, index) => {
          const emoji = getTokenEmoji(webhook.tokenType);
          const formattedAmount = formatTokenAmount(webhook.amount, webhook.tokenType);
          const timestamp = new Date(Number(webhook.timestamp) / 1000000);
          
          console.log(`\n${index + 1}. ${emoji} ${webhook.tokenType} ${webhook.eventType.toUpperCase()}`);
          console.log(`   💰 Amount: ${formattedAmount}`);
          console.log(`   📦 Block: ${webhook.blockIndex}`);
          console.log(`   ⏰ Time: ${timestamp.toLocaleString()}`);
        });
        console.log('==================');
      }

      await ngrok.disconnect();
      await ngrok.kill();
      server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error:', error);
    server.close();
    process.exit(1);
  }
}

main().catch(console.error);
