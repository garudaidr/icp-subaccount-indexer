import { Actor, HttpAgent } from "@dfinity/agent";
import { isNotEmptyOrError } from "./utils";
import { _SERVICE, idlFactory, TokenType } from "./userVault.did";

/**
 * Calls the list_transactions function on a canister to fetch transactions.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {bigint} [upToIndex] - The number of blocks for the transactions to fetch.
 * @returns {Promise<StoredTransactions[]>} - The list of transactions.
 */
export async function getUserVaultTransactions(
  agent: HttpAgent,
  upToIndex?: bigint
) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(userVaultCanisterId, "User Vault ID is undefined.");

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.list_transactions(upToIndex ? [upToIndex] : []);
}

/**
 * Calls the get_interval function on a canister to get the interval.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<bigint>} - The interval value.
 */
export async function getUserVaultInterval(agent: HttpAgent) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_interval();
}

/**
 * Calls the get_transactions_count function on a canister to get the transaction count.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<number>} - The transaction count.
 */
export async function getTransactionsCount(agent: HttpAgent) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_transactions_count();
}

/**
 * Calls the get_nonce function on a canister to get the nonce value.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<number>} - The nonce value.
 */
export async function getNonce(agent: HttpAgent) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_nonce();
}

/**
 * Calls the get_subaccount_count function on a canister to get the subaccount count.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<number>} - The subaccount count.
 */
export async function getSubaccountCount(agent: HttpAgent) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_subaccount_count();
}

/**
 * Calls the get_subaccountid function on a canister to get the subaccount ID by index.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {number} index - The index of the subaccount.
 * @returns {Promise<string>} - The subaccount ID.
 */
export async function getSubaccountId(agent: HttpAgent, index: number) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_subaccountid(index);
}

/**
 * Retrieves the webhook URL set for the user's vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<string>} - A promise that resolves to the webhook URL.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getWebhookUrl(agent: HttpAgent) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_webhook_url();
}

/**
 * Gets the principal of the user vault canister.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<string>} - A promise that resolves to the canister principal.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getCanisterPrincipal(agent: HttpAgent) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_canister_principal();
}

/**
 * Gets the ICRC-1 account representation for a subaccount.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {number} index - The index of the subaccount.
 * @returns {Promise<string>} - A promise that resolves to the ICRC-1 account.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getIcrcAccount(agent: HttpAgent, index: number) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_icrc_account(index);
}

/**
 * Gets the network the user vault is running on (Mainnet or Local).
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<"Mainnet" | "Local">} - A promise that resolves to the network.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getNetwork(agent: HttpAgent) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_network();
}

/**
 * Gets the next block to be processed by the user vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<bigint>} - A promise that resolves to the next block.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getNextBlock(agent: HttpAgent) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_next_block();
}

/**
 * Gets the oldest block processed by the user vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<bigint | undefined>} - A promise that resolves to the oldest block or undefined.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getOldestBlock(agent: HttpAgent) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_oldest_block();
}

/**
 * Gets the token types registered with the user vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<[TokenType, string][]>} - A promise that resolves to an array of token types and their canister IDs.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getRegisteredTokens(agent: HttpAgent) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_registered_tokens();
}

/**
 * Gets the token type for a specific transaction.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} txHash - The transaction hash.
 * @returns {Promise<TokenType>} - A promise that resolves to the token type.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function getTransactionTokenType(
  agent: HttpAgent,
  txHash: string
) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.get_transaction_token_type(txHash);
}
