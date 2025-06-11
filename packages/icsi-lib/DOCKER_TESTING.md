# Docker Testing Guide

This guide explains how to use the Docker-based testing environment for end-to-end testing of the ICSI (ICP Sub-Account Indexer) system.

## Overview

The Docker testing environment provides:

- **Isolated DFX replica** running locally
- **Test token canisters** (ICP, ckUSDC, ckUSDT)
- **ICSI indexer canister** with proper configuration
- **Automated deployment** sequence
- **Jest integration** for comprehensive testing

## Prerequisites

- Docker and Docker Compose installed
- pnpm package manager
- Node.js 20+

## Quick Start

```bash
# Navigate to the library directory
cd packages/icsi-lib

# Run end-to-end tests with Docker
pnpm run docker:e2e

# For CI environments
pnpm run docker:e2e:ci
```

## Architecture

### Services

The Docker environment consists of three services:

1. **dfx**: DFX replica with ICP ledger
2. **test-tokens**: Deploys test ckUSDC and ckUSDT canisters
3. **icsi-indexer**: Deploys the main ICSI canister

### Dependencies

Services start in sequence:

```
dfx → test-tokens → icsi-indexer
```

Each service waits for the previous one to complete successfully.

### Volumes

- `dfx_data`: Persistent DFX state
- `node_modules`: Cached Node.js dependencies
- `pnpm_cache`: Cached pnpm packages

## Configuration

### Environment Variables

The deployment process creates `.env.docker` with:

```env
DFX_NETWORK=local
ICP_CANISTER_ID=rdmx6-jaaaa-aaaaa-aaadq-cai
CKUSDC_CANISTER_ID=<generated-id>
CKUSDT_CANISTER_ID=<generated-id>
USER_VAULT_CANISTER_ID=<generated-id>
MINTER_PRINCIPAL=<dfx-identity-principal>
DFX_HOST=http://localhost:4943
```

### Token Configuration

Test tokens are configured with:

- **Transfer fee**: 10,000 micro-units (0.01 tokens)
- **Minting account**: DFX default identity
- **Initial balances**: Empty (tokens minted as needed)
- **Archive settings**: Optimized for testing

## Manual Commands

### Start Environment Only

```bash
# Start just the Docker environment
pnpm run docker:up

# Check status
docker-compose -f docker/docker-compose.test.yml ps

# View logs
docker-compose -f docker/docker-compose.test.yml logs
```

### Stop Environment

```bash
# Stop and clean up
pnpm run docker:down
```

### Full Deployment

```bash
# Run complete deployment sequence
pnpm run docker:test
```

## Test Structure

### Integration Tests

Located in `test/integration/endToEnd.test.ts`:

- **Token registration workflow**
- **Subaccount creation and management**
- **Webhook configuration**
- **Interval management**
- **Transaction queries**
- **Balance inquiries**
- **Sweep operations**

### Test Categories

1. **Complete Workflow Tests**

   - Multi-token registration
   - Subaccount generation
   - Address validation

2. **Configuration Tests**

   - Webhook URL management
   - Polling interval settings
   - State persistence

3. **Query Tests**

   - Transaction counting
   - Balance retrieval
   - State consistency

4. **Error Handling Tests**
   - Concurrent operations
   - Timeout scenarios
   - Edge cases

## Troubleshooting

### Common Issues

1. **Port conflicts**

   ```bash
   # Check if port 4943 is in use
   lsof -i :4943

   # Kill existing DFX processes
   pkill dfx
   ```

2. **Docker daemon not running**

   ```bash
   # Start Docker (macOS)
   open /Applications/Docker.app

   # Start Docker (Linux)
   sudo systemctl start docker
   ```

3. **Insufficient disk space**

   ```bash
   # Clean up Docker
   docker system prune -a

   # Remove unused volumes
   docker volume prune
   ```

4. **Canister deployment failures**

   ```bash
   # Check container logs
   docker-compose -f docker/docker-compose.test.yml logs icsi-indexer

   # Restart with clean state
   pnpm run docker:down && pnpm run docker:e2e
   ```

### Debug Mode

Enable verbose logging:

```bash
# Set debug environment
export DEBUG=true

# Run tests with detailed output
pnpm run docker:e2e
```

### Container Access

Access running containers for debugging:

```bash
# Access DFX container
docker-compose -f docker/docker-compose.test.yml exec dfx bash

# Check DFX status
dfx ping

# List canisters
dfx canister status --network local --all
```

## Performance Considerations

### Resource Usage

- **Memory**: ~2GB recommended
- **CPU**: 2+ cores for parallel builds
- **Disk**: ~5GB for Docker images and volumes
- **Network**: Minimal (local only)

### Optimization

- Node modules and pnpm cache are volume-mounted for speed
- DFX data persists between runs to avoid re-downloading
- Services start in parallel where possible

### CI/CD Integration

For GitHub Actions:

```yaml
- name: Run E2E tests
  run: cd packages/icsi-lib && pnpm run docker:e2e:ci
  timeout-minutes: 15
```

## Development Workflow

### Typical Flow

1. Make code changes
2. Run unit tests: `pnpm run test:unit`
3. Run e2e tests: `pnpm run docker:e2e`
4. Commit changes

### Debugging Tests

1. Start environment: `pnpm run docker:up`
2. Run tests manually: `pnpm run test:integration`
3. Inspect state via DFX commands
4. Clean up: `pnpm run docker:down`

## Advanced Usage

### Custom Token Amounts

Modify test scripts to use different amounts:

```typescript
// In test files
const testAmount = testHelper.convertToE8s(0.5); // 0.5 tokens
```

### Extended Timeouts

For slow environments:

```bash
# Increase Jest timeout
jest --config jest.config.integration.js --testTimeout=600000
```

### Multiple Test Runs

```bash
# Run tests multiple times for reliability
for i in {1..3}; do
  echo "Test run $i"
  pnpm run docker:e2e:ci
done
```

## Security Notes

- **Test environment only**: Never use in production
- **Ephemeral identities**: Test principals are generated fresh
- **Local network**: No mainnet connectivity
- **Clean state**: Each run starts with clean canisters

## Contributing

When modifying the Docker setup:

1. Update relevant configuration files
2. Test with `pnpm run docker:e2e`
3. Update this documentation
4. Run CI tests locally
5. Submit PR with clear description

## Support

For issues with Docker testing:

1. Check this guide first
2. Review container logs
3. Search existing issues on GitHub
4. Create new issue with reproduction steps
