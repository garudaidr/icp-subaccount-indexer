// Type exports
export * from './userVault.did';

// Authentication function exports
export { addHttpAgentFromSeed } from './auth';

// Utility function exports
export {
  isNotEmptyOrError,
  getIdentityFromSeed,
  createHostAgentAndIdentityFromSeed,
} from './utils';

// Query function exports
export {
  getUserVaultTransactions,
  getUserVaultInterval,
  getTransactionsCount,
  getNonce,
  getSubaccountCount,
  getSubaccountId,
  getWebhookUrl,
  getCanisterPrincipal,
  getIcrcAccount,
  getNetwork,
  getNextBlock,
  getOldestBlock,
  getRegisteredTokens,
  getTransactionTokenType,
} from './query';

// Update function exports
export {
  refund,
  setUserVaultInterval,
  sweep,
  sweepByTokenType,
  addSubaccount,
  addSubaccountForToken,
  clearTransactions,
  setWebhookUrl,
  registerToken,
  sweepSubaccountId,
  convertToIcrcAccount,
  validateIcrcAccount,
  singleSweep,
  setSweepFailed,
} from './update';

// Helper function exports
export {
  Tokens,
  getTokenConfig,
  getDepositAddresses,
  getBalances,
  getTransactionsByTokenType,
  type TokenConfig,
  type DepositAddress,
  type TokenBalance,
} from './helpers';
