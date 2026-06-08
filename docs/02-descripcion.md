
# 2. descripción funcional

## Visión general del sistema
OrganizaT es una aplicación web orientada a alumnado que centraliza información académica de Moodle en una interfaz propia. A nivel técnico, el flujo principal se construye con Laravel (backend), Inertia (puente servidor-cliente) y React + TypeScript (frontend).

La aplicación trabaja por secciones funcionales y cada sección tiene su controlador, su estado asíncrono y su página React:

1. Dashboard: vista de prioridad académica.
2. Asignaturas: estado global por materia.
3. Tareas: calendario, estado y exportación ICS.
4. Calificaciones: notas y exportación PDF.
5. Recursos: materiales por asignatura y unidad.

## Usuarios objetivo
El usuario objetivo principal es el estudiante que necesita:

1. Ver de forma rápida que entregar primero.
2. Tener seguimiento de progreso por asignatura.
3. Acceder a recursos sin perder tiempo navegando en profundidad.
4. Configurar notificaciones y seguridad de cuenta.

En la implementación actual no he introducido roles múltiples (por ejemplo, profesor o administrador con vistas separadas). El foco esta en experiencia de estudiante autenticado.

## Funcionalidades principales implementadas

### 2.1 Autenticación y seguridad
He utilizado Laravel Fortify para:

1. Registro, login, recuperacion de contraseña y verificación.
2. Doble factor (2FA) con estado pendiente y confirmado.
3. Actualizacion de contraseña en ruta protegida con throttle.

En seguridad también incluyo:

1. Preferencias de notificaciones.
2. Desconexión explícita de Moodle.
3. Eliminación de cuenta desde configuración.

### 2.2 conexión Moodle
La conexión se hace desde endpoint dedicado y valida credenciales. Si el login CAS es correcto, guardo sesión temporal y limpio cache para reconstruir datos con la nueva conexión.

En caso de fallo de autenticación o configuración, devuelvo errores controlados (422 o mensajes de sesión).

### 2.3 Dashboard académico
El dashboard muestra:

1. Hero con la prioridad principal.
2. Tarjetas rápidas de asignaturas.
3. Timeline de entregas.
4. Matriz de Eisenhower con modo base y modo IA.

El modo IA se lanza de forma opcional y usa la API key introducida por el usuario en la sesión del dashboard.

### 2.4 Asignaturas
La sección calcula por materia:

1. Progreso.
2. Tareas totales y pendientes.
3. Docente y metadatos.

Las tarjetas redirigen a tareas filtradas por asignatura para mantener continuidad de navegación.

### 2.5 Tareas
La página de tareas incluye:

1. Normalización de estado (pendiente, entregada, calificada, vencida).
2. Agrupación por fecha.
3. Vista de calendario y detalle por asignatura.
4. Exportación global en formato ICS.

### 2.6 Calificaciones
La página de calificaciones incorpora:

1. Tarjetas por asignatura y unidades.
2. Parseo de nota numerica para metricas agregadas.
3. Hitos proximos y recientes.
4. Descarga de informe PDF general o por asignatura.

### 2.7 Recursos
Recursos permite:

1. Navegar por asignatura.
2. Clasificar por tipo (documentos, multimedia, enlaces, etc.).
3. Filtrar por bucket de metadatos.
4. Resolver URLs de acceso mediante servicio de proxy/redirect para enlaces Moodle.

### 2.8 Notificaciones
El sistema de notificaciones construye items en base a:

1. Cambios y vencimientos de tareas.
2. Mensajería Moodle.
3. Preferencias del usuario.

además permite marcar como leídas y enviar correos en cola según triggers configurados.

### 2.9 gestión de incidencias 404
Cuando una ruta no existe, he implementado una pantalla dedicada con formulario de reporte. El backend valida datos, comprueba configuración de correo y envia el incidente con mailable específico.

## Experiencia de usuario (UI/UX)
La UX se basa en tres decisiones que he mantenido en todas las páginas:

1. Consistencia visual por layout, header y bloques de resumen.
2. Cargas asincronas con estados de espera y polling controlado.
3. Mensajes de error explicitando si hay problema de sesión Moodle o de recuperacion de datos.

Este enfoque evita pantallas vacias y reduce incertidumbre cuando Moodle no responde a la primera.

## Casos de uso principales

1. Conectar Moodle y cargar panel académico.
2. Revisar prioridad de tareas y planificar con matriz.
3. Entrar en asignatura y consultar entregas pendientes.
4. Exportar calendario ICS para uso externo.
5. Descargar informe PDF de notas para seguimiento.
6. Ajustar preferencias de notificaciones y enviar correo de prueba.
7. Reportar una incidencia si encuentro una ruta rota.

## Límites actuales

1. No hay roles avanzados ni políticas RBAC dedicadas.

2. La cobertura se valida por suite de tests y CI, pero no tengo aún informe porcentual automatizado.

3. En cuanto a la seguridad de las cookies de sesión, un administrador de la aplicación podría tratar de acceder a las sesiones del usuario (si tiene malas intenciones), y si alguien ataca y consigue descifrarlas igual, lo que nos limita esto es que actualmente tendríamos que prescindir de las notificaciones. En un futuro se tratará de encontrar una alternativa migrando la lógica para no prescindir de ninguna funcionalidad y a su vez mantener la seguridad que nos gustaría para nuestros usuarios.



