<h1 align="center">OrganizaT</h1>

<p align="center">
	<img src="resources/imgs/OrganizaT_sinfondo.png" width="360" alt="OrganizaT" />
</p>

Aplicación web para alumnado de FP que centraliza información académica de Moodle en un único panel de organización: tareas, calificaciones, recursos, recordatorios y prioridades.

## Índice

- [1. Resumen](#1-resumen)
- [2. Funcionalidades principales](#2-funcionalidades-principales)
- [3. Documentación del TFG](#3-documentación-del-tfg)
- [4. Arquitectura](#4-arquitectura)
- [5. Requisitos previos](#5-requisitos-previos)
- [6. Arranque local](#6-arranque-local)
- [7. Calidad y pruebas](#7-calidad-y-pruebas)
- [8. CI/CD y despliegue](#8-cicd-y-despliegue)
- [9. Variables de entorno](#9-variables-de-entorno)
- [10. Verificación post-despliegue](#10-verificación-post-despliegue)
- [11. Enlaces útiles](#11-enlaces-útiles)
- [12. Autor](#12-autor)

## 1. Resumen

OrganizaT nace como Trabajo de Fin de Grado de DAW para resolver un problema real del alumnado: la información académica está dispersa entre Moodle, correo, recursos y recordatorios. La aplicación la unifica en una interfaz propia con backend Laravel, frontend React + TypeScript e infraestructura Docker.

## 2. Funcionalidades principales

- Dashboard con visión global del estado académico.
- Gestión de tareas y entregas pendientes.
- Consulta de calificaciones y exportación de informes.
- Exploración de recursos docentes por asignatura.
- Notificaciones y recordatorios configurables.
- Matriz de prioridades con soporte opcional de IA.
- Exportación de calendario en formato ICS.

## 3. Documentación del TFG

La documentación obligatoria y técnica del proyecto está en la carpeta `docs/`:

1. [01-introduccion.md](docs/01-introduccion.md)
2. [02-descripcion.md](docs/02-descripcion.md)
3. [03-instalacion.md](docs/03-instalacion.md)
4. [04-guia-estilos.md](docs/04-guia-estilos.md)
5. [05-diseno.md](docs/05-diseno.md)
6. [06-desarrollo.md](docs/06-desarrollo.md)
7. [07-pruebas.md](docs/07-pruebas.md)
8. [08-despliegue.md](docs/08-despliegue.md)
9. [09-manual-usuario.md](docs/09-manual-usuario.md)
10. [10-conclusiones.md](docs/10-conclusiones.md)

## 4. Arquitectura

Stack principal:

1. Backend: Laravel 12 + Fortify + Wayfinder.
2. Frontend: Inertia + React + TypeScript.
3. Infraestructura: Docker Compose con PHP-FPM, Nginx, Redis, MySQL, worker y scheduler.
4. CI/CD: GitHub Actions con validación, build/push a GHCR y despliegue remoto por SSH.

Servicios definidos en `docker-compose.prod.yml`:

- `app`
- `worker`
- `scheduler`
- `nginx`
- `redis`
- `db`
- `adminer`

## 5. Requisitos previos

### Desarrollo local

1. PHP `^8.2`.
2. Composer v2.
3. Node.js `22` y npm.
4. SQLite local para desarrollo o tests rápidos.

### Producción / beta

1. Docker Engine.
2. Docker Compose plugin.
3. Archivo `.env` válido.
4. Imágenes publicadas en GHCR (`APP_IMAGE`, `NGINX_IMAGE`, `IMAGE_TAG`).

## 6. Arranque local

### Instalación

```bash
composer install
npm ci
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
```

### Desarrollo

```bash
composer dev
```

`composer dev` levanta servidor Laravel, cola y Vite en paralelo.

## 7. Calidad y pruebas

Comandos relevantes:

```bash
# Backend
composer lint:check
php artisan test

# Frontend
npm run lint:check
npm run types:check
npm run format:check
npm run test

# Check integrado frontend
npm run cicheck
```

## 8. CI/CD y despliegue

El repositorio usa un único pipeline en `.github/workflows/deploy.yml`.

Flujo principal:

1. Validación de estructura del proyecto en la raíz del repositorio.
2. Quality gate backend con `composer lint:check`.
3. Quality gate frontend y tests con `npm run cicheck`.
4. Tests backend con SQLite local y `php artisan test`.
5. Build y push de imágenes Docker a GHCR (`organizat-app` y `organizat-nginx`).
6. Despliegue remoto por SSH reutilizando imágenes ya construidas.
7. `migrate --force`, `optimize` y `queue:restart` en el servidor.

### Despliegue manual del host

Scripts disponibles:

```bash
bash scripts/ops/bootstrap-droplet-beta.sh
sh scripts/ops/first-boot-beta.sh
sh scripts/ops/deploy.sh
sh scripts/ops/inspect-beta.sh
```

Estos scripts validan `docker-compose.prod.yml`, hacen `pull` de las imágenes publicadas y levantan el stack sin recompilar en remoto.

### Crear usuario administrador

```bash
php artisan db:seed
```

Usuario admin por defecto:

- Email: `admin@admin.com`
- Contraseña inicial: `Admin1234!`

Cambiar la contraseña inmediatamente tras el primer acceso en cualquier entorno público.

## 9. Variables de entorno

Referencias:

1. Desarrollo local: `.env.example`
2. Producción: `.env.prod.example`

Variables clave:

1. App: `APP_ENV`, `APP_KEY`, `APP_URL`, `APP_HTTP_PORT`.
2. Base de datos: `DB_*`.
3. Redis y colas: `REDIS_*`, `SESSION_DRIVER`, `CACHE_STORE`, `QUEUE_CONNECTION`.
4. Moodle/CAS: `MOODLE_URL`, `MOODLE_BASE_URL`, `MOODLE_CAS_BASE`.
5. IA y correo: `AI_*`, `MAIL_*`, `RESEND_API_KEY`.
6. Imágenes desplegadas: `APP_IMAGE`, `NGINX_IMAGE`, `IMAGE_TAG`.

## 10. Verificación post-despliegue

```bash
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml ps
sh scripts/ops/inspect-beta.sh
curl -I http://127.0.0.1:${APP_HTTP_PORT:-80}/up
```

Checklist:

- [ ] `app`, `worker`, `scheduler`, `nginx`, `redis` y `db` en estado correcto.
- [ ] `/up` responde.
- [ ] Migraciones aplicadas.
- [ ] Worker y scheduler activos.
- [ ] Sin errores críticos repetidos en logs.

## 11. Enlaces útiles

- Prototipo Figma: <https://www.figma.com/design/H4suweb5Pc2qJqUs7iRXQ9/Prototipo_TFG_PFF?node-id=0-1&t=Dou0TuJGGV2lCw4X-1>
- Swagger UI: <https://organizat.blete.tech/docs/api>
- OpenAPI JSON: <https://organizat.blete.tech/docs/api.json>
- URL beta / producción: <https://organizat.blete.tech>

- Credenciales para testeo del profesorado:

Si se testea con correo electronico real, recibiras los mails que no se hayan recibido antes en tu bandeja de entrada. Recomiendo testear con correo electronico real para experiencia real.

	- username: pferfer650b

	- password: XSCUXT

Correo para login como admin y asi visualizar panel:

admin@example.com - Admin123498765@

## 12. Autor

**Pablo Fernández**  
2º DAW — IES Rafael Alberti, Cádiz

Proyecto desarrollado como Trabajo de Fin de Grado del ciclo de Desarrollo de Aplicaciones Web.
