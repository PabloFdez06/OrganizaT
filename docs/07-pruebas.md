
# 7. Pruebas

## 7.1 Metodologia de pruebas aplicada
He aplicado una estrategia mixta:

1. Pruebas automatizadas backend con Pest/PHPUnit.
2. Configuración de pruebas frontend con Vitest (base preparada).
3. Validación continua en CI con GitHub Actions.
4. Pruebas manuales funcionales en las rutas principales durante desarrollo y despliegue beta.

No he seguido TDD estricto desde el inicio, pero si he mantenido pruebas en bloques funcionales críticos para evitar regresiones en autenticación, seguridad, Moodle y exportaciones.

## 7.2 Tipos de pruebas realizadas

### Unitarias
He implementado pruebas unitarias para componentes de lógica y parsing, por ejemplo:

1. CasLoginParser.
2. AssignmentsParser.
3. GradesParser.
4. MoodleEphemeralSessionService.

### Feature
He cubierto escenarios de aplicación completos en:

1. Auth (registro, login, verificación, 2FA, password).
2. Dashboard (acceso y estado autenticado).
3. Settings/Security (render de estado 2FA y cambio de password).
4. Moodle (conexión y preferencias).
5. Tareas (exportación de calendario ICS).

### Frontend (estado actual)
Tengo Vitest configurado y listo para ejecutar, pero en esta fase la cobertura frontend automatizada es limitada. Esto lo considero una línea de mejora clara para siguiente iteración.

## 7.3 Inventario real de suite
Actualmente cuento con 25 ficheros PHP en tests, entre bootstrap y pruebas.

Distribucion aproximada:

1. Feature: 18 archivos.
2. Unit: 5 archivos.
3. Base de tests: Pest.php y TestCase.php.

## 7.4 Casos representativos

### Exportación ICS de tareas
Valido que un usuario autenticado con Moodle conectado descarga calendario valido y que tareas sin fecha no se incluyen.

### Seguridad 2FA
Valido estados de 2FA:

1. Sin activar.
2. Pendiente de confirmacion.
3. Confirmado.

### conexión Moodle
Valido conexión correcta y persistencia de datos de conexión para el usuario.

### Sesión Moodle en background
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
2. Instalación dependencias PHP y Node.
3. Copia de .env.example y generacion de APP_KEY.
4. Build frontend (npm run build).
5. Ejecucion de suite backend con Pest.

## 7.6 Resultados y estado actual
El proyecto tiene pipeline automatizada de validación y una base de tests real en backend. Las areas más criticas del negocio académico (acceso, seguridad, exportaciones y sesión Moodle) tienen pruebas especificas.

## 7.7 Cobertura de código
Punto importante: aunque en CI se habilita xdebug en workflow de tests, actualmente no estoy publicando un informe porcentual formal de cobertura (HTML/Clover/Codecov). Esto significa que la cobertura existe como capacidad técnica, pero no esta explotada como metrica reportada en esta entrega.

## 7.8 Riesgos detectados y mejoras previstas

1. Aumentar pruebas frontend sobre componentes y hooks.
2. Publicar reporte de cobertura con umbral minimo.
3. Añadir pruebas de integración más profundas para flujos Moodle completos.
4. Añadir pruebas de rendimiento ligero sobre endpoints de estado asíncrono.

## 7.9 Conclusiones de calidad
Con la suite actual he conseguido una base de control de calidad estable para evitar regresiones graves en las funcionalidades principales. Para una siguiente versión, mi prioridad es reforzar frontend y cobertura cuantitativa reportada para subir madurez de testing. Pero actualmente he de indicar que tengo una "base" bastante solida y que tras cada despliegue, hay una verificación exhaustiva de que todo funciona como deberia.

## 7.10 Prueba de rendimiento y carga ligera

Además de las pruebas funcionales, he incluido un script de carga ligera con Apache Bench (`ab`) para validar el comportamiento del servidor de aplicaciones bajo concurrencia real.

### Herramienta y script

El script `scripts/ops/load-test.sh` encapsula tres escenarios de prueba:

```bash
bash scripts/ops/load-test.sh https://organizat.blete.tech
```

Los escenarios cubren:

1. Endpoint `/up` (200 peticiones, concurrencia 20) — capacidad bruta del stack.
2. Página principal `/` (100 peticiones, concurrencia 10) — render Inertia completo.
3. Documentación `/docs/api` (50 peticiones, concurrencia 5) — serialización OpenAPI.

### Resultados obtenidos

| Endpoint | Req/s | p95 (ms) | Errores |
|---|---|---|---|
| `/up` | 144 | 193 | 0 |
| `/` | 29 | 467 | 0 |
| `/docs/api` | 13 | 481 | 0 |

### Interpretación

- **Sin errores en ningún escenario**: el pool PHP-FPM dinámico (`pm = dynamic`, `max_children = 10`) absorbe la concurrencia sin saturarse.
- **`/up` a 144 req/s**: coherente con OPcache activo y mínima lógica PHP ejecutada. Demuestra que el stack nginx → PHP-FPM está operativo y con capacidad de respuesta.
- **`/` a 29 req/s**: tiempo esperado para un render Inertia completo con serialización de datos. Aceptable para uso beta individual y demostraciones.
- **`/docs/api` a 13 req/s**: Scramble genera el JSON del spec en cada petición; el throughput más bajo es consecuencia directa del tamaño del spec, no de saturación del servidor.

La configuración de PHP-FPM y los resultados están documentados con detalle en [08-despliegue.md — Sección 8.13 y 8.14](08-despliegue.md).

## Pruebas de Autorización

### Middleware y acceso al panel de administración

El middleware `EnsureUserIsAdmin` (alias `role.admin`) garantiza que únicamente usuarios con rol `admin` accedan a las rutas protegidas. Se deben cubrir los siguientes comportamientos:

- **403 para usuario autenticado sin rol admin**: un usuario con rol `user` que intenta acceder a `/admin` recibe una respuesta 403, sin redirección al login (el usuario ya está autenticado).
- **200 para usuario con rol admin**: un administrador accede correctamente a `/admin`.
- **Redirección al login para usuario no autenticado**: las rutas protegidas con `auth` redirigen al login antes de que intervenga `role.admin`.

### Estado `admin()` en UserFactory

El estado `admin()` de `UserFactory` permite crear usuarios administradores en tests:

```php
$admin = User::factory()->admin()->create();
$user  = User::factory()->create(); // rol 'user' por defecto
```

### Casos de prueba sugeridos

```php
it('redirige al login si no está autenticado al acceder a /admin', function () {
    $this->get('/admin')->assertRedirect('/login');
});

it('devuelve 403 a un usuario autenticado sin rol admin', function () {
    $user = User::factory()->create(); // rol 'user'
    $this->actingAs($user)->get('/admin')->assertForbidden();
});

it('permite el acceso a /admin a un administrador', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)->get('/admin')->assertOk();
});

it('impide que un admin cambie su propio rol', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)
        ->patch("/admin/users/{$admin->id}/role", ['role' => 'user'])
        ->assertSessionHasErrors('role');
});

it('impide que un admin elimine su propia cuenta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)
        ->delete("/admin/users/{$admin->id}")
        ->assertSessionHasErrors('delete');
});
```




