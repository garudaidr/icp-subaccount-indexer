# ICSI CLI Tool

## Overview

This CLI tool is designed to interact with the ICSI (ICP Sub-Account Indexer) canister. It provides both an interactive mode and a command-line interface for executing various operations on the ICSI canister.

## Prerequisites

- Node.js (version 12 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the project root and add the following:
   ```
   CANISTER_ID=<your-canister-id>
   CUSTODIAN_SEED=<your-custodian-seed>
   ```

## Usage

The CLI tool can be used in two modes: interactive and command-line.

### Interactive Mode

To start the interactive mode, run:

```
node index.js
```

This will present a menu of available operations. Follow the on-screen prompts to execute various canister methods.

### Command-Line Mode

To use the command-line mode, use the `--cli` flag followed by the method name and any required arguments:

```
node index.js --cli <method_name> [arguments]
```

#### Available Commands:

1. Add a subaccount:
   ```
   node index.js --cli add_subaccount
   ```

2. Set webhook URL:
   ```
   node index.js --cli set_webhook_url https://example.com/webhook
   ```

3. Other available methods:
   - get_account_identifier_transactions
   - query_blocks
   - get_network
   - set_next_block
   - get_next_block
   - set_interval
   - get_interval
   - get_nonce
   - get_canister_principal
   - get_subaccountid
   - get_subaccount_count
   - get_transactions_count
   - get_oldest_block
   - list_transactions
   - clear_transactions
   - refund
   - sweep
   - canister_status
   - get_webhook_url

   Example usage:
   ```
   node index.js --cli get_network
   ```

## Development

To modify or extend the CLI tool:

1. Edit the `index.js` file to add new methods or modify existing ones.
2. Update the `runTest` function to handle new methods.
3. If adding new CLI commands, update the `handleCommandLineArgs` function.
4. For interactive mode changes, modify the `promptUser` function.

## Troubleshooting

- If you encounter "Module not found" errors, ensure all dependencies are installed by running `npm install`.
- Check that your `.env` file is properly configured with the correct canister ID and custodian seed.
- For network-related issues, verify your internet connection and the status of the Internet Computer network.

## Contributing

Contributions to improve the CLI tool are welcome. Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Commit your changes (`git commit -am 'Add some feature'`)
5. Push to the branch (`git push origin feature/your-feature-name`)
6. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.