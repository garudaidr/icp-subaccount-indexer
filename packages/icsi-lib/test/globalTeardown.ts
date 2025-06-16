import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Tearing down Docker test environment...');

  const projectRoot = join(__dirname, '../../../..');
  const dockerComposeFile = join(
    __dirname,
    '../docker/docker-compose.test.yml'
  );

  try {
    // Stop and remove all containers
    await execAsync(
      `docker compose -f ${dockerComposeFile} down -v --remove-orphans`,
      {
        cwd: projectRoot,
      }
    );

    console.log('✅ Test environment cleanup complete!');
  } catch (error) {
    console.warn('⚠️  Warning: Failed to cleanup test environment:', error);
    // Don't throw here as it's just cleanup
  }
}
