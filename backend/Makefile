.PHONY: up down build logs setup-demo test format format-check lint lint-fix lint-check quality-check security

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

setup-demo:
	docker compose exec api python setup_demo.py

test:
	docker compose exec api ./run_tests.sh

format:
	docker compose exec api ruff format ./app

format-check:
	docker compose exec api ruff format ./app --check

lint:
	docker compose exec api ruff check ./app --fix

lint-check:
	docker compose exec api ruff check ./app

quality-check:
	docker compose exec api sh -c "ruff format ./app --check && ruff check ./app"

security:
	./scan_vulnerabilities.sh
