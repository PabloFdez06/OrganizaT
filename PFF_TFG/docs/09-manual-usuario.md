
# 9. Manual de usuario

## 9.1 Objetivo del manual
En este manual explico como uso la aplicacion de principio a fin, con los flujos realmente implementados en la version actual.

## 9.2 Acceso inicial

### Registro o inicio de sesion

1. Entro a la pagina principal.
2. Si no tengo cuenta, me registro.
3. Si ya tengo cuenta, inicio sesion.
4. Si lo necesito, recupero contrasena desde el flujo de auth.

Tras autenticarme, entro al panel protegido.

## 9.3 Conexion con Moodle
Para activar datos academicos:

1. Voy a Ajustes > Seguridad.
2. Introduzco usuario y contrasena Moodle en el formulario de conexion.
3. Si la conexion es correcta, el sistema guarda sesion temporal y limpia cache previa.

Si la sesion Moodle caduca, vere un aviso indicando que debo reconectar.

## 9.4 Navegacion principal
Desde el header principal puedo moverme entre:

1. Dashboard.
2. Asignaturas.
3. Calificaciones.
4. Tareas.
5. Recursos.

Tambien tengo panel de notificaciones y acceso rapido a configuracion.

## 9.5 Uso del Dashboard
En Dashboard consulto:

1. Prioridad principal (hero).
2. Timeline de tareas.
3. Tarjetas rapidas por asignatura.
4. Matriz de Eisenhower.

Puedo usar matriz en modo logico o modo IA (si tengo API key configurada).

## 9.6 Uso de Asignaturas
En Asignaturas veo tarjetas con:

1. Nombre de la materia.
2. Docente.
3. Progreso.
4. Tareas pendientes.

Al pulsar una tarjeta me lleva a Tareas filtrada por esa asignatura.

## 9.7 Uso de Tareas
En Tareas tengo:

1. Vista por calendario.
2. Estado de cada tarea (pendiente, entregada, calificada o vencida).
3. Detalle por unidad.

### Exportar calendario
Puedo descargar un archivo ICS con todas mis tareas desde la accion de exportacion.

## 9.8 Uso de Calificaciones
En Calificaciones consulto:

1. Resumen global de notas.
2. Detalle por asignatura y unidad.
3. Hitos y seguimiento.

### Descargar informe PDF
Puedo descargar informe completo o filtrado por asignatura en formato PDF.

## 9.9 Uso de Recursos
En Recursos:

1. Selecciono asignatura.
2. Filtro por tipo de recurso.
3. Abro o descargo materiales.

El sistema resuelve accesos Moodle mediante rutas seguras de media/redirect para minimizar incidencias de sesion.

## 9.10 Notificaciones y preferencias

### Notificaciones en app

1. Veo contador de pendientes en el icono del header.
2. Puedo abrir listado y marcar como leidas.

### Preferencias
Desde Seguridad configuro:

1. Recordatorios por ventana temporal.
2. Canales (email activo y flag de push disponible en preferencias).
3. Notificaciones en background.
4. Envio de correo de prueba.

## 9.11 Seguridad de cuenta
En Ajustes > Seguridad puedo:

1. Cambiar contrasena.
2. Activar o confirmar doble factor.
3. Desconectar Moodle.
4. Eliminar cuenta.

## 9.12 Reporte de errores 404
Si accedo a una ruta inexistente:

1. Se muestra pagina 404 con acciones de recuperacion.
2. Puedo enviar un formulario de incidencia con nombre, email y descripcion.
3. El sistema intenta enviar el reporte por correo de soporte.

## 9.13 Mensajes habituales y resolucion

### Caso: no aparecen datos academicos

1. Verifico que Moodle esta conectado.
2. Si hay mensaje de sesion caducada, reconecto cuenta.

### Caso: no se envia correo de prueba

1. Reviso configuracion de mailer y credenciales.
2. Compruebo estado de cola worker.

### Caso: exportaciones fallan

1. Verifico sesion Moodle activa.
2. Reintento tras refrescar datos.

## 9.14 Recomendaciones de uso

1. Mantener preferencias de notificaciones ajustadas al ritmo academico.
2. Revisar dashboard al inicio del dia para priorizar.
3. Exportar calendario cuando necesite integrar tareas en agenda externa.
4. Usar PDF de calificaciones para seguimiento periodico.
5. Permitir persistencia de Cookies para notificaciones en segundo plano.
6. Activar verificación en 2 pasos para mayor seguridad, sobre todo si activas la persistencia de cookies.


