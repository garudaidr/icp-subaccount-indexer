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
 * Generates a Secp256k1KeyIdentity from a private key in various formats.
 * @param {string} privateKey - The private key as hex string or EC PEM format.
 * @returns {Secp256k1KeyIdentity} - The generated Secp256k1KeyIdentity.
 */
export const getIdentityFromPrivateKey = (privateKey: string) => {
  if (!privateKey || typeof privateKey !== 'string') {
    throw new Error('Private key cannot be empty');
  }

  try {
    // Check if it's a PEM format
    if (privateKey.includes('-----BEGIN') && privateKey.includes('-----END')) {
      // For PEM format, try to parse using the Secp256k1KeyIdentity.fromPem method
      try {
        return Secp256k1KeyIdentity.fromPem(privateKey);
      } catch (pemError) {
        throw new Error(
          `Failed to parse PEM private key: ${(pemError as Error).message}. Make sure it's a valid EC (secp256k1) private key in PEM format.`
        );
      }
    }

    // Handle hex format (with or without 0x prefix)
    const cleanPrivateKey = privateKey.replace(/^0x/, '').replace(/\s/g, '');

    if (cleanPrivateKey.length !== 64) {
      throw new Error(
        'Private key must be 64 hex characters (32 bytes) for secp256k1'
      );
    }

    const privateKeyBuffer = Buffer.from(cleanPrivateKey, 'hex');
    const publicKey = publicKeyCreate(privateKeyBuffer, false);

    return Secp256k1KeyIdentity.fromKeyPair(publicKey, privateKeyBuffer);
  } catch (error) {
    throw new Error(`Invalid private key format: ${(error as Error).message}`);
  }
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

/**
 * Creates an HttpAgent with a Secp256k1KeyIdentity from a private key.
 * @param {string} privateKey - The private key in EC PEM format or as a hex string.
 * @param {string} [host="https://ic0.app"] - The host URL for the HttpAgent (default is the IC mainnet URL).
 * @returns {HttpAgent} - The initialized HttpAgent with the generated identity.
 */
export function createHostAgentAndIdentityFromPrivateKey(
  privateKey: string,
  host: string = 'https://ic0.app'
): HttpAgent {
  const identity = getIdentityFromPrivateKey(privateKey);

  // Initialize and return the HttpAgent with the generated identity.
  return new HttpAgent({
    host,
    identity,
    fetch,
  });
}
