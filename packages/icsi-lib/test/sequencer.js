const TestSequencer = require('@jest/test-sequencer').default;

class CustomTestSequencer extends TestSequencer {
  sort(tests) {
    // Sort tests to run setup tests first, then integration tests
    const setupTests = tests.filter((test) => test.path.includes('setup'));
    const integrationTests = tests.filter((test) =>
      test.path.includes('integration')
    );
    const unitTests = tests.filter(
      (test) =>
        !test.path.includes('setup') && !test.path.includes('integration')
    );

    return [...setupTests, ...unitTests, ...integrationTests];
  }
}

module.exports = CustomTestSequencer;
