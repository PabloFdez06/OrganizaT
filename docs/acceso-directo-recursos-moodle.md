# Acceso directo a enlaces Moodle (sin login manual)

## Contexto
Detecte que el problema no era solo en recursos. Tambien pasaba en enlaces de tareas, hitos de calificaciones, timeline del dashboard, matriz Eisenhower y notificaciones.

El patron era el mismo: el enlace abria Moodle directamente y, si no habia sesion Moodle en ese navegador, pedia login manual.

## Objetivo
Mi objetivo fue unificar el comportamiento para todos los enlaces Moodle: que cualquier clic desde mi app llegue al destino sin pedir login manual en la web de Moodle, siempre que exista una sesion Moodle valida gestionada por mi backend.

## Que he implementado

### 1) Capa comun de acceso URL Moodle
Refactorice la logica en un servicio unico: `MoodleAccessUrlService`.

Este servicio hace tres cosas:
1. Normaliza una URL (absoluta, relativa o por modulo) a formato consistente.
2. Valida si el host destino pertenece al conjunto permitido de Moodle/CAS.
3. Si aplica, transforma la URL a ruta interna `moodle.media?url=...`.

Con esto evite duplicar reglas en cada controlador.

### 2) Aplicacion global en backend
Conecte la misma logica en los puntos donde genero links para UI o exportaciones:
1. `RecursosController` (apertura y descargas).
2. `TareasController` (tareas y calendario visual).
3. `DashboardController` (hero, timeline y matriz).
4. `CalificacionesController` (hitos y links de tareas relacionadas).
5. `MoodleNotificationCenter` (campana y notificaciones).
6. `AcademicCalendarExportService` (URLs en eventos `.ics`).

Resultado: todos esos enlaces salen ya preparados para acceso mediado por mi app.

### 3) Fallback automatico de sesion en apertura
Ademas, en `MoodleMediaController` añadi fallback:
1. Primero intenta sesion efimera activa (cache).
2. Si no existe, intenta restaurar sesion persistida cifrada de base de datos.
3. Si restaura correctamente, rehidrata la sesion efimera para siguientes peticiones.

Esto reduce mucho casos de reconexion innecesaria.

## Por que este enfoque
Lo elegi porque me permite equilibrio entre UX y seguridad:
1. UX: el usuario no depende de tener Moodle abierta en el navegador.
2. Mantenibilidad: una regla central, no logica repetida en varios sitios.
3. Seguridad: no abro redirecciones libres, solo hosts Moodle/CAS permitidos.

## Beneficios concretos

### Para usuario
1. Clic directo mas consistente en cualquier seccion de la app.
2. Menos friccion y menos "Moodle me pide login otra vez".
3. Experiencia uniforme entre recursos, tareas, dashboard, calificaciones y notificaciones.

### Para sistema
1. Reutilizacion de sesion Moodle gestionada por backend.
2. Control central de destinos permitidos.
3. Menos deuda tecnica al no mantener multiples implementaciones de enlace.

## Antes vs ahora

### Antes
1. Cada seccion manejaba enlaces Moodle de forma independiente.
2. Muchos enlaces iban directos a Moodle.
3. Si el navegador no tenia sesion Moodle, aparecia login manual.

### Ahora
1. Uso una capa comun para convertir enlaces Moodle a acceso interno seguro.
2. La app intenta reusar sesion activa y, si hace falta, restaurar la persistida.
3. El usuario llega al contenido con mucha menos friccion.

## Limite esperado
Si no existe ninguna sesion Moodle valida (ni efimera ni persistida), no puedo abrir el contenido externo autenticado y se requerira reconexion desde la app. Ese comportamiento es el esperado por seguridad.

## Resumen
Con esta refactorizacion pase de una solucion puntual en recursos a una estrategia global de acceso Moodle. Ahora el comportamiento es consistente en toda la app, mejora la experiencia y mantiene control de seguridad en los destinos y en la restauracion de sesion.
