# OrganizaT - Despliegue beta profesional con Docker Compose

Este repositorio queda preparado para desplegar la beta en un Droplet Ubuntu con una base mantenible y escalable.

## 1) Arquitectura objetivo

Servicios del stack:

- `nginx`: entrada HTTP y servicio de estaticos con cache agresiva.
- `app`: contenedor principal Laravel (PHP-FPM).
- `worker`: proceso dedicado a colas (`queue:work`).
- `scheduler`: proceso dedicado al scheduler (`schedule:work`).
- `redis`: backend de sesiones, cache y colas.
- `db`: MySQL 8.4 para persistencia de datos.

Decisiones clave:

- `app`, `worker` y `scheduler` comparten la misma imagen para mantener coherencia y simplificar despliegues.
- Build multi-stage para reducir peso y separar dependencias de build/runtime.
- Healthchecks en todos los servicios.
- Volumen persistente para `db` y `redis`.
- Base preparada para evolucionar a CI/CD sin rehacer la infraestructura.

## 2) Estructura de despliegue

Archivos principales:

- `Dockerfile`
- `docker-compose.beta.yml`
- `.env.beta.example`
- `docker/nginx/conf.d/default.conf`
- `docker/nginx/snippets/security-headers.conf`
- `docker/php/conf.d/99-app.ini`
- `docker/php/php-fpm.d/zz-docker.conf`
- `docker/bin/entrypoint.sh`
- `docker/bin/healthcheck-worker.sh`
- `docker/bin/healthcheck-scheduler.sh`
- `scripts/ops/first-boot-beta.sh`
- `scripts/ops/deploy-beta.sh`
- `scripts/ops/inspect-beta.sh`
- `scripts/ops/bootstrap-droplet-beta.sh`

## 3) Entorno beta

La plantilla de entorno para despliegue es:

- `.env.beta.example`

En el servidor debes copiarla a `.env` y rellenar secretos reales. No se versiona `.env`.

Redis queda configurado para:

- `SESSION_DRIVER=redis`
- `CACHE_STORE=redis`
- `QUEUE_CONNECTION=redis`

## 4) Validacion local rapida

Con Docker engine activo:

```bash
docker compose -f docker-compose.beta.yml config
sh scripts/ops/first-boot-beta.sh
sh scripts/ops/inspect-beta.sh
```

## 5) Arranque automatico en Droplet (sin agente)

Una vez clonado el repo en el servidor:

```bash
cd app
git fetch --all --prune
git switch deploy-beta
git pull origin deploy-beta

cp .env.beta.example .env
nano .env

bash scripts/ops/bootstrap-droplet-beta.sh
```

Este script automatiza:

- instalacion de Docker + Compose plugin si faltan (Ubuntu),
- validacion de `.env` para evitar credenciales placeholder,
- build y arranque de servicios,
- generacion de `APP_KEY` si falta,
- migraciones, optimizacion y reinicio de colas,
- checks finales de HTTP (`/up`), Redis, worker y scheduler.

No necesitas instalar PHP, Composer ni Node en el host Ubuntu.
Todo eso vive dentro de la imagen Docker.

Dependencias PHP de app cubiertas en el Dockerfile:

- core de Laravel + extensiones de trabajo (`pdo_mysql`, `mbstring`, `dom`, `xml`, `simplexml`, `xmlwriter`, `bcmath`, `gd`, `intl`, `zip`, `pcntl`, `opcache`, `redis`).

## 6) Parte 11 - Preparacion del Droplet Ubuntu

Comandos base recomendados (root o usuario con sudo):

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install ca-certificates curl gnupg git ufw
sudo timedatectl set-timezone Europe/Madrid
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## 7) Parte 12 - Instalar Docker y llevar rama deploy-beta

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker

sudo usermod -aG docker $USER
newgrp docker

git clone <URL_DE_TU_REPO> app
cd app

git fetch --all --prune
git switch deploy-beta
git pull origin deploy-beta
```

## 8) Parte 13 - Primer arranque optimizado en Droplet

Modo recomendado:

```bash
bash scripts/ops/bootstrap-droplet-beta.sh
```

Modo manual (fallback):

```bash
cd app
cp .env.beta.example .env
nano .env

sh scripts/ops/first-boot-beta.sh

docker compose -f docker-compose.beta.yml exec -T app php artisan migrate --force
docker compose -f docker-compose.beta.yml exec -T app php artisan optimize:clear
docker compose -f docker-compose.beta.yml exec -T app php artisan optimize
docker compose -f docker-compose.beta.yml exec -T app php artisan queue:restart

docker compose -f docker-compose.beta.yml exec -T app php artisan tinker --execute="dump(Illuminate\\Support\\Facades\\Redis::connection()->ping());"
docker compose -f docker-compose.beta.yml exec -T app php artisan tinker --execute="cache()->put('beta:cache:ok', now()->toDateTimeString(), 60); dump(cache()->get('beta:cache:ok'));"

docker compose -f docker-compose.beta.yml ps
```

Verificaciones funcionales recomendadas:

- Abrir `http://IP_DEL_DROPLET/` y comprobar login/dashboard.
- Comprobar que `worker` y `scheduler` estan en `healthy`.
- Revisar logs recientes con `sh scripts/ops/inspect-beta.sh`.

## 9) Parte 14 - Checklist final para beta

Checklist minima antes de abrir a testers:

- [ ] Todos los servicios `healthy` en `docker compose ps`.
- [ ] App accesible por navegador en el dominio/IP beta.
- [ ] Migraciones aplicadas sin errores.
- [ ] Redis responde y cache funciona.
- [ ] Cola procesando trabajos sin errores recurrentes.
- [ ] Scheduler ejecutando tareas periodicas.
- [ ] Logs sin excepciones criticas repetidas.
- [ ] Credenciales reales en `.env` y nunca en git.

## 10) Parte 15 - Flujo de actualizacion futura

Actualizacion estandar de la beta:

```bash
cd app
git fetch --all --prune
git switch deploy-beta
git pull origin deploy-beta

sh scripts/ops/deploy-beta.sh
sh scripts/ops/inspect-beta.sh
```

Cuando reconstruir:

- Siempre que cambie `Dockerfile`, `docker-compose.beta.yml`, dependencias PHP/Node o configuracion Nginx/PHP.

Cuando migrar:

- Cada despliegue que incluya cambios en `database/migrations`.
- El script `deploy-beta.sh` ya ejecuta `migrate --force`.

Que revisar tras cada despliegue:

- Estado `healthy` de servicios.
- Rutas principales de la app.
- Logs de `app`, `worker`, `scheduler`.
- Cache/sesiones y cola en Redis.

Base para automatizacion futura:

- Ya existe un flujo determinista con scripts y compose.
- El siguiente paso natural es un workflow CI/CD que haga build, tests y deploy remoto de `deploy-beta` usando SSH.
