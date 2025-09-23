import { Actor, HttpAgent } from '@dfinity/agent';
import { isNotEmptyOrError } from './utils';
import {
  _SERVICE,
  idlFactory,
  TokenType,
  Result_2,
  Result_3,
  Result_4,
  Result_5,
  Result_6,
  Result_7,
  Result_8,
  Result_9,
  Result_10,
  Result_1,
  Result,
} from './userVault.did';

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
 * @returns {Promise<Result_10>} - The list of transactions wrapped in a Result.
 */
export async function getUserVaultTransactions(
  agent: HttpAgent,
  userVaultCanisterId: string,
  upToIndex?: bigint
): Promise<Result_10> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.list_transactions(upToIndex ? [upToIndex] : []);
}

/**
 * Calls the get_interval function on a canister to get the interval.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<bigint>} - The interval value.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getUserVaultInterval(
  agent: HttpAgent,
  userVaultCanisterId: string
): Promise<bigint> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_interval();

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err);
  }
}

/**
 * Calls the get_transactions_count function on a canister to get the transaction count.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<number>} - The transaction count.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getTransactionsCount(
  agent: HttpAgent,
  userVaultCanisterId: string
): Promise<number> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_transactions_count();

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err);
  }
}

/**
 * Calls the get_nonce function on a canister to get the nonce value.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<number>} - The nonce value.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getNonce(
  agent: HttpAgent,
  userVaultCanisterId: string
): Promise<number> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_nonce();

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err);
  }
}

/**
 * Calls the get_subaccount_count function on a canister to get the subaccount count.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<number>} - The subaccount count.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getSubaccountCount(
  agent: HttpAgent,
  userVaultCanisterId: string
): Promise<number> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_subaccount_count();

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err);
  }
}

/**
 * Calls the get_subaccountid function on a canister to get the subaccount ID by index.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @param {number} index - The index of the subaccount.
 * @param {TokenType} tokenType - The token type for the subaccount.
 * @returns {Promise<string>} - The subaccount ID.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getSubaccountId(
  agent: HttpAgent,
  userVaultCanisterId: string,
  index: number,
  tokenType: TokenType
): Promise<string> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_subaccountid(index, [tokenType]);

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err.message);
  }
}

/**
 * Retrieves the webhook URL set for the user's vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<string>} - A promise that resolves to the webhook URL.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getWebhookUrl(
  agent: HttpAgent,
  userVaultCanisterId: string
): Promise<string> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_webhook_url();

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err);
  }
}

/**
 * Gets the principal of the user vault canister.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<string>} - A promise that resolves to the canister principal.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getCanisterPrincipal(
  agent: HttpAgent,
  userVaultCanisterId: string
): Promise<string> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_canister_principal();

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err);
  }
}

/**
 * Gets the ICRC-1 account representation for a subaccount.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @param {number} index - The index of the subaccount.
 * @returns {Promise<string>} - A promise that resolves to the ICRC-1 account.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getIcrcAccount(
  agent: HttpAgent,
  userVaultCanisterId: string,
  index: number
): Promise<string> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_icrc_account(index);

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err.message);
  }
}

/**
 * Gets the network the user vault is running on (Mainnet or Local).
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<"Mainnet" | "Local">} - A promise that resolves to the network.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getNetwork(
  agent: HttpAgent,
  userVaultCanisterId: string
): Promise<'Mainnet' | 'Local'> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_network();

  if ('Ok' in result) {
    if ('Mainnet' in result.Ok) {
      return 'Mainnet';
    } else {
      return 'Local';
    }
  } else {
    throw new Error(result.Err);
  }
}

/**
 * Gets the next block to be processed by the user vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<bigint>} - A promise that resolves to the next block.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getNextBlock(
  agent: HttpAgent,
  userVaultCanisterId: string
): Promise<bigint> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_next_block();

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err);
  }
}

/**
 * Gets the oldest block processed by the user vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<bigint | undefined>} - A promise that resolves to the oldest block or undefined.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getOldestBlock(
  agent: HttpAgent,
  userVaultCanisterId: string
): Promise<bigint | undefined> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_oldest_block();

  if ('Ok' in result) {
    return result.Ok.length > 0 ? result.Ok[0] : undefined;
  } else {
    throw new Error(result.Err);
  }
}

/**
 * Gets the token types registered with the user vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<Result_8>} - The registered tokens wrapped in a Result.
 */
export async function getRegisteredTokens(
  agent: HttpAgent,
  userVaultCanisterId: string
): Promise<Result_8> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  return await actor.get_registered_tokens();
}

/**
 * Gets the token type for a specific transaction.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @param {string} txHash - The transaction hash.
 * @returns {Promise<TokenType>} - A promise that resolves to the token type.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getTransactionTokenType(
  agent: HttpAgent,
  userVaultCanisterId: string,
  txHash: string
): Promise<TokenType> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_transaction_token_type(txHash);

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err);
  }
}

/**
 * Gets all token blocks for all registered token types.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @returns {Promise<Array<[TokenType, bigint]>>} - A promise that resolves to array of token type and block pairs.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getAllTokenBlocks(
  agent: HttpAgent,
  userVaultCanisterId: string
): Promise<Array<[TokenType, bigint]>> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_all_token_blocks();

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err);
  }
}

/**
 * Gets the next block to be processed for a specific token type.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} userVaultCanisterId - The canister ID of the user vault.
 * @param {TokenType} tokenType - The token type to query.
 * @returns {Promise<bigint>} - A promise that resolves to the next block number.
 * @throws {Error} - Throws if the call returns an error.
 */
export async function getTokenNextBlockQuery(
  agent: HttpAgent,
  userVaultCanisterId: string,
  tokenType: TokenType
): Promise<bigint> {
  const actor = createUserVaultActor(agent, userVaultCanisterId);
  const result = await actor.get_token_next_block_query(tokenType);

  if ('Ok' in result) {
    return result.Ok;
  } else {
    throw new Error(result.Err);
  }
}
