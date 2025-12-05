.PHONY: install build test lint clean services-up services-down set-east-version version-prerelease version-patch version-minor version-major link-local-east unlink-local-east help

# Install dependencies
install:
	npm ci

# Build the project
build:
	npm run build

# Run all tests
test:
	npm run build && npm test

# Run linter
lint:
	npm run build && npm run lint

# Clean build artifacts
clean:
	rm -rf node_modules/ package-lock.json
	rm -rf packages/*/dist/
	rm -rf packages/*/node_modules/
	rm -rf packages/*/.package/

# Start Docker services (for integration tests)
services-up:
	docker compose -f packages/east-node-io/docker-compose.yml up -d

# Stop Docker services
services-down:
	docker compose -f packages/east-node-io/docker-compose.yml down -v

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
	npm run version:all:prerelease

version-patch:
	npm run version:all:patch

version-minor:
	npm run version:all:minor

version-major:
	npm run version:all:major

# Link local east package for development/testing
# Usage: make link-local-east EAST_PATH=../east
link-local-east:
ifndef EAST_PATH
	$(error EAST_PATH is required. Usage: make link-local-east EAST_PATH=../east)
endif
	@echo "Linking local east from $(EAST_PATH)..."
	cd $(EAST_PATH) && npm link
	npm link @elaraai/east
	@echo ""
	@echo "Now using LOCAL east from $(EAST_PATH). Remember to 'make unlink-local-east' when done!"

# Unlink local east and restore npm version
unlink-local-east:
	@echo "Restoring npm version of east..."
	npm install @elaraai/east
	@echo ""
	@echo "Now using NPM east."

# Help
help:
	@echo "install           - Install dependencies (npm ci)"
	@echo "build             - Build the project"
	@echo "test              - Run all tests"
	@echo "test-export       - Export test IR from all packages"
	@echo "lint              - Run linter"
	@echo "clean             - Clean build artifacts"
	@echo "services-up       - Start Docker services"
	@echo "services-down     - Stop Docker services"
	@echo "set-east-version  - Update @elaraai/east version (VERSION=x.y.z)"
	@echo "version-prerelease - Bump all packages to next prerelease"
	@echo "version-patch     - Bump all packages patch version"
	@echo "version-minor     - Bump all packages minor version"
	@echo "version-major     - Bump all packages major version"
	@echo "link-local-east   - Link local east for testing (EAST_PATH=../east)"
	@echo "unlink-local-east - Restore npm version of east"
