
# 8. Despliegue

## 8.1 Entorno de despliegue utilizado
He preparado el despliegue beta sobre infraestructura Linux (Ubuntu) con Docker Compose, usando una arquitectura de servicios separada.

Servicios definidos en docker-compose.beta.yml:

1. app (Laravel PHP-FPM).
2. worker (queue:work para colas default y mail).
3. scheduler (schedule:work).
4. nginx (entrada HTTP y entrega publica).
5. redis (cache, sesiones y colas).
6. db (MySQL 8.4).
7. adminer (gestión de base de datos en entorno beta).

## 8.2 Arquitectura operativa
La arquitectura de runtime separa responsabilidades:

1. Nginx expone puerto HTTP y enruta al backend.
2. App procesa peticiones y comandos artisan.
3. Worker y scheduler se ejecutan en contenedores dedicados.
4. Redis y MySQL persisten estado y datos.

Esto evita mezclar en un solo proceso todas las tareas de aplicación.

## 8.3 Dockerfile y build
El Dockerfile esta implementado en multi-stage:

1. base: extensiones PHP y dependencias del sistema.
2. vendor: composer install --no-dev.
3. frontend: npm ci + wayfinder:generate + npm run build.
4. runtime: imagen final PHP-FPM con build frontend copiado.
5. nginx: imagen separada para servidor web.

Ventajas de esta aproximacion:

1. Imagen final más limpia para runtime.
2. Reproducibilidad de build.
3. Separacion entre servicio app y servicio nginx.

## 8.4 Configuración de entorno
Para despliegue uso .env.beta.example como plantilla y nunca versiono .env real.

Variables clave de beta:

1. DB_* para MySQL.
2. REDIS_* y drivers redis para sesión/cache/colas.
3. APP_URL y APP_HTTP_PORT.
4. Configuración Moodle y CAS.
5. Configuración AI y correo.

El script bootstrap valida que no queden placeholders antes de levantar stack.

## 8.5 CI/CD configurado

### Workflows existentes

1. tests.yml: build y test en matrix PHP 8.4/8.5.
2. lint.yml: Pint, formato frontend, lint frontend y tipos TS.
3. deploy-beta.yml: CI backend/frontend, build de imagenes, push a GHCR y despliegue por SSH.

### Flujo de deploy-beta

1. Verifica estructura del proyecto.
2. Ejecuta checks backend y frontend.
3. Construye imagen runtime (app) y nginx.
4. Publica imagenes en ghcr.io.
5. Conecta por SSH al servidor beta.
6. Actualiza rama deploy-beta.
7. Hace pull de imagenes y levanta servicios.
8. Ejecuta migrate --force, optimize y queue:restart.

## 8.6 Proceso de despliegue documentado

### Opcion automática recomendada

```bash
bash scripts/ops/bootstrap-droplet-beta.sh
```

### Opcion primer arranque

```bash
sh scripts/ops/first-boot-beta.sh
```

### Opcion actualizacion

```bash
sh scripts/ops/deploy-beta.sh
sh scripts/ops/inspect-beta.sh
```

### Inicializar usuario administrador

Tras aplicar las migraciones, ejecutar el seeder para crear el usuario administrador por defecto:

```bash
php artisan db:seed
```

Esto crea (o actualiza idempotentemente) el usuario:

- **Email**: `admin@admin.com`
- **Contraseña por defecto**: `Admin1234!`
- **Rol**: `admin`

> **Aviso de seguridad**: cambiar la contraseña del usuario admin inmediatamente tras el primer acceso en cualquier entorno accesible públicamente.

## 8.7 Verificaciones de despliegue
En scripts y checklist incluyo verificaciones concretas:

1. docker compose config valida sintaxis.
2. docker compose ps confirma estado de servicios.
3. /up responde por HTTP.
4. Redis responde con PONG.
5. Worker y scheduler activos por pgrep.
6. Migraciones aplicadas y cache optimizada.

## 8.8 Reverse proxy y servidor de aplicaciones

1. Nginx funciona como punto de entrada web.
2. El backend se ejecuta en PHP-FPM dentro del servicio app.
3. El compose separa red interna backend y expone solo HTTP necesario.
4. Adminer queda disponible en ruta dedicada para administracion en beta.

## 8.9 Riesgos operativos controlados

1. APP_KEY no definida: scripts generan clave valida.
2. Credenciales inseguras de ejemplo: bootstrap bloquea despliegue.
3. Redis overcommit en host: bootstrap aplica vm.overcommit_memory=1.
4. Drift de estado: inspect-beta.sh centraliza revision de logs.

## 8.10 URL de producción
La URL publica final depende del entorno de entrega. En esta memoria dejo el campo para completar con el endpoint final activo en la defensa:

1. URL beta/publica: https://organizat.blete.tech/.

## 8.11 Conclusiones de despliegue
He dejado una base de despliegue reproducible y escalable para un TFG individual: separacion de servicios, pipeline automatizada, healthchecks y scripts operativos reales. El siguiente salto natural seria reforzar observabilidad y publicar metrica de cobertura en CI como artefacto permanente, y asi ultimar como deploy en producción.



