#!/usr/bin/env sh
set -eu

COMPOSE_FILE="docker-compose.beta.yml"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\n[ERROR] %s\n' "$*" >&2
  exit 1
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

set_env_value() {
  key="$1"
  value="$2"

  if grep -qE "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

ensure_env_file() {
  if [ ! -f .env ]; then
    cp .env.beta.example .env
  fi
}

ensure_app_key() {
  if grep -Eq '^APP_KEY=base64:' .env; then
    return
  fi

  log "APP_KEY ausente. Generando clave..."
  generated_key="$(compose run --rm --no-deps app php artisan key:generate --show | tail -n 1 | tr -d '\r')"

  case "$generated_key" in
    base64:*) set_env_value "APP_KEY" "$generated_key" ;;
    *) fail "No se pudo generar una APP_KEY válida." ;;
  esac
}

wait_for_service_health() {
  service="$1"
  retries="${2:-20}"
  sleep_seconds="${3:-3}"
  attempt=1

  while [ "$attempt" -le "$retries" ]; do
    status="$(compose ps --format json 2>/dev/null | grep -o '"Service":"[^"]*"\|"Health":"[^"]*"' | paste - - | sed 's/"Service":"//;s/" "Health":"/ /;s/"//g' | awk -v svc="$service" '$1==svc{print $2; exit}')"

    if [ "$status" = "healthy" ] || [ -z "$status" ]; then
      return 0
    fi

    sleep "$sleep_seconds"
    attempt=$((attempt + 1))
  done

  fail "El servicio $service no alcanzó estado healthy."
}

post_checks() {
  app_port="$(grep -E '^APP_HTTP_PORT=' .env | tail -n 1 | cut -d= -f2- || true)"
  if [ -z "$app_port" ]; then
    app_port=80
  fi

  log "Estado de contenedores"
  compose ps

  if command -v curl >/dev/null 2>&1; then
    log "Comprobando endpoint /up"
    curl -fsS "http://127.0.0.1:${app_port}/up" >/dev/null || fail "Falló el healthcheck HTTP en /up"
  fi

  log "Comprobando Redis"
  compose exec -T redis sh -c 'if [ -n "${REDIS_PASSWORD:-}" ] && [ "${REDIS_PASSWORD}" != "null" ]; then redis-cli -a "$REDIS_PASSWORD" ping | grep -q PONG; else redis-cli ping | grep -q PONG; fi' || fail "Redis no responde"

  log "Comprobando proceso worker"
  compose exec -T worker sh -c 'pgrep -f "artisan queue:work" >/dev/null' || fail "Worker no está en ejecución"

  log "Comprobando proceso scheduler"
  compose exec -T scheduler sh -c 'pgrep -f "artisan schedule:work" >/dev/null' || fail "Scheduler no está en ejecución"
}

main() {
  ensure_env_file
  ensure_app_key

  log "Validando docker compose"
  compose config >/dev/null

  log "Construyendo imágenes"
  compose build --pull

  log "Levantando stack"
  compose up -d --remove-orphans

  wait_for_service_health db 30 4
  wait_for_service_health redis 20 3
  wait_for_service_health app 30 4
  wait_for_service_health nginx 30 4

  log "Ejecutando migraciones"
  compose exec -T app php artisan migrate --force

  log "Limpiando y regenerando cachés"
  compose exec -T app php artisan optimize:clear
  compose exec -T app php artisan optimize

  log "Reiniciando workers de cola"
  compose exec -T app php artisan queue:restart

  post_checks

  log "Despliegue beta completado correctamente"
}

main "$@"
