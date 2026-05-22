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

docker compose -f docker-compose.prod.yml build --pull

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
