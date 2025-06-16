#!/bin/bash

# Local testing script for GitHub Actions with act
# Usage: ./test-local.sh [job-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Act command with best settings
ACT_CMD="act --container-architecture linux/amd64 -P ubuntu-latest=catthehacker/ubuntu:runner-latest"

print_usage() {
    echo -e "${BLUE}Local GitHub Actions Testing Script${NC}"
    echo ""
    echo "Usage: $0 [job-name]"
    echo ""
    echo -e "${YELLOW}Available jobs from ci.yml:${NC}"
    echo "  test-unit       - Unit tests (TypeScript)"
    echo "  test-backend    - Backend tests (Rust)"
    echo "  build-canister  - Build canister WASM"
    echo "  lint-and-format - All linting and formatting"
    echo ""
    echo -e "${YELLOW}Special commands:${NC}"
    echo "  list            - List all available jobs"
    echo "  quick           - Run quick tests (unit + backend)"
    echo "  all-local       - Run all local tests (unit + backend + build + lint)"
    echo ""
    echo "Examples:"
    echo "  $0 test-unit"
    echo "  $0 build-canister"
    echo "  $0 quick"
    echo "  $0 all-local"
}

run_job() {
    local job=$1
    
    echo -e "${BLUE}Running job: ${job} from ci.yml${NC}"
    
    $ACT_CMD -j "$job" -W .github/workflows/ci.yml
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Job '$job' completed successfully${NC}"
    else
        echo -e "${RED}❌ Job '$job' failed${NC}"
        exit 1
    fi
}

case "${1:-help}" in
    "help"|"--help"|"-h"|"")
        print_usage
        ;;
    "list")
        echo -e "${BLUE}Listing all available jobs...${NC}"
        act --list
        ;;
    "quick")
        echo -e "${BLUE}Running quick tests (unit + backend)...${NC}"
        jobs=("test-unit" "test-backend")
        for job in "${jobs[@]}"; do
            echo ""
            run_job "$job"
        done
        echo -e "${GREEN}🎉 Quick tests completed successfully!${NC}"
        ;;
    "all-local")
        echo -e "${BLUE}Running all local tests (unit + backend + build + lint)...${NC}"
        jobs=("test-unit" "test-backend" "build-canister" "lint-and-format")
        for job in "${jobs[@]}"; do
            echo ""
            run_job "$job"
        done
        echo -e "${GREEN}🎉 All local tests completed successfully!${NC}"
        ;;
    # CI jobs
    "test-unit"|"test-backend"|"build-canister"|"lint-and-format")
        run_job "$1"
        ;;
    *)
        echo -e "${RED}Unknown job: $1${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac