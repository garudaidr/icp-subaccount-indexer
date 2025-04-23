import { Actor, HttpAgent } from "@dfinity/agent";
import { isNotEmptyOrError } from "./utils";
import {
  Result as AddAccountResult,
  TokenType,
  _SERVICE,
  idlFactory,
} from "./userVault.did";

/**
 * Calls the refund function on a canister with a specific amount.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {bigint} amount - The amount to refund.
 * @returns {Promise<string>} - The result of the refund operation.
 */
export async function refund(agent: HttpAgent, amount: bigint) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.refund(amount);
}

/**
 * Calls the set_interval function on a canister with a specific interval.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {bigint} interval - The interval to set.
 * @returns {Promise<bigint>} - The set interval value.
 */
export async function setUserVaultInterval(agent: HttpAgent, interval: bigint) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.set_interval(interval);
}

/**
 * Calls the sweep function on a canister.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<string[]>} - The result of the sweep operation.
 */
export async function sweep(agent: HttpAgent) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.sweep();
}

/**
 * Sweeps all subaccounts for a specific token type.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {TokenType} tokenType - The token type to sweep (ICP, CKUSDC, or CKUSDT).
 * @returns {Promise<string[]>} - The result of the sweep operation.
 */
export async function sweepByTokenType(agent: HttpAgent, tokenType: TokenType) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.sweep_by_token_type(tokenType);
}

/**
 * Calls the add_subaccount function on a canister to add a generic subaccount for ICP.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @returns {Promise<string>} - The result of the add_subaccount operation.
 */
export async function addSubaccount(
  agent: HttpAgent
): Promise<AddAccountResult> {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.add_subaccount();
}

/**
 * Adds a new subaccount for a specific token type (ICP, CKUSDC, or CKUSDT).
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {TokenType} tokenType - The token type to create a subaccount for.
 * @returns {Promise<AddAccountResult>} - The result of the add_subaccount operation.
 */
export async function addSubaccountForToken(
  agent: HttpAgent,
  tokenType: TokenType
): Promise<AddAccountResult> {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });

  // Check if the token is already registered
  const registeredTokens = await actor.get_registered_tokens();
  if ("Err" in registeredTokens) {
    throw new Error(`Failed to get registered tokens: ${registeredTokens.Err}`);
  }

  // Get the canister ID for the token type
  let canisterId: string;
  switch (true) {
    case "CKUSDC" in tokenType:
      canisterId =
        process.env.CKUSDC_CANISTER_ID || "xevnm-gaaaa-aaaar-qafnq-cai";
      break;
    case "CKUSDT" in tokenType:
      canisterId =
        process.env.CKUSDT_CANISTER_ID || "vgmay-piaaa-aaaar-qafoq-cai";
      break;
    case "ICP" in tokenType:
      canisterId =
        process.env.ICP_LEDGER_CANISTER_ID || "ryjl3-tyaaa-aaaaa-aaaba-cai";
      break;
    default:
      throw new Error(`Unsupported token type: ${JSON.stringify(tokenType)}`);
  }

  // Check if the token type is already registered
  const isTokenRegistered = registeredTokens.Ok.some(
    ([regTokenType, _]) =>
      ("CKUSDC" in tokenType && "CKUSDC" in regTokenType) ||
      ("CKUSDT" in tokenType && "CKUSDT" in regTokenType) ||
      ("ICP" in tokenType && "ICP" in regTokenType)
  );

  // Register the token if not already registered
  if (!isTokenRegistered) {
    const registerResult = await actor.register_token(tokenType, canisterId);
    if ("Err" in registerResult) {
      throw new Error(
        `Failed to register token: ${registerResult.Err.message}`
      );
    }
  }

  // Add a subaccount for the token type
  return await actor.add_subaccount();
}

/**
 * Calls the clear_transactions function on a canister.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {bigint} [index] - The optional index to start clearing from.
 * @param {object} [timestamp] - The optional timestamp to clear up to.
 * @param {bigint} [timestamp.timestamp_nanos] - The timestamp in nanoseconds.
 * @returns {Promise<any[]>} - The result of the clear transactions operation.
 */
export async function clearTransactions(
  agent: HttpAgent,
  index?: bigint,
  timestamp?: { timestamp_nanos: bigint }
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
  return await actor.clear_transactions(
    index ? [index] : [],
    timestamp ? [timestamp] : []
  );
}

/**
 * Sets a new webhook URL for the user's vault.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} url - The new webhook URL to be set.
 * @returns {Promise<void>} - A promise that resolves when the webhook URL is successfully set.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function setWebhookUrl(agent: HttpAgent, url: string) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.set_webhook_url(url);
}

/**
 * Registers a new token type with the user vault canister.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {TokenType} tokenType - The token type to register (ICP, CKUSDC, or CKUSDT).
 * @param {string} canisterId - The canister ID for the token ledger.
 * @returns {Promise<any>} - A promise that resolves with the result of the register operation.
 */
export async function registerToken(
  agent: HttpAgent,
  tokenType: TokenType,
  canisterId: string
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
  return await actor.register_token(tokenType, canisterId);
}

/**
 * Sweeps a specific amount from a given subaccount for a specific token type.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} subaccountId - The ID of the subaccount to sweep from.
 * @param {number} amount - The amount to sweep.
 * @param {TokenType} tokenType - The token type to sweep (ICP, CKUSDC, or CKUSDT).
 * @returns {Promise<any>} - A promise that resolves with the result of the sweep operation.
 * @throws {Error} - Throws an error if the User Vault Canister ID is undefined.
 */
export async function sweepSubaccountId(
  agent: HttpAgent,
  subaccountId: string,
  amount: number,
  tokenType: TokenType = { ICP: null }
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
  return await actor.sweep_subaccount(subaccountId, amount, tokenType);
}

/**
 * Converts a subaccount ID to an ICRC account.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} subaccountId - The ID of the subaccount to convert.
 * @returns {Promise<AddAccountResult>} - A promise that resolves with the result of the conversion.
 */
export async function convertToIcrcAccount(
  agent: HttpAgent,
  subaccountId: string
): Promise<AddAccountResult> {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.convert_to_icrc_account(subaccountId);
}

/**
 * Validates if a string is a valid ICRC account.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} account - The account string to validate.
 * @returns {Promise<boolean>} - A promise that resolves with the validation result.
 */
export async function validateIcrcAccount(agent: HttpAgent, account: string) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  const result = await actor.validate_icrc_account(account);

  if ("Err" in result) {
    throw new Error(`Failed to validate ICRC account: ${result.Err.message}`);
  }

  return result.Ok;
}

/**
 * Performs a single sweep for a specific transaction.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} txHash - The transaction hash to sweep.
 * @returns {Promise<string[]>} - A promise that resolves with the result of the sweep operation.
 */
export async function singleSweep(agent: HttpAgent, txHash: string) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.single_sweep(txHash);
}

/**
 * Sets a transaction's sweep status to failed.
 * @param {HttpAgent} agent - The HTTP agent used for the call.
 * @param {string} txHash - The transaction hash to mark as failed.
 * @returns {Promise<string[]>} - A promise that resolves with the result of the operation.
 */
export async function setSweepFailed(agent: HttpAgent, txHash: string) {
  const userVaultCanisterId = process.env.USER_VAULT_CANISTER_ID;
  isNotEmptyOrError(
    userVaultCanisterId,
    "User Vault Canister ID is undefined."
  );

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: userVaultCanisterId!,
  });
  return await actor.set_sweep_failed(txHash);
}
