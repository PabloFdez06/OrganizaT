# EVALUACIÓN COMPLETA — TFG OrganizaT

---

## PARTE 1 — RÚBRICA DWEC (Desarrollo Web en Entorno Cliente)

### DWEC-1: Sintaxis moderna del lenguaje — PUNTUACIÓN: 4 / 4 (10 pts)

**Evidencia:**
- **Interfaces/types propios**: `DashboardProps`, `TareasProps`, `CalificacionesProps`, `AsignaturasProps`, `QuickCard`, `TimelineItem`, `MatrixTask`, `EisenhowerMatrix`, `TaskItem`, `SubjectCard`, `CalendarCell`, `FeedbackModalData` — todos definidos localmente en cada página con tipado estricto.
- **Types centralizados**: `resources/js/types/auth.ts` define `User` con union literal `'admin' | 'user'`, `Auth`, `TwoFactorSetupData`. `global.d.ts` extiende `InertiaConfig` con module augmentation.
- **Sintaxis moderna**: Arrow functions en todo el código, destructuring de props (`{ moodleConnected, studentName, ... }: DashboardProps`), optional chaining (`navigator?.clipboard`), template literals, `Number.parseInt`, `Number.isNaN`.
- **Genéricos**: `useRef<HTMLElement | null>(null)`, `useRef<HTMLOListElement | null>(null)`, `useState<number | null>(null)`.
- **Comentarios**: Presentes en hooks (`use-form-validation.ts` tiene JSDoc completo con ejemplo de uso), ausentes en páginas grandes — aceptable dado que el código es autoexplicativo.
- **Carencia menor**: No se usan enums TypeScript (se usan union literals, que es la práctica moderna recomendada). No hay clases (correcto en React funcional).

**Justificación**: Uso consistente y correcto de TypeScript moderno en todo el proyecto. Interfaces propias en cada página, genéricos en hooks, module augmentation, union types para roles. Código 100% funcional sin legacy.

---

### DWEC-2: Objetos predefinidos del lenguaje — PUNTUACIÓN: 4 / 4 (10 pts)

**Evidencia:**
- **Array methods**: `timeline.slice(0, visibleTimelineItems)`, `courseCards.map()`, `Array.from({ length: 3 })`, `tasksByDate[iso] ?? []`, `dayTasks.some(task => task.statusTone === 'expired')`, `spans.reduce((acc, span) => acc + span, 0)`, `Array.from({ length: 42 })` en buildCalendarCells.
- **Object manipulation**: Spread operator extensivo (`{ ...values, [name]: value }`), `Object.keys` implícito en iteraciones de schema.
- **Date**: `new Date()`, `date.getFullYear()`, `date.getMonth()`, `date.toLocaleDateString('es-ES', {...})`, `date.setDate()`, manipulación completa de calendario con funciones `parseIsoDate`, `formatLocalIsoDate`, `formatMonthLabel`, `buildMonthDate`, `shiftMonth`.
- **Promise/async**: `useClipboard` usa `async/await` con `navigator.clipboard.writeText()`.
- **Generación dinámica JSX**: Tarjetas de asignaturas con `.map()`, calendario con celdas dinámicas, timeline con items dinámicos, skeletons generados con `Array.from`.
- **API del navegador**: `navigator.clipboard`, `window.setTimeout`, `window.clearTimeout`, `window.innerWidth`, `ResizeObserver`, `window.addEventListener('resize')`.

**Justificación**: Uso extensivo y correcto de Array, Date, Promise, API del navegador. Generación dinámica de JSX compleja (calendario, grids, timelines). Excelente.

---

### DWEC-3: Manejo de eventos — PUNTUACIÓN: 3 / 4 (7.5 pts)

**Evidencia:**
- **Formularios con validación cliente**: `useFormValidation` hook con reglas (`required`, `email`, `minLength`, `maxLength`, `matches`). Login usa `onBefore={() => validateAll()}` para validar antes de enviar.
- **Handlers tipados**: `handleChange` tipado como `ChangeEvent<HTMLInputElement | HTMLTextAreaElement>`, `handleBlur` como `FocusEvent<...>`.
- **Errores servidor + cliente**: `clientErrors.email || translateServerError(errors.email)` — combinación de validación local y errores de Inertia.
- **Accesibilidad formularios**: `<Label htmlFor="email">`, `required`, `autoComplete`, `tabIndex` ordenados.
- **Eventos de UI**: onClick implícitos en Links y Buttons, onChange/onBlur en inputs.
- **Carencia**: No se observan eventos personalizados (CustomEvent), ni event bubbling/delegation explícito, ni handlers de teclado (keydown/keyup) más allá de los nativos del navegador. Los formularios no usan `onSubmit` directo sino el `Form` de Inertia con `onBefore`.

**Justificación**: Validación cliente-servidor bien integrada con hook reutilizable. Handlers correctamente tipados. Formularios accesibles. Falta variedad de eventos (keyboard, custom events) para el 4.

---

### DWEC-4: Modelo de objetos del documento (DOM) — PUNTUACIÓN: 4 / 4 (10 pts)

**Evidencia:**
- **useRef extensivo**: `leftColumnRef`, `heroCardRef`, `timelineContainerRef`, `timelineListRef`, `timelineActionsRef` — todos tipados con `<HTMLElement | null>`.
- **useEffect con dependencias correctas**: Polling con cleanup (`return () => { cancelled = true; ... }`), ResizeObserver con disconnect, window event listener con removeEventListener. Dependencias explícitas: `[loading, moodleConnected]`, `[timeline.length, hasMoreTimelineItems, visibleTimelineItems, timelineListOffset]`.
- **Manipulación dinámica**: Cálculo de `timelineMaxHeight` basado en `getBoundingClientRect()`, `window.innerWidth`, offsets dinámicos. Scroll y layout responsive calculado en JS.
- **ResizeObserver**: Observa cambios de tamaño del leftColumn para recalcular layout.
- **useState**: Múltiples estados (`timelineMaxHeight`, `timelineListOffset`, `visibleTimelineItems`, `values`, `clientErrors`, `touched`).
- **Context**: `useSidebar` en sidebar.tsx (contexto de UI).
- **Animaciones via JS**: Offset dinámico de timeline con `transform: translateY`.

**Justificación**: Uso avanzado de refs para medición de DOM, ResizeObserver, cleanup correcto de efectos, estados complejos interdependientes. Excelente dominio del modelo de objetos en React.

---

### DWEC-5: Comunicación asíncrona — PUNTUACIÓN: 4 / 4 (10 pts)

**Evidencia:**
- **Polling con router.reload**: Dashboard, Asignaturas, Tareas — todos implementan polling cada 5s con `router.reload({ only: [...] })` para partial reloads SPA.
- **useForm de Inertia**: Login usa `Form` con `method="post"`, `action={store().url}`, `resetOnSuccess`. Dashboard usa `useForm` con `post` para actualizar matriz.
- **Endpoints /api/***: Definidos en `web.php` — `/api/asignaturas`, `/api/tareas/{courseId}`, `/api/all-tareas`, `/api/calificaciones`, `/api/recursos/{courseId}`, `/api/all-recursos`, `/api/configuracion`.
- **Estados de carga**: `loading` prop + `<Spinner>` + `<Skeleton>` + `aria-live="polite" aria-busy="true"`.
- **Manejo de errores**: `dashboardError`, `pageError` — errores del servidor mostrados con `<AlertError>`.
- **Formatos múltiples**: ICS export (`/tareas/export-all.ics`), PDF download (`/calificaciones/report`), JSON endpoints.
- **Navegación SPA**: `<Link href={...}>` de Inertia para navegación sin recarga.
- **Cancelación**: `cancelled = true` + `clearTimeout` en cleanup de useEffect.

**Justificación**: Comunicación asíncrona completa: polling con partial reloads, formularios Inertia, endpoints JSON, exportaciones multi-formato, estados de carga, manejo de errores, cancelación de peticiones. Excelente.


---

## PARTE 2 — RÚBRICA DWES (Desarrollo Web en Entorno Servidor)

### DWES-API: API REST — Correcto (7.5 pts)

**a) Diseño de recursos REST: Correcto**
- Rutas siguen convención: GET para lectura, POST para acciones, PATCH para actualización parcial, DELETE para eliminación.
- Prefijo `/api` para endpoints JSON separados de rutas web.
- Rutas bien estructuradas por entidad: `/api/asignaturas`, `/api/tareas/{courseId}`, `/api/calificaciones`, `/api/recursos/{courseId}`.
- **Carencia**: No hay paginación ni filtros en endpoints API. No es REST puro (es Inertia + endpoints de soporte).

**b) Autenticación y autorización: Excelente**
- Fortify para login/registro/2FA/verificación.
- Middleware `auth` + `verified` en rutas protegidas.
- Middleware `role.admin` para rutas admin (`/admin`, `/moodle-console`).
- Roles `admin`/`user` con enum en migración.

**c) Códigos HTTP: Correcto**
- Controladores devuelven `Inertia::render()` (200 implícito), `redirect()` (302), `response()->json()` (200).
- `abort(403)` y `abort(503)` en exportación ICS.
- Validación con `$request->validate()` devuelve 422 automáticamente.
- Throttle en rutas sensibles (`throttle:6,1`).
- **Carencia**: No se observan respuestas 201 explícitas para creación.

**d) Pruebas de API: Correcto**
- 18 archivos Feature + 5 Unit. Cubren: Auth (login, registro, 2FA, password, verificación), Dashboard, Settings/Security, Moodle (conexión, preferencias, notificaciones background), Tareas (exportación ICS).
- Tests de éxito y error presentes.
- Tests de autorización (admin middleware).
- **Carencia**: No hay tests directos de los endpoints `/api/*`. Cobertura cuantitativa no publicada.

**e) Documentación API: Correcto**
- OpenAPI con Scramble (auto-generado). URL pública: `https://organizat.blete.tech/docs/api`.
- README documenta endpoints con tabla de métodos, parámetros, respuestas y códigos.
- Ejemplos curl reales y reproducibles.
- `docs/openapi.md` existe (9KB).
- **Carencia**: La documentación OpenAPI es auto-generada, no hay anotaciones manuales enriquecidas.

**Puntuación global DWES-API: Correcto → 7.5/10**

---

### DWES-MVC: MVC — Correcto (7.5 pts)

**Evidencia:**
- **Separación clara**: Controladores orquestan (DashboardController, TareasController), Services contienen lógica (MoodleCasClient, EisenhowerMatrixService, MoodleEphemeralSessionService, MoodleUserAcademicCache, etc.), Vistas son páginas React via Inertia.
- **Lógica en Services**: 15+ servicios en `app/Services/` con responsabilidades claras. Controladores no hacen parsing HTML ni lógica de negocio compleja directamente.
- **Inyección de dependencias**: Constructor injection en controladores (`private readonly MoodleUserAcademicCache $cache`, etc.).
- **Carencia**: No hay Form Requests separados — la validación se hace inline con `$request->validate()`. Los controladores son largos (DashboardController 23KB, TareasController 20KB) con métodos privados de transformación que podrían estar en servicios dedicados.

**Puntuación: Correcto → 7.5/10**

---

### DWES-Modelo: Modelo de Datos — Suficiente (5 pts)

**Evidencia:**
- **Modelos**: Solo 2 modelos Eloquent (User, ErrorReport). User tiene casts, métodos helper (`isAdmin()`, `hasMoodleBackgroundSession()`).
- **Migraciones**: 11 migraciones. Tabla users con campos Moodle, 2FA, roles. Tabla error_reports. Tablas de infraestructura (cache, jobs, sessions).
- **Relaciones**: Solo 1 relación implícita (user_id en moodle_notification_emails). No hay relaciones Eloquent definidas en modelos (`hasMany`, `belongsTo`).
- **Complejidad**: El modelo es simple. La mayoría de datos académicos viven en cache/Redis, no en BD relacional. No hay consultas complejas con joins, scopes avanzados, ni relaciones N:M.
- **Diagrama ER**: Presente en `docs/05-diseno.md` con Mermaid y capturas.
- **Justificación**: El diseño se justifica por la naturaleza del proyecto (datos efímeros de Moodle en cache), pero desde perspectiva académica el modelo relacional es muy básico.

**Puntuación: Suficiente → 5/10**


---

## PARTE 3 — RÚBRICA DIW (Diseño de Interfaces Web)

### DIW-1: Planificación y prototipado — 7.5 / 10

**Evidencia:**
- Enlace Figma presente: `https://www.figma.com/design/H4suweb5Pc2qJqUs7iRXQ9/...`
- Guía de estilos describe componentes reutilizables del prototipo.
- Paleta de colores, tipografías y espaciados documentados.
- **Carencia**: No se describe explícitamente si el prototipo usa auto-layout ni variables Figma. No hay wireframes separados documentados (solo se menciona "correspondencia con interfaz final"). No puedo verificar el contenido del Figma.

---

### DIW-2: Guía de estilos y consistencia visual — 7.5 / 10

**Evidencia:**
- **Colores tokenizados**: `_variables.scss` tiene 100+ variables de color para light/dark con nomenclatura consistente.
- **Tipografías**: 3 familias definidas en `_tokens.scss` (sans, mono, display).
- **Espaciados**: Escala `$space-1` a `$space-12` en rem. Radios `$radius-sm/md/lg`. Sombras `$shadow-sm/md`.
- **Coherencia SCSS ↔ guía**: La guía documenta lo que está en código.
- **Carencia**: Algunos valores en páginas SCSS usan valores directos (`2.5rem`, `1.125rem`) en vez de tokens `$space-*`. La guía de estilos escrita (doc) es breve (3KB) — podría ser más exhaustiva con ejemplos visuales.

---

### DIW-3: Estilos avanzados CSS3/Preprocesadores — 10 / 10

**Evidencia:**
- **ITCSS 7 capas**: `app.scss` importa en orden correcto: settings → tools → generic → elements → objects → components → utilities.
- **BEM estricto**: `.p-asignaturas__course--span-1`, `.c-auth-editorial__hero-title`, `.p-dashboard__hero`, `.c-academia-header__nav-link`.
- **@use moderno**: Todo el proyecto usa `@use` (no `@import`). Ejemplo: `@use '../1-settings/breakpoints' as bp;`.
- **Mixins reutilizados**: `up(sm|md|lg|xl)` para responsive, `focus-ring` para accesibilidad.
- **Sin PX hardcodeados** (excepto breakpoints que es correcto): Espaciados en rem, `clamp()` para tipografía responsive.
- **Código comentado**: Comentarios en nginx conf y PHP, SCSS tiene estructura autoexplicativa.
- **Subdivisión components**: atoms/molecules/organisms/pages — Atomic Design dentro de ITCSS.

---

### DIW-4: Responsive y accesibilidad — 7.5 / 10

**Evidencia:**
- **Breakpoints**: 4 breakpoints (640, 768, 1024, 1280px) con mixin `up()`.
- **Responsive**: `clamp()` para tipografía, `min()` para containers, grid responsive con `minmax`.
- **Labels**: `<Label htmlFor="email">`, `<Label htmlFor="password">` en formularios.
- **ARIA**: `aria-live="polite"`, `aria-busy="true"`, `aria-hidden="true"`, `aria-label` en secciones.
- **Semántica HTML**: `<article>`, `<section>`, `<header>`, `<main>`, `<nav>`, `<figure>`, `<footer>`.
- **Focus visible**: Mixin `focus-ring` con outline.
- **Imágenes**: `alt` descriptivos (`alt={`Imagen de ${course.title}`}`), `loading="lazy"`.
- **Carencia**: No puedo verificar jerarquía h1→h2→h3 completa en todas las páginas. No hay skip-to-content link visible. No hay pruebas de accesibilidad automatizadas (axe, lighthouse).

---

### DIW-5: Interactividad y multimedia — 5 / 10

**Evidencia:**
- **Elementos interactivos**: Calendario interactivo, matriz Eisenhower con cuadrantes, timeline expandible, polling con estados de carga.
- **Coherencia con sistema de diseño**: Spinner, Skeleton, Alert — todos del sistema UI.
- **Carencia**: No se observan animaciones CSS/transitions explícitas en SCSS (no hay `@keyframes`, `transition`, `animation` en los archivos leídos). No hay optimización de imágenes documentada (no hay `<picture>`, srcset, WebP). No hay vídeos ni multimedia rica.

---

### DIW-6: Usabilidad y UX — 7.5 / 10

**Evidencia:**
- **Navegación**: Header académico común en todas las secciones, breadcrumbs, sidebar.
- **Estados error/éxito**: `<AlertError>` con mensajes claros, estados de sesión Moodle caducada.
- **Feedback formularios**: Validación inmediata (onBlur), spinner en botón submit, `processing` state.
- **Flujo onboarding**: Conexión Moodle desde Settings > Seguridad con feedback claro.
- **Carencia**: No hay evidencia de pruebas de usabilidad con usuarios reales. El flujo de conexión Moodle está en Settings, no en un onboarding dedicado al primer uso.


---

## PARTE 4 — RÚBRICA DESPLIEGUE

### Despliegue-1: Arquitectura — 4 / 4 (10 pts)

**Evidencia:**
- 7 servicios claramente separados: app, worker, scheduler, nginx, redis, db, adminer.
- Diagrama Mermaid en README con flujo completo.
- Cada servicio justificado y explicado en `docs/08-despliegue.md`.
- Comunicación entre servicios documentada (nginx → app via fastcgi, app → redis, app → db).

---

### Despliegue-2: Implementación Docker — 4 / 4 (10 pts)

**Evidencia:**
- Dockerfile multi-stage (5 targets: base, vendor, frontend, runtime, nginx).
- `.env.example` y `.env.beta.example` presentes.
- Solo puerto HTTP expuesto (`APP_HTTP_PORT:-8080`).
- Red interna `backend` entre servicios.
- Volúmenes para persistencia: `db_data`, `redis_data`.
- Imágenes publicadas en GHCR (deploy-beta.yml).
- Variables de entorno bien gestionadas con `env_file`.
- Healthchecks en todos los servicios.

---

### Despliegue-3: Reverse proxy (Nginx) — 3 / 4 (6.67 pts)

**Evidencia:**
- Nginx hace reverse proxy a PHP-FPM via upstream `php_fpm_upstream`.
- Sirve estáticos directamente con cache 30d.
- Rutas `/adminer/` proxied a servicio adminer.
- Security headers configurados (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy).
- Logs configurados (access_log, error_log).
- Gzip habilitado con tipos correctos.
- **Carencia**: HTTPS no está configurado en nginx (se justifica que hay proxy externo que termina TLS, pero no hay configuración SSL en el proyecto). No hay rate limiting en nginx.

---

### Despliegue-4: Servidor de aplicaciones — 3 / 4 (6.67 pts)

**Evidencia:**
- PHP-FPM configurado: pool dinámico (max_children=10, start=2, min_spare=2, max_spare=4, max_requests=500).
- OPcache optimizado (192MB, 20000 files, validate_timestamps=0).
- Logs: `catch_workers_output = yes`.
- Ping/status paths configurados.
- **Carencia**: No hay pruebas de rendimiento/carga documentadas. No hay evidencia de pruebas con curl a endpoints en docs de despliegue (sí hay ejemplos curl en README pero no resultados de pruebas).

---

### Despliegue-5: CI/CD — 4 / 4 (10 pts)

**Evidencia:**
- `tests.yml`: Matrix PHP 8.4/8.5, Node 22, ejecuta Pest.
- `lint.yml`: Pint (PHP), formatcheck, lintcheck, typescheck (TS).
- `deploy-beta.yml`: CI completo → build multi-stage → push GHCR → deploy SSH con migrate + optimize + queue:restart.
- Secrets de GitHub (SERVER_HOST, SERVER_USER, SERVER_PASSWORD, GITHUB_TOKEN).
- Concurrency control (`cancel-in-progress: true`).
- Flujo de branches: develop/deploy-beta/main.
- **Bonus**: Verificación de estructura del proyecto en CI antes de build.

---

### Despliegue-6: Documentación del despliegue — 4 / 4 (10 pts)

**Evidencia:**
- README cubre: arquitectura, requisitos, arranque, API, CI/CD, despliegue paso a paso, variables de entorno, verificación, troubleshooting.
- Diagrama Mermaid de arquitectura.
- Endpoints API con tabla completa + ejemplos curl reales.
- Deploy documentado desde cero (host Ubuntu → Docker → clone → .env → bootstrap).
- Troubleshooting con 5 problemas reales.
- `.env.example` y `.env.beta.example` documentados.
- URL pública: https://organizat.blete.tech


---

## PARTE 5 — DOCUMENTACIÓN

| Documento | Evaluación | Observaciones |
|-----------|-----------|---------------|
| 01-introduccion.md | **COMPLETO** | Origen, motivación, objetivos específicos, comparativa con Moodle, resultado vs objetivos |
| 02-descripcion.md | **COMPLETO** | Funcionalidades detalladas por sección, usuarios objetivo, casos de uso, límites actuales |
| 03-instalacion.md | **COMPLETO** | Paso a paso verificable, requisitos con versiones, scripts Docker, variables de entorno |
| 04-guia-estilos.md | **PARCIAL** | Enlace Figma ✓, tipografías ✓, colores ✓, componentes ✓. Falta: capturas del prototipo, ejemplos visuales de componentes |
| 05-diseno.md | **COMPLETO** | Diagrama ER Mermaid, casos de uso, flujo de sincronización, arquitectura, diseño API completo |
| 06-desarrollo.md | **COMPLETO** | Secuencia de desarrollo, dificultades con soluciones, decisiones técnicas justificadas, fragmentos de código |
| 07-pruebas.md | **COMPLETO** | Metodología, tipos, inventario, casos representativos, ejecución, cobertura (reconoce limitación) |
| 08-despliegue.md | **COMPLETO** | Entorno, CI/CD, proceso documentado, URL producción, OpenAPI, verificaciones |
| 09-manual-usuario.md | **PARCIAL** | Guía de uso completa, FAQ/troubleshooting. Falta: capturas de pantalla reales (solo texto) |
| 10-conclusiones.md | **COMPLETO** | Evaluación crítica honesta, grado cumplimiento, mejoras futuras, lecciones aprendidas, preparación defensa |


---

## PARTE 6 — CÁLCULO DE NOTAS COMPUESTAS

Valores normalizados usados:

| Ítem | Nota /10 |
|------|----------|
| DWEC-1 | 10 |
| DWEC-2 | 10 |
| DWEC-3 | 7.5 |
| DWEC-4 | 10 |
| DWEC-5 | 10 |
| DWES-API | 7.5 |
| DWES-MVC | 7.5 |
| DWES-Modelo | 5 |
| DIW-1 | 7.5 |
| DIW-2 | 7.5 |
| DIW-3 | 10 |
| DIW-4 | 7.5 |
| DIW-5 | 5 |
| DIW-6 | 7.5 |
| Deploy-1 | 10 |
| Deploy-2 | 10 |
| Deploy-3 | 6.67 |
| Deploy-4 | 6.67 |
| Deploy-5 | 10 |
| Deploy-6 | 10 |

---

### Criterio 2h — Documentación para el diseño

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| DIW-1: Planificación y prototipado | 30% | 7.5 | 2.25 |
| DIW-2: Guía de estilos | 30% | 7.5 | 2.25 |
| DIW-3: Estilos avanzados | 20% | 10 | 2.00 |
| DIW-5: Interactividad | 20% | 5 | 1.00 |
| **NOTA CRITERIO 2h** | | | **7.50 / 10** |

### Criterio 2i — Control de calidad

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| DIW-4: Responsive y accesibilidad | 30% | 7.5 | 2.25 |
| DIW-6: Usabilidad y UX | 20% | 7.5 | 1.50 |
| DWEC-3: Manejo de eventos | 10% | 7.5 | 0.75 |
| DWEC-4: Modelo objetos documento | 10% | 10 | 1.00 |
| DWEC-5: Comunicación asíncrona | 10% | 10 | 1.00 |
| DWES-API: API REST | 20% | 7.5 | 1.50 |
| **NOTA CRITERIO 2i** | | | **8.00 / 10** |

### Criterio 3d — Procedimientos de actuación

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| DWEC-1: Sintaxis moderna | 10% | 10 | 1.00 |
| DWEC-2: Objetos predefinidos | 10% | 10 | 1.00 |
| DWEC-3: Manejo de eventos | 10% | 7.5 | 0.75 |
| DWEC-4: Modelo objetos documento | 10% | 10 | 1.00 |
| DWEC-5: Comunicación asíncrona | 10% | 10 | 1.00 |
| DWES-MVC: MVC | 20% | 7.5 | 1.50 |
| DWES-API: API REST | 20% | 7.5 | 1.50 |
| Despliegue-2: Docker | 10% | 10 | 1.00 |
| **NOTA CRITERIO 3d** | | | **8.75 / 10** |

### Criterio 3e — Riesgos y prevención

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| Despliegue-1: Arquitectura | 25% | 10 | 2.50 |
| Despliegue-2: Docker | 25% | 10 | 2.50 |
| Despliegue-4: Servidor aplicaciones | 20% | 6.67 | 1.33 |
| Despliegue-5: CI/CD | 10% | 10 | 1.00 |
| Despliegue-6: Documentación | 10% | 10 | 1.00 |
| DWES-API: API REST | 10% | 7.5 | 0.75 |
| **NOTA CRITERIO 3e** | | | **9.08 / 10** |

### Criterio 3h — Documentación para la implementación

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| Despliegue-6: Documentación | 40% | 10 | 4.00 |
| DWES-API: API REST | 20% | 7.5 | 1.50 |
| DWES-MVC: MVC | 10% | 7.5 | 0.75 |
| DWES-Modelo: Modelo datos | 10% | 5 | 0.50 |
| DWEC-2: Objetos predefinidos | 20% | 10 | 2.00 |
| **NOTA CRITERIO 3h** | | | **8.75 / 10** |

### Criterio 4a — Procedimiento de evaluación

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| DWES-API: API REST | 30% | 7.5 | 2.25 |
| DWES-MVC: MVC | 10% | 7.5 | 0.75 |
| DWEC-3: Manejo de eventos | 10% | 7.5 | 0.75 |
| DWEC-4: Modelo objetos documento | 10% | 10 | 1.00 |
| DWEC-5: Comunicación asíncrona | 10% | 10 | 1.00 |
| DIW-4: Responsive y accesibilidad | 20% | 7.5 | 1.50 |
| Despliegue-5: CI/CD | 10% | 10 | 1.00 |
| **NOTA CRITERIO 4a** | | | **8.25 / 10** |

### Criterio 4b — Indicadores de calidad

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| DIW-4: Responsive y accesibilidad | 25% | 7.5 | 1.875 |
| DIW-6: Usabilidad y UX | 15% | 7.5 | 1.125 |
| DWEC-5: Comunicación asíncrona | 10% | 10 | 1.00 |
| DWEC-3: Manejo de eventos | 10% | 7.5 | 0.75 |
| DWEC-4: Modelo objetos documento | 10% | 10 | 1.00 |
| DWES-API: API REST | 20% | 7.5 | 1.50 |
| Despliegue-5: CI/CD | 10% | 10 | 1.00 |
| **NOTA CRITERIO 4b** | | | **8.25 / 10** |

### Criterio 4c — Evaluación de incidencias

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| Despliegue-4: Servidor aplicaciones | 20% | 6.67 | 1.33 |
| Despliegue-2: Docker | 20% | 10 | 2.00 |
| DWES-API: API REST | 20% | 7.5 | 1.50 |
| DWEC-3: Manejo de eventos | 10% | 7.5 | 0.75 |
| DWEC-5: Comunicación asíncrona | 10% | 10 | 1.00 |
| Despliegue-6: Documentación | 20% | 10 | 2.00 |
| **NOTA CRITERIO 4c** | | | **8.58 / 10** |

### Criterio 4d — Gestión de cambios

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| DWES-MVC: MVC | 30% | 7.5 | 2.25 |
| DWEC-1: Sintaxis moderna | 10% | 10 | 1.00 |
| DWEC-4: Modelo objetos documento | 10% | 10 | 1.00 |
| DWEC-5: Comunicación asíncrona | 10% | 10 | 1.00 |
| Despliegue-5: CI/CD | 20% | 10 | 2.00 |
| DIW-2: Guía de estilos | 20% | 7.5 | 1.50 |
| **NOTA CRITERIO 4d** | | | **8.75 / 10** |

### Criterio 4e — Documentación para la evaluación

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| Despliegue-6: Documentación | 30% | 10 | 3.00 |
| DIW-6: Usabilidad y UX | 20% | 7.5 | 1.50 |
| DWES-API: API REST | 25% | 7.5 | 1.875 |
| DWEC-2: Objetos predefinidos | 25% | 10 | 2.50 |
| **NOTA CRITERIO 4e** | | | **8.875 / 10** |

### Criterio 4f — Participación de usuarios

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| DIW-6: Usabilidad y UX | 40% | 7.5 | 3.00 |
| DIW-5: Interactividad y multimedia | 10% | 5 | 0.50 |
| DWEC-3: Manejo de eventos | 20% | 7.5 | 1.50 |
| DWEC-4: Modelo objetos documento | 10% | 10 | 1.00 |
| DWEC-2: Objetos predefinidos | 20% | 10 | 2.00 |
| **NOTA CRITERIO 4f** | | | **8.00 / 10** |

### Criterio 4g — Cumplimiento del pliego de condiciones

| Ítem | Peso | Nota | Contribución |
|------|------|------|-------------|
| DIW-2: Guía de estilos | 20% | 7.5 | 1.50 |
| DWEC-1: Sintaxis moderna | 10% | 10 | 1.00 |
| DWEC-4: Modelo objetos documento | 10% | 10 | 1.00 |
| DWES-API: API REST | 30% | 7.5 | 2.25 |
| Despliegue-5: CI/CD | 30% | 10 | 3.00 |
| **NOTA CRITERIO 4g** | | | **8.75 / 10** |


---

## PARTE 7 — TABLA RESUMEN FINAL

| Criterio | Nota / 10 | Calificación |
|----------|-----------|--------------|
| **ÍTEMS BASE** | | |
| DWEC-1 Sintaxis moderna | 10.0 | Excelente |
| DWEC-2 Objetos predefinidos | 10.0 | Excelente |
| DWEC-3 Eventos | 7.5 | Bien |
| DWEC-4 DOM | 10.0 | Excelente |
| DWEC-5 Asíncrona | 10.0 | Excelente |
| DWES-API REST | 7.5 | Correcto |
| DWES-MVC | 7.5 | Correcto |
| DWES-Modelo de datos | 5.0 | Suficiente |
| DIW-1 Prototipado | 7.5 | Muy Bueno |
| DIW-2 Guía estilos | 7.5 | Muy Bueno |
| DIW-3 CSS avanzado | 10.0 | Excelente |
| DIW-4 Responsive/Accesibilidad | 7.5 | Muy Bueno |
| DIW-5 Interactividad/Multimedia | 5.0 | Bueno |
| DIW-6 Usabilidad/UX | 7.5 | Muy Bueno |
| Deploy-1 Arquitectura | 10.0 | Excelente |
| Deploy-2 Docker | 10.0 | Excelente |
| Deploy-3 Reverse proxy | 6.67 | Bien |
| Deploy-4 Servidor aplicaciones | 6.67 | Bien |
| Deploy-5 CI/CD | 10.0 | Excelente |
| Deploy-6 Documentación | 10.0 | Excelente |
| **CRITERIOS COMPUESTOS** | | |
| 2h Documentación diseño | 7.50 | |
| 2i Control de calidad | 8.00 | |
| 3d Procedimientos de actuación | 8.75 | |
| 3e Riesgos y prevención | 9.08 | |
| 3h Documentación implementación | 8.75 | |
| 4a Procedimiento evaluación | 8.25 | |
| 4b Indicadores de calidad | 8.25 | |
| 4c Evaluación incidencias | 8.58 | |
| 4d Gestión de cambios | 8.75 | |
| 4e Documentación evaluación | 8.88 | |
| 4f Participación de usuarios | 8.00 | |
| 4g Cumplimiento pliego | 8.75 | |

---

### Media global orientativa

- **Media ítems base**: 8.14 / 10
- **Media criterios compuestos**: 8.46 / 10
- **Nota global estimada**: **8.3 / 10** (Notable alto)

---

### 3 Puntos más fuertes del proyecto

1. **Infraestructura de despliegue excepcional**: Dockerfile multi-stage, 7 servicios con healthchecks, CI/CD completo con 3 workflows, deploy automatizado por SSH. Nivel profesional real.
2. **Frontend TypeScript de alta calidad**: Tipado estricto en todas las páginas, hooks personalizados reutilizables, polling asíncrono con cleanup correcto, manipulación avanzada del DOM con ResizeObserver.
3. **Arquitectura SCSS impecable**: ITCSS 7 capas + BEM estricto + @use moderno + tokens centralizados + dark/light theme. Es el mejor aspecto técnico del proyecto desde perspectiva de mantenibilidad.

---

### 3 Puntos más débiles que más penalizan

1. **Modelo de datos muy simple** (5/10): Solo 2 modelos Eloquent, sin relaciones definidas, sin consultas complejas. La justificación técnica (datos en cache) es válida pero académicamente penaliza.
2. **Interactividad/multimedia limitada** (5/10): No hay animaciones CSS, transitions, ni multimedia rica. El proyecto es funcional pero visualmente estático.
3. **Tests de endpoints API ausentes**: Los endpoints `/api/*` no tienen tests directos. La cobertura cuantitativa no se publica. Esto baja DWES-API de Excelente a Correcto.

---

### Recomendaciones prioritarias antes de la entrega (22 de mayo) — ordenadas por impacto en nota

1. **[ALTO IMPACTO] Añadir 2-3 tests Feature para endpoints `/api/*`** (mejora DWES-API de 7.5 a 8.5-9): Un test de `/api/asignaturas`, `/api/tareas/{id}` y `/api/configuracion` con mock de sesión Moodle. Impacta en 8 criterios compuestos.

2. **[ALTO IMPACTO] Añadir transitions/animations CSS** (mejora DIW-5 de 5 a 7.5): Añadir `transition` en hover de tarjetas, `@keyframes` para skeleton loading, y `transition` en apertura de menús. 30 minutos de trabajo, impacta en criterios 2h y 4f.

3. **[MEDIO IMPACTO] Añadir capturas de pantalla al manual de usuario** (mejora doc 09 de PARCIAL a COMPLETO): 4-5 screenshots de las pantallas principales. Impacta en percepción general del tribunal.

4. **[MEDIO IMPACTO] Definir relación Eloquent `hasMany` en User** para `moodle_notification_emails` (mejora DWES-Modelo de 5 a 6-6.5): Una línea de código que demuestra conocimiento de ORM.

5. **[BAJO IMPACTO] Añadir un evento de teclado** (Escape para cerrar modales, Enter para confirmar): Mejora DWEC-3 de 7.5 a 8.5-9.
