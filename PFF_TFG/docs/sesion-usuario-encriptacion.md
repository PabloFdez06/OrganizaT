Mi aplicación gestiona dos capas de encriptado independientes:

1. Cookies de sesión de Laravel

Cuando un usuario se loguea en mi app, Laravel genera una cookie laravel_session. Esta cookie está encriptada automáticamente por el middleware encryptCookies, que aplica a todas las cookies excepto appearance y sidebar_state, que excluí explícitamente porque son preferencias de UI que no contienen datos sensibles.
El algoritmo que uso es AES-256-CBC con la APP_KEY como clave. Cada vez que el navegador manda la cookie, el middleware la desencripta, obtiene el session ID, y Laravel busca los datos de sesión en el almacén configurado.

2. Sesión de Moodle del usuario

Esta capa la gestiono yo. Cuando el usuario conecta su cuenta Moodle, mi servicio MoodleEphemeralSessionService serializa el payload de sesión (cookies de Moodle, sesskey, userid) a JSON y lo encripta con Crypt::encryptString(), que internamente usa la misma APP_KEY con AES-256-CBC.
Ese blob encriptado lo guardo en dos sitios según el contexto:

Caché con un TTL configurable (default 1800s) - para sesiones de usuario activo navegando.
Base de datos en la columna moodle_session_data de la tabla users, con TTL de 8 horas - para el modo de notificaciones en background, donde necesito mantener la sesión aunque el usuario no esté navegando.

Al restaurar la sesión, leo el blob, lo desencripto, parseo el JSON y reconstituyo la sesión de Moodle. Si el desencriptado falla por cualquier motivo, invalido la sesión automáticamente.

Todo trabaja entorno la APP_KEY. Si la roto, todas las sesiones Moodle persistidas en base de datos quedan inválidas y los usuarios tendrían que reconectar su cuenta, y además todas las cookies de sesión de la app caducan obligando a relogueo.