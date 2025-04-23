/**
 * Checks if a value is not empty or throws an error.
 * @param value - The value to check.
 * @param errorMessage - The error message to throw if the value is empty.
 * @throws {Error} - Throws an error with the specified message if the value is empty.
 */
export function isNotEmptyOrError(value: any, errorMessage: string): void {
  if (!value) {
    throw new Error(errorMessage);
  }
}

/**
 * Creates an HTTP agent and identity from a seed phrase.
 * This is a placeholder implementation.
 * You'll need to implement this function based on your specific requirements.
 * @param seedPhrase - The seed phrase to use for identity creation.
 * @returns The HTTP agent and identity.
 */
export function createHostAgentAndIdentityFromSeed(seedPhrase: string) {
  // Implement agent and identity creation logic here
  // This is a placeholder implementation
  return {
    agent: {},
    identity: {},
  };
}
