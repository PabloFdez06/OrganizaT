# 1. Introduccion, objetivos y antecedentes

## Origen de la idea y motivacion
Este proyecto nace de un problema que yo mismo he vivido durante el curso: tengo la informacion academica repartida en Moodle, correo y recordatorios personales, y eso me obliga a cambiar de contexto constantemente para saber que tengo pendiente. La idea de OrganizaT es concentrar en una sola interfaz lo que mas necesito para el dia a dia: tareas, calificaciones, recursos, avisos y prioridades.

He planteado el proyecto como una aplicacion web full stack construida sobre Laravel + Inertia + React + TypeScript, con integracion real contra Moodle mediante CAS y con cache para no castigar la experiencia de usuario en cada carga.

## Objetivos del proyecto
Los objetivos que me marque al iniciar el desarrollo fueron estos:

1. Integrar Moodle sin replicar credenciales de forma insegura.
2. Mostrar informacion academica clave por secciones (dashboard, asignaturas, tareas, calificaciones y recursos).
3. Priorizar tareas abiertas con una matriz de Eisenhower (logica y modo IA opcional).
4. Permitir exportaciones utiles para el estudiante: calendario ICS de tareas y PDF de calificaciones.
5. Mantener una arquitectura desplegable y mantenible con Docker Compose y CI/CD.

## Resultado frente a objetivos
Durante el desarrollo he conseguido cubrir esos objetivos con implementaciones reales en el codigo:

1. Integracion Moodle con sesion temporal cifrada y restauracion controlada para notificaciones en segundo plano.
2. Navegacion academica completa en rutas protegidas y render Inertia por cada seccion.
3. Matriz de Eisenhower con dos estrategias: reglas locales y analisis IA.
4. Exportaciones funcionales en rutas reales de la aplicacion.
5. Pipeline de calidad y despliegue en GitHub Actions con publicacion de imagenes en GHCR.

## Antecedentes y comparativa breve
Mi referencia principal ha sido el uso directo de Moodle, que cubre la parte institucional pero no siempre prioriza la organizacion personal. En mi implementacion he orientado la UX a decisiones rapidas:

1. En vez de navegar curso por curso, tengo vistas resumidas por objetivo (entregas, notas, recursos).
2. En vez de depender solo del listado cronologico, tengo clasificacion por prioridad.
3. En vez de gestionar todo manualmente, tengo avisos en app y por correo con reglas configurables.

No he buscado sustituir Moodle, sino crear una capa de organizacion academica encima de su informacion real.

## Alcance real de esta memoria
En esta documentacion solo describo funcionalidades implementadas y verificables en el repositorio. Cualquier limitacion actual (por ejemplo, ausencia de cobertura porcentual formal o falta de OpenAPI dedicado) la indico de forma explicita para mantener rigor tecnico y academico.