
# 7. Pruebas

## 7.1 Metodologia de pruebas aplicada
He aplicado una estrategia mixta:

1. Pruebas automatizadas backend con Pest/PHPUnit.
2. Configuracion de pruebas frontend con Vitest (base preparada).
3. Validacion continua en CI con GitHub Actions.
4. Pruebas manuales funcionales en las rutas principales durante desarrollo y despliegue beta.

No he seguido TDD estricto desde el inicio, pero si he mantenido pruebas en bloques funcionales criticos para evitar regresiones en autenticacion, seguridad, Moodle y exportaciones.

## 7.2 Tipos de pruebas realizadas

### Unitarias
He implementado pruebas unitarias para componentes de logica y parsing, por ejemplo:

1. CasLoginParser.
2. AssignmentsParser.
3. GradesParser.
4. MoodleEphemeralSessionService.

### Feature
He cubierto escenarios de aplicacion completos en:

1. Auth (registro, login, verificacion, 2FA, password).
2. Dashboard (acceso y estado autenticado).
3. Settings/Security (render de estado 2FA y cambio de password).
4. Moodle (conexion y preferencias).
5. Tareas (exportacion de calendario ICS).

### Frontend (estado actual)
Tengo Vitest configurado y listo para ejecutar, pero en esta fase la cobertura frontend automatizada es limitada. Esto lo considero una linea de mejora clara para siguiente iteracion.

## 7.3 Inventario real de suite
Actualmente cuento con 25 ficheros PHP en tests, entre bootstrap y pruebas.

Distribucion aproximada:

1. Feature: 18 archivos.
2. Unit: 5 archivos.
3. Base de tests: Pest.php y TestCase.php.

## 7.4 Casos representativos

### Exportacion ICS de tareas
Valido que un usuario autenticado con Moodle conectado descarga calendario valido y que tareas sin fecha no se incluyen.

### Seguridad 2FA
Valido estados de 2FA:

1. Sin activar.
2. Pendiente de confirmacion.
3. Confirmado.

### Conexion Moodle
Valido conexion correcta y persistencia de datos de conexion para el usuario.

### Sesion Moodle en background
Valido persistencia/restauracion cifrada e invalidacion al desactivar consentimiento de notificaciones en background.

## 7.5 Ejecucion de pruebas

### Local

```bash
./vendor/bin/pest
npm run test
```

### Pipeline CI
En tests.yml ejecuto:

1. Matrix PHP 8.4 y 8.5.
2. Instalacion dependencias PHP y Node.
3. Copia de .env.example y generacion de APP_KEY.
4. Build frontend (npm run build).
5. Ejecucion de suite backend con Pest.

## 7.6 Resultados y estado actual
El proyecto tiene pipeline automatizada de validacion y una base de tests real en backend. Las areas mas criticas del negocio academico (acceso, seguridad, exportaciones y sesion Moodle) tienen pruebas especificas.

## 7.7 Cobertura de codigo
Punto importante: aunque en CI se habilita xdebug en workflow de tests, actualmente no estoy publicando un informe porcentual formal de cobertura (HTML/Clover/Codecov). Esto significa que la cobertura existe como capacidad tecnica, pero no esta explotada como metrica reportada en esta entrega.

## 7.8 Riesgos detectados y mejoras previstas

1. Aumentar pruebas frontend sobre componentes y hooks.
2. Publicar reporte de cobertura con umbral minimo.
3. Añadir pruebas de integracion mas profundas para flujos Moodle completos.
4. Añadir pruebas de rendimiento ligero sobre endpoints de estado asincrono.

## 7.9 Conclusiones de calidad
Con la suite actual he conseguido una base de control de calidad estable para evitar regresiones graves en las funcionalidades principales. Para una siguiente version, mi prioridad es reforzar frontend y cobertura cuantitativa reportada para subir madurez de testing. Pero actualmente he de indicar que tengo una "base" bastante solida y que tras cada despliegue, hay una verificación exhaustiva de que todo funciona como deberia.


