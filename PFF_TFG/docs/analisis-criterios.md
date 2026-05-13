# Análisis de Criterios — OrganizaT (TFG DAW)

> **Rol**: Examinador final de TFG. Evaluación estricta sobre la rúbrica oficial del IES Rafael Alberti (Proyecto Final DAW).
> Fuente de la rúbrica: [https://ies-rafael-alberti.github.io/proyecto-intermodular-daw/docs/proyectos/proyecto-final/](https://ies-rafael-alberti.github.io/proyecto-intermodular-daw/docs/proyectos/proyecto-final/)

---

## Nota previa: entregables mínimos

La rúbrica exige estos mínimos para que el proyecto sea evaluado. Si no se cumplen, todos los criterios asociados valen **0**.

| Mínimo exigido | Estado |
|---|---|
| Prototipo en Figma funcional | ✅ Existe enlace en `docs/04-guia-estilos.md` |
| Repositorio con cliente y servidor | ✅ Repositorio completo (Laravel + React/TS) |
| Documentación con los 10 apartados | ✅ `docs/01` a `docs/10` presentes |
| Aplicación desplegada en URL pública | ✅ https://organizat.blete.tech/ |

**Todos los mínimos cumplidos → evaluación procede.**

---

## Rúbricas por módulo

### 1. DWEC — Desarrollo Web en Entorno Cliente

Escala: **0 (Muy deficiente) · 1 (Insuficiente) · 2 (Suficiente) · 3 (Bien) · 4 (Excelente)**  
Cada ítem vale el 20% de la nota del módulo DWEC.

---

#### 1.1 Aplica la sintaxis moderna del lenguaje

**Nota obtenida: 3 — Bien**

| Nivel | Descripción (rúbrica) |
|---|---|
| **3 — Bien** ✅ | Utiliza la sintaxis moderna en la mayor parte de la aplicación, incluyendo estructuras definidas por el usuario, comentando el código de forma correcta. |

**Justificación**: El proyecto usa TypeScript en todo el frontend, con interfaces y tipos propios definidos (`DashboardProps`, `MatrixTask`, `QuickCard`, etc.), arrow functions, destructuring, optional chaining, módulos ES6 y React 19 con hooks. La sintaxis es consistentemente moderna. Los comentarios existen en SCSS y en algún lugar del TS, pero no están presentes de forma exhaustiva en cada función o componente TSX. Para alcanzar el 4 (Excelente) sería necesario "comentar en todo momento el código de forma clara y concisa", lo que no ocurre aquí.

**Mejora posible**: Añadir JSDoc en funciones clave, hooks personalizados y componentes complejos para alcanzar el nivel Excelente.

**Nota normalizada (0–10): 7,5**

---

#### 1.2 Escribe código identificando y aplicando las funcionalidades aportadas por los objetos predefinidos del lenguaje

**Nota obtenida: 3 — Bien**

| Nivel | Descripción (rúbrica) |
|---|---|
| **3 — Bien** ✅ | Buen uso de los objetos predefinidos para cambiar el aspecto del navegador y el documento, generando textos y etiquetas. |

**Justificación**: El proyecto utiliza los objetos predefinidos de React (`useState`, `useEffect`, `useRef`, `useMemo`), de Inertia (`useForm`, `usePage`, `router`, `Head`, `Link`), y del navegador (`window.Echo` para WebSockets). Los componentes generan dinámicamente nodos JSX (equivalente moderno de crear/modificar etiquetas del DOM). El uso es correcto y amplio, sin explorar al máximo APIs de bajo nivel del navegador (como `IntersectionObserver`, `MutationObserver`, etc.) que justificarían el Excelente.

**Mejora posible**: Explotar más APIs nativas del navegador (Notification API, Clipboard API, Storage API de forma más explícita) para reforzar el conocimiento de objetos predefinidos más allá del framework.

**Nota normalizada (0–10): 7,5**

---

#### 1.3 Desarrolla aplicaciones Web interactivas integrando mecanismos de manejo de eventos

**Nota obtenida: 3 — Bien**

| Nivel | Descripción (rúbrica) |
|---|---|
| **3 — Bien** ✅ | Buena integración de los mecanismos de manejo de eventos, validando los formularios de la aplicación. |

**Justificación**: El proyecto integra ampliamente el manejo de eventos: `onSubmit`, `onClick`, `onChange`, `onKeyDown` en todos los formularios y componentes interactivos. La validación de formularios se gestiona mediante `useForm` de Inertia (server-side), con errores mostrados al usuario. La validación client-side es delegada al servidor (errores de `422` retornados por Laravel y mostrados en `errors`), lo que es correcto en el patrón Inertia pero limita la puntuación frente al nivel Excelente, que exige "creación y captura de eventos, validando los formularios".

**Mejora posible**: Añadir validación inline client-side antes del envío (longitud mínima, formato de email, campos requeridos) con feedback inmediato, complementando la validación server-side.

**Nota normalizada (0–10): 7,5**

---

#### 1.4 Desarrolla aplicaciones Web analizando y aplicando las características del modelo de objetos del documento

**Nota obtenida: 3 — Bien**

| Nivel | Descripción (rúbrica) |
|---|---|
| **3 — Bien** ✅ | Se ha accedido de manera adecuada a la estructura del documento, creando y modificando elementos, asociando acciones a los eventos. |

**Justificación**: React gestiona el Virtual DOM como abstracción del DOM real. Los componentes crean y modifican dinámicamente la estructura del documento en función del estado (loading states, condicionales, listas dinámicas). Los refs se usan donde se requiere acceso directo al DOM (`useRef`). Las acciones están asociadas a eventos del modelo a través del sistema de eventos sintéticos de React. No se manipula el DOM "crudo" directamente (document.querySelector, etc.) porque React lo abstrae correctamente; el nivel Excelente aplica el criterio original orientado a JS vanilla.

**Mejora posible**: Uso explícito de refs para manipulación directa en casos donde aplica (scroll automático, foco programático) y documentar esas decisiones.

**Nota normalizada (0–10): 7,5**

---

#### 1.5 Desarrolla aplicaciones Web dinámicas, reconociendo y aplicando mecanismos de comunicación asíncrona entre cliente y servidor

**Nota obtenida: 4 — Excelente**

| Nivel | Descripción (rúbrica) |
|---|---|
| **4 — Excelente** ✅ | Se ha utilizado comunicación asíncrona en la actualización dinámica del documento, utilizando distintos formatos en el envío y recepción de información, incorporando librerías que facilitan las tecnologías de actualización dinámica. |

**Justificación**: Éste es el punto más sólido de DWEC. El proyecto implementa múltiples capas de comunicación asíncrona:
1. **Inertia.js**: SPA con navegación asíncrona sin recarga completa, intercambio de props JSON entre servidor y cliente.
2. **Polling de estado**: los endpoints `/dashboard/status`, `/asignaturas/status`, `/tareas/status` se consultan periódicamente para actualizar el estado de carga por sección (patrón Async Cache + Jobs).
3. **Laravel Echo + Pusher**: WebSockets en tiempo real para notificaciones (canal `notifications.{userId}`).
4. **Múltiples formatos**: JSON para API, ICS (`text/calendar`) para exportación de tareas, PDF para informes de calificaciones.
5. **Librerías especializadas**: Inertia, Echo, y el sistema de colas de Laravel como infraestructura asíncrona de servidor.

**Mejora posible**: Ninguna significativa en este criterio; es el de mayor solidez técnica del módulo DWEC.

**Nota normalizada (0–10): 10,0**

---

### 2. DWES — Desarrollo Web en Entorno Servidor

Escala cualitativa: **Insuficiente · Mejorable · Suficiente · Correcto · Excelente**  
Estructura: Backend (70%) compuesto por API REST y MVC; Modelo de Datos (30%).  
Para normalización a 0–10: Insuficiente=0 · Mejorable=2,5 · Suficiente=5 · Correcto=7,5 · Excelente=10.

> **Nota crítica**: La rúbrica de DWES define "Correcto" y "Excelente" con "sistema de autenticación y autorización **con roles**" como condición explícita. OrganizaT tiene un único tipo de usuario autenticado (sin sistema RBAC ni roles diferenciados). Esto fija el techo en **Suficiente** para API REST y MVC.

---

#### 2.1 API REST (dentro del 70% de Backend)

**Nota obtenida: Suficiente**

| Nivel | Descripción (rúbrica) |
|---|---|
| **Suficiente** ✅ | Diseño mejorable de recursos, puntos de entrada y códigos de respuesta. Sistema de autenticación y autorización **sin roles**. Pruebas unitarias con cobertura mejorable. Documentación mejorable sin peticiones de prueba. |

**Evidencia analizada**:
- Las rutas bajo `/api` están bien organizadas dentro del grupo `auth`+`verified` y agrupadas en `Route::prefix('api')`.
- Controladores separados por dominio: `MoodleDataController`, `MoodlePreferencesController`, `MoodleConnectionController`, etc.
- Códigos HTTP correctos: `200`, `201`, `401`, `422`, `500`, `502` usados apropiadamente.
- **Sin roles**: solo middleware `auth` + `verified`. No hay RBAC, no hay Admin/User ni ninguna capa de autorización diferenciada.
- Tests: 25 ficheros PHP (Feature + Unit) con escenarios reales, pero no hay colección OpenAPI/Swagger ni Postman exportada.
- El README incluye tabla de endpoints y ejemplos `curl`, pero la rúbrica para "Correcto" requiere "peticiones de prueba" formales (Postman/OpenAPI), no solo curl en el README.

**Puntos positivos no alcanzables por la restricción de roles**: diseño de rutas correcto, controladores bien separados, HTTP codes acertados, tests existentes y README con curl examples.

**Mejora posible**: Implementar al menos un nivel básico de RBAC (admin vs. alumno) o diferenciar acceso por tipo de usuario. Generar una colección Postman o fichero OpenAPI para la documentación formal de la API.

**Nota normalizada (0–10): 5,0**

---

#### 2.2 MVC (dentro del 70% de Backend)

**Nota obtenida: Suficiente**

| Nivel | Descripción (rúbrica) |
|---|---|
| **Suficiente** ✅ | Separación mejorable de la lógica de negocio de los aspectos de presentación. Sistema de autenticación y autorización **sin roles**. |

**Evidencia analizada**:
- La separación real del proyecto es **mejor que "mejorable"**: controladores delegan en servicios (`MoodleAcademicService`, `MoodleSessionService`), los jobs encapsulan lógica asíncrona, los modelos acceden a la BD. La arquitectura es MVC sólida con capa de servicios adicional.
- Sin embargo, la condición de roles es limitante: la rúbrica no permite alcanzar "Correcto" sin sistema de autenticación y autorización con roles.
- El nivel asignado (Suficiente) **no refleja la calidad real de la separación**, que es cercana al nivel Correcto o Excelente técnicamente, pero la restricción de roles lo impide según la rúbrica.

**Mejora posible**: La separación en sí no necesita mejora. El único bloqueo es la ausencia de roles, misma solución que para API REST.

**Nota normalizada (0–10): 5,0**

---

#### 2.3 Modelo de Datos (30%)

**Nota obtenida: Suficiente**

| Nivel | Descripción (rúbrica) |
|---|---|
| **Suficiente** ✅ | Modelo simple poco relacionado. Consultas simples. Documentación mejorable. |

**Evidencia analizada**:
- El modelo de datos local es muy acotado: tabla `users` (con múltiples columnas JSON para datos Moodle y preferencias), tabla `moodle_notification_emails`, más tablas de framework (`cache`, `jobs`, `sessions`, `password_reset_tokens`, `failed_jobs`).
- Solo hay 2 entidades de dominio propias (users y moodle_notification_emails) con una relación 1:N básica.
- Las consultas son simples: lecturas sobre User model y escrituras sobre moodle_notification_emails.
- La documentación del diseño existe y tiene un diagrama ER en Mermaid (`docs/05-diseno.md`), lo que eleva la valoración respecto a "Mejorable" (que indica documentación deficiente).
- El uso de columnas JSON (`moodle_notification_preferences`, `dashboard_quick_subject_ids`) añade algo de complejidad a nivel de estructura, pero no equivale a un modelo relacional complejo.

**Mejora posible**: El modelo es intrínsecamente simple por la naturaleza de la aplicación (los datos "ricos" son de Moodle, externos). Si se almacenaran localmente algunas entidades (historial de tareas, asignaturas favoritas, etc.) se enriquecería el modelo de datos con más relaciones reales.

**Nota normalizada (0–10): 5,0**

---

### 3. DIW — Diseño de Interfaces Web

Escala: **0 (Insuficiente) · 2,5 (Aceptable) · 5 (Bueno) · 7,5 (Muy Bueno) · 10 (Excelente)**

---

#### 3.1 Planificación y prototipado RA1

**Peso en el módulo: 20%**  
**Nota obtenida: 7,5 — Muy Bueno**

| Nivel | Descripción (rúbrica) |
|---|---|
| **7,5 — Muy Bueno** ✅ | Prototipo responsive con uso de auto-layout y componentes bien estructurados, aunque faltan detalles menores en la guía de estilos. |

**Justificación**: El enlace al prototipo Figma está documentado en `docs/04-guia-estilos.md`. La implementación final refleja una planificación estructurada con pantallas consistentes: dashboard con hero block + Eisenhower matrix, vistas por módulo académico (asignaturas, tareas, calificaciones, recursos), zona de configuración separada. No es posible verificar directamente el uso de auto-layout avanzado o variables nativas de Figma desde el repositorio, lo que impide confirmar el nivel Excelente. La correspondencia entre prototipo e implementación es evidente.

**Mejora posible**: Documentar en `docs/04-guia-estilos.md` el uso de componentes en Figma, librería de estilos y variables de Figma de forma explícita para que el evaluador pueda verificar sin abrir el archivo.

**Nota: 7,5**

---

#### 3.2 Guía de estilos y consistencia visual RA1, RA2

**Peso en el módulo: 20%**  
**Nota obtenida: 10 — Excelente**

| Nivel | Descripción (rúbrica) |
|---|---|
| **10 — Excelente** ✅ | Guía de estilos completa: tipografías, colores, tamaños y patrones reutilizables, manteniendo coherencia perfecta en todo el diseño. |

**Justificación**: El sistema de estilos es exhaustivo y coherente:
- **Tipografía**: 3 familias con roles diferenciados (Space Grotesk + Instrument Sans para texto operativo, JetBrains Mono para código, Playfair Display para display).
- **Color**: tokens centralizados con soporte dark/light en `_variables.scss`, usando `var(--color-*)` en todos los componentes. Tokens de marca, estados (brand, danger, muted, ring) y overlays rgba.
- **Espaciado**: escala de `space-1` a `space-12` en rem, radios sm/md/lg y sombras sm/md reutilizables.
- **BEM**: aplicado consistentemente (`c-academia-header`, `c-academia-header__nav-link`, `p-dashboard__hero`, etc.).
- **Metodología**: arquitectura ITCSS 7-1 (settings → tools → generic → elements → objects → components → utilities).

La coherencia visual se mantiene a través de todos los módulos de la aplicación mediante este sistema.

**Mejora posible**: No hay mejora significativa en este criterio.

**Nota: 10,0**

---

#### 3.3 Definición de estilos avanzados CSS3/Preprocesadores RA2

**Peso en el módulo: 20%**  
**Nota obtenida: 10 — Excelente**

| Nivel | Descripción (rúbrica) |
|---|---|
| **10 — Excelente** ✅ | Uso avanzado de preprocesadores y metodologías, código limpio y bien documentado. La estructura CSS3 está perfectamente optimizada. |

**Justificación**:
- **Preprocesador SCSS**: arquitectura 7-1 ITCSS completa con capas separadas (settings, tools, generic, elements, objects, components, utilities).
- **Mixins**: `up(sm|md|lg|xl)` para media queries responsivos, `focus-ring` para accesibilidad de teclado, y otros mixins de composición reutilizables.
- **Variables/tokens**: sistema centralizado en `_variables.scss` con CSS custom properties para theming.
- **Metodología BEM**: nomenclatura consistente y bien aplicada en todos los componentes.
- Sin estilos hardcodeados, sin píxeles directos salvo donde es justificable (media queries), unidades relativas (rem).
- Código limpio, sin duplicaciones, con separación clara entre capas.

**Mejora posible**: No hay mejora significativa en este criterio.

**Nota: 10,0**

---

#### 3.4 Diseño responsive y accesibilidad RA5, RA6

**Peso en el módulo: 20%**  
**Nota obtenida: 7,5 — Muy Bueno**

| Nivel | Descripción (rúbrica) |
|---|---|
| **7,5 — Muy Bueno** ✅ | Diseño responsive y accesible, con pequeños detalles que podrían mejorarse en algunos dispositivos o en las pautas WCAG. |

**Justificación**:
- Breakpoints centralizados con mixin `up(sm|md|lg|xl)` aplicado consistentemente.
- Mixin `focus-ring` para navegación por teclado accesible.
- Semántica HTML correcta (según instrucciones del proyecto): `main`, `section`, `article`, `header`, `nav`, etc.
- Metodología BEM que favorece la accesibilidad estructural.
- Soporte dark/light mode mediante CSS custom properties.
- No se evidencia una auditoría WCAG AA formal documentada (axe, Lighthouse accesibilidad > 90), ni atributos ARIA explícitos en componentes complejos como modales o dropdowns, lo que impide confirmar el nivel Excelente ("Cumple con SEO y estándares de accesibilidad").

**Mejora posible**: Ejecutar y documentar un informe de accesibilidad Lighthouse o axe. Añadir `aria-label`, `aria-expanded`, `aria-haspopup` en componentes complejos (Dropdown, Dialog). Verificar ratio de contraste en modo claro y oscuro.

**Nota: 7,5**

---

#### 3.5 Interactividad y multimedia RA3, RA4

**Peso en el módulo: 10%**  
**Nota obtenida: 5 — Bueno**

| Nivel | Descripción (rúbrica) |
|---|---|
| **5 — Bueno** ✅ | Multimedia integrada de forma básica pero funcional, con inconsistencias en su diseño o uso limitado de elementos interactivos. |

**Justificación**: OrganizaT es una aplicación de productividad académica. La integración multimedia es funcional pero acotada:
- Estados de carga con `Spinner` y `Skeleton` (feedback visual animado).
- Exportación de archivos multimedia: ICS (calendario) y PDF (informe de calificaciones).
- Reproductor de media de Moodle (`moodle.media` route) para contenido externo.
- No hay integración creativa de vídeo, audio, animaciones CSS/JS complejas ni transiciones de página elaboradas.

Esta es la naturaleza de la aplicación (dashboard funcional, no una plataforma de contenido multimedia), por lo que el 5 es la puntuación justa.

**Mejora posible**: Añadir micro-animaciones en transiciones de componentes (framer-motion o CSS transitions), onboarding interactivo con tooltips animados, o vídeos demostrativos embebidos para enriquecer la experiencia multimedia.

**Nota: 5,0**

---

#### 3.6 Usabilidad y experiencia de usuario UX RA5, RA6

**Peso en el módulo: 10%**  
**Nota obtenida: 7,5 — Muy Bueno**

| Nivel | Descripción (rúbrica) |
|---|---|
| **7,5 — Muy Bueno** ✅ | Navegación fluida y mayoritariamente intuitiva, con mínimos problemas detectados en las verificaciones. |

**Justificación**:
- Navegación SPA con Inertia (sin recarga completa, transición suave entre páginas).
- Estados de carga explícitos: Spinner/Skeleton mientras se obtienen datos de Moodle.
- Feedback de errores claro (`Alert`, `AlertError`) con mensajes contextuales.
- Dashboard con Eisenhower matrix para priorización visual de tareas.
- Cabecera académica común (`AcademiaHeader`) en todas las secciones para coherencia de navegación.
- Soporte dark/light mode.
- No se documenta verificación formal de usabilidad (test con usuarios, Hotjar, etc.) que justificaría el nivel Excelente.

**Mejora posible**: Realizar y documentar al menos un test de usabilidad básico (5 usuarios, tareas definidas). Implementar breadcrumbs más descriptivos y mensajes de onboarding para usuarios nuevos.

**Nota: 7,5**

---

### 4. Despliegue de Aplicaciones Web

Escala: **1 (Insuficiente) · 2 (Básico) · 3 (Bien) · 4 (Excelente)**  
Para normalización a 0–10: 1→0 · 2→5 · 3→7,5 · 4→10.

---

#### 4.1 Arquitectura de la aplicación

**Peso en el módulo: 20%**  
**Nota obtenida: 4 — Excelente**

| Nivel | Descripción (rúbrica) |
|---|---|
| **4 — Excelente** ✅ | Arquitectura claramente definida y separada por servicios. Se explica qué hace cada servicio y cómo se comunican. Evidenciada con diagrama en README/DEPLOY y con el compose. Funciona al levantar el proyecto. |

**Justificación**: La arquitectura de 7 servicios Docker está perfectamente definida y documentada:
- `app` (Laravel PHP-FPM), `worker` (queue:work), `scheduler` (schedule:work), `nginx` (HTTP + estáticos), `redis` (cache/sesiones/colas), `db` (MySQL 8.4), `adminer` (gestión DB).
- Diagramas Mermaid en `README.md` y `docs/08-despliegue.md` con arquitectura runtime y lógica.
- `docker-compose.beta.yml` con todos los servicios y sus dependencias.
- Explicación de la comunicación entre servicios (Redis como bus de colas, PHP-FPM detrás de Nginx, Worker consumiendo de Redis).

**Mejora posible**: Ninguna significativa.

**Nota normalizada (0–10): 10,0**

---

#### 4.2 Implementación Docker

**Peso en el módulo: 20%**  
**Nota obtenida: 4 — Excelente**

| Nivel | Descripción (rúbrica) |
|---|---|
| **4 — Excelente** ✅ | Proyecto completamente "dockerizado" y reproducible. Dockerfile(s) correctos y compose.yaml con instrucciones claras. Redes internas y puertos limpios. Volúmenes para persistencia. Variables de entorno bien gestionadas (.env.example). Imagen publicada en registry. |

**Justificación**:
- **Dockerfile multi-stage** (5 etapas: `base` → `vendor` → `frontend` → `runtime` → `nginx`): imagen final limpia sin artefactos de build.
- **docker-compose.beta.yml**: 7 servicios con healthchecks, named volumes, YAML anchors, internal networks.
- **`.env.beta.example`**: plantilla completa de variables con script de validación (`bootstrap-droplet-beta.sh`) que rechaza placeholders sin reemplazar.
- **Imagen publicada** en `ghcr.io` mediante `deploy-beta.yml` (evidenciada en el workflow).
- Solo se expone el puerto HTTP de Nginx; el resto de servicios se comunican en red interna.

**Mejora posible**: Ninguna significativa.

**Nota normalizada (0–10): 10,0**

---

#### 4.3 Servidor web/front (reverse proxy)

**Peso en el módulo: 15%** *(Este ítem no aparece en los criterios de evaluación final, pero se evalúa como parte de la rúbrica de Despliegue)*  
**Nota obtenida: 4 — Excelente**

| Nivel | Descripción (rúbrica) |
|---|---|
| **4 — Excelente** ✅ | Servidor web actúa como front real: reverse proxy al backend y sirve estáticos. HTTPS configurado correctamente (o explicado por qué no se usa). Contextos/rutas adecuadas. Se explican adaptaciones. Evidenciado con fichero de configuración. |

**Justificación**:
- **`docker/nginx/conf.d/default.conf`**: configuración completa con upstream a `app:9000` (PHP-FPM), keepalive 16, serving de estáticos con `expires 30d` y `Cache-Control: public, immutable`.
- Gzip activado con tipos MIME correctos.
- Security headers incluidos via `include /etc/nginx/snippets/security-headers.conf`.
- Proxy a Adminer en `/adminer/`.
- HTTPS en producción (`https://organizat.blete.tech/`) gestionado a nivel de infraestructura (Cloudflare o proxy externo), lo cual es una solución válida y habitual en entornos beta.
- Acceso correcto documentado.

**Mejora posible**: Documentar explícitamente en `docs/08-despliegue.md` cómo se gestiona el TLS (Cloudflare/Let's Encrypt/etc.) para que quede claro en la evidencia.

**Nota normalizada (0–10): 10,0**  
*(Este ítem no contribuye a los criterios de evaluación de la rúbrica oficial, pero refleja un trabajo Excelente)*

---

#### 4.4 Servidor de aplicaciones

**Peso en el módulo: 15%**  
**Nota obtenida: 3 — Bien**

| Nivel | Descripción (rúbrica) |
|---|---|
| **3 — Bien** ✅ | Backend correctamente configurado y probado, pero con menos profundidad (pruebas de rendimiento muy básicas o explicación corta). Evidencia funcionamiento y logs. |

**Justificación**:
- PHP-FPM correctamente configurado como servidor de aplicaciones detrás de Nginx.
- Redis como driver para sesiones, caché y colas (documentado en variables de entorno).
- Workers de cola independientes con `queue:work` en contenedor separado.
- Tests funcionales con Pest (25 ficheros PHP, cobertura de Feature + Unit).
- El README incluye ejemplos curl reproducibles para verificar endpoints.
- **No se evidencian pruebas de rendimiento/carga** (ab, wrk, k6, Siege) que el nivel Excelente requiere.

**Mejora posible**: Ejecutar al menos una prueba básica de carga (ej. `wrk -t4 -c50 -d30s http://localhost/api/asignaturas`) y documentar el resultado con interpretación.

**Nota normalizada (0–10): 7,5**

---

#### 4.5 Control de versiones + CI/CD

**Peso en el módulo: 20%**  
**Nota obtenida: 4 — Excelente**

| Nivel | Descripción (rúbrica) |
|---|---|
| **4 — Excelente** ✅ | Git ordenado con ramas para features, main estable, commits descriptivos. GitHub Actions con CI (build + tests) y CD (publicar imagen + despliegue). Run correcto evidenciado. Secrets usados. |

**Justificación**:
- **3 workflows de GitHub Actions**:
  - `tests.yml`: matriz PHP 8.4/8.5, ejecuta Pest suite completa.
  - `lint.yml`: Pint (PHP), ESLint + TypeScript + Prettier (frontend) — calidad de código automatizada.
  - `deploy-beta.yml`: pipeline completo CI → build imagen multi-stage → push `ghcr.io` → SSH deploy, con `migrate --force`, `optimize`, `queue:restart`.
- Secrets usados (`GHCR_TOKEN`, `SSH_PRIVATE_KEY`, `SSH_HOST`, etc.).
- Rama `deploy-beta` separada de `main` para el despliegue.
- La existencia y complejidad de los 3 workflows demuestra madurez en la práctica CI/CD.

**Mejora posible**: Ninguna significativa. Se podría añadir análisis estático de seguridad (SAST) como action adicional.

**Nota normalizada (0–10): 10,0**

---

#### 4.6 Documentación del despliegue

**Peso en el módulo: 10%**  
**Nota obtenida: 4 — Excelente**

| Nivel | Descripción (rúbrica) |
|---|---|
| **4 — Excelente** ✅ | Documentación permite entender, ejecutar y mantener el proyecto sin ayuda. README con arquitectura + diagrama + API documentada con curl + Deploy paso a paso + variables de entorno + troubleshooting. |

**Justificación**:
- `README.md`: índice completo, diagrama Mermaid de arquitectura runtime, tabla de endpoints con métodos/parámetros/códigos, ejemplos curl reales, instrucciones de arranque local y beta, sección de troubleshooting básico.
- `docs/08-despliegue.md`: dockerfile explicado por etapas, configuración de entorno, flujo del workflow CI/CD paso a paso, opción automatizada con script.
- `.env.beta.example`: todas las variables documentadas con comentarios.
- Script `bootstrap-droplet-beta.sh` con validación previa al despliegue.
- No hay aspectos importantes sin documentar.

**Mejora posible**: Ninguna significativa.

**Nota normalizada (0–10): 10,0**

---

## Criterios de evaluación y pesos — Cálculo de notas

A continuación se calcula la nota de cada criterio combinando las notas de los ítems de rúbrica con sus pesos oficiales, todos normalizados a escala 0–10.

### Tabla de ítems de rúbrica normalizados (referencia)

| Ítem | Nota normalizada (0–10) |
|---|---|
| DWEC: Sintaxis moderna del lenguaje | 7,5 |
| DWEC: Objetos predefinidos | 7,5 |
| DWEC: Manejo de eventos | 7,5 |
| DWEC: DOM (modelo de objetos del documento) | 7,5 |
| DWEC: Comunicación asíncrona | 10,0 |
| DWES: API REST | 5,0 |
| DWES: MVC | 5,0 |
| DWES: Modelo de Datos | 5,0 |
| DIW: Planificación y prototipado (RA1) | 7,5 |
| DIW: Guía de estilos y consistencia visual (RA1, RA2) | 10,0 |
| DIW: Estilos avanzados CSS3/Preprocesadores (RA2) | 10,0 |
| DIW: Diseño responsive y accesibilidad (RA5, RA6) | 7,5 |
| DIW: Interactividad y multimedia (RA3, RA4) | 5,0 |
| DIW: Usabilidad y experiencia de usuario (RA5, RA6) | 7,5 |
| Despliegue: Arquitectura de la aplicación | 10,0 |
| Despliegue: Implementación Docker | 10,0 |
| Despliegue: Servidor de aplicaciones | 7,5 |
| Despliegue: Control de versiones + CI/CD | 10,0 |
| Despliegue: Documentación del despliegue | 10,0 |

---

### Criterio 2h) Documentación para el diseño

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| DIW: Planificación y prototipado (RA1) | 30% | 7,5 |
| DIW: Guía de estilos y consistencia visual (RA1, RA2) | 30% | 10,0 |
| DIW: Definición de estilos avanzados CSS3/Preprocesadores (RA2) | 20% | 10,0 |
| DIW: Interactividad y multimedia (RA3, RA4) | 20% | 5,0 |

**Nota 2h = (7,5×0,30) + (10×0,30) + (10×0,20) + (5×0,20) = 2,25 + 3,00 + 2,00 + 1,00 = 8,25**

---

### Criterio 2i) Control de calidad

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| DIW: Diseño responsive y accesibilidad (RA5, RA6) | 30% | 7,5 |
| DIW: Usabilidad y experiencia de usuario (RA5, RA6) | 20% | 7,5 |
| DWEC: Mecanismos de manejo de eventos | 10% | 7,5 |
| DWEC: Modelo de objetos del documento | 10% | 7,5 |
| DWEC: Comunicación asíncrona | 10% | 10,0 |
| DWES: API REST | 20% | 5,0 |

**Nota 2i = (7,5×0,30) + (7,5×0,20) + (7,5×0,10) + (7,5×0,10) + (10×0,10) + (5×0,20) = 2,25 + 1,50 + 0,75 + 0,75 + 1,00 + 1,00 = 7,25**

---

### Criterio 3d) Procedimientos de actuación

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| DWEC: Sintaxis moderna del lenguaje | 10% | 7,5 |
| DWEC: Objetos predefinidos | 10% | 7,5 |
| DWEC: Mecanismos de manejo de eventos | 10% | 7,5 |
| DWEC: Modelo de objetos del documento | 10% | 7,5 |
| DWEC: Comunicación asíncrona | 10% | 10,0 |
| DWES: MVC | 20% | 5,0 |
| DWES: API REST | 20% | 5,0 |
| Despliegue: Implementación Docker | 10% | 10,0 |

**Nota 3d = (7,5×0,10) + (7,5×0,10) + (7,5×0,10) + (7,5×0,10) + (10×0,10) + (5×0,20) + (5×0,20) + (10×0,10) = 0,75 + 0,75 + 0,75 + 0,75 + 1,00 + 1,00 + 1,00 + 1,00 = 7,00**

---

### Criterio 3e) Riesgos y prevención

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| Despliegue: Arquitectura de la aplicación | 25% | 10,0 |
| Despliegue: Implementación Docker | 25% | 10,0 |
| Despliegue: Servidor de aplicaciones | 20% | 7,5 |
| Despliegue: Control de versiones + CI/CD | 10% | 10,0 |
| Despliegue: Documentación del despliegue | 10% | 10,0 |
| DWES: API REST | 10% | 5,0 |

**Nota 3e = (10×0,25) + (10×0,25) + (7,5×0,20) + (10×0,10) + (10×0,10) + (5×0,10) = 2,50 + 2,50 + 1,50 + 1,00 + 1,00 + 0,50 = 9,00**

---

### Criterio 3h) Documentación para la implementación

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| Despliegue: Documentación del despliegue | 40% | 10,0 |
| DWES: API REST | 20% | 5,0 |
| DWES: MVC | 10% | 5,0 |
| DWES: Modelo de Datos | 10% | 5,0 |
| DWEC: Objetos predefinidos | 20% | 7,5 |

**Nota 3h = (10×0,40) + (5×0,20) + (5×0,10) + (5×0,10) + (7,5×0,20) = 4,00 + 1,00 + 0,50 + 0,50 + 1,50 = 7,50**

---

### Criterio 4a) Procedimiento de evaluación

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| DWES: API REST | 30% | 5,0 |
| DWES: MVC | 10% | 5,0 |
| DWEC: Mecanismos de manejo de eventos | 10% | 7,5 |
| DWEC: Modelo de objetos del documento | 10% | 7,5 |
| DWEC: Comunicación asíncrona | 10% | 10,0 |
| DIW: Diseño responsive y accesibilidad (RA5, RA6) | 20% | 7,5 |
| Despliegue: Control de versiones + CI/CD | 10% | 10,0 |

**Nota 4a = (5×0,30) + (5×0,10) + (7,5×0,10) + (7,5×0,10) + (10×0,10) + (7,5×0,20) + (10×0,10) = 1,50 + 0,50 + 0,75 + 0,75 + 1,00 + 1,50 + 1,00 = 7,00**

---

### Criterio 4b) Indicadores de calidad

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| DIW: Diseño responsive y accesibilidad (RA5, RA6) | 25% | 7,5 |
| DIW: Usabilidad y experiencia de usuario (RA5, RA6) | 15% | 7,5 |
| DWEC: Comunicación asíncrona | 10% | 10,0 |
| DWEC: Mecanismos de manejo de eventos | 10% | 7,5 |
| DWEC: Modelo de objetos del documento | 10% | 7,5 |
| DWES: API REST | 20% | 5,0 |
| Despliegue: Control de versiones + CI/CD | 10% | 10,0 |

**Nota 4b = (7,5×0,25) + (7,5×0,15) + (10×0,10) + (7,5×0,10) + (7,5×0,10) + (5×0,20) + (10×0,10) = 1,875 + 1,125 + 1,00 + 0,75 + 0,75 + 1,00 + 1,00 = 7,50**

---

### Criterio 4c) Evaluación de incidencias

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| Despliegue: Servidor de aplicaciones | 20% | 7,5 |
| Despliegue: Implementación Docker | 20% | 10,0 |
| DWES: API REST | 20% | 5,0 |
| DWEC: Mecanismos de manejo de eventos | 10% | 7,5 |
| DWEC: Comunicación asíncrona | 10% | 10,0 |
| Despliegue: Documentación del despliegue | 20% | 10,0 |

**Nota 4c = (7,5×0,20) + (10×0,20) + (5×0,20) + (7,5×0,10) + (10×0,10) + (10×0,20) = 1,50 + 2,00 + 1,00 + 0,75 + 1,00 + 2,00 = 8,25**

---

### Criterio 4d) Gestión de cambios

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| DWES: MVC | 30% | 5,0 |
| DWEC: Sintaxis moderna del lenguaje | 10% | 7,5 |
| DWEC: Modelo de objetos del documento | 10% | 7,5 |
| DWEC: Comunicación asíncrona | 10% | 10,0 |
| Despliegue: Control de versiones + CI/CD | 20% | 10,0 |
| DIW: Guía de estilos y consistencia visual (RA1, RA2) | 20% | 10,0 |

**Nota 4d = (5×0,30) + (7,5×0,10) + (7,5×0,10) + (10×0,10) + (10×0,20) + (10×0,20) = 1,50 + 0,75 + 0,75 + 1,00 + 2,00 + 2,00 = 8,00**

---

### Criterio 4e) Documentación para la evaluación

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| Despliegue: Documentación del despliegue | 30% | 10,0 |
| DIW: Usabilidad y experiencia de usuario (RA5, RA6) | 20% | 7,5 |
| DWES: API REST | 25% | 5,0 |
| DWEC: Objetos predefinidos | 25% | 7,5 |

**Nota 4e = (10×0,30) + (7,5×0,20) + (5×0,25) + (7,5×0,25) = 3,00 + 1,50 + 1,25 + 1,875 = 7,63**

---

### Criterio 4f) Participación de usuarios

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| DIW: Usabilidad y experiencia de usuario (RA5, RA6) | 40% | 7,5 |
| DIW: Interactividad y multimedia (RA3, RA4) | 10% | 5,0 |
| DWEC: Mecanismos de manejo de eventos | 20% | 7,5 |
| DWEC: Modelo de objetos del documento | 10% | 7,5 |
| DWEC: Objetos predefinidos | 20% | 7,5 |

**Nota 4f = (7,5×0,40) + (5×0,10) + (7,5×0,20) + (7,5×0,10) + (7,5×0,20) = 3,00 + 0,50 + 1,50 + 0,75 + 1,50 = 7,25**

---

### Criterio 4g) Cumplimiento del pliego de condiciones

| Ítem de rúbrica | Peso | Nota |
|---|---|---|
| DIW: Guía de estilos y consistencia visual (RA1, RA2) | 20% | 10,0 |
| DWEC: Sintaxis moderna del lenguaje | 10% | 7,5 |
| DWEC: Modelo de objetos del documento | 10% | 7,5 |
| DWES: API REST | 30% | 5,0 |
| Despliegue: Control de versiones + CI/CD | 30% | 10,0 |

**Nota 4g = (10×0,20) + (7,5×0,10) + (7,5×0,10) + (5×0,30) + (10×0,30) = 2,00 + 0,75 + 0,75 + 1,50 + 3,00 = 8,00**

---

## Resumen de notas por criterio

| Criterio | Descripción | Nota (0–10) |
|---|---|---|
| **2h** | Documentación para el diseño | **8,25** |
| **2i** | Control de calidad | **7,25** |
| **3d** | Procedimientos de actuación | **7,00** |
| **3e** | Riesgos y prevención | **9,00** |
| **3h** | Documentación para la implementación | **7,50** |
| **4a** | Procedimiento de evaluación | **7,00** |
| **4b** | Indicadores de calidad | **7,50** |
| **4c** | Evaluación de incidencias | **8,25** |
| **4d** | Gestión de cambios | **8,00** |
| **4e** | Documentación para la evaluación | **7,63** |
| **4f** | Participación de usuarios | **7,25** |
| **4g** | Cumplimiento del pliego de condiciones | **8,00** |

---

## Nota media final

$$\text{Nota final} = \frac{8{,}25 + 7{,}25 + 7{,}00 + 9{,}00 + 7{,}50 + 7{,}00 + 7{,}50 + 8{,}25 + 8{,}00 + 7{,}63 + 7{,}25 + 8{,}00}{12} = \frac{91{,}63}{12} \approx \mathbf{7{,}64 / 10}$$

**Calificación: Notable (7,64)**

---

## Análisis de fortalezas y debilidades

### Fortalezas (lo que eleva la nota)

1. **Infraestructura y DevOps excepcional**: Despliegue Docker multi-stage, 7 servicios bien definidos, 3 workflows CI/CD completos (tests + lint + deploy). Es el punto más sólido del proyecto, alcanzando el máximo en casi todos los ítems de Despliegue.

2. **Sistema de estilos CSS/SCSS de nivel profesional**: Arquitectura 7-1 ITCSS, BEM, token system con dark/light, mixins reutilizables. Los ítems de DIW relacionados con preprocesadores y guía de estilos alcanzan el máximo.

3. **Comunicación asíncrona avanzada**: Inertia SPA + polling de estado + Laravel Echo/WebSockets + múltiples formatos de respuesta (JSON, ICS, PDF). El único ítem de DWEC que alcanza Excelente.

4. **Documentación técnica completa**: README exhaustivo con diagramas, curl examples, troubleshooting, junto a los 10 documentos de memoria.

### Debilidades (lo que limita la nota)

1. **Ausencia de roles/RBAC** *(impacto: −2 a −3 puntos en criterios que incluyen DWES)*: Es el mayor limitante. Los ítems DWES API REST y MVC no pueden superar "Suficiente" según la rúbrica por esta razón. Afecta a los criterios 2i, 3d, 3e, 3h, 4a, 4b, 4c, 4d, 4e, 4g.

2. **Modelo de datos simple**: Solo 2 entidades de dominio propias. Inevitable dada la naturaleza de la aplicación (datos en Moodle), pero penaliza el criterio DWES Modelo de Datos.

3. **Sin documentación formal de API** (OpenAPI/Swagger/Postman): El README tiene curl examples, pero no hay una colección exportable que cumpla el estándar de "documentación formal con peticiones de prueba".

4. **Ausencia de pruebas de rendimiento**: No hay evidencia de load testing documentado, lo que impide alcanzar el Excelente en Servidor de Aplicaciones.

5. **Comentarios de código insuficientes en TSX**: El código TypeScript está bien tipado pero no está comentado "en todo momento", limitando la nota de Sintaxis moderna a Bien en lugar de Excelente.

### Acciones concretas de mejora (por impacto descendente)

1. **[Alto impacto]** Añadir sistema de roles básico (admin/usuario) con `spatie/laravel-permission` o un guard simple. Desbloquearía API REST y MVC de Suficiente → Correcto (+2,5 puntos por ítem normalizados).

2. **[Alto impacto]** Generar colección Postman exportable (`postman_collection.json`) o un fichero `openapi.yaml`. Complementa la documentación existente y eleva la puntuación de API REST.

3. **[Medio impacto]** Ejecutar y documentar un test de carga básico (wrk/k6) en `docs/08-despliegue.md`. Desbloquearía Servidor de Aplicaciones de Bien → Excelente.

4. **[Medio impacto]** Añadir JSDoc a hooks personalizados y componentes principales. Desbloquearía DWEC Sintaxis moderna de Bien → Excelente.

5. **[Bajo impacto]** Ejecutar auditoría de accesibilidad (Lighthouse/axe) y documentar el resultado con porcentaje. Añadir ARIA attributes en componentes complejos (Dialog, Dropdown). Desbloquearía DIW Responsive/Accesibilidad de Muy Bueno → Excelente.
