.PHONY: install build test lint extract-examples

build:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run build

install:
	. ${NVM_DIR}/nvm.sh && nvm use && npm ci

test:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run build && npm test

lint:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run build && npm run lint

extract-examples:
	. ${NVM_DIR}/nvm.sh && nvm use && npm run extract-examples
