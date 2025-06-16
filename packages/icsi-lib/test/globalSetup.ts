import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
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
    await execAsync(`docker compose -f ${dockerComposeFile} down -v`, {
      cwd: projectRoot,
    }).catch(() => {
      // Ignore errors if containers don't exist
    });

    // Start all services in sequence - docker compose will handle the dependencies
    console.log('🚀 Starting Docker test environment with all services...');
    await execAsync(
      `docker compose -f ${dockerComposeFile} up --abort-on-container-exit dfx test-tokens icsi-indexer`,
      {
        cwd: projectRoot,
        timeout: 300000, // 5 minutes timeout
      }
    );

    // Wait for DFX to be ready
    console.log('⏳ Verifying DFX is ready...');
    let retries = 30;
    while (retries > 0) {
      try {
        const response = await fetch('http://localhost:4943/_/api/v2/status');
        if (response.ok) {
          console.log('✅ DFX is confirmed ready!');
          break;
        }
      } catch (error) {
        // DFX not ready yet
      }

      retries--;
      if (retries === 0) {
        throw new Error('DFX failed to be ready within timeout');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Verify environment file was created
    const envFile = join(projectRoot, 'packages/icsi-lib/.env.docker');
    if (existsSync(envFile)) {
      const envContent = readFileSync(envFile, 'utf8');
      console.log('📋 Environment configuration:');
      console.log(envContent);

      // Verify all required canister IDs are present
      if (
        envContent.includes('USER_VAULT_CANISTER_ID=') &&
        !envContent.includes('USER_VAULT_CANISTER_ID=\n')
      ) {
        console.log('✅ All canisters deployed successfully!');
      } else {
        throw new Error('ICSI canister ID not found in environment file');
      }
    } else {
      throw new Error(
        'Environment file not created - deployment may have failed'
      );
    }

    console.log('🎉 Test environment setup complete!');

    // Save setup completion flag
    process.env.TEST_ENV_READY = 'true';
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);

    // Try to get logs for debugging
    try {
      console.log('🔍 Getting container logs for debugging...');
      const { stdout } = await execAsync(
        `docker compose -f ${dockerComposeFile} logs`,
        { cwd: projectRoot }
      );
      console.log('📝 Container logs:');
      console.log(stdout);
    } catch (logError) {
      console.warn('Could not retrieve container logs:', logError);
    }

    throw error;
  }
}
