#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
	cp .env.beta.example .env
fi

docker compose -f docker-compose.beta.yml build --pull
docker compose -f docker-compose.beta.yml up -d --remove-orphans
docker compose -f docker-compose.beta.yml exec -T app php artisan migrate --force
docker compose -f docker-compose.beta.yml exec -T app php artisan optimize:clear
docker compose -f docker-compose.beta.yml exec -T app php artisan optimize
docker compose -f docker-compose.beta.yml exec -T app php artisan queue:restart
