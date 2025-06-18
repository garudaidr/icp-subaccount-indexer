<img width="200" src="../../docs/icsi.png">

# 🧑‍🚀 ICSI-Lib - @jagad/icsi

Internet Computer Subaccount Indexer Library - A TypeScript library for interacting with ICP user vault canisters.

[![Build and Test ICP Prototype Backend](https://github.com/garudaidr/icp-subaccount-indexer/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/garudaidr/icp-subaccount-indexer/actions/workflows/build-and-test.yml)
[![npm version](https://badge.fury.io/js/%40jagad%2Ficsi.svg)](https://badge.fury.io/js/%40jagad%2Ficsi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Internet Computer Subaccount Indexer Library** - A comprehensive TypeScript SDK for ICP multi-token subaccount management, transaction tracking, and automated sweeping with webhook support.

## Features

🚀 **Multi-Token Support**: ICP, ckUSDC, and ckUSDT  
🏦 **Subaccount Management**: Generate and manage unique deposit addresses  
📊 **Transaction Tracking**: Real-time transaction indexing and monitoring  
🧹 **Automated Sweeping**: Automatic token collection from subaccounts  
🔔 **Webhook Integration**: Real-time notifications for new transactions  
⚡ **Production Ready**: Fully tested and production-proven codebase  
🔒 **Type Safe**: Complete TypeScript support with full type definitions

## Installation

```bash
npm install @jagad/icsi
# or
pnpm install @jagad/icsi
# or
yarn add @jagad/icsi
```

## Quick Start

```typescript
import { HttpAgent } from '@dfinity/agent';
import {
  getUserVaultTransactions,
  addSubaccountForToken,
  getDepositAddresses,
  Tokens,
} from '@jagad/icsi';

// Initialize agent
const agent = new HttpAgent({ host: 'https://ic0.app' });
const canisterId = 'your-canister-id';

// Create a new subaccount for ckUSDC
const subaccount = await addSubaccountForToken(
  agent,
  canisterId,
  Tokens.CKUSDC
);
console.log('New ckUSDC subaccount:', subaccount);

// Get all deposit addresses
const addresses = await getDepositAddresses(agent, canisterId);
console.log('Deposit addresses:', addresses);

// Fetch recent transactions
const transactions = await getUserVaultTransactions(
  agent,
  canisterId,
  BigInt(10)
);
console.log('Recent transactions:', transactions);
```

## Supported Tokens

| Token      | Type   | Ledger Canister ID            | Address Format        |
| ---------- | ------ | ----------------------------- | --------------------- |
| **ICP**    | Native | `ryjl3-tyaaa-aaaaa-aaaba-cai` | Hex AccountIdentifier |
| **ckUSDC** | ICRC-1 | `xevnm-gaaaa-aaaar-qafnq-cai` | ICRC-1 Textual        |
| **ckUSDT** | ICRC-1 | `cngnf-vqaaa-aaaar-qag4q-cai` | ICRC-1 Textual        |

## API Reference

### Query Functions (Read-only)

#### Transaction Management

```typescript
// Get transactions with optional limit
getUserVaultTransactions(agent: HttpAgent, canisterId: string, limit?: bigint): Promise<Result_9>

// Get total transaction count
getTransactionsCount(agent: HttpAgent, canisterId: string): Promise<number>

// Get transactions by token type
getTransactionsByTokenType(agent: HttpAgent, canisterId: string, tokenType: TokenType): Promise<Transaction[]>
```

#### Subaccount Operations

```typescript
// Get subaccount by index and token type
getSubaccountId(agent: HttpAgent, canisterId: string, index: number, tokenType: TokenType): Promise<string>

// Get ICRC account format
getIcrcAccount(agent: HttpAgent, canisterId: string, index: number): Promise<string>

// Get total subaccount count
getSubaccountCount(agent: HttpAgent, canisterId: string): Promise<number>
```

#### Configuration & Status

```typescript
// Get polling interval
getUserVaultInterval(agent: HttpAgent, canisterId: string): Promise<bigint>

// Get webhook URL
getWebhookUrl(agent: HttpAgent, canisterId: string): Promise<string>

// Get network type
getNetwork(agent: HttpAgent, canisterId: string): Promise<'Mainnet' | 'Local'>

// Get registered tokens
getRegisteredTokens(agent: HttpAgent, canisterId: string): Promise<Result_7>
```

### Update Functions (State-modifying)

#### Subaccount Creation

```typescript
// Create basic ICP subaccount
addSubaccount(agent: HttpAgent, canisterId: string): Promise<Result_1>

// Create token-specific subaccount
addSubaccountForToken(agent: HttpAgent, canisterId: string, tokenType: TokenType): Promise<Result_1>
```

#### Token Management

```typescript
// Register a new token type
registerToken(agent: HttpAgent, canisterId: string, tokenType: TokenType, ledgerCanisterId: string): Promise<Result_5>
```

#### Sweep Operations

```typescript
// Sweep all tokens from all subaccounts
sweep(agent: HttpAgent, canisterId: string): Promise<Result_3>

// Sweep specific token type
sweepByTokenType(agent: HttpAgent, canisterId: string, tokenType: TokenType): Promise<Result_3>

// Sweep specific subaccount
sweepSubaccountId(agent: HttpAgent, canisterId: string, subaccountId: string, amount: number, tokenType?: TokenType): Promise<Result_2>
```

#### Configuration

```typescript
// Set polling interval
setUserVaultInterval(agent: HttpAgent, canisterId: string, interval: bigint): Promise<Result_6>

// Set webhook URL
setWebhookUrl(agent: HttpAgent, canisterId: string, url: string): Promise<Result_4>
```

### Helper Functions

```typescript
// Get all deposit addresses for all tokens
getDepositAddresses(agent: HttpAgent, canisterId: string): Promise<DepositAddress[]>

// Get balances for all tokens
getBalances(agent: HttpAgent, canisterId: string): Promise<TokenBalance[]>

// Validate ICRC account format
validateIcrcAccount(agent: HttpAgent, canisterId: string, account: string): Promise<boolean>
```

### Token Constants

```typescript
import { Tokens } from '@jagad/icsi';

// Available token types
Tokens.ICP; // { ICP: null }
Tokens.CKUSDC; // { CKUSDC: null }
Tokens.CKUSDT; // { CKUSDT: null }
```

## Authentication

The library supports multiple authentication methods:

### Using Seed Phrase

```typescript
import { createHostAgentAndIdentityFromSeed } from '@jagad/icsi';

const { agent } = await createHostAgentAndIdentityFromSeed(
  'your twelve word seed phrase here',
  'https://ic0.app'
);
```

### Using Private Key

```typescript
import { createHostAgentAndIdentityFromPrivateKey } from '@jagad/icsi';

const privateKey = `-----BEGIN EC PRIVATE KEY-----
Your PEM private key here
-----END EC PRIVATE KEY-----`;

const { agent } = await createHostAgentAndIdentityFromPrivateKey(
  privateKey,
  'https://ic0.app'
);
```

## Examples

### Payment Processing Workflow

```typescript
import { HttpAgent } from '@dfinity/agent';
import {
  addSubaccountForToken,
  getUserVaultTransactions,
  sweepByTokenType,
  setWebhookUrl,
  Tokens,
} from '@jagad/icsi';

const agent = new HttpAgent({ host: 'https://ic0.app' });
const canisterId = 'your-canister-id';

// 1. Set up webhook for real-time notifications
await setWebhookUrl(agent, canisterId, 'https://your-api.com/webhook');

// 2. Create deposit addresses for customers
const usdcAddress = await addSubaccountForToken(
  agent,
  canisterId,
  Tokens.CKUSDC
);
console.log('Customer USDC deposit address:', usdcAddress);

// 3. Monitor for incoming payments
const checkPayments = async () => {
  const transactions = await getUserVaultTransactions(
    agent,
    canisterId,
    BigInt(50)
  );

  if ('Ok' in transactions) {
    const recentTransactions = transactions.Ok.filter(
      (tx) =>
        tx.token_type.CKUSDC !== undefined &&
        tx.sweep_status.Pending !== undefined
    );

    console.log(`Found ${recentTransactions.length} pending USDC payments`);
  }
};

// 4. Sweep collected funds
const sweepFunds = async () => {
  const result = await sweepByTokenType(agent, canisterId, Tokens.CKUSDC);
  console.log('Sweep result:', result);
};
```

### Multi-Token Deposit Address Generation

```typescript
import { getDepositAddresses, Tokens } from '@jagad/icsi';

const generateCustomerAddresses = async (customerId: string) => {
  const addresses = await getDepositAddresses(agent, canisterId);

  const customerAddresses = {
    customerId,
    addresses: {
      ICP: addresses.find((addr) => addr.tokenType.ICP)?.depositAddress,
      USDC: addresses.find((addr) => addr.tokenType.CKUSDC)?.depositAddress,
      USDT: addresses.find((addr) => addr.tokenType.CKUSDT)?.depositAddress,
    },
  };

  return customerAddresses;
};
```

## Error Handling

```typescript
import { getUserVaultTransactions } from '@jagad/icsi';

try {
  const transactions = await getUserVaultTransactions(agent, canisterId);

  if ('Ok' in transactions) {
    console.log('Transactions:', transactions.Ok);
  } else {
    console.error('Error fetching transactions:', transactions.Err);
  }
} catch (error) {
  console.error('Network or authentication error:', error);
}
```

## Testing

The library includes comprehensive test suites:

```bash
# Run unit tests
pnpm test:unit

# Run integration tests (requires canister access)
pnpm test:query      # Safe read-only tests
pnpm test:functions  # Interactive test runner
pnpm test:all        # Complete test suite
```

## TypeScript Support

Full TypeScript support with complete type definitions:

```typescript
import type {
  TokenType,
  Transaction,
  DepositAddress,
  TokenBalance,
  Result_9,
} from '@jagad/icsi';

// All functions are fully typed
const handleTransactions = (transactions: Result_9) => {
  if ('Ok' in transactions) {
    transactions.Ok.forEach((tx: Transaction) => {
      console.log(`Transaction ${tx.tx_hash}: ${tx.amount} ${tx.token_type}`);
    });
  }
};
```

## Publishing to NPM

### Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **Organization Scope**: Set up the `@jagad` organization scope
3. **Authentication**: Log in to NPM locally

```bash
npm login
# Enter your NPM credentials
```

### Pre-Publishing Checklist

1. **Update Version**: Use semantic versioning

   ```bash
   # For patch releases (bug fixes)
   npm version patch

   # For minor releases (new features)
   npm version minor

   # For major releases (breaking changes)
   npm version major
   ```

2. **Run Quality Checks**: The `prepublishOnly` script automatically runs:

   - TypeScript type checking
   - Code formatting validation
   - Unit tests
   - Build process

3. **Test Package Locally**:

   ```bash
   # Build the package
   pnpm run build

   # Test locally with npm pack
   npm pack

   # Test installation in another project
   npm install ./jagad-icsi-1.0.0.tgz
   ```

### Publishing Steps

#### 1. Dry Run (Recommended)

```bash
# See what would be published
npm publish --dry-run
```

#### 2. Publish to NPM

```bash
# For scoped packages (first time)
npm publish --access public

# For subsequent releases
npm publish
```

#### 3. Verify Publication

```bash
# Check if package is available
npm view @jagad/icsi

# Install from NPM to verify
npm install @jagad/icsi
```

### Automated Publishing with GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org/'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Build package
        run: pnpm run build
        working-directory: packages/icsi-lib

      - name: Publish to NPM
        run: npm publish --access public
        working-directory: packages/icsi-lib
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Post-Publishing

1. **Create GitHub Release**: Document the changes
2. **Update Documentation**: Update any external docs
3. **Announce Release**: Share with community
4. **Monitor**: Watch for issues or feedback

### Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (1.0.1): Bug fixes, no breaking changes
- **Minor** (1.1.0): New features, backward compatible
- **Major** (2.0.0): Breaking changes

Example version updates:

```bash
# Bug fix release
npm version patch   # 1.0.0 → 1.0.1

# New feature release
npm version minor   # 1.0.1 → 1.1.0

# Breaking change release
npm version major   # 1.1.0 → 2.0.0
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/jagad/icp-subaccount-indexer/issues)
- **Documentation**: [GitHub Repository](https://github.com/jagad/icp-subaccount-indexer)
- **Community**: [Internet Computer Forum](https://forum.dfinity.org/)

## Related Projects

- [Internet Computer](https://internetcomputer.org/) - The blockchain this library is built for
- [DFinity Agent JS](https://github.com/dfinity/agent-js) - Core Internet Computer agent library
- [IC-CDK](https://github.com/dfinity/cdk-rs) - Canister Development Kit for Rust

---

Built with ❤️ for the Internet Computer ecosystem
