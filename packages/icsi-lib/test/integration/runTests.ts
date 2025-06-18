#!/usr/bin/env ts-node

import { testQueryFunctions } from './testQueryFunctions';
import { testUpdateFunctions } from './testUpdateFunctions';
import { testAllFunctions } from './testAllFunctions';
import { testTokenOperations } from './testTokenOperations';

interface TestSuite {
  name: string;
  description: string;
  fn: () => Promise<void>;
  warning?: string;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'query',
    description: 'Query Functions Only (Read-only, Safe)',
    fn: testQueryFunctions,
  },
  {
    name: 'update',
    description: 'Update Functions Only (State-modifying)',
    fn: testUpdateFunctions,
    warning: 'This will modify canister state!',
  },
  {
    name: 'tokens',
    description: 'Token-Specific Operations (Registration, Subaccounts, etc.)',
    fn: testTokenOperations,
    warning: 'This will register tokens and create subaccounts!',
  },
  {
    name: 'all',
    description: 'All Function Tests (Query + Update)',
    fn: testAllFunctions,
    warning: 'This will modify canister state extensively!',
  },
];

function printUsage() {
  console.log('🧪 ICSI Library Test Suite');
  console.log('='.repeat(50));
  console.log('');
  console.log('Usage: pnpm run test:functions [suite]');
  console.log('   or: ts-node runTests.ts [suite]');
  console.log('');
  console.log('Available test suites:');
  console.log('');

  TEST_SUITES.forEach((suite) => {
    console.log(`📋 ${suite.name.padEnd(8)} - ${suite.description}`);
    if (suite.warning) {
      console.log(`   ⚠️  WARNING: ${suite.warning}`);
    }
    console.log('');
  });

  console.log('Examples:');
  console.log('  pnpm run test:functions query     # Safe read-only tests');
  console.log('  pnpm run test:functions tokens    # Token operations');
  console.log('  pnpm run test:functions all       # All tests (destructive)');
  console.log('');
}

async function runTestSuite(suiteName: string) {
  const suite = TEST_SUITES.find((s) => s.name === suiteName);

  if (!suite) {
    console.error(`❌ Unknown test suite: ${suiteName}`);
    console.log('');
    printUsage();
    process.exit(1);
  }

  console.log(`🚀 Running Test Suite: ${suite.name}`);
  console.log(`📄 Description: ${suite.description}`);

  if (suite.warning) {
    console.log(`⚠️  WARNING: ${suite.warning}`);
    console.log('');

    // Add a small delay for destructive tests
    if (suiteName !== 'query') {
      console.log('Starting in 3 seconds... (Ctrl+C to cancel)');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    await suite.fn();

    const duration = (Date.now() - startTime) / 1000;
    console.log('');
    console.log('🎉 Test Suite Completed Successfully!');
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
  } catch (error) {
    console.error('');
    console.error('❌ Test Suite Failed:');
    console.error(error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const suiteName = args[0].toLowerCase();

  if (suiteName === 'help' || suiteName === '--help' || suiteName === '-h') {
    printUsage();
    process.exit(0);
  }

  await runTestSuite(suiteName);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { runTestSuite, TEST_SUITES };
