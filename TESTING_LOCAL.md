# Local GitHub Actions Testing

This project now has a simplified system for testing GitHub Actions locally using `act`.

## Quick Start

```bash
# Run quick tests (format + unit tests)
./test-local.sh quick

# Run individual jobs
./test-local.sh format-ts      # TypeScript formatting
./test-local.sh format-rust    # Rust formatting
./test-local.sh clippy         # Rust linting
./test-local.sh test-ts-unit   # TypeScript unit tests
./test-local.sh test-rust-unit # Rust unit tests
./test-local.sh build-basic    # Build canister WASM

# Show all available options
./test-local.sh
```

## What Was Fixed

### ✅ Resolved Issues

1. **Rust version incompatibility** - Updated from 1.81.0 to 1.82.0
2. **Multiple workflows running at once** - Created simplified local-ci.yml
3. **Complex dependencies** - Simplified test dependencies
4. **Job interdependencies** - Made all jobs independent
5. **Missing candid-extractor** - Added cargo install step for build jobs
6. **Workflow conflicts** - Disabled overlapping workflows (.disabled files)

### ✅ New Testing System

- **Local CI Workflow** (`.github/workflows/local-ci.yml`) - Simplified for `act`
- **Test Script** (`./test-local.sh`) - Easy job management
- **Individual Job Execution** - Run one test at a time
- **Quick Test Suites** - Run common combinations

## Available Jobs

### Simple Jobs (local-ci.yml)

| Job              | Description                 | Speed     |
| ---------------- | --------------------------- | --------- |
| `format-ts`      | TypeScript formatting check | Fast ⚡   |
| `format-rust`    | Rust formatting check       | Medium 🚀 |
| `clippy`         | Rust linting                | Medium 🚀 |
| `test-ts-unit`   | TypeScript unit tests       | Fast ⚡   |
| `test-rust-unit` | Rust unit tests             | Medium 🚀 |
| `build-basic`    | Build canister WASM         | Slow 🐌   |
| `type-check`     | TypeScript type checking    | Fast ⚡   |

### Complex Jobs (ci.yml)

| Job               | Description                | Speed     |
| ----------------- | -------------------------- | --------- |
| `test-unit`       | Full unit test suite       | Medium 🚀 |
| `test-backend`    | Backend tests with Rust    | Slow 🐌   |
| `lint-and-format` | All linting and formatting | Medium 🚀 |
| `security-audit`  | Security auditing          | Medium 🚀 |

### Special Commands

| Command     | Description                    |
| ----------- | ------------------------------ |
| `quick`     | Run format checks + unit tests |
| `all-local` | Run all local-ci jobs          |
| `list`      | Show all available jobs        |

## Manual act Commands

If you prefer using `act` directly:

```bash
# Run individual jobs from simplified workflow
act --container-architecture linux/amd64 -j format-ts -W .github/workflows/local-ci.yml -P ubuntu-latest=catthehacker/ubuntu:runner-latest

# Run individual jobs from main workflow
act --container-architecture linux/amd64 -j test-unit -W .github/workflows/ci.yml -P ubuntu-latest=catthehacker/ubuntu:runner-latest

# List all available jobs
act --list
```

## Workflow Structure

### Before (Problems)

```
❌ All jobs run at once
❌ Complex external service dependencies
❌ Tightly coupled dependencies
❌ Rust version incompatibility
❌ Hard to test individual components
```

### After (Solutions)

```
✅ Individual job execution
✅ Simplified dependencies
✅ Independent jobs
✅ Compatible Rust 1.82.0
✅ Easy local testing
```

## Best Practices

1. **Start with quick tests**: `./test-local.sh quick`
2. **Test individual components**: Use specific job names
3. **Use the script**: Easier than raw `act` commands
4. **Cache benefits**: Jobs reuse downloaded dependencies

## Troubleshooting

### Common Issues

- **Permission errors**: Check that `test-local.sh` is executable (`chmod +x test-local.sh`)
- **act not installed**: Install with `brew install act` (macOS) or see [act documentation](https://github.com/nektos/act)
- **Job failures**: Make sure dependencies are installed (`pnpm install`)

### Performance Tips

- Use `runner-latest` image for better compatibility
- Run quick tests first before slower builds
- Individual jobs are faster than full pipeline

## Development Workflow

```bash
# 1. Quick validation before committing
./test-local.sh quick

# 2. Test specific changes
./test-local.sh format-rust    # After Rust changes
./test-local.sh test-ts-unit   # After TypeScript changes

# 3. Full canister build when needed
./test-local.sh build-basic

# 4. Before major changes
./test-local.sh all-local
```

This system gives you the confidence that your GitHub Actions will work correctly when pushed to the repository, while allowing fast iteration during development.
