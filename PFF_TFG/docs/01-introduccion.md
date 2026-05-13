# 1. Introducción, objetivos y antecedentes

## Origen de la idea y motivacion
Este proyecto nace de un problema que yo mismo he vivido durante el curso: tengo la información académica repartida en Moodle, correo y recordatorios personales, y eso me obliga a cambiar de contexto constantemente para saber que tengo pendiente. La idea de OrganizaT es concentrar en una sola interfaz lo que más necesito para el día a día: tareas, calificaciones, recursos, avisos y prioridades.

He planteado el proyecto como una aplicación web full stack construida sobre Laravel + Inertia + React + TypeScript, con integración real contra Moodle mediante CAS y con cache para no castigar la experiencia de usuario en cada carga.

## Objetivos del proyecto
Los objetivos que me marque al iniciar el desarrollo fueron estos:

1. Integrar Moodle sin replicar credenciales de forma insegura.
2. Mostrar información académica clave por secciones (dashboard, asignaturas, tareas, calificaciones y recursos).
3. Priorizar tareas abiertas con una matriz de Eisenhower (lógica y modo IA opcional).
4. Permitir exportaciones útiles para el estudiante: calendario ICS de tareas y PDF de calificaciones.
5. Mantener una arquitectura desplegable y mantenible con Docker Compose y CI/CD.

## Resultado frente a objetivos
Durante el desarrollo he conseguido cubrir esos objetivos con implementaciones reales en el código:

1. integración Moodle con sesión temporal cifrada y restauracion controlada para notificaciones en segundo plano.
2. Navegación académica completa en rutas protegidas y render Inertia por cada sección.
3. Matriz de Eisenhower con dos estrategias: reglas locales y análisis IA.
4. Exportaciones funcionales en rutas reales de la aplicación.
5. Pipeline de calidad y despliegue en GitHub Actions con publicación de imagenes en GHCR.

## Antecedentes y comparativa breve
Mi referencia principal ha sido el uso directo de Moodle, que cubre la parte institucional pero no siempre prioriza la organización personal. En mi implementación he orientado la UX a decisiones rápidas:

1. En vez de navegar curso por curso, tengo vistas resumidas por objetivo (entregas, notas, recursos).
2. En vez de depender solo del listado cronologico, tengo clasificacion por prioridad.
3. En vez de gestionar todo manualmente, tengo avisos en app y por correo con reglas configurables.

No he buscado sustituir Moodle, sino crear una capa de organización académica encima de su información real.

## Alcance real de esta memoria
En esta documentación solo describo funcionalidades implementadas y verificables en el repositorio. Cualquier limitacion actual (por ejemplo, ausencia de cobertura porcentual formal o falta de OpenAPI dedicado) la indico de forma explícita para mantener rigor técnico y académico.
