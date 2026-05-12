
# 2. Descripcion funcional

## Vision general del sistema
OrganizaT es una aplicacion web orientada a alumnado que centraliza informacion academica de Moodle en una interfaz propia. A nivel tecnico, el flujo principal se construye con Laravel (backend), Inertia (puente servidor-cliente) y React + TypeScript (frontend).

La aplicacion trabaja por secciones funcionales y cada seccion tiene su controlador, su estado asincrono y su pagina React:

1. Dashboard: vista de prioridad academica.
2. Asignaturas: estado global por materia.
3. Tareas: calendario, estado y exportacion ICS.
4. Calificaciones: notas y exportacion PDF.
5. Recursos: materiales por asignatura y unidad.

## Usuarios objetivo
El usuario objetivo principal es el estudiante que necesita:

1. Ver de forma rapida que entregar primero.
2. Tener seguimiento de progreso por asignatura.
3. Acceder a recursos sin perder tiempo navegando en profundidad.
4. Configurar notificaciones y seguridad de cuenta.

En la implementacion actual no he introducido roles multiples (por ejemplo, profesor o administrador con vistas separadas). El foco esta en experiencia de estudiante autenticado.

## Funcionalidades principales implementadas

### 2.1 Autenticacion y seguridad
He utilizado Laravel Fortify para:

1. Registro, login, recuperacion de contrasena y verificacion.
2. Doble factor (2FA) con estado pendiente y confirmado.
3. Actualizacion de contrasena en ruta protegida con throttle.

En seguridad tambien incluyo:

1. Preferencias de notificaciones.
2. Desconexion explicita de Moodle.
3. Eliminacion de cuenta desde configuracion.

### 2.2 Conexion Moodle
La conexion se hace desde endpoint dedicado y valida credenciales. Si el login CAS es correcto, guardo sesion temporal y limpio cache para reconstruir datos con la nueva conexion.

En caso de fallo de autenticacion o configuracion, devuelvo errores controlados (422 o mensajes de sesion).

### 2.3 Dashboard academico
El dashboard muestra:

1. Hero con la prioridad principal.
2. Tarjetas rapidas de asignaturas.
3. Timeline de entregas.
4. Matriz de Eisenhower con modo base y modo IA.

El modo IA se lanza de forma opcional y usa la API key introducida por el usuario en la sesion del dashboard.

### 2.4 Asignaturas
La seccion calcula por materia:

1. Progreso.
2. Tareas totales y pendientes.
3. Docente y metadatos.

Las tarjetas redirigen a tareas filtradas por asignatura para mantener continuidad de navegacion.

### 2.5 Tareas
La pagina de tareas incluye:

1. Normalizacion de estado (pendiente, entregada, calificada, vencida).
2. Agrupacion por fecha.
3. Vista de calendario y detalle por asignatura.
4. Exportacion global en formato ICS.

### 2.6 Calificaciones
La pagina de calificaciones incorpora:

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
2. Mensajeria Moodle.
3. Preferencias del usuario.

Ademas permite marcar como leidas y enviar correos en cola segun triggers configurados.

### 2.9 Gestion de incidencias 404
Cuando una ruta no existe, he implementado una pantalla dedicada con formulario de reporte. El backend valida datos, comprueba configuracion de correo y envia el incidente con mailable especifico.

## Experiencia de usuario (UI/UX)
La UX se basa en tres decisiones que he mantenido en todas las paginas:

1. Consistencia visual por layout, header y bloques de resumen.
2. Cargas asincronas con estados de espera y polling controlado.
3. Mensajes de error explicitando si hay problema de sesion Moodle o de recuperacion de datos.

Este enfoque evita pantallas vacias y reduce incertidumbre cuando Moodle no responde a la primera.

## Casos de uso principales

1. Conectar Moodle y cargar panel academico.
2. Revisar prioridad de tareas y planificar con matriz.
3. Entrar en asignatura y consultar entregas pendientes.
4. Exportar calendario ICS para uso externo.
5. Descargar informe PDF de notas para seguimiento.
6. Ajustar preferencias de notificaciones y enviar correo de prueba.
7. Reportar una incidencia si encuentro una ruta rota.

## Limites actuales

1. No hay roles avanzados ni politicas RBAC dedicadas.

2. La cobertura se valida por suite de tests y CI, pero no tengo aun informe porcentual automatizado.

3. En cuanto a la seguridad de las cookies de sesión, un administrador de la aplicacion podría tratar de acceder a las sesiones del usuario (si tiene malas intenciones), y si alguien ataca y consigue descifrarlas igual, lo que nos limita esto es que actualmente tendriamos que prescindir de las notificaciones. En un futuro se tratará de encontrar una alternativa migrando la lógica para no prescindir de ninguna funcionalidad y a su vez mantener la seguridad que nos gustaria para nuestros usuarios.

