use candid::{CandidType, Principal};
use serde::{Serialize, Deserialize};
use sha2::{Digest, Sha224};
use crc32fast::Hasher;
use hex;

#[derive(CandidType, Deserialize, Clone, Hash, Debug, PartialEq, Eq, Copy)]
#[serde(transparent)]
pub struct Subaccount(pub [u8; 32]);

#[derive(CandidType, Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct AccountIdentifier {
    hash: [u8; 28],
}

const SUB_ACCOUNT_ZERO: Subaccount = Subaccount([0; 32]);
const ACCOUNT_DOMAIN_SEPERATOR: &[u8] = b"\x0Aaccount-id";

impl AccountIdentifier {
    pub fn new(account: Principal, sub_account: Option<Subaccount>) -> AccountIdentifier {
        let mut hash = Sha224::new();
        hash.update(ACCOUNT_DOMAIN_SEPERATOR);
        hash.update(account.as_slice());

        let sub_account = sub_account.unwrap_or(SUB_ACCOUNT_ZERO);
        hash.update(&sub_account.0[..]);

        AccountIdentifier {
            hash: hash.finalize().into(),
        }
    }

    fn generate_checksum(&self) -> [u8; 4] {
        let mut hasher = Hasher::new();
        hasher.update(&self.hash);
        hasher.finalize().to_be_bytes()
    }

    pub fn to_address(self) -> [u8; 32] {
        let mut result = [0u8; 32];
        result[0..4].copy_from_slice(&self.generate_checksum());
        result[4..32].copy_from_slice(&self.hash);
        result
    }
}

pub fn to_hex_string(bytes: [u8; 32]) -> String {
    hex::encode(bytes.as_ref())
}