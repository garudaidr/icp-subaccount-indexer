import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import fetch from 'cross-fetch';

const execAsync = promisify(exec);

export default async function globalSetup(): Promise<void> {
  console.log('🔧 Setting up Docker test environment...');

  const projectRoot = join(__dirname, '../../../..');
  const dockerComposeFile = join(
    __dirname,
    '../docker/docker-compose.test.yml'
  );

  try {
    // Stop any existing containers
    console.log('🧹 Cleaning up existing containers...');
    await execAsync(`docker-compose -f ${dockerComposeFile} down -v`, {
      cwd: projectRoot,
    }).catch(() => {
      // Ignore errors if containers don't exist
    });

    // Start the test environment
    console.log('🚀 Starting Docker test environment...');
    await execAsync(`docker-compose -f ${dockerComposeFile} up -d dfx`, {
      cwd: projectRoot,
    });

    // Wait for DFX to be ready
    console.log('⏳ Waiting for DFX to be ready...');
    let retries = 30;
    while (retries > 0) {
      try {
        const response = await fetch('http://localhost:4943/_/api/v2/status');
        if (response.ok) {
          console.log('✅ DFX is ready!');
          break;
        }
      } catch (error) {
        // DFX not ready yet
      }

      retries--;
      if (retries === 0) {
        throw new Error('DFX failed to start within timeout');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Deploy test tokens
    console.log('📦 Deploying test tokens...');
    await execAsync(`docker-compose -f ${dockerComposeFile} up test-tokens`, {
      cwd: projectRoot,
    });

    // Deploy ICSI indexer
    console.log('🏗️  Deploying ICSI indexer...');
    await execAsync(`docker-compose -f ${dockerComposeFile} up icsi-indexer`, {
      cwd: projectRoot,
    });

    console.log('🎉 Test environment setup complete!');

    // Save setup completion flag
    process.env.TEST_ENV_READY = 'true';
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  }
}
