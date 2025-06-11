import fetch from 'cross-fetch';
import { HttpAgent } from '@dfinity/agent';
import * as bip39 from 'bip39';
import HDKey from 'hdkey';
import { publicKeyCreate } from 'secp256k1';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';

// Define the BIP44 derivation path for ICP.
const DERIVATION_PATH = "m/44'/223'/0'/0";

/**
 * Checks if a value is not empty or throws an error.
 * @param value - The value to check.
 * @param errorMessage - The error message to throw if the value is empty.
 * @throws {Error} - Throws an error with the specified message if the value is empty.
 */
export function isNotEmptyOrError(
  variable: any,
  message: string | undefined = undefined
): void {
  let error_msg: string;
  if (message === undefined) {
    error_msg = 'Variable is empty.';
  } else {
    error_msg = message;
  }

  if (Array.isArray(variable)) {
    if (variable.length < 1) {
      throw new Error(error_msg);
    }
  } else {
    if (variable === undefined || variable === '' || variable === null) {
      throw new Error(error_msg);
    }
  }
}

/**
 * Generates a Secp256k1KeyIdentity from a seed phrase and an optional index.
 * @param {string} mnemonic - The mnemonic seed phrase.
 * @param {number} [index=0] - The index to use in the derivation path (default is 0).
 * @returns {Secp256k1KeyIdentity} - The generated Secp256k1KeyIdentity.
 */
export const getIdentityFromSeed = (mnemonic: string, index = 0) => {
  if (!mnemonic || mnemonic.trim() === '') {
    throw new Error('Mnemonic seed phrase cannot be empty');
  }
  
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic seed phrase');
  }
  
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const masterKey = HDKey.fromMasterSeed(seed);

  // Derive the private and public keys using the BIP44 derivation path.
  const { privateKey } = masterKey.derive(`${DERIVATION_PATH}/${index}`);
  const publicKey = publicKeyCreate(privateKey!, false);

  return Secp256k1KeyIdentity.fromKeyPair(publicKey, privateKey!);
};

/**
 * Creates an HttpAgent with a Secp256k1KeyIdentity from a given seed phrase.
 * @param {string} seedPhrase - The seed phrase to generate the identity.
 * @param {string} [host="https://ic0.app"] - The host URL for the HttpAgent (default is the IC mainnet URL).
 * @returns {HttpAgent} - The initialized HttpAgent with the generated identity.
 */
export function createHostAgentAndIdentityFromSeed(
  seedPhrase: string,
  host: string = 'https://ic0.app'
): HttpAgent {
  const identity = getIdentityFromSeed(seedPhrase);

  // Initialize and return the HttpAgent with the generated identity.
  return new HttpAgent({
    host,
    identity,
    fetch,
  });
}
