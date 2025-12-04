.PHONY: all install build test test-integration lint extract-examples services services-up services-down services-logs services-status clean set-east-version version-prerelease version-patch version-minor version-major help

# Default target
all: build

# Install dependencies
install:
	. ${NVM_DIR}/nvm.sh && nvm use && npm ci

# Build the project
build:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run build

# Run tests (unit tests only, no Docker required)
test:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run build && npm test

# Run integration tests with Docker services (east-node-io only)
test-integration:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run test:integration --workspace=@elaraai/east-node-io

# Run linter
lint:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run build && npm run lint

# Extract TypeDoc examples
extract-examples:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run extract-examples --workspaces --if-present

# Start development services (Docker) - for east-node-io integration tests
services:
	docker-compose -f packages/east-node-io/docker-compose.yml up -d

# Alias for services
services-up:
	docker-compose -f packages/east-node-io/docker-compose.yml up -d

# Stop development services
services-down:
	docker-compose -f packages/east-node-io/docker-compose.yml down -v

# View service logs
services-logs:
	docker-compose -f packages/east-node-io/docker-compose.yml logs -f

# Check service status
services-status:
	docker-compose -f packages/east-node-io/docker-compose.yml ps

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf node_modules/
	rm -rf packages/*/dist/
	rm -rf packages/*/node_modules/
	rm -rf packages/*/.package/
	rm -rf package-lock.json

# Update @elaraai/east version across all packages
# Usage: make set-east-version VERSION=0.0.1-beta.1
set-east-version:
ifndef VERSION
	$(error VERSION is required. Usage: make set-east-version VERSION=0.0.1-beta.1)
endif
	@echo "Updating @elaraai/east to version $(VERSION)..."
	@find packages -name "package.json" -exec sed -i 's/"@elaraai\/east": "[^"]*"/"@elaraai\/east": "^$(VERSION)"/g' {} \;
	@echo "Done. Run 'npm install' to update dependencies."

# Bump all package versions
version-prerelease:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run version:all:prerelease

version-patch:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run version:all:patch

version-minor:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run version:all:minor

version-major:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run version:all:major

# Help target
help:
	@echo "Available targets:"
	@echo "  install            - Install dependencies"
	@echo "  build              - Build the project"
	@echo "  test               - Run unit tests"
	@echo "  test-integration   - Run integration tests with Docker (east-node-io)"
	@echo "  lint               - Run linter"
	@echo "  extract-examples   - Extract TypeDoc examples"
	@echo "  services           - Start Docker services"
	@echo "  services-up        - Start Docker services (alias)"
	@echo "  services-down      - Stop Docker services"
	@echo "  services-logs      - View service logs"
	@echo "  services-status    - Check service status"
	@echo "  clean              - Clean build artifacts"
	@echo "  set-east-version   - Update @elaraai/east version (VERSION=x.y.z)"
	@echo "  version-prerelease - Bump all packages to next prerelease version"
	@echo "  version-patch      - Bump all packages patch version"
	@echo "  version-minor      - Bump all packages minor version"
	@echo "  version-major      - Bump all packages major version"
	@echo "  help               - Show this help message"
