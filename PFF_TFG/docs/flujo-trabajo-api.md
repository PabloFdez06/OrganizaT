# Flujo de trabajo de mi API (vision operativa)

## Objetivo
En este documento explico, con enfoque tecnico-practico, como funciona mi flujo de trabajo alrededor de la API y de la integracion con Moodle/CAS: que pasa al iniciar sesion, que llama a que, en que orden y como transformo los datos para pintar las vistas.

## Stack y piezas principales
- Backend: Laravel + Inertia + Fortify.
- Integracion academica: `MoodleCasClient`, `MoodleAcademicService`, `MoodleUserAcademicCache`.
- Vistas principales que consumen snapshot academico: `dashboard`, `asignaturas`, `tareas`, `calificaciones`.

## Flujo 1: cuando inicio sesion en la app
1. Inicio sesion en la app con Fortify (auth local de Laravel).
2. En este punto no hago login a Moodle automaticamente.
3. El login local solo me autentica contra mi propia app y habilita rutas protegidas con `auth` + `verified`.
4. El consumo de Moodle empieza cuando entro en una vista que necesita datos academicos.

Idea clave: login de app y login de Moodle son dos pasos separados.

## Flujo 2: conectar mi cuenta Moodle
Este flujo lo gestiono en `MoodleConnectionController`.

1. Recibo `moodle_username` y `moodle_password`.
2. Valido credenciales contra Moodle/CAS haciendo login real con `MoodleCasClient::login(...)`.
3. Si el login falla, devuelvo error claro (credenciales invalidas o problema de configuracion).
4. Si el login va bien:
- Guardo `moodle_username` y `moodle_password` en el usuario.
- La password Moodle se guarda cifrada (cast encrypted en el modelo `User`).
- Limpio cache academico de ese usuario con `MoodleUserAcademicCache::clearForUser(...)`.

## Flujo 3: primera carga de datos academicos (tras login o tras conectar Moodle)
Cuando entro, por ejemplo, a `dashboard`, `asignaturas` o `tareas`, el controlador llama a `MoodleUserAcademicCache::getForUser($user)`.

Orden real de trabajo:
1. Compruebo si el usuario tiene Moodle conectado (`moodle_username` y `moodle_password`).
2. Intento leer snapshot desde cache por usuario.
3. Si el snapshot esta fresco, devuelvo cache inmediatamente.
4. Si esta en ventana stale:
- Devuelvo stale para no bloquear UX.
- Programo refresh asincrono al terminar la respuesta.
5. Si no hay cache usable:
- Recargo con lock para evitar recargas concurrentes.

## Que incluye mi snapshot academico
Cuando recomputo, `MoodleUserAcademicCache` construye un payload unificado con:
- `courses`
- `tasks`
- `gradeReport`
- `profileAvatarUrl`
- `studentName`
- `studentEmail`
- `academicCourse`
- `academicYear`

## Flujo interno de extraccion (llamada a llamada)
Dentro de `buildAcademicPayload(...)` hago este orden:

1. Login CAS en Moodle (`MoodleCasClient::login`).
2. Obtener cursos (`MoodleAcademicService::getCourses`).
3. Obtener tareas de todos los cursos (agregacion interna).
4. Obtener calificaciones (`MoodleAcademicService::getGrades`).
5. Enriquecer tareas con datos de notas/feedback.
6. Extraer avatar, nombre, email, curso academico y ano academico.
7. Normalizar fechas para tener `fecha_iso` y `dias_restantes` consistentes.
8. Cerrar sesion Moodle siempre (`finally` con `session->close()`).

## Como autentico contra Moodle/CAS
`MoodleCasClient` encapsula todo el handshake:

1. Resuelvo URL base Moodle/CAS desde `config/services.php` y `.env`.
2. Hago GET a CAS login con `service` apuntando a Moodle.
3. Parseo hidden fields del formulario CAS.
4. Hago POST de credenciales.
5. Sigo redirecciones hasta llegar a Moodle autenticado.
6. Extraigo `sesskey` y `userid`.
7. Reutilizo la misma sesion cURL para llamadas posteriores de esa peticion.

## Como llega eso a cada pagina

### Dashboard (`DashboardController@index`)
1. Pido snapshot al cache.
2. Construyo `quickCards`, `timeline`, `hero` y matriz Eisenhower.
3. Si el modo matriz es AI y se solicita ejecucion, llamo al servicio AI.
4. Entrego props a Inertia para render.

### Asignaturas (`AsignaturasController@index`)
1. Pido snapshot al cache.
2. Calculo estadisticas de tareas por curso.
3. Construyo cards de asignatura y resumen global.
4. Entrego props a Inertia.

### Tareas (`TareasController@index`)
1. Pido snapshot al cache.
2. Normalizo tareas (estado, fecha, tono, unidad, enlace).
3. Agrupo por fecha (`tasksByDate`) para calendario.
4. Construyo cards por asignatura y metricas de cumplimiento.
5. Determino `initialSubjectId` y defaults de calendario.

### Calificaciones (`CalificacionesController@index`)
1. Reutilizo `gradeReport` del snapshot cuando existe.
2. Si no existe, pido grades dedicados.
3. Normalizo notas por asignatura/item y genero resumen + hitos.

## Endpoints API internos (JSON)
Tengo endpoints en `MoodleDataController` para consumo tecnico/controlado:
- `GET /api/asignaturas`
- `GET /api/tareas/{courseId}`
- `GET /api/all-tareas`
- `GET /api/calificaciones`

Flujo de estos endpoints:
1. Resolver credenciales Moodle desde el usuario autenticado.
2. Login CAS.
3. Llamada al servicio academico correspondiente.
4. Respuesta JSON.
5. Cierre de sesion Moodle en `finally`.

## Gestion de errores y degradacion
Yo separo errores por tipo:
- Error de autenticacion Moodle (`MoodleAuthenticationException`).
- Error de request externo (`MoodleRequestException`).
- Error inesperado (`Throwable`).

Comportamiento:
1. Devuelvo mensajes funcionales para UI.
2. En cache stale, si el refresh falla, mantengo datos stale antes que romper la pagina.
3. En endpoints JSON, uso codigos HTTP coherentes (401/502/500 segun caso).

## Resumen ejecutivo del orden completo
1. Login local en app (Fortify).
2. Navegacion a ruta protegida.
3. Si la vista necesita datos academicos, intento `getForUser`.
4. Cache decide: fresh, stale+refresh, o recompute con lock.
5. Si recompute: login CAS -> cursos/tareas/notas -> normalizacion -> cache.
6. Controlador transforma snapshot a DTO de UI.
7. Inertia renderiza la pagina con props.

## Regla mental que sigo
La regla que me aplico es: "una unica fuente de verdad academica por usuario".

Eso significa que priorizo un snapshot cacheado y consistente, y a partir de ahi cada controlador solo adapta ese snapshot a su vista (dashboard, asignaturas, tareas, calificaciones) sin duplicar autenticacion CAS ni scraping en cada pagina.