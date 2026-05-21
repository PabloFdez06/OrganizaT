#!/usr/bin/env bash
# =============================================================================
# load-test.sh — Prueba de carga ligera con Apache Bench (ab)
#
# Uso:    bash scripts/ops/load-test.sh [URL_BASE]
# Defecto: https://organizat.blete.tech
#
# Requisito: apache2-utils (ab)
#   Ubuntu/Debian → apt-get install apache2-utils
#   macOS         → brew install httpd
# =============================================================================
set -euo pipefail

BASE_URL="${1:-https://organizat.blete.tech}"

# Parámetros de carga
REQUESTS_HEALTH=200
CONCURRENCY_HEALTH=20
REQUESTS_PAGES=100
CONCURRENCY_PAGES=10
REQUESTS_LIGHT=50
CONCURRENCY_LIGHT=5

log() { printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

check_ab() {
    if ! command -v ab >/dev/null 2>&1; then
        printf '[ERROR] Apache Bench (ab) no está instalado.\n' >&2
        printf '  Ubuntu/Debian : sudo apt-get install apache2-utils\n' >&2
        printf '  macOS         : brew install httpd\n' >&2
        exit 1
    fi
    printf 'ab version: %s\n' "$(ab -V 2>&1 | head -1)"
}

run_test() {
    local label="$1"
    local url="$2"
    local requests="$3"
    local concurrency="$4"

    log "Test: $label"
    printf '  URL          : %s\n' "$url"
    printf '  Peticiones   : %d\n' "$requests"
    printf '  Concurrencia : %d\n\n' "$concurrency"

    ab -n "$requests" -c "$concurrency" \
        -H "Accept-Encoding: gzip, deflate" \
        -r \
        "$url" 2>&1

    printf '\n─────────────────────────────────────────────────────────────\n'
}

# ─── Cabecera ───────────────────────────────────────────────────────────────
printf '\n'
printf '═══════════════════════════════════════════════════════════════\n'
printf '  OrganizaT — Prueba de carga ligera (Apache Bench)\n'
printf '  URL base  : %s\n' "$BASE_URL"
printf '  Fecha     : %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
printf '═══════════════════════════════════════════════════════════════\n'

check_ab

# ─── Test 1: Health endpoint (/up) ──────────────────────────────────────────
# Carga mínima de PHP — mide capacidad bruta del stack nginx + PHP-FPM
run_test \
    "Health endpoint — /up (carga mínima PHP)" \
    "${BASE_URL}/up" \
    "$REQUESTS_HEALTH" \
    "$CONCURRENCY_HEALTH"

# ─── Test 2: Página de inicio (renderizado Inertia) ─────────────────────────
# Página completa con layout React serializad por Inertia
run_test \
    "Página principal — / (render Inertia completo)" \
    "${BASE_URL}/" \
    "$REQUESTS_PAGES" \
    "$CONCURRENCY_PAGES"

# ─── Test 3: Documentación API (/docs/api) ──────────────────────────────────
# Scramble genera y serializa el spec OpenAPI en cada request (sin cache)
run_test \
    "Documentación API — /docs/api (Scramble / OpenAPI)" \
    "${BASE_URL}/docs/api" \
    "$REQUESTS_LIGHT" \
    "$CONCURRENCY_LIGHT"

# ─── Resumen ────────────────────────────────────────────────────────────────
log "Prueba de carga completada."
printf '\nInterpretación guía:\n'
printf '  /up          → debería superar 150 req/s con p95 < 200ms (carga mínima)\n'
printf '  /            → esperado 30–60 req/s con p95 < 400ms (render completo)\n'
printf '  /docs/api    → esperado 20–40 req/s (serialización JSON de spec)\n'
printf '\n  Si algún valor queda muy por debajo, revisar:\n'
printf '    1. Logs PHP-FPM:  docker compose -f docker-compose.beta.yml logs app\n'
printf '    2. Estado pool:   docker compose exec app curl -s http://127.0.0.1/status\n'
printf '    3. Opcache:       php artisan opcache:status (si el comando existe)\n'
printf '    4. pm.max_children en docker/php/php-fpm.d/zz-docker.conf\n'
