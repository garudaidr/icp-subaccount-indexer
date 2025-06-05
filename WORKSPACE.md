# ICSI Monorepo Structure

This project uses pnpm workspaces to manage multiple packages in a monorepo structure.

## Structure

```
.
├── pnpm-workspace.yaml     # Workspace configuration
├── package.json           # Root package with workspace scripts
├── pnpm-lock.yaml        # Single lockfile for entire workspace
├── packages/
│   └── icsi-lib/         # ICSI TypeScript library
└── .maintain/
    └── legacy/
        └── script/       # Legacy test scripts
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

### From Root Directory

```bash
# Build everything
pnpm run build

# Run tests
pnpm run test

# Format all code
pnpm run format

# Library-specific commands
pnpm run lib:generate:wallet    # Generate test wallet
pnpm run lib:test:icp          # Test ICP deposits
pnpm run lib:test:usdc         # Test USDC deposits
pnpm run lib:test:usdt         # Test USDT deposits
pnpm run lib:test:webhook      # Test webhooks
```

### Working with Specific Packages

```bash
# Run command in specific package
pnpm --filter @jagad/icsi <command>

# Or navigate to package
cd packages/icsi-lib
pnpm run test:usdc-deposit
```

## Benefits

1. **Single Install**: One `pnpm install` at root installs everything
2. **Shared Dependencies**: Common dependencies are hoisted to root
3. **Single Lock File**: One `pnpm-lock.yaml` ensures consistency
4. **Cross-Package Scripts**: Run any package script from root
5. **Atomic Updates**: Update dependencies across all packages together

## Adding New Packages

1. Create new directory under `packages/`
2. Add package.json with unique name
3. Update `pnpm-workspace.yaml` if needed
4. Run `pnpm install` from root

## Troubleshooting

If you encounter issues:

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clear pnpm cache
pnpm store prune
```
