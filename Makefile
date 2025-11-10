.PHONY: help install clean dev build test lint docker-up docker-down docker-logs docker-restart

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ General

help: ## Display this help message
	@echo "$(BLUE)AWS HealthImaging Application - Makefile Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(GREEN)<target>$(NC)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-25s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Installation & Setup

install: ## Install all dependencies using pnpm
	@echo "$(BLUE)Installing dependencies with pnpm...$(NC)"
	pnpm install

install-backend: ## Install backend dependencies only
	@echo "$(BLUE)Installing backend dependencies...$(NC)"
	cd backend && pnpm install

install-frontend: ## Install frontend dependencies only
	@echo "$(BLUE)Installing frontend dependencies...$(NC)"
	cd frontend && pnpm install

setup: docker-up install prisma-generate prisma-migrate ## Complete project setup (docker + deps + database)
	@echo "$(GREEN)✓ Setup complete!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Configure backend/.env file"
	@echo "  2. Run 'make dev' to start development servers"

##@ Docker & Infrastructure

docker-up: ## Start PostgreSQL and Redis containers
	@echo "$(BLUE)Starting Docker containers...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Containers started$(NC)"

docker-down: ## Stop Docker containers
	@echo "$(BLUE)Stopping Docker containers...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Containers stopped$(NC)"

docker-restart: ## Restart Docker containers
	@echo "$(BLUE)Restarting Docker containers...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Containers restarted$(NC)"

docker-logs: ## View Docker container logs
	docker-compose logs -f

docker-clean: docker-down ## Stop containers and remove volumes
	@echo "$(RED)Removing Docker volumes...$(NC)"
	docker-compose down -v
	@echo "$(GREEN)✓ Containers and volumes removed$(NC)"

##@ Database (Prisma)

prisma-generate: ## Generate Prisma client
	@echo "$(BLUE)Generating Prisma client...$(NC)"
	cd backend && pnpm prisma:generate

prisma-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	cd backend && pnpm prisma:migrate

prisma-studio: ## Open Prisma Studio (database GUI)
	@echo "$(BLUE)Opening Prisma Studio...$(NC)"
	cd backend && pnpm prisma:studio

prisma-seed: ## Seed database with initial data
	@echo "$(BLUE)Seeding database...$(NC)"
	cd backend && pnpm prisma:seed

db-reset: ## Reset database (drop, migrate, seed)
	@echo "$(RED)Resetting database...$(NC)"
	cd backend && pnpm prisma migrate reset --force

##@ Development

dev: ## Start both frontend and backend in development mode
	@echo "$(GREEN)Starting development servers...$(NC)"
	@echo "$(YELLOW)Backend:$(NC) http://localhost:3001/api"
	@echo "$(YELLOW)Frontend:$(NC) http://localhost:3000"
	@echo ""
	@trap 'kill 0' EXIT; \
	(cd backend && pnpm start:dev) & \
	(cd frontend && pnpm dev) & \
	wait

dev-backend: ## Start backend development server
	@echo "$(BLUE)Starting backend development server...$(NC)"
	cd backend && pnpm start:dev

dev-frontend: ## Start frontend development server
	@echo "$(BLUE)Starting frontend development server...$(NC)"
	cd frontend && pnpm dev

##@ Building

build: build-backend build-frontend ## Build both frontend and backend

build-backend: ## Build backend for production
	@echo "$(BLUE)Building backend...$(NC)"
	cd backend && pnpm build
	@echo "$(GREEN)✓ Backend built$(NC)"

build-frontend: ## Build frontend for production
	@echo "$(BLUE)Building frontend...$(NC)"
	cd frontend && pnpm build
	@echo "$(GREEN)✓ Frontend built$(NC)"

##@ Testing

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests
	@echo "$(BLUE)Running backend tests...$(NC)"
	cd backend && pnpm test

test-backend-e2e: ## Run backend E2E tests
	@echo "$(BLUE)Running backend E2E tests...$(NC)"
	cd backend && pnpm test:e2e

test-backend-cov: ## Run backend tests with coverage
	@echo "$(BLUE)Running backend tests with coverage...$(NC)"
	cd backend && pnpm test:cov

test-backend-watch: ## Run backend tests in watch mode
	@echo "$(BLUE)Running backend tests in watch mode...$(NC)"
	cd backend && pnpm test:watch

test-frontend: ## Run frontend tests
	@echo "$(BLUE)Running frontend tests...$(NC)"
	cd frontend && pnpm test

test-frontend-ui: ## Run frontend tests with UI
	@echo "$(BLUE)Running frontend tests with UI...$(NC)"
	cd frontend && pnpm test:ui

test-frontend-cov: ## Run frontend tests with coverage
	@echo "$(BLUE)Running frontend tests with coverage...$(NC)"
	cd frontend && pnpm test:coverage

##@ Linting & Formatting

lint: lint-backend lint-frontend ## Lint both frontend and backend

lint-backend: ## Lint backend code
	@echo "$(BLUE)Linting backend...$(NC)"
	cd backend && pnpm lint

lint-frontend: ## Lint frontend code
	@echo "$(BLUE)Linting frontend...$(NC)"
	cd frontend && pnpm lint

format-backend: ## Format backend code
	@echo "$(BLUE)Formatting backend code...$(NC)"
	cd backend && pnpm format

type-check-frontend: ## Type check frontend code
	@echo "$(BLUE)Type checking frontend...$(NC)"
	cd frontend && pnpm type-check

##@ Production

start-prod-backend: ## Start backend in production mode
	@echo "$(GREEN)Starting backend in production mode...$(NC)"
	cd backend && pnpm start:prod

preview-frontend: ## Preview frontend production build
	@echo "$(GREEN)Previewing frontend production build...$(NC)"
	cd frontend && pnpm preview

##@ Cleaning

clean: ## Clean all dependencies and build artifacts
	@echo "$(RED)Cleaning project...$(NC)"
	rm -rf node_modules
	rm -rf backend/node_modules backend/dist
	rm -rf frontend/node_modules frontend/dist
	@echo "$(GREEN)✓ Project cleaned$(NC)"

clean-install: clean install ## Clean and reinstall all dependencies

##@ Quick Start Commands

first-time: ## First time setup (everything from scratch)
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)First Time Setup$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@$(MAKE) docker-up
	@sleep 3
	@$(MAKE) install
	@echo "$(YELLOW)Checking for .env file...$(NC)"
	@if [ ! -f backend/.env ]; then \
		echo "$(RED)⚠ backend/.env not found$(NC)"; \
		echo "$(YELLOW)Please copy backend/.env.example to backend/.env and configure it$(NC)"; \
		exit 1; \
	fi
	@$(MAKE) prisma-generate
	@$(MAKE) prisma-migrate
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)✓ Setup Complete!$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(YELLOW)Run 'make dev' to start development servers$(NC)"

quick-start: docker-up dev ## Quick start (assumes dependencies are installed)

restart: docker-restart ## Restart everything (Docker + dev servers)
	@$(MAKE) dev
