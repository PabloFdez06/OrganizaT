#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="docker-compose.beta.yml"
DOCKER_CMD="docker"

log() {
    printf "\n[%s] %s\n" "$(date +"%Y-%m-%d %H:%M:%S")" "$*"
}

fail() {
    printf "\n[ERROR] %s\n" "$*" >&2
    exit 1
}

compose() {
    ${DOCKER_CMD} compose -f "${COMPOSE_FILE}" "$@"
}

set_env_value() {
    local key="$1"
    local value="$2"

    if grep -qE "^${key}=" .env; then
        sed -i "s|^${key}=.*|${key}=${value}|" .env
    else
        printf "\n%s=%s\n" "${key}" "${value}" >> .env
    fi
}

read_env_value() {
    local key="$1"
    local line

    line="$(grep -E "^${key}=" .env | tail -n 1 || true)"
    if [ -z "${line}" ]; then
        printf ""
        return
    fi

    line="${line#*=}"
    line="${line%\"}"
    line="${line#\"}"
    line="${line%\'}"
    line="${line#\'}"

    printf "%s" "${line}"
}

install_docker_if_missing() {
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        return
    fi

    if ! command -v sudo >/dev/null 2>&1; then
        fail "Docker no existe y no hay sudo disponible para instalarlo."
    fi

    if ! grep -qi "ubuntu" /etc/os-release; then
        fail "Instalacion automatica soportada solo en Ubuntu."
    fi

    log "Docker no detectado. Instalando Docker Engine + Compose plugin..."

    sudo apt-get update
    sudo apt-get -y install ca-certificates curl gnupg

    sudo install -m 0755 -d /etc/apt/keyrings

    if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    fi

    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
        local codename
        codename="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${codename} stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    fi

    sudo apt-get update
    sudo apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker

    if id -nG "${USER}" | grep -qw docker; then
        log "El usuario ${USER} ya pertenece al grupo docker."
    else
        sudo usermod -aG docker "${USER}" || true
        log "Usuario ${USER} agregado al grupo docker. Puede requerir nueva sesion para evitar sudo."
    fi
}

resolve_docker_command() {
    if docker info >/dev/null 2>&1; then
        DOCKER_CMD="docker"
        return
    fi

    if command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
        return
    fi

    fail "No se puede acceder al motor Docker."
}

ensure_env_file() {
    if [ ! -f .env ]; then
        cp .env.beta.example .env
        log "Se creo .env desde .env.beta.example"
    fi
}

validate_env() {
    local required_vars
    required_vars="APP_URL DB_DATABASE DB_USERNAME DB_PASSWORD DB_ROOT_PASSWORD REDIS_PASSWORD"

    for key in ${required_vars}; do
        local value
        value="$(read_env_value "${key}")"

        if [ -z "${value}" ]; then
            fail "Falta ${key} en .env"
        fi

        case "${value}" in
            change_this_*|replace_with_real_*|null)
                fail "${key} tiene valor de ejemplo. Actualizalo en .env antes de continuar."
                ;;
        esac

        if [ "${key}" = "APP_URL" ]; then
            case "${value}" in
                *localhost*|*example.com*)
                    fail "APP_URL sigue apuntando a localhost/example. Define la URL real de la beta."
                    ;;
            esac
        fi
    done

    local moodle_url
    local moodle_base_url
    moodle_url="$(read_env_value "MOODLE_URL")"
    moodle_base_url="$(read_env_value "MOODLE_BASE_URL")"

    if [ -z "${moodle_url}" ] && [ -z "${moodle_base_url}" ]; then
        log "Aviso: no hay MOODLE_URL ni MOODLE_BASE_URL definidos."
    fi

    local app_key
    app_key="$(read_env_value "APP_KEY")"
    if [ -z "${app_key}" ]; then
        log "APP_KEY vacia: se generara automaticamente en el arranque."
    fi
}

deploy_stack() {
    log "Validando compose..."
    compose config >/dev/null

    log "Construyendo imagenes..."
    compose build --pull

    if ! grep -Eq '^APP_KEY=base64:' .env; then
        local generated_key

        log "Generando APP_KEY..."
        generated_key="$(compose run --rm --no-deps app php artisan key:generate --show | tail -n 1 | tr -d '\r')"

        if [[ ! "${generated_key}" =~ ^base64: ]]; then
            fail "No se pudo generar una APP_KEY valida."
        fi

        set_env_value "APP_KEY" "${generated_key}"
    fi

    log "Levantando servicios..."
    compose up -d --remove-orphans

    log "Ejecutando migraciones y optimizacion..."
    compose exec -T app php artisan migrate --force
    compose exec -T app php artisan optimize:clear
    compose exec -T app php artisan optimize
    compose exec -T app php artisan queue:restart
}

post_checks() {
    local app_port
    app_port="$(read_env_value "APP_HTTP_PORT")"
    if [ -z "${app_port}" ]; then
        app_port="80"
    fi

    log "Verificando estado de contenedores..."
    compose ps

    if command -v curl >/dev/null 2>&1; then
        log "Comprobando health endpoint /up..."
        curl -fsS "http://127.0.0.1:${app_port}/up" >/dev/null || fail "Healthcheck HTTP fallo en /up"
    else
        log "curl no disponible; se omite check HTTP desde host."
    fi

    log "Comprobando Redis..."
    compose exec -T redis sh -c 'if [ -n "$REDIS_PASSWORD" ] && [ "$REDIS_PASSWORD" != "null" ]; then redis-cli -a "$REDIS_PASSWORD" ping | grep -q PONG; else redis-cli ping | grep -q PONG; fi' || fail "Redis no responde"

    log "Comprobando proceso worker..."
    compose exec -T worker sh -c 'pgrep -f "artisan queue:work" >/dev/null'

    log "Comprobando proceso scheduler..."
    compose exec -T scheduler sh -c 'pgrep -f "artisan schedule:work" >/dev/null'

    log "Todo correcto. Beta desplegada y verificada."
}

main() {
    cd "${PROJECT_ROOT}"

    log "Iniciando bootstrap beta en ${PROJECT_ROOT}"

    install_docker_if_missing
    resolve_docker_command
    ensure_env_file
    validate_env
    deploy_stack
    post_checks
}

main "$@"
