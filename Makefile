API_DIR := api
UI_DIR  := ui

.PHONY: help setup install sync dev api ui clean

##@ Help

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make \033[36m<target>\033[0m\n"} \
	  /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } \
	  /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2 }' \
	  $(MAKEFILE_LIST)

##@ Setup

install: ## Install npm dependencies
	npm install

sync: ## Sync exercise data from the upstream rustlings repo
	cd $(API_DIR) && cargo run -- sync

setup: install sync ## First-time setup: install deps + sync exercise data

##@ Development

api: ## Start the API server on :3000
	cd $(API_DIR) && cargo run -- serve

ui: ## Start the UI dev server on :3001
	npm run dev --workspace=$(UI_DIR)

dev: ## Start API + UI together (Ctrl-C stops both)
	@echo "Starting API on :3000 and UI on :3001 ..."
	@trap 'kill 0' INT TERM; \
	(cd $(API_DIR) && cargo run -- serve) & \
	(npm run dev --workspace=$(UI_DIR)) & \
	wait

##@ Maintenance

clean: ## Remove build artifacts and the local database
	cargo clean
	rm -f $(API_DIR)/rustlings.db
