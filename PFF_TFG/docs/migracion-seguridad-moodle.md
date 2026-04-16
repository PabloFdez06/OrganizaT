# Migración de seguridad de Moodle

## Qué problema teníamos
Antes guardaba en base de datos el usuario de Moodle y también la contraseña (cifrada). Aunque estuviera cifrada, seguía siendo una contraseña persistida en el sistema, y eso no era el nivel de seguridad que buscaba.

## Qué he cambiado
He migrado el sistema para que la contraseña de Moodle no se guarde de forma persistente.

Ahora el flujo es así:
1. El usuario introduce sus credenciales y se validan contra CAS, igual que antes.
2. Si son válidas, creo una sesión temporal segura de Moodle en cache.
3. Las llamadas a asignaturas, tareas, calificaciones y media usan esa sesión temporal.
4. Al desconectar o caducar la sesión, se invalida y toca reconectar.

Además, he limpiado el uso de `moodle_password` en runtime y he añadido migración para eliminar ese campo del esquema cuando existe en instalaciones previas.

## Qué se mantiene igual
- La funcionalidad del producto no cambia: conectar, ver dashboard, asignaturas, tareas, calificaciones, preferencias y descargar recursos sigue funcionando.
- Las rutas y el flujo general para el usuario se mantienen.

## Qué mejora de seguridad consigo
- Ya no hay contraseñas Moodle persistidas en base de datos.
- Se reduce de forma importante el riesgo de exposición masiva de credenciales almacenadas.
- El estado de conexión depende de sesión temporal y no de una contraseña guardada.

## Límite a tener en cuenta
Este cambio mejora mucho la seguridad, pero lógicamente no significa riesgo cero. Aun así, el salto de seguridad frente al sistema que usaba anteriormente bastante claro y notable.

## Cómo funciona ahora la sesión del usuario
Para dejar claro el comportamiento real después de la migración:

- Cuando conecto Moodle, valido primero contra CAS.
- Si la validación es correcta, creo una sesión temporal segura en cache (no guardo la contraseña en base de datos).
- Mientras la sesión esté activa, la aplicación reutiliza esa sesión para cargar asignaturas, tareas, calificaciones y recursos.

La sesión tiene dos límites:

- Duración por inactividad (renovable con uso): 30 minutos por defecto.
- Duración máxima absoluta: 8 horas por defecto.

La sesión se cierra o se invalida en estos casos:

- Si el usuario está inactivo más del tiempo permitido.
- Si se supera el tiempo máximo absoluto de la sesión.
- Si el usuario pulsa "Cerrar sesión" de Moodle dentro de la aplicación.
- Si la sesión remota de Moodle/CAS caduca y deja de ser válida.
- Si se limpia la cache del servidor o se detecta que el payload de sesión es inválido.

En todos esos casos, el comportamiento esperado es pedir reconexión de Moodle. Con esto mantengo la funcionalidad y reduzco de forma importante el riesgo de exposición de credenciales persistidas.

## V2: scraping asíncrono y sesión técnica consentida

En esta segunda fase se ha completado la migración para evitar bloqueos en navegación y permitir comprobaciones automáticas seguras.

### Objetivo de la V2

La V2 busca equilibrar tres necesidades que antes entraban en conflicto:

- Seguridad: no persistir contraseñas Moodle y limitar exposición de secretos.
- UX: evitar pantallas bloqueadas por scraping síncrono.
- Operación: permitir comprobaciones automáticas de nuevas tareas cuando el usuario lo autoriza.

### Qué hacemos con las credenciales de Moodle

En V2 la contraseña Moodle no se persiste en base de datos, ni se reutiliza como secreto de larga duración.

Flujo real de credenciales:

1. El usuario introduce usuario y contraseña en el formulario de conexión.
2. El backend valida contra CAS/Moodle.
3. Si la autenticación es correcta, el sistema obtiene una sesión técnica de Moodle (cookies/sesskey).
4. La contraseña deja de tener utilidad en runtime y no se guarda como dato persistente.

En otras palabras: autenticamos con contraseña, pero operamos después con sesión técnica temporal.

### Persistencia de sesión del usuario en V2

En V2 existen dos niveles de sesión, con responsabilidades distintas.

1. Sesión efímera en cache (navegación normal):
- Se usa para cargar dashboard/asignaturas/tareas/calificaciones/recursos.
- TTL por inactividad y TTL absoluto.
- Se invalida en logout, expiración, error de sesión remota o payload inválido.

2. Sesión técnica cifrada en base de datos (solo con consentimiento):
- Campos añadidos en `users`:
	- `moodle_session_data`
	- `moodle_session_expires_at`
	- `moodle_background_notifications`
- `moodle_session_data` se almacena cifrada.
- Nunca guarda contraseña Moodle, solo datos mínimos para reanudar sesión técnica.
- Se usa exclusivamente para comprobaciones de fondo (background notifications).

Control del usuario:

- El toggle de "Notificaciones de Moodle en segundo plano" decide si esta persistencia está permitida.
- Si el usuario desactiva el toggle, se elimina inmediatamente la sesión técnica persistida.

### Scraping asíncrono por secciones

Para evitar bloqueo de navegación en páginas académicas:

- `dashboard`, `asignaturas`, `tareas`, `calificaciones` y `recursos` ya no dependen del scraping síncrono en la request principal.
- Cada sección usa estado asíncrono (`idle`, `pending`, `done`, `error`) en cache.
- Al entrar en la página, se encola job de sección y la UI muestra `loading`/skeleton.
- Se añadieron endpoints de estado `/status` para polling de progreso.

Beneficio directo: menor tiempo percibido de carga inicial y menos timeouts en navegación.

### Qué hacemos con los emails en V2

En V2 el envío de email se desacopla del request web y pasa a cola:

- `MoodleNotificationCenter` detecta eventos notificables.
- El envío real se delega a `SendMoodleNotificationEmailJob`.
- El job aplica reintentos y control de duplicados para evitar múltiples envíos del mismo aviso.

Importante:

- El pipeline de email no usa ni requiere la contraseña Moodle.
- Solo procesa eventos/metadata de tareas y preferencias del usuario.

### Ejecución automática en background

- Comando: `php artisan moodle:check-notifications`
- Scheduler: ejecución cada hora.
- Se encola `CheckUserMoodleNotificationsJob` solo para usuarios elegibles:
	- Consentimiento activo (`moodle_background_notifications = true`)
	- Sesión técnica persistida válida y no expirada.

### Por qué mejora (beneficios concretos)

Beneficios de seguridad:

- Eliminamos el almacenamiento persistente de contraseña Moodle.
- Reducimos superficie de exposición de credenciales reutilizables.
- El usuario mantiene control explícito de la persistencia técnica para background.

Beneficios de producto y operación:

- Páginas académicas más fluidas al no bloquear en scraping síncrono.
- Menor riesgo de timeouts en requests de usuario.
- Pipeline de notificaciones por cola más resiliente y trazable.

### Limitaciones y decisiones conscientes

- La sesión técnica persistida implica custodiar un secreto de sesión (cifrado y con expiración), aunque no sea una contraseña.
- Por eso se condiciona por consentimiento y se borra al desactivar la opción.
- Si la sesión remota caduca o falla validación, se invalida y se requiere reconexión.

### Cobertura de tests añadida

- `tests/Feature/Moodle/MoodleAcademicServiceTest.php`
- `tests/Feature/Moodle/BackgroundNotificationsTest.php`
- `tests/Unit/Moodle/MoodleEphemeralSessionServiceTest.php`

Con esta V2 mantenemos el objetivo de seguridad (sin contraseña Moodle persistida), mejoramos la experiencia en navegación y habilitamos notificaciones en segundo plano bajo control explícito del usuario.
