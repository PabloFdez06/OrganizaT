#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
    cp .env.beta.example .env
fi

docker compose -f docker-compose.beta.yml up -d --build --remove-orphans

if ! grep -Eq '^APP_KEY=base64:' .env; then
    docker compose -f docker-compose.beta.yml exec -T app php artisan key:generate --force
fi

docker compose -f docker-compose.beta.yml exec -T app php artisan migrate --force
docker compose -f docker-compose.beta.yml exec -T app php artisan optimize:clear
docker compose -f docker-compose.beta.yml exec -T app php artisan optimize
