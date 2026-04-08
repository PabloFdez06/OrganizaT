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
