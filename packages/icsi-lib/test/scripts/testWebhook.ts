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
    case 'ICP':
      return '⚡';
    case 'CKUSDC':
      return '💵';
    case 'CKUSDT':
      return '💴';
    default:
      return '💰';
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
    // The canister sends tx_hash as a query parameter, not JSON body
    const txHash = req.query.tx_hash as string;
    const payload = req.body;

    console.log('\n🔔 WEBHOOK RECEIVED!');
    console.log('==================');

    if (txHash) {
      console.log(`🔗 Transaction Hash: ${txHash}`);
    }

    // Log raw request details for debugging
    console.log('\n📋 Request Details:');
    console.log('Query Parameters:', req.query);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('==================');

    // Create a webhook record for tracking
    const webhookRecord = {
      timestamp: new Date().toISOString(),
      txHash: txHash || 'unknown',
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body,
      headers: req.headers,
    };

    receivedWebhooks.push(webhookRecord as any);

    res.status(200).json({
      status: 'received',
      message: 'Webhook processed successfully',
      txHash: txHash,
      receivedAt: new Date().toISOString(),
    });
  });

  // Status endpoint
  app.get('/status', (req: express.Request, res: express.Response) => {
    res.json({
      status: 'running',
      webhooksReceived: receivedWebhooks.length,
      recentWebhooks: receivedWebhooks.slice(-5),
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
    console.log(
      '💡 To trigger webhooks, run these commands in separate terminals:'
    );
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
          console.log(
            `\n${index + 1}. 🔗 Transaction Hash: ${(webhook as any).txHash}`
          );
          console.log(`   ⏰ Received: ${(webhook as any).timestamp}`);
          console.log(`   📡 Method: ${(webhook as any).method}`);
          console.log(`   🌐 URL: ${(webhook as any).url}`);
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
