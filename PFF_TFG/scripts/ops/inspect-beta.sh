#!/usr/bin/env sh
set -eu

docker compose -f docker-compose.beta.yml ps
docker compose -f docker-compose.beta.yml logs --tail=40 nginx
docker compose -f docker-compose.beta.yml logs --tail=40 app
docker compose -f docker-compose.beta.yml logs --tail=40 worker
docker compose -f docker-compose.beta.yml logs --tail=40 scheduler
