# --- Legal Draft Agent Makefile ---

# Export all variables defined in this Makefile to child processes (like docker compose)
.EXPORT_ALL_VARIABLES:

# Load environment variables from .env file if it exists
ifneq ("$(wildcard .env)","")
    include .env
endif

# Default target
.PHONY: help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  up             Start all services (API + UI) using Docker Compose"
	@echo "  down           Stop all services"
	@echo "  build          Build or rebuild all services"
	@echo "  restart        Restart all services"
	@echo "  logs           View logs for all services"
	@echo "  test           Run backend tests using pytest"
	@echo "  clean          Remove temporary files and build artifacts"
	@echo "  status         Show status of running containers"

# Docker Compose commands
.PHONY: up
up:
	docker compose up -d --build

.PHONY: down
down:
	docker compose down

.PHONY: build
build:
	docker compose build

.PHONY: restart
restart:
	docker compose restart

.PHONY: logs
logs:
	docker compose logs -f

.PHONY: status
status:
	docker compose ps

# Backend commands
.PHONY: run
run:
	.venv/bin/legal-draft-agent start

.PHONY: test
test:
	.venv/bin/python -m pytest tests/

# Cleanup
.PHONY: clean
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf *.egg-info
	rm -rf src/*.egg-info
	rm -rf ui/out
	rm -rf src/legal_draft_agent/ui
	rm -rf dist/
	rm -rf build/

# Bundling
.PHONY: bundle
bundle:
	cd ui && npm install && NEXT_PUBLIC_API="" npm run build
	mkdir -p src/legal_draft_agent/ui
	cp -r ui/out/* src/legal_draft_agent/ui/
	@echo "UI bundled into src/legal_draft_agent/ui with relative API paths"

# Packaging
.PHONY: dist
dist: clean bundle
	.venv/bin/python -m build
	@echo "Package built in dist/"
