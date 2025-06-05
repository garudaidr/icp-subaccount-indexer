# DEPRECATED - Legacy Scripts

This directory contains legacy scripts that have been superseded by newer implementations.

## Migration Guide

### Deploy Scripts

- **OLD**: `.maintain/deploy.sh`
- **NEW**:
  - For local development: Keep using `.maintain/deploy.sh` (it includes ledger deployment)
  - For mainnet: Use `scripts/deploy-mainnet.sh`

### Test Scripts

- **OLD**: `.maintain/test.sh` and `.maintain/script/index.js`
- **NEW**: `packages/icsi-lib/test/scripts/`
  - `testUSDCDeposit.ts` - Test CKUSDC deposits
  - `testWebhook.ts` - Test webhook functionality
  - See `packages/icsi-lib/README.md` for usage

### Why Keep These Files?

- `.maintain/deploy.sh` - Still useful for local development as it deploys the ICP ledger
- `.maintain/test.sh` - Basic ICP transfer testing reference
- `.maintain/script/index.js` - Interactive CLI tool (may be useful for debugging)

### Recommended Actions

1. Use the TypeScript test suite in `packages/icsi-lib/test/scripts/` for all new testing
2. Use `scripts/deploy-mainnet.sh` for production deployments
3. Refer to `scripts/README.md` for current documentation
