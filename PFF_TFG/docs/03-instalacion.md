
# 3. Instalación y preparacion

## Objetivo de esta sección
En esta sección documento como preparo el proyecto en local y como dejo la beta desplegada con Docker Compose, siguiendo exactamente los archivos y scripts reales del repositorio.

## Requisitos previos

### Desarrollo local

1. PHP compatible con Laravel (en el proyecto se usa ^8.2 en composer).
2. Composer v2.
3. Node.js (en CI uso Node 22 para tests/lint; en workflow de deploy aparece Node 20 para checks frontend).
4. NPM.
5. Motor de base de datos según entorno (SQLite en local por defecto, MySQL en beta).

### Entorno beta dockerizado

1. Docker Engine.
2. Docker Compose plugin.
3. Archivo .env valido con credenciales reales.

## Estructura de instalación relevante
Los ficheros que uso para preparar y desplegar son:

1. Dockerfile.
2. docker-compose.beta.yml.
3. .env.example y .env.beta.example.
4. scripts/ops/first-boot-beta.sh.
5. scripts/ops/deploy-beta.sh.
6. scripts/ops/bootstrap-droplet-beta.sh.
7. scripts/ops/inspect-beta.sh.

## Preparacion de entorno local

### Paso 1. Dependencias

```bash
composer install
npm ci
```

### Paso 2. Variables de entorno

```bash
cp .env.example .env
php artisan key:generate
```

### Paso 3. Base de datos y cache inicial

```bash
php artisan migrate
```

### Paso 4. Build frontend y arranque

```bash
npm run build
composer dev
```

Notas importantes:

1. El script composer dev ejecuta servidor, cola y vite en paralelo.
2. Para esta memoria no necesito ejecutar build en cada cambio de documentación.

## Variables de entorno clave

### Aplicación

1. APP_ENV, APP_KEY, APP_URL.
2. APP_TIMEZONE.

### Base de datos y cache

1. DB_CONNECTION, DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD.
2. REDIS_HOST, REDIS_PORT, REDIS_PASSWORD.
3. SESSION_DRIVER, CACHE_STORE, QUEUE_CONNECTION.

### integración Moodle

1. MOODLE_URL o MOODLE_BASE_URL.
2. MOODLE_CAS_BASE (o CAS_BASE) si CAS va separado.
3. Parametros de timeout y cache de Moodle.

### IA (si aplica) y correo

1. AI_BASE_URL, AI_API_KEY, AI_MODEL.
2. MAIL_MAILER, RESEND_API_KEY o SMTP legado.

## Instalación de beta con Docker Compose

### Opcion recomendada (bootstrap completo)

```bash
bash scripts/ops/bootstrap-droplet-beta.sh
```

Este script automatiza:

1. Instalación de Docker si falta (Ubuntu).
2. Validación estricta de .env para evitar placeholders.
3. Build y arranque de contenedores.
4. Generacion de APP_KEY si no existe.
5. Migraciones, optimize y restart de colas.
6. Post-checks de /up, Redis, worker y scheduler.

### Opcion primer arranque manual

```bash
sh scripts/ops/first-boot-beta.sh
```

### Opcion actualizacion

```bash
sh scripts/ops/deploy-beta.sh
sh scripts/ops/inspect-beta.sh
```

## Validaciones de instalación

```bash
docker compose -f docker-compose.beta.yml config
docker compose -f docker-compose.beta.yml ps
```

Comprobaciones recomendadas:

1. Endpoint /up responde correctamente.
2. app, worker, scheduler y nginx estan en estado healthy.
3. Redis responde con PONG.
4. Migraciones aplicadas sin error.

## Prueba de carga post-instalación

Una vez instalado el entorno beta, se puede validar el comportamiento del servidor de aplicaciones bajo carga ligera con:

```bash
# Requiere apache2-utils: sudo apt-get install apache2-utils
bash scripts/ops/load-test.sh https://organizat.blete.tech
```

Esto ejecuta tres escenarios con Apache Bench contra `/up`, `/` y `/docs/api` y muestra throughput, tiempos de respuesta y percentiles. Ver interpretación en [08-despliegue.md — Sección 8.14](08-despliegue.md).

## Preparacion para CI/CD
La pipeline definida en GitHub Actions exige como minimo:

1. Estructura de proyecto intacta (composer.json, package.json, artisan, etc.).
2. Build frontend correcto (npm run build).
3. Tests backend ejecutables (./vendor/bin/pest).

En rama deploy-beta, la pipeline también construye imagenes runtime y nginx y despliega por SSH.

## Errores comunes que he contemplado

1. APP_KEY vacía en .env: los scripts la generan automaticamente.
2. Credenciales de ejemplo en .env: bootstrap corta la ejecucion para no desplegar mal.
3. Sesión Moodle caducada: la aplicación informa de reconexión necesaria.
4. Si no hay mailer real, el reporte de incidencias 404 no se envia y devuelve error controlado.

## Cierre
Con este flujo tengo dos rutas reproducibles:

1. Desarrollo local para evolucionar funcionalidad.
2. Entorno beta dockerizado para validación y demostracion del proyecto, cual pasara a ser producción.



