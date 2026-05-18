
# Documentación OpenAPI / Swagger — OrganizaT API

## Acceso a la documentación

| Recurso | URL |
|---|---|
| Swagger UI (interfaz visual) | `https://tu-dominio.com/docs/api` |
| Especificación JSON (OpenAPI 3.x) | `https://tu-dominio.com/docs/api.json` |

En entorno local:

| Recurso | URL local |
|---|---|
| Swagger UI | `http://localhost/docs/api` |
| JSON spec | `http://localhost/docs/api.json` |

---

## Decisión técnica: paquete elegido

Se utiliza **[dedoc/scramble](https://scramble.dedoc.co/)** (v0.13.x).

### Por qué Scramble y no L5-Swagger

| Criterio | Scramble | L5-Swagger |
|---|---|---|
| Generación automática | Sí, desde rutas/controladores | No, requiere anotaciones PHPDoc en cada endpoint |
| Anotaciones manuales | Mínimas (docblocks opcionales) | Muchas (obligatorias por endpoint) |
| Mantenimiento | Bajo — sigue el código | Alto — requiere sincronizar anotaciones |
| Compatibilidad Laravel 12 | Nativa | Posible pero más fricción |
| UI integrada | Stoplight Elements (moderna) | Swagger UI 3.x |
| Configurable en servicio | Sí (`Scramble::configure()`) | Config file + anotaciones |

**Conclusión:** Scramble es la opción más robusta y de menor mantenimiento para un proyecto Laravel moderno
con rutas/controladores bien tipados. La generación es automática y sigue el código real, sin riesgo de
que las anotaciones queden obsoletas.

---

## Arquitectura de publicación

### Cómo se sirve Swagger

```
Usuario → HTTPS → Proxy reverso externo → HTTP → nginx (puerto 80)
                                                     ↓
                                               PHP-FPM (Laravel)
                                                     ↓
                                         Scramble responde /docs/api
                                         y /docs/api.json
```

Swagger UI y el JSON OpenAPI se sirven por **la misma entrada HTTPS del dominio principal**.
No se abre ningún puerto adicional para documentación.

### Por qué esta arquitectura

1. La app ya expone HTTPS vía proxy externo en el mismo dominio.
2. nginx enruta `/docs/api` y `/docs/api.json` a `index.php` → Laravel → Scramble.
3. Los assets de Stoplight Elements (JavaScript/CSS) se sirven también por Laravel desde el vendor.
4. No hay puerto nuevo, no hay servicio adicional, no hay docker-compose modificado para esto.

### HTTPS y proxy reverso

- `$middleware->trustProxies(at: '*')` está configurado en `bootstrap/app.php`.
- nginx pasa `X-Forwarded-Proto` al PHP-FPM via `HTTP_X_FORWARDED_PROTO`.
- Scramble usa `url()` de Laravel para generar la URL del servidor en el spec, que respeta el proxy.
- `URL::forceScheme('https')` se activa en producción desde `AppServiceProvider`.
- El JSON spec en `/docs/api.json` referencia el servidor correcto con esquema `https://`.

---

## Endpoints documentados

Solo se documentan los endpoints bajo el prefijo `/api/*` que devuelven `JsonResponse`.
Las rutas Inertia/HTML del frontend **no están incluidas** en la especificación OpenAPI.

### Endpoints incluidos

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/asignaturas` | Lista de asignaturas (cursos Moodle) del usuario |
| `GET` | `/api/tareas/{courseId}` | Tareas de una asignatura concreta |
| `GET` | `/api/all-tareas` | Agregado de todas las tareas de todas las asignaturas |
| `GET` | `/api/calificaciones` | Calificaciones del usuario en todas las asignaturas |
| `GET` | `/api/recursos/{courseId}` | Recursos de una asignatura concreta |
| `GET` | `/api/all-recursos` | Agregado de todos los recursos de todas las asignaturas |
| `GET` | `/api/configuracion` | Preferencias de notificación del usuario |
| `POST` | `/api/configuracion` | Actualiza preferencias de notificación |

### Endpoints excluidos (no son API pública consumible)

- Rutas Inertia (devuelven HTML/React): `/dashboard`, `/asignaturas`, `/tareas`, etc.
- Rutas de polling interno: `/dashboard/status`, `/asignaturas/status`, etc.
- Rutas de admin: `/admin/*` (devuelven Inertia/Redirect).
- Rutas de configuración de perfil: `/settings/*`.
- Rutas de autenticación Fortify: `/login`, `/logout`, etc.

---

## Autenticación

**Todos los endpoints documentados requieren autenticación de sesión Laravel.**

La API usa autenticación basada en sesión (cookie `laravel_session`) gestionada por Fortify.
El esquema de seguridad documentado en el spec es `apiKey in cookie: laravel_session`.

Para usar los endpoints desde herramientas externas (Postman, curl):

1. Hacer login en la web para obtener la cookie de sesión.
2. Copiar las cookies `laravel_session` y `XSRF-TOKEN` del navegador.
3. Incluir el header `X-XSRF-TOKEN: <valor>` en las peticiones POST/PATCH/DELETE.

La Swagger UI incrustada en `/docs/api` incluye "Try It" con `credentials: include`, lo que significa
que si tienes sesión activa en el navegador, las peticiones funcionarán directamente desde la UI.

> **La documentación es pública, pero la API requiere autenticación real.**
> Ver la documentación no da acceso a los endpoints. Solo describe cómo usarlos.

---

## Mantenimiento y regeneración

### La documentación se genera en tiempo real

Scramble genera el spec OpenAPI dinámicamente en cada petición a `/docs/api.json`.
No hay un archivo estático que regenerar; el spec siempre refleja el código actual.

### Comandos útiles

```bash
# Ver la especificación JSON generada (requiere APP_KEY y DB configurados)
php artisan scramble:export --path=docs/api-export.json

# Listar rutas documentadas por Scramble
php artisan route:list --path=api

# Ver rutas de la documentación en sí
php artisan route:list --path=docs
```

### Actualizar la versión de la API

Editar en `.env` o `.env.beta.example`:

```env
API_VERSION=1.1.0
```

### Cómo mejorar el spec

- Añadir docblocks al inicio de métodos de controladores para mejorar sumario y descripción.
- Scramble infiere tipos de parámetros y validaciones desde `Request::validate()`.
- Para respuestas tipadas, usar Laravel Resources (`JsonResource`) o DTOs.
- Añadir anotaciones `#[Response(...)]` de Scramble donde sea necesario.

---

## Despliegue y CI/CD

No es necesario ningún paso adicional en el pipeline para la documentación:

- Scramble es un paquete PHP instalado via Composer.
- El Dockerfile ya instala dependencias composer en la etapa `vendor`.
- Las rutas `/docs/api` y `/docs/api.json` son rutas Laravel — nginx las enruta a PHP-FPM.
- No hay assets que compilar ni publicar adicionalmente.

### Verificación post-despliegue

```bash
# Comprobar que las rutas existen
curl -I https://tu-dominio.com/docs/api
curl -I https://tu-dominio.com/docs/api.json

# Verificar que el JSON es válido
curl https://tu-dominio.com/docs/api.json | python3 -m json.tool > /dev/null && echo "JSON válido"
```

---

## Seguridad

1. **La documentación es pública** — no requiere login para leer el spec. Esto es intencional.
2. **La API mantiene sus controles** — `auth`, `verified` y `role.admin` siguen activos en runtime.
3. **Sin secretos en el spec** — el spec no incluye credenciales, tokens ni valores internos.
4. **Sin mixed content** — las URLs del servidor en el spec se generan via `url()` de Laravel,
   respetando el proxy HTTPS. No hay referencias absolutas hardcodeadas.
5. **Sin puerto nuevo** — la documentación usa la misma entrada que el resto de la app.
6. **RestrictedDocsAccess eliminado** — se ha eliminado deliberadamente el middleware de acceso
   restringido de Scramble para hacer la docs pública. Ver `config/scramble.php` y comentario
   en ese archivo para la justificación de esta decisión.

---

## Limitaciones conocidas y dudas abiertas

1. **Tipos de respuesta no inferibles**: Los datos retornados por `/api/asignaturas`,
   `/api/tareas/{courseId}`, etc. vienen de Moodle (arrays dinámicos). Scramble no puede
   inferir el schema de respuesta. Se documenta como `object`. Para mejorar esto habría que
   crear Laravel Resources o DTOs con tipos estáticos.

2. **CSRF en Try It**: La UI de Swagger incluye "Try It". Las peticiones POST/PATCH requieren
   el token CSRF. Si el navegador tiene sesión activa, `credentials: include` pasa las cookies
   automáticamente y debería funcionar. Si falla, usar curl con cookies extraídas manualmente.

3. **APP_ENV=beta**: Si el entorno no es `production` ni `local`, `URL::forceScheme('https')`
   no se activa en `AppServiceProvider`. En ese caso las URLs del spec en `/docs/api.json`
   pueden aparecer con `http://`. Workaround: configurar `APP_ENV=production` en beta,
   o añadir `APP_ENV=beta` al condicional en AppServiceProvider.
   **Se asume que el entorno beta usa `APP_ENV=production` (confirmado en `.env.beta.example`).**

4. **Status endpoints no documentados**: Los endpoints de polling interno (`/dashboard/status`,
   `/asignaturas/status`, etc.) no están bajo `/api/` y quedan excluidos del spec.
   Son rutas de soporte del frontend SPA, no API consumible externamente.
