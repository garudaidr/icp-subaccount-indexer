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
    const payload = req.body;
    console.log('\n📨 Webhook received:');
    console.log(JSON.stringify(payload, null, 2));

    receivedWebhooks.push(payload);

    res.status(200).json({
      status: 'received',
      message: 'Webhook processed successfully',
    });
  });

  // Status endpoint
  app.get('/status', (req: express.Request, res: express.Response) => {
    res.json({
      status: 'running',
      webhooksReceived: receivedWebhooks.length,
      webhooks: receivedWebhooks,
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
    console.log('💡 To trigger a webhook:');
    console.log('   1. Send USDC to your ICSI deposit address');
    console.log('   2. Run: npm run test:usdc-deposit');
    console.log('   3. Wait for the transaction to be indexed (~30 seconds)');
    console.log('\n🛑 Press Ctrl+C to stop the server\n');

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
        console.log('Webhooks:');
        receivedWebhooks.forEach((webhook, index) => {
          console.log(
            `\n${index + 1}. ${webhook.eventType} - ${webhook.tokenType}`
          );
          console.log(`   Amount: ${webhook.amount}`);
          console.log(`   Block: ${webhook.blockIndex}`);
        });
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
