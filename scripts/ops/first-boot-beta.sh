#!/usr/bin/env sh
set -eu

if [ ! -f .env ]; then
    cp .env.prod.example .env
fi

set_env_value() {
    key="$1"
    value="$2"

    if grep -qE "^${key}=" .env; then
        sed -i "s|^${key}=.*|${key}=${value}|" .env
    else
        printf "\n%s=%s\n" "${key}" "${value}" >> .env
    fi
}

app_image="$(grep -E '^APP_IMAGE=' .env | tail -n 1 | cut -d= -f2- || true)"
nginx_image="$(grep -E '^NGINX_IMAGE=' .env | tail -n 1 | cut -d= -f2- || true)"
image_tag="$(grep -E '^IMAGE_TAG=' .env | tail -n 1 | cut -d= -f2- || true)"

if [ -z "${app_image}" ] || [ -z "${nginx_image}" ]; then
    echo "Faltan APP_IMAGE o NGINX_IMAGE en .env. El primer arranque usa imágenes publicadas en GHCR." >&2
    exit 1
fi

if [ -z "${image_tag}" ]; then
    set_env_value "IMAGE_TAG" "latest"
fi

docker compose -f docker-compose.prod.yml config >/dev/null
docker compose -f docker-compose.prod.yml pull app worker scheduler nginx

if ! grep -Eq '^APP_KEY=base64:' .env; then
    generated_key="$(docker compose -f docker-compose.prod.yml run --rm --no-deps app php artisan key:generate --show | tail -n 1 | tr -d '\r')"

    case "${generated_key}" in
        base64:*)
            set_env_value "APP_KEY" "${generated_key}"
            ;;
        *)
            echo "No se pudo generar una APP_KEY valida" >&2
            exit 1
            ;;
    esac
fi

docker compose -f docker-compose.prod.yml up -d --remove-orphans

docker compose -f docker-compose.prod.yml exec -T app php artisan migrate --force
docker compose -f docker-compose.prod.yml exec -T app php artisan optimize:clear
docker compose -f docker-compose.prod.yml exec -T app php artisan optimize
