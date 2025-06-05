<img width="200" src="./docs/icsi.png">

# 🧑‍🚀 ICSI: ICP Sub-Account Indexer

Streamline the management and indexing of principal sub-accounts for ICRC transactions.

[![Build and Test ICP Prototype Backend](https://github.com/garudaidr/icp-subaccount-indexer/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/garudaidr/icp-subaccount-indexer/actions/workflows/build-and-test.yml)

## Overview

ICSI (ICP Sub-Account Indexer) is a robust solution designed to streamline the management and indexing of sub-accounts within the ICP (Internet Computer Protocol) ecosystem. This project aims to enhance the efficiency, security, and scalability of handling multiple sub-accounts under a single principal, making it easier for users and administrators to manage their ICP assets.

The ICSI canister provides methods that allow organizations to primarily carry out several operations:

- Generate sub-account-id in the form of hex_string
- Track incoming ICP-token transfers into created sub-account-ids
- Manage ICP-tokens that reside in the sub-account-ids

### Video Demo

If you are interested in learning more from the builders of ICSI, you can watch the product pitch and presentation in the attached videos below:

- [Jagad ICSI - Product Pitch](https://youtu.be/dxknHHXws-w)
- [Jagad Presentation in ICP Office Hour - Stephen Antoni](https://youtu.be/uwZGl-OaPNI)
- [Jagad App Short Product Demo](https://youtu.be/mMKuJmFbFAY)

## Description

### 1. Simplicity

ICSI simplifies the process of managing sub-accounts by providing a clear and intuitive interface for creating, tracking, and managing sub-accounts. Users can easily generate new sub-accounts and view transaction histories without dealing with the underlying complexities.

### 2. Security

Security is paramount in ICSI. By leveraging the ICP's robust security features and integrating additional validation mechanisms, ICSI ensures that all transactions are secure and compliant with best practices. Features like illicit transaction detection and refund capabilities add extra layers of protection for users' assets.

### 3. Scalability

ICSI is built to scale. With efficient indexing and transaction handling, the system can manage tens of thousands of sub-accounts without compromising performance. The design ensures that querying and managing transactions remains fast and reliable, even as the number of users grows.

### 4. Sequence Flow

[![](https://mermaid.ink/img/pako:eNqVk91q4zAQhV9FmL1oIX4BUwKhXZYUug2b_bkxhLE0TkXtkXc0CoTSd1_JWodunELXNzLSmaNPR5qXQjuDRVV4_B2QNN5Z2DP0Nan4DcBitR2ARP3wyAp8Hq8OFtR9-Qu6DuV6Ln4MvHsAS7uVMYzep8J72INRaVZt2FJSdvPKbWh2K61dIPG79e3mVFneOhJ2cUOTGW4aXiZ5Oclrynbjarlczigq9S2d0ou6w8F5K2rCax2PZdlgRp_MzsEq9QUJGQTP3bLJ7CDle0gSmC57zEGSRwKtYobuYM07m58iyNo1WbGJ9DsDedBiHeX8rnS8QtWAfkYyarVZ5yyM9U1gjz1G-uszz3kS21T8KR1S3EfTuGj0ls96pR21lvt44wforPm_YD_3gxwz9U8InfxjHjnHl3iCzN5fXQyJ7f5JlGsveL6xGOmmB9kcc5zD9LAXSgOpBlUPBPuoGJd7x6iwbTE6HLA71lQsih65B2tiD74kiLqQp5h7XVTx1wA_10VNr1EHQdz2SLqohAMuijCYeKV_-3WaRGPF8UPu6bG1X_8AfuRXQg?type=png)](https://mermaid.live/edit#pako:eNqVk91q4zAQhV9FmL1oIX4BUwKhXZYUug2b_bkxhLE0TkXtkXc0CoTSd1_JWodunELXNzLSmaNPR5qXQjuDRVV4_B2QNN5Z2DP0Nan4DcBitR2ARP3wyAp8Hq8OFtR9-Qu6DuV6Ln4MvHsAS7uVMYzep8J72INRaVZt2FJSdvPKbWh2K61dIPG79e3mVFneOhJ2cUOTGW4aXiZ5Oclrynbjarlczigq9S2d0ou6w8F5K2rCax2PZdlgRp_MzsEq9QUJGQTP3bLJ7CDle0gSmC57zEGSRwKtYobuYM07m58iyNo1WbGJ9DsDedBiHeX8rnS8QtWAfkYyarVZ5yyM9U1gjz1G-uszz3kS21T8KR1S3EfTuGj0ls96pR21lvt44wforPm_YD_3gxwz9U8InfxjHjnHl3iCzN5fXQyJ7f5JlGsveL6xGOmmB9kcc5zD9LAXSgOpBlUPBPuoGJd7x6iwbTE6HLA71lQsih65B2tiD74kiLqQp5h7XVTx1wA_10VNr1EHQdz2SLqohAMuijCYeKV_-3WaRGPF8UPu6bG1X_8AfuRXQg)

## How It Works

### 1. Subaccount Derivation

ICSI uses a [sophisticated mechanism to derive sub-accounts](https://jagad.slab.com/posts/subaccount-derivation-mechanism-ebwjd334) from a single principal ID. Each sub-account is generated using a combination of the principal ID and a subaccount number, ensuring privacy and uniqueness. This allows for an infinite number of sub-accounts under one principal.

### 2. Transaction Management

Transactions are tracked and managed efficiently. ICSI can list, clear, and refund transactions across sub-accounts, ensuring that all financial activities are transparent and manageable.

### 3. Sweeping Mechanism

ICSI incorporates a [sweeping mechanism](https://jagad.slab.com/posts/sweeping-subaccounts-to-user-vaults-main-principal-m2pjvc1t) to centralize funds from sub-accounts to a main principal account. This process involves validating transactions and ensuring that only legitimate deposits are swept to the main account.

## Technical Specifications

ICSI is built with a focus on modularity and extensibility. The core components include:

- **Subaccount Management**: Efficient handling of subaccount creation and indexing.
- **Transaction Handling**: Robust mechanisms for listing, clearing, and refunding transactions.
- **Security Features**: Integration with third-party services for transaction validation and illicit activity detection.

## Canister Methods

The canister provides several methods to assist with ICP-token deposit management. The complete methods can be observed inside
[Candid File](./src/icp_subaccount_indexer/icp_subaccount_indexer.did)

```
add_subaccount : () -> (variant { Ok : text; Err : Error });
```

This method returns sub-account-id in hex_string format.

```
sweep : () -> (variant { Ok : vec text; Err : Error });
```

This method forwards ICP-token that are sitting on each sub-account-ids

```
single_sweep : (text) -> (variant { Ok : vec text; Err : Error });
```

This method forwards ICP-token that was transacted within a single tx_hash provided in the argument

## Project Structure

This is a pnpm workspace monorepo containing:

- **Root**: DFX canister and webpack configuration
- **packages/icsi-lib**: TypeScript library for interacting with ICSI
- **.maintain/legacy/script**: Legacy test scripts

See [WORKSPACE.md](./WORKSPACE.md) for detailed monorepo documentation.

## Usage

### Quick Start

1. **Prerequisites**

   - Install [DFX](https://internetcomputer.org/docs/current/developer-docs/getting-started/install/)
   - Install Node.js and pnpm (`npm install -g pnpm`)
   - Have ICP tokens for mainnet deployment

2. **Local Development**

   ```bash
   # Install all dependencies (monorepo)
   pnpm install

   # Deploy locally with ICP ledger
   pnpm run deploy:local

   # Run library tests from root
   pnpm run lib:test:usdc
   ```

3. **Mainnet Deployment**

   ```bash
   # Deploy to mainnet
   ./scripts/deploy-mainnet.sh deploy

   # Upgrade existing canister
   ./scripts/deploy-mainnet.sh upgrade
   ```

### Deployment

#### Local Development

For local development with ICP ledger:

```bash
.maintain/deploy.sh --network local [--clean]
```

#### Mainnet Deployment

For production deployment:

```bash
./scripts/deploy-mainnet.sh deploy  # Initial deployment
./scripts/deploy-mainnet.sh upgrade # Upgrade existing
```

See [Deployment Guide](./docs/canister-deployment-guideline.md) for detailed instructions.

### Testing

#### Modern Test Suite (Recommended)

The TypeScript test suite in `packages/icsi-lib/test/scripts/` provides comprehensive testing:

```bash
# From root directory (monorepo commands)
pnpm install  # Install all workspace dependencies

# Generate test wallet
pnpm run lib:generate:wallet

# Test various deposits
pnpm run lib:test:icp    # Test ICP deposits
pnpm run lib:test:usdc   # Test USDC deposits
pnpm run lib:test:usdt   # Test USDT deposits

# Test webhook functionality
pnpm run lib:test:webhook

# Or run directly in the package
cd packages/icsi-lib
pnpm run test:usdc-deposit
```

See [Testing Guide](./TESTING_GUIDE.md) for complete documentation.

#### Legacy Test Scripts

Legacy scripts in `.maintain/` are deprecated but still available:

- `.maintain/test.sh` - Basic ICP transfer tests
- `.maintain/script/index.js` - Interactive CLI tool

See [Legacy Scripts Documentation](./.maintain/DEPRECATED.md) for migration guide.

## Conclusion

ICSI represents a significant advancement in the management of ICP sub-accounts, offering simplicity, security, and scalability. By leveraging advanced indexing and transaction handling techniques, ICSI provides a reliable and user-friendly solution for managing ICP assets.

## Research Documents

The following are some of the research documents during specification design:

[Subaccount Derivation Mechanism](https://jagad.slab.com/posts/subaccount-derivation-mechanism-ebwjd334)

[Sweeping Mechanism](https://jagad.slab.com/posts/sweeping-subaccounts-to-user-vaults-main-principal-m2pjvc1t)

## License

[MIT](./LICENSE.md) © [Jagad](https://t.me/jagadofficial)
