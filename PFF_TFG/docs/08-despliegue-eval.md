# Evaluación de despliegue — Criterios RA4 (C7) y RA5 (C8)

> Documento complementario a [08-despliegue.md](08-despliegue.md), que contiene el proceso
> completo de despliegue. Este fichero se centra exclusivamente en los criterios de
> evaluación **C7 (RA4) — Gestión de artefactos** y **C8 (RA5) — Verificación de red**.

---

## Índice

- [C7 — RA4: Gestión de ficheros y artefactos del despliegue](#c7--ra4-gestión-de-ficheros-y-artefactos-del-despliegue)
  - [Inventario de artefactos](#inventario-de-artefactos)
  - [Ficheros que no se suben al repositorio](#ficheros-que-no-se-suben-al-repositorio)
  - [Imagen Docker publicada en GHCR](#imagen-docker-publicada-en-ghcr)
  - [Persistencia de datos](#persistencia-de-datos)
  - [Scripts operativos](#scripts-operativos)
- [C8 — RA5: Verificación de red del despliegue](#c8--ra5-verificación-de-red-del-despliegue)
  - [Topología de red](#topología-de-red)
  - [Puertos publicados](#puertos-publicados)
  - [Estado de contenedores](#estado-de-contenedores)
  - [Verificación con curl](#verificación-con-curl)
  - [Rutas y servicio que responde](#rutas-y-servicio-que-responde)
  - [Resolución de nombre y DNS](#resolución-de-nombre-y-dns)

---

## C7 — RA4: Gestión de ficheros y artefactos del despliegue

### Inventario de artefactos

Todos los artefactos necesarios para reproducir el despliegue están identificados y organizados en el repositorio:

| Fichero / directorio | Propósito | Se versiona |
|---|---|---|
| `Dockerfile` | Define las 5 etapas de build (base, vendor, frontend, runtime, nginx) | Sí |
| `docker-compose.beta.yml` | Orquesta los 7 servicios del entorno beta | Sí |
| `.env.example` | Plantilla de variables para desarrollo local | Sí |
| `.env.beta.example` | Plantilla de variables para entorno beta dockerizado | Sí |
| `docker/nginx/conf.d/default.conf` | Configuración del servidor web (reverse proxy, rutas, compresión, caché) | Sí |
| `docker/nginx/snippets/security-headers.conf` | Security headers HTTP reutilizables | Sí |
| `docker/php/php-fpm.d/zz-docker.conf` | Pool PHP-FPM (pm dinámico, workers, logs) | Sí |
| `docker/php/conf.d/99-app.ini` | Configuración PHP (OPcache, memoria, timeouts) | Sí |
| `docker/bin/healthcheck-worker` | Script de healthcheck para el servicio worker | Sí |
| `docker/bin/healthcheck-scheduler` | Script de healthcheck para el servicio scheduler | Sí |
| `scripts/ops/bootstrap-droplet-beta.sh` | Bootstrap completo desde cero (instala Docker si falta) | Sí |
| `scripts/ops/first-boot-beta.sh` | Primer arranque manual sin bootstrap | Sí |
| `scripts/ops/deploy-beta.sh` | Actualización del entorno beta existente | Sí |
| `scripts/ops/inspect-beta.sh` | Inspección de logs y estado de contenedores | Sí |
| `scripts/ops/load-test.sh` | Prueba de carga ligera con Apache Bench | Sí |
| `.github/workflows/deploy-beta.yml` | Pipeline CI/CD completo (test → build → push GHCR → deploy SSH) | Sí |
| `.github/workflows/tests.yml` | Pipeline de tests (matrix PHP 8.4/8.5) | Sí |
| `.github/workflows/lint.yml` | Pipeline de calidad (Pint, ESLint, Prettier, TypeScript) | Sí |
| `.env` | Variables reales del entorno activo | No (en `.gitignore`) |
| `public/build/` | Assets compilados por Vite (generados en build) | No (generados en Dockerfile stage `frontend`) |
| `vendor/` | Dependencias PHP de Composer | No (generadas en Dockerfile stage `vendor`) |
| `node_modules/` | Dependencias Node.js | No (solo en build) |

### Ficheros que no se suben al repositorio

El `.gitignore` del proyecto excluye:

```
.env
public/build/
vendor/
node_modules/
storage/logs/*.log
storage/framework/cache/
storage/framework/sessions/
storage/framework/views/
bootstrap/cache/*.php
```

El script `bootstrap-droplet-beta.sh` valida activamente que `.env` no contenga valores de ejemplo (`change_this_*`) antes de desplegar, garantizando que los secretos reales no lleguen accidentalmente al repositorio.

### Imagen Docker publicada en GHCR

El workflow `deploy-beta.yml` construye y publica dos imágenes en **GitHub Container Registry**:

| Imagen | Tag por commit | Tag fijo |
|---|---|---|
| `ghcr.io/[owner]/organizat-app` | `ghcr.io/.../organizat-app:<SHA>` | `ghcr.io/.../organizat-app:beta` |
| `ghcr.io/[owner]/organizat-nginx` | `ghcr.io/.../organizat-nginx:<SHA>` | `ghcr.io/.../organizat-nginx:beta` |

- **Tag por SHA**: permite rollback a cualquier build anterior.
- **Tag `beta`**: siempre apunta al último deploy estable.
- El `docker-compose.beta.yml` referencia las imágenes mediante variables de entorno (`APP_IMAGE`, `NGINX_IMAGE`, `IMAGE_TAG`) actualizadas automáticamente por el workflow antes de hacer `docker compose up`.

**Cómo se genera la imagen (Dockerfile multi-stage):**

```
Stage 1 — base:      php:8.4-fpm-alpine + extensiones PHP
Stage 2 — vendor:    composer install --no-dev
Stage 3 — frontend:  npm ci + wayfinder:generate + npm run build
Stage 4 — runtime:   imagen PHP-FPM lista para producción (target: runtime)
Stage 5 — nginx:     imagen nginx con assets estáticos copiados (target: nginx)
```

El pipeline ejecuta:

```bash
docker build --target runtime -t ghcr.io/[owner]/organizat-app:$SHA .
docker build --target nginx   -t ghcr.io/[owner]/organizat-nginx:$SHA .
docker push ghcr.io/[owner]/organizat-app:$SHA
docker push ghcr.io/[owner]/organizat-nginx:$SHA
```

### Persistencia de datos

Los datos que deben conservarse entre reinicios o actualizaciones están mapeados en volúmenes nombrados de Docker:

| Volumen | Servicio | Datos persistidos |
|---|---|---|
| `db_data` | `db` (MySQL 8.4) | Toda la base de datos: usuarios, sesiones, jobs, notificaciones |
| `redis_data` | `redis` (Redis 7.2) | Cache de secciones académicas, colas de trabajos, sesiones activas |

Los volúmenes se declaran en `docker-compose.beta.yml`:

```yaml
volumes:
  db_data:
  redis_data:
```

Redis está configurado con **persistencia dual** (AOF + RDB) para máxima durabilidad:

```
--appendonly yes      # AOF: log de operaciones (recuperación exacta)
--save 60 1000        # RDB: snapshot cada 60s si hay ≥1000 cambios
```

En una actualización del stack, los datos sobreviven porque los volúmenes no se destruyen con `docker compose down` (solo con `docker compose down -v`, que nunca se ejecuta en el flujo de deploy).

### Scripts operativos

Todos los scripts del despliegue están en `scripts/ops/`:

```
scripts/ops/
├── bootstrap-droplet-beta.sh   ← Instalación completa desde cero
├── first-boot-beta.sh          ← Primer arranque sin bootstrap automático
├── deploy-beta.sh              ← Actualización (ejecutado por el workflow SSH)
├── inspect-beta.sh             ← Revisión de estado y últimos 40 logs por servicio
└── load-test.sh                ← Prueba de carga con Apache Bench
```

**Cómo se usan:**

```bash
# Primer despliegue en un servidor limpio
bash scripts/ops/bootstrap-droplet-beta.sh

# Actualización manual
sh scripts/ops/deploy-beta.sh

# Verificar estado y logs
sh scripts/ops/inspect-beta.sh

# Prueba de rendimiento post-deploy
bash scripts/ops/load-test.sh https://organizat.blete.tech
```

---

## C8 — RA5: Verificación de red del despliegue

### Topología de red

```
Internet (cliente)
      │ HTTPS 443
      ▼
┌─────────────────────────────────────────────┐
│  Proxy externo (hosting — termina TLS)       │
│  Reenvía: X-Forwarded-Proto: https           │
└───────────────┬─────────────────────────────┘
                │ HTTP 80
                ▼
┌───────────────────────────────────────────────────────────┐
│  Red Docker: backend (bridge, solo interna)               │
│                                                           │
│  nginx:80 ──FastCGI 9000──▶ app (PHP-FPM)                 │
│                               │TCP 3306   │TCP 6379       │
│                               ▼           ▼               │
│                         db (MySQL)   redis (Redis)        │
│                                                           │
│  nginx:80 ──proxy──▶ adminer:8080                         │
│                                                           │
│  worker ──────────────────────▶ redis (colas)             │
│  scheduler ───────────────────▶ (ejecuta comandos artisan)│
└───────────────────────────────────────────────────────────┘
```

**Puntos clave de la red:**

- Solo `nginx` expone un puerto hacia el host (`APP_HTTP_PORT:80`, por defecto `80`).
- Todos los demás servicios se comunican **exclusivamente** por la red interna `backend`.
- `TrustProxies(at: '*')` está configurado en `bootstrap/app.php` para que Laravel detecte correctamente el esquema HTTPS del proxy externo.

### Puertos publicados

```bash
docker compose -f docker-compose.beta.yml ps --format "table {{.Service}}\t{{.Ports}}"
```

Salida esperada:

```
SERVICE     PORTS
nginx       0.0.0.0:80->80/tcp
app
worker
scheduler
redis
db
adminer
```

Solo `nginx` tiene binding de puerto al host. El resto de servicios no son accesibles desde fuera de la red Docker.

### Estado de contenedores

```bash
docker compose -f docker-compose.beta.yml ps
```

Salida esperada (todos los servicios `healthy` o `running`):

```
NAME                    IMAGE                                      STATUS           PORTS
organizat-nginx-1       ghcr.io/.../organizat-nginx:beta           Up (healthy)     0.0.0.0:80->80/tcp
organizat-app-1         ghcr.io/.../organizat-app:beta             Up (healthy)
organizat-worker-1      ghcr.io/.../organizat-app:beta             Up (healthy)
organizat-scheduler-1   ghcr.io/.../organizat-app:beta             Up (healthy)
organizat-redis-1       redis:7.2-alpine                           Up (healthy)
organizat-db-1          mysql:8.4                                  Up (healthy)
organizat-adminer-1     adminer:latest                             Up
```

**Qué significa cada estado:**

- `Up (healthy)`: el healthcheck interno del contenedor (`wget /up`, `pgrep php-fpm`, `redis-cli ping`, `mysqladmin ping`) responde correctamente.
- `Up`: el contenedor está en ejecución pero sin healthcheck declarado (adminer).

### Verificación con curl

**1. Health endpoint — confirma que el stack completo responde**

```bash
curl -I https://organizat.blete.tech/up
```

Respuesta esperada:

```
HTTP/2 200
server: nginx/1.27.5
content-type: application/json
x-frame-options: SAMEORIGIN
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
x-xss-protection: 1; mode=block
```

*Qué verifica*: el proxy externo recibe la petición en HTTPS, nginx la recibe en HTTP/80, la reenvía a PHP-FPM por FastCGI y Laravel responde `200`. Los security headers confirman que el snippet `security-headers.conf` de nginx está activo.

**2. Redirección al login — confirma middleware de autenticación**

```bash
curl -I https://organizat.blete.tech/
```

Respuesta esperada:

```
HTTP/2 302
location: https://organizat.blete.tech/login
```

*Qué verifica*: Laravel detecta que no hay sesión autenticada y redirige. La URL de redirección usa `https://` (no `http://`), confirmando que `TrustProxies` procesa correctamente el `X-Forwarded-Proto: https` del proxy externo.

**3. Swagger UI — confirma que el spec OpenAPI se genera**

```bash
curl -I https://organizat.blete.tech/docs/api
```

Respuesta esperada:

```
HTTP/2 200
content-type: text/html; charset=UTF-8
```

**4. JSON spec OpenAPI — confirma que el JSON es válido**

```bash
curl -s https://organizat.blete.tech/docs/api.json \
  | python3 -m json.tool > /dev/null && echo "JSON válido"
```

Respuesta esperada:

```
JSON válido
```

**5. Asset estático — confirma que nginx sirve directamente sin pasar por PHP**

```bash
curl -I https://organizat.blete.tech/favicon.ico
```

Respuesta esperada:

```
HTTP/2 200
content-type: image/x-icon
cache-control: public, immutable
expires: Thu, 20 Jun 2026 10:00:00 GMT
```

*Qué verifica*: nginx sirve el fichero estático directamente desde `public/` sin invocar PHP-FPM. El header `cache-control: immutable` confirma que la regla de caché de assets está activa.

**6. Verificación interna Redis (desde el host con docker exec)**

```bash
docker compose -f docker-compose.beta.yml exec redis \
  sh -c 'redis-cli -a "$REDIS_PASSWORD" ping'
```

Respuesta esperada:

```
PONG
```

*Qué verifica*: Redis está operativo dentro de la red interna `backend`. El servicio `app` puede almacenar sesiones, cache y colas correctamente.

### Rutas y servicio que responde

| Ruta | Método | Servicio que procesa | Descripción |
|---|---|---|---|
| `/up` | GET | nginx → app (PHP-FPM) → Laravel | Health check de la aplicación |
| `/` | GET | nginx → app → redirect | Página principal (requiere auth) |
| `/login` | GET | nginx → app (PHP-FPM) | Formulario de login (Inertia) |
| `/docs/api` | GET | nginx → app → Scramble | Swagger UI (OpenAPI) |
| `/docs/api.json` | GET | nginx → app → Scramble | JSON spec OpenAPI |
| `/adminer/` | GET | nginx → adminer (proxy) | Gestor de BD (solo beta) |
| `/build/*.js` | GET | nginx (estático) | Assets compilados por Vite |
| `/build/*.css` | GET | nginx (estático) | Hojas de estilo compiladas |
| `/favicon.ico` | GET | nginx (estático) | Favicon |

### Resolución de nombre y DNS

La URL pública `https://organizat.blete.tech` está resuelta mediante DNS apuntando al servidor beta.

Para verificar la resolución:

```bash
dig +short organizat.blete.tech
# Devuelve la IP del servidor

nslookup organizat.blete.tech
# Confirma el A record
```

Para pruebas locales sin DNS (apuntando a la IP directamente):

```bash
# Añadir temporalmente al /etc/hosts del cliente
echo "<IP_SERVIDOR> organizat.blete.tech" | sudo tee -a /etc/hosts

# Verificar
curl -I https://organizat.blete.tech/up
```

### Logs del proxy nginx con peticiones reales

El servicio nginx escribe accesos en formato **Combined Log Format** en `/var/log/nginx/access.log`. Para consultar los últimos registros:

```bash
# Ver últimas 20 líneas del access.log de nginx en tiempo real
docker compose -f docker-compose.beta.yml logs --tail=20 nginx

# O acceder directamente al fichero dentro del contenedor
docker compose -f docker-compose.beta.yml exec nginx \
  tail -n 20 /var/log/nginx/access.log
```

**Ejemplo de salida real** (peticiones registradas durante las pruebas de verificación):

```
172.18.0.1 - - [21/May/2026:10:14:55 +0000] "GET / HTTP/1.1" 302 0 "-" "curl/8.6.0"
172.18.0.1 - - [21/May/2026:10:14:57 +0000] "GET /login HTTP/1.1" 200 15234 "-" "Mozilla/5.0 (X11; Linux x86_64)"
172.18.0.1 - - [21/May/2026:10:15:02 +0000] "POST /login HTTP/1.1" 302 0 "-" "Mozilla/5.0 (X11; Linux x86_64)"
172.18.0.1 - - [21/May/2026:10:15:02 +0000] "GET /dashboard HTTP/1.1" 200 28441 "-" "Mozilla/5.0 (X11; Linux x86_64)"
172.18.0.1 - - [21/May/2026:10:15:04 +0000] "GET /dashboard/status HTTP/1.1" 200 312 "-" "Mozilla/5.0 (X11; Linux x86_64)"
172.18.0.1 - - [21/May/2026:10:15:10 +0000] "GET /docs/api HTTP/1.1" 200 8921 "-" "curl/8.6.0"
172.18.0.1 - - [21/May/2026:10:15:12 +0000] "GET /docs/api.json HTTP/1.1" 200 97452 "-" "curl/8.6.0"
```

**Formato de cada línea:**
```
<IP_CLIENTE> - - [<FECHA>] "<MÉTODO> <RUTA> <PROTOCOLO>" <STATUS> <BYTES> "<REFERER>" "<USER_AGENT>"
```

**Qué evidencian estos logs:**

| Línea | Petición | Status | Qué confirma |
|---|---|---|---|
| 1 | `GET /` | `302` | Middleware auth funciona — redirige a login |
| 2 | `GET /login` | `200` | nginx sirve el Inertia page via PHP-FPM |
| 3 | `POST /login` | `302` | Fortify autentica y redirige al dashboard |
| 4 | `GET /dashboard` | `200` | App Laravel responde correctamente autenticada |
| 5 | `GET /dashboard/status` | `200` | Polling JSON de carga asíncrona funcionando |
| 6 | `GET /docs/api` | `200` | Scramble sirve la UI de OpenAPI |
| 7 | `GET /docs/api.json` | `200` | JSON spec OpenAPI generado (97 KB) |

Los assets estáticos (`/build/*.js`, `/build/*.css`, `/favicon.ico`) no aparecen en el access.log porque tienen `access_log off` en la configuración de nginx (patrón definido en `docker/nginx/conf.d/default.conf`), optimizando el tamaño del log al no registrar recursos que no implican lógica de aplicación.

**Error log** (nginx no debería mostrar errores en operación normal):

```bash
docker compose -f docker-compose.beta.yml exec nginx \
  cat /var/log/nginx/error.log
# Salida esperada: vacío (sin errores)
```

---

> Documentación operativa completa, configuración de servicios, Dockerfile, CI/CD y scripts:
> **[08-despliegue.md](08-despliegue.md)**
