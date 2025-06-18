#!/usr/bin/env ts-node

import { testQueryFunctions } from './testQueryFunctions';
import { testUpdateFunctions } from './testUpdateFunctions';

async function testAllFunctions() {
  console.log('🚀 Running Comprehensive ICSI Library Function Tests');
  console.log('='.repeat(80));

  const startTime = Date.now();

  try {
    console.log('\n📖 PHASE 1: Testing Query Functions (Read-only)');
    console.log('-'.repeat(50));
    await testQueryFunctions();

    console.log('\n✏️  PHASE 2: Testing Update Functions (State-modifying)');
    console.log('-'.repeat(50));
    await testUpdateFunctions();
  } catch (error) {
    console.error('❌ Testing failed with error:', error);
    process.exit(1);
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\n🎉 ALL TESTS COMPLETED!');
  console.log('='.repeat(80));
  console.log(`⏱️  Total duration: ${duration.toFixed(2)} seconds`);
  console.log('📄 Check the output above for individual test results');
  console.log('🔧 Review any failed tests and canister state changes');
}

// Run if called directly
if (require.main === module) {
  testAllFunctions().catch(console.error);
}

export { testAllFunctions };
