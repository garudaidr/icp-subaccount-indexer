import getDepositAddresses from './getDepositAddresses';
import sweepAll from './sweepAll';
import getBalances from './getBalances';

async function runAll() {
  console.log('===== RUNNING ALL TEST SCRIPTS =====\n');

  console.log('===== 1. GET DEPOSIT ADDRESSES =====');
  await getDepositAddresses();
  console.log('\n');

  console.log('===== 2. CHECK BALANCES =====');
  await getBalances();
  console.log('\n');

  console.log('===== 3. SWEEP ALL TOKENS =====');
  await sweepAll();
  console.log('\n');

  console.log('===== 4. CHECK BALANCES AFTER SWEEP =====');
  await getBalances();
  console.log('\n');

  console.log('===== ALL TESTS COMPLETED =====');
}

// Run the function if this script is executed directly
if (require.main === module) {
  runAll()
    .then(() => process.exit(0))
    .catch((error: any) => {
      console.error('Error running tests:', error.message);
      process.exit(1);
    });
}

export default runAll;
