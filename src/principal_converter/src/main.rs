use candid::Principal;
use crc32fast::Hasher;
use hex;

#[derive(Debug, Clone, PartialEq, Eq)]
struct Account {
    owner: Principal,
    subaccount: Option<[u8; 32]>,
}

impl Account {
    fn new(owner: Principal, subaccount: Option<[u8; 32]>) -> Self {
        Self { owner, subaccount }
    }

    fn is_default_subaccount(subaccount: &[u8; 32]) -> bool {
        subaccount.iter().all(|&b| b == 0)
    }

    // Base32 encoding (lowercase, no padding) for the checksum
    fn base32_encode_lowercase(input: &[u8]) -> String {
        // RFC4648 Base32 alphabet
        const ALPHABET: &[u8] = b"abcdefghijklmnopqrstuvwxyz234567";

        let mut result = String::new();
        let mut bits = 0u16;
        let mut bit_count = 0;

        for &byte in input {
            bits = (bits << 8) | (byte as u16);
            bit_count += 8;

            while bit_count >= 5 {
                bit_count -= 5;
                let index = ((bits >> bit_count) & 0x1F) as usize;
                result.push(ALPHABET[index] as char);
            }
        }

        // Handle remaining bits if any
        if bit_count > 0 {
            let index = ((bits << (5 - bit_count)) & 0x1F) as usize;
            result.push(ALPHABET[index] as char);
        }

        result
    }

    fn to_text(&self) -> String {
        if let Some(subaccount) = self.subaccount {
            // If subaccount is all zeros, just return the principal text
            if Self::is_default_subaccount(&subaccount) {
                return self.owner.to_text();
            }

            // Calculate checksum (CRC-32 of concatenated principal and subaccount bytes)
            let principal_bytes = self.owner.as_slice();
            let mut hasher = Hasher::new();
            hasher.update(principal_bytes);
            hasher.update(&subaccount);
            let checksum_value = hasher.finalize();

            // Convert checksum to big-endian bytes
            let checksum_bytes = checksum_value.to_be_bytes();

            // Encode checksum in Base32 lowercase
            let checksum_encoded = Self::base32_encode_lowercase(&checksum_bytes);

            // Encode subaccount as hex and remove leading zeros
            let subaccount_hex = hex::encode(subaccount);
            let trimmed_hex = subaccount_hex.trim_start_matches('0');

            // If all bytes were zero (which should not happen here since we checked earlier),
            // we should have at least one digit
            let subaccount_hex_trimmed = if trimmed_hex.is_empty() {
                "0"
            } else {
                trimmed_hex
            };

            // Construct the textual representation
            format!(
                "{}-{}.{}",
                self.owner.to_text(),
                checksum_encoded,
                subaccount_hex_trimmed
            )
        } else {
            // Default subaccount
            self.owner.to_text()
        }
    }
}

fn main() {
    // The two principal IDs
    let principal_ids = ["xevnm-gaaaa-aaaar-qafnq-cai", "cngnf-vqaaa-aaaar-qag4q-cai"];

    for principal_text in principal_ids {
        let principal = Principal::from_text(principal_text).unwrap();
        println!("Principal: {}", principal_text);

        // Default subaccount (all zeros)
        let default_subaccount = [0u8; 32];
        let default_account = Account::new(principal.clone(), Some(default_subaccount));
        println!("Default Subaccount: {}", default_account.to_text());

        // Subaccount 1 (last byte is 1, rest zeros)
        let mut subaccount1 = [0u8; 32];
        subaccount1[31] = 1;
        let account1 = Account::new(principal.clone(), Some(subaccount1));
        println!("Subaccount 1: {}", account1.to_text());

        // Subaccount with index 123
        let mut subaccount_index = [0u8; 32];
        subaccount_index[31] = 123;
        let account_index = Account::new(principal.clone(), Some(subaccount_index));
        println!("Subaccount Index 123: {}", account_index.to_text());

        // Subaccount for minting (special purpose)
        let mut minting_subaccount = [0u8; 32];
        minting_subaccount[0] = 1; // First byte as 1 for minting designation
        let minting_account = Account::new(principal.clone(), Some(minting_subaccount));
        println!("Minting Subaccount: {}", minting_account.to_text());

        // Sequential subaccount (1,2,3,...)
        let mut sequential_subaccount = [0u8; 32];
        for i in 0..32 {
            sequential_subaccount[i] = (i + 1) as u8;
        }
        let sequential_account = Account::new(principal.clone(), Some(sequential_subaccount));
        println!("Sequential Subaccount: {}", sequential_account.to_text());

        println!();
    }
}
