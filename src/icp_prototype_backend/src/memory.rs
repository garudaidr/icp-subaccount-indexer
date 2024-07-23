use ic_stable_structures::memory_manager::{MemoryId, MemoryManager};
use ic_stable_structures::DefaultMemoryImpl;
use ic_stable_structures::{StableBTreeMap, StableCell};
use std::cell::RefCell;

use crate::types::{Memory, Network, StoredPrincipal, StoredTransactions};

const PRINCIPAL_MEMORY: MemoryId = MemoryId::new(0);
const LAST_SUBACCOUNT_NONCE_MEMORY: MemoryId = MemoryId::new(1);
const NEXT_BLOCK_MEMORY: MemoryId = MemoryId::new(2);
const INTERVAL_IN_SECONDS_MEMORY: MemoryId = MemoryId::new(3);
const TRANSACTIONS_MEMORY: MemoryId = MemoryId::new(4);
const CUSTODIAN_PRINCIPAL_MEMORY: MemoryId = MemoryId::new(5);
const NETWORK_MEMORY: MemoryId = MemoryId::new(6);
const WEBHOOK_URL_MEMORY: MemoryId = MemoryId::new(7);

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    pub static PRINCIPAL: RefCell<StableCell<StoredPrincipal, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(PRINCIPAL_MEMORY)),
            StoredPrincipal::default() // TODO: add to init function
        ).expect("Initializing PRINCIPAL StableCell failed")
    );
    // u32 - upper limit is 4,294,967,295
    pub static LAST_SUBACCOUNT_NONCE: RefCell<StableCell<u32, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(LAST_SUBACCOUNT_NONCE_MEMORY)),
            0
        ).expect("Initializing LAST_SUBACCOUNT_NONCE StableCell failed")
    );
    pub static NEXT_BLOCK: RefCell<StableCell<u64, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(NEXT_BLOCK_MEMORY)),
            1 // Default is 1
        ).expect("Initializing NEXT_BLOCK StableCell failed")
    );
    pub static INTERVAL_IN_SECONDS: RefCell<StableCell<u64, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(INTERVAL_IN_SECONDS_MEMORY)),
            5 // Default is 5 seconds
        ).expect("Initializing INTERVAL_IN_SECONDS StableCell failed")
    );
    pub static TRANSACTIONS: RefCell<StableBTreeMap<u64, StoredTransactions, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(TRANSACTIONS_MEMORY))
        )
    );
    pub static CUSTODIAN_PRINCIPAL: RefCell<StableCell<StoredPrincipal, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CUSTODIAN_PRINCIPAL_MEMORY)),
            StoredPrincipal::default() // TODO: add to init function
        ).expect("Initializing CUSTODIAN_PRINCIPAL StableCell failed")
    );
    pub static CONNECTED_NETWORK: RefCell<StableCell<Network, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(NETWORK_MEMORY)),
            Network::Mainnet
        ).expect("Initializing NETWORK StableCell failed")
    );
    pub static WEBHOOK_URL: RefCell<StableCell<String, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(WEBHOOK_URL_MEMORY)),
            String::default()
        ).expect("Initializing WEBHOOK_URL StableCell failed")
    );
}
