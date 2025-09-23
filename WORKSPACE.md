# ICSI Monorepo Structure

This project uses pnpm workspaces to manage multiple packages in a monorepo structure. ICSI (ICP Sub-Account Indexer) is a production-ready canister system for managing sub-accounts and tracking multi-token transactions on the Internet Computer.

## Project Structure

```
.
├── pnpm-workspace.yaml        # Workspace configuration
├── package.json              # Root package with workspace scripts
├── pnpm-lock.yaml           # Single lockfile for entire workspace
├── dfx.json                 # DFX canister configuration
├── canister_ids.json        # Mainnet canister IDs
├── tsconfig.json            # TypeScript configuration
├── CLAUDE.md                # AI assistant instructions
├── README.md                # Project overview
├── WORKSPACE.md             # This file
├── src/
│   ├── icp_subaccount_indexer/  # Rust canister implementation
│   │   ├── Cargo.toml
│   │   ├── icp_subaccount_indexer.did  # Candid interface
│   │   └── src/
│   │       ├── lib.rs       # Main canister logic
│   │       ├── types.rs     # Type definitions
│   │       ├── ledger.rs    # Token ledger integration
│   │       ├── memory.rs    # Stable memory management
│   │       └── tests.rs     # Unit tests
│   └── declarations/        # Auto-generated TypeScript types
├── packages/
│   └── icsi-lib/           # TypeScript SDK
│       ├── package.json
│       ├── src/
│       │   └── index.ts    # Library entry point
│       └── test/
│           └── scripts/    # Test scripts
│               ├── testICPDeposit.sh      # ICP deposit test
│               ├── testUSDCDeposit.sh     # ckUSDC deposit test
│               ├── testUSDTDeposit.sh     # ckUSDT deposit test
│               ├── testWebhook.ts         # Webhook server
│               ├── generateTestWallet.ts  # Wallet generator
│               └── legacy/                # Deprecated scripts
├── scripts/
│   └── deploy-mainnet.sh   # Production deployment script
├── .maintain/
│   ├── deploy.sh          # Local deployment script
│   └── legacy/            # Legacy maintenance scripts
└── docs/
    ├── TESTING_GUIDE.md         # Comprehensive testing documentation
    ├── CANISTER_DEBUGGING_GUIDE.md  # Debugging deployed canisters
    └── logs/              # Detailed testing logs
        ├── TESTING_ATTEMPT_1.md   # Initial deployment
        ├── TESTING_ATTEMPT_2.md   # Principal fixes
        └── ...                    # Through TESTING_ATTEMPT_10.md
```

## Installation

Install all dependencies across the workspace:

```bash
pnpm install
```

This single command installs dependencies for:

- Root project (DFX, webpack, etc.)
- icsi-lib package
- Legacy scripts

## Common Commands

### Development Commands (From Root)

```bash
# Initial setup
pnpm install                    # Install all dependencies

# Local development
pnpm run start:local:env       # Start local IC replica
pnpm run deploy:local          # Deploy to local network
pnpm run build                 # Build everything
pnpm run build:canister        # Build just the canister
pnpm run build:lib             # Build just the TypeScript library
pnpm run generate              # Generate TypeScript declarations

# Testing commands
pnpm run test                  # Run all tests
pnpm run test:backend          # Run canister tests
pnpm run lib:generate:wallet   # Generate test wallet
pnpm run lib:test:icp         # Test ICP deposits
pnpm run lib:test:usdc        # Test ckUSDC deposits
pnpm run lib:test:usdt        # Test ckUSDT deposits
pnpm run lib:test:webhook     # Start webhook test server

# Code quality
pnpm run format               # Format all code (Rust + TypeScript)
pnpm run clean                # Clean all build artifacts
```

### Production Deployment

```bash
# Deploy to mainnet
./scripts/deploy-mainnet.sh deploy    # Initial deployment
./scripts/deploy-mainnet.sh upgrade   # Upgrade existing canister

# Or use DFX directly (see docs/TESTING_GUIDE.md for details)
dfx deploy --network ic
```

### Working with Specific Packages

```bash
# Run command in specific package
pnpm --filter @jagad/icsi <command>

# Or navigate to package
cd packages/icsi-lib
pnpm run generate:wallet      # Generate test wallet
pnpm run test:icp-deposit    # Test ICP deposits
pnpm run test:usdc-deposit   # Test ckUSDC deposits
pnpm run test:usdt-deposit   # Test ckUSDT deposits
pnpm run test:webhook        # Start webhook server

# Build commands
pnpm run build               # Build library
pnpm run build:types         # Generate TypeScript types
```

### Key Package Scripts

**Root package.json:**

- Orchestrates all workspace commands
- Provides `lib:*` aliases for library commands
- Manages canister build and deployment

**icsi-lib package.json:**

- TypeScript SDK build and distribution
- Test script execution
- Type generation from Candid files

## Workspace Benefits

1. **Single Install**: One `pnpm install` at root installs everything
2. **Shared Dependencies**: Common dependencies are hoisted to root
3. **Single Lock File**: One `pnpm-lock.yaml` ensures consistency
4. **Cross-Package Scripts**: Run any package script from root using `lib:*` aliases
5. **Atomic Updates**: Update dependencies across all packages together
6. **Efficient Storage**: pnpm's content-addressable storage saves disk space
7. **Strict Dependencies**: Prevents phantom dependencies

## Key Technologies

### Backend (Rust)

- **ic-cdk**: Internet Computer SDK for canisters
- **ic-stable-structures**: Persistent storage across upgrades
- **candid**: Interface description language
- **ic-ledger-types**: ICP ledger integration
- **icrc-ledger-types**: ICRC-1 token standard support

### Frontend (TypeScript)

- **@dfinity/agent**: IC agent for canister calls
- **@dfinity/identity**: Identity and authentication
- **@dfinity/identity-secp256k1**: Secp256k1 key management
- **@dfinity/principal**: Principal ID handling
- **@dfinity/candid**: Candid type handling

## Adding New Packages

1. Create new directory under `packages/`
2. Add package.json with unique name
3. Update `pnpm-workspace.yaml` if needed
4. Run `pnpm install` from root

## Development Workflow

### 1. Initial Setup

```bash
git clone <repository>
cd icp-subaccount-indexer
pnpm install
```

### 2. Local Development

```bash
# Terminal 1: Start local replica
pnpm run start:local:env

# Terminal 2: Deploy and test
pnpm run deploy:local
pnpm run lib:generate:wallet
pnpm run lib:test:icp
```

### 3. Mainnet Testing

```bash
# Deploy to mainnet
./scripts/deploy-mainnet.sh deploy

# Configure test environment
cd packages/icsi-lib
echo 'USER_VAULT_CANISTER_ID="your-canister-id"' >> .env.test

# Run tests
pnpm run test:webhook  # Keep running
pnpm run test:usdc-deposit  # In new terminal
```

## Troubleshooting

### Installation Issues

```bash
# Clean install
rm -rf node_modules packages/*/node_modules pnpm-lock.yaml
pnpm install

# Clear pnpm cache
pnpm store prune
```

### Build Issues

```bash
# Clean all build artifacts
pnpm run clean

# Rebuild everything
pnpm run build
```

### Common Errors

**"Cannot find module"**

- Run `pnpm install` from root
- Check you're using Node.js 16+

**"Canister build failed"**

- Ensure Rust is installed
- Check dfx version: `dfx --version`
- Run `pnpm run clean` then rebuild

**"Insufficient cycles"**

- See docs/TESTING_GUIDE.md for cycle management
- Large canisters need ~500B cycles

## Best Practices

1. **Always run commands from root** when possible
2. **Use pnpm** instead of npm/yarn
3. **Check test logs** in `docs/logs/` for examples
4. **Use test wallets** for all testing
5. **Read CLAUDE.md** for codebase conventions
