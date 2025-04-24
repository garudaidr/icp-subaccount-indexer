import { Actor, HttpAgent } from '@dfinity/agent';
import { isNotEmptyOrError } from './utils';
import { _SERVICE, idlFactory, TokenType } from './userVault.did';

/**
 * Creates an actor for interacting with a user vault canister.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {_SERVICE} - The actor instance.
 */
function createUserVaultActor(
  agent: HttpAgent,
  userVaultCanisterId: string
): _SERVICE {
  isNotEmptyOrError(
    userVaultCanisterId,
    'User Vault Canister ID is undefined.'
  );

  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId,
  });
}

/**
 * Calls the list_transactions function on a canister to fetch transactions.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @param {bigint} [upToIndex] - The number of blocks for the transactions to fetch.
 * @returns {Promise<StoredTransactions[]>} - The list of transactions.
 */
export async function getUserVaultTransactions(
  agent: HttpAgent,
  userVaultCanisterId: string,
  upToIndex?: bigint
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.list_transactions(upToIndex ? [upToIndex] : []);
}

/**
 * Calls the get_interval function on a canister to get the interval.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<bigint>} - The interval value.
 */
export async function getUserVaultInterval(
  agent: HttpAgent,
  userVaultCanisterId: string
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_interval();
}

/**
 * Calls the get_transactions_count function on a canister to get the transaction count.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<number>} - The transaction count.
 */
export async function getTransactionsCount(
  agent: HttpAgent,
  userVaultCanisterId: string
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_transactions_count();
}

/**
 * Calls the get_nonce function on a canister to get the nonce value.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<number>} - The nonce value.
 */
export async function getNonce(agent: HttpAgent, userVaultCanisterId: string) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_nonce();
}

/**
 * Calls the get_subaccount_count function on a canister to get the subaccount count.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<number>} - The subaccount count.
 */
export async function getSubaccountCount(
  agent: HttpAgent,
  userVaultCanisterId: string
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_subaccount_count();
}

/**
 * Calls the get_subaccountid function on a canister to get the subaccount ID by index.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @param {number} index - The index of the subaccount.
 * @returns {Promise<string>} - The subaccount ID.
 */
export async function getSubaccountId(
  agent: HttpAgent,
  userVaultCanisterId: string,
  index: number,
  tokenType: TokenType
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_subaccountid(index, [tokenType]);
}

/**
 * Retrieves the webhook URL set for the user's vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<string>} - A promise that resolves to the webhook URL.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getWebhookUrl(
  agent: HttpAgent,
  userVaultCanisterId: string
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_webhook_url();
}

/**
 * Gets the principal of the user vault canister.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<string>} - A promise that resolves to the canister principal.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getCanisterPrincipal(
  agent: HttpAgent,
  userVaultCanisterId: string
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_canister_principal();
}

/**
 * Gets the ICRC-1 account representation for a subaccount.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @param {number} index - The index of the subaccount.
 * @returns {Promise<string>} - A promise that resolves to the ICRC-1 account.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getIcrcAccount(
  agent: HttpAgent,
  userVaultCanisterId: string,
  index: number
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_icrc_account(index);
}

/**
 * Gets the network the user vault is running on (Mainnet or Local).
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<"Mainnet" | "Local">} - A promise that resolves to the network.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getNetwork(
  agent: HttpAgent,
  userVaultCanisterId: string
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_network();
}

/**
 * Gets the next block to be processed by the user vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<bigint>} - A promise that resolves to the next block.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getNextBlock(
  agent: HttpAgent,
  userVaultCanisterId: string
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_next_block();
}

/**
 * Gets the oldest block processed by the user vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<bigint | undefined>} - A promise that resolves to the oldest block or undefined.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getOldestBlock(
  agent: HttpAgent,
  userVaultCanisterId: string
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_oldest_block();
}

/**
 * Gets the token types registered with the user vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<[TokenType, string][]>} - A promise that resolves to an array of token types and their canister IDs.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getRegisteredTokens(
  agent: HttpAgent,
  userVaultCanisterId: string
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_registered_tokens();
}

/**
 * Gets the token type for a specific transaction.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @param {string} txHash - The transaction hash.
 * @returns {Promise<TokenType>} - A promise that resolves to the token type.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getTransactionTokenType(
  agent: HttpAgent,
  userVaultCanisterId: string,
  txHash: string
) {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_transaction_token_type(txHash);
}
