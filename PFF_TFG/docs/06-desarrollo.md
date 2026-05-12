
# 6. Desarrollo

## 6.1 Secuencia de desarrollo seguida
He seguido una secuencia incremental, priorizando primero seguridad y base funcional, y despues optimizacion de experiencia:

1. Estructura base Laravel + Inertia + React + TypeScript.
2. Autenticacion y seguridad de cuenta (Fortify + 2FA).
3. Integracion Moodle por CAS y gestion de sesion temporal.
4. Construccion de secciones academicas (dashboard, asignaturas, tareas, calificaciones, recursos).
5. Capa de cache y asincronia por seccion con jobs.
6. Notificaciones in-app y por correo.
7. Exportaciones (ICS y PDF).
8. Dockerizacion y pipeline CI/CD.

## 6.2 Patron tecnico aplicado en backend
He aplicado una estructura MVC con servicios dedicados. En la practica:

1. Los controladores orquestan entradas/salidas y validacion de request.
2. La logica Moodle vive en servicios (sesion, parser, cache, reglas y notificaciones).
3. La carga pesada se desplaza a jobs de cola.

Un ejemplo real es el patron index + status por seccion:

```php
// app/Http/Controllers/TareasController.php
public function index(Request $request): InertiaResponse
public function status(Request $request): JsonResponse
```

Este patron me ha permitido mostrar UI rapidamente y completar datos en segundo plano.

## 6.3 Integracion Moodle y sesion segura
La parte mas sensible del proyecto ha sido la sesion Moodle. He tomado estas decisiones:

1. Login CAS centralizado en MoodleCasClient.
2. Sesion efimera cifrada en cache con TTL.
3. Persistencia cifrada en DB solo para notificaciones en background y con expiracion.

Fragmento representativo:

```php
// app/Services/Moodle/MoodleEphemeralSessionService.php
$serialized = json_encode($payload, JSON_THROW_ON_ERROR);
$encrypted = Crypt::encryptString($serialized);
Cache::put($this->cacheKey($userId), $encrypted, now()->addSeconds($ttl));
```

Ademas, quite almacenamiento persistente de moodle_password mediante migracion de eliminacion de columna.

## 6.4 Carga asincrona por seccion
Para evitar bloqueos de interfaz he implementado estado asincrono por seccion:

1. MoodleAsyncSectionCache marca idle/pending/done/error.
2. Cada controlador dispara su job cuando el estado esta idle.
3. El frontend realiza polling periodico con router.reload.

Este flujo aparece en dashboard, tareas, asignaturas, calificaciones y recursos.

## 6.5 Cache academica y estrategia stale
En MoodleUserAcademicCache he aplicado dos ideas:

1. Reutilizacion de payload unificado (cursos, tareas, mensajes, perfil, etc.).
2. Recalculo con lock y refresco asincrono para evitar concurrencia descontrolada.

Con esto reduzco llamadas repetidas a Moodle y mantengo tiempos de respuesta razonables.

## 6.6 Funcionalidades diferenciales implementadas

### 6.6.1 Matriz de Eisenhower (base + IA)

1. Modo base: EisenhowerMatrixService puntua urgencia/importancia y limita 3 tareas por cuadrante.
2. Modo IA: EisenhowerMatrixAiService conecta con proveedor segun clave y valida respuesta JSON.

### 6.6.2 Exportaciones

1. AcademicCalendarExportService genera VCALENDAR RFC5545 en /tareas/export-all.ics.
2. CalificacionesController descarga PDF con DomPDF en /calificaciones/report.

### 6.6.3 Acceso a recursos Moodle
MoodleAccessUrlService decide si un recurso debe ir por proxy media o por redirect seguro, evitando enlaces que rompan contexto de sesion.

### 6.6.4 Notificaciones
MoodleNotificationCenter construye eventos, deduplica IDs y dispara correo en cola mail cuando aplica.

## 6.7 Dificultades encontradas y como las resolvi

### Dificultad 1. Seguridad de Credenciales del usuario
Problema: Se comenzo el proyecto aportando una seguridad nula al usuario, ya que este simplemente ingresaba usuario - contraseña de moodle accedia y no se encriptaba de ninguna manera de primeras, luego se reutilizaban para obtener recursos y ademas se almacenaban en DB, tras muchos cambios, como usar las cookies de sesion, y otros, di con la forma que dentro de la logica de mi aplicación me permite, garantiza en la medida de lo posible la mayor seguridad al usuario.

Solución: La contraseña de la moodle se pide una unica vez (siempre que logues el usuario de moodle), una vez se verifica en CAS, la contraseña no se almacena en ningun sitio e incluso se elimina en cache. Una vez el usuario ha sido autentificado se almacenan en cache las cookies de sesión (si el usuario lo permite, en BD también para background-notifications), las cuales automaticamente se encriptan, de esta manera durante esa sesión el usuario permanece autentificado por al menos media hora, lo cual permite al usuario navegar y acceder a todo tipo de recurso sin volver a loguear continuamente.

El problema que encontramos con esta lógica también es el siguiente: Un administrador de la aplicacion podría tratar de acceder a las sesiones del usuario (si tiene malas intenciones), y si alguien ataca y consigue descifrarlas igual, lo que nos limita esto es que actualmente tendriamos que prescindir de las notificaciones. En un futuro se tratará de encontrar una alternativa migrando la lógica para no prescindir de ninguna funcionalidad y a su vez mantener la seguridad que nos gustaria para nuestros usuarios.

### Dificultad 2. Sesiones Moodle caducadas
Problema: el usuario podia tener cuenta conectada pero sesion no reutilizable.
Solucion: mensaje explicito de sesion caducada + invalidacion controlada + reconexion guiada.

### Dificultad 3. Tiempos de carga en secciones academicas
Problema: traer todo en peticion bloqueante degradaba UX.
Solucion: jobs por seccion + cache de estado + skeleton/loading + polling.

### Dificultad 4. Enlaces Moodle no homogeneos
Problema: no todos los recursos se abren igual (mod/url, media, rutas relativas).
Solucion: capa de normalizacion y resolucion central en MoodleAccessUrlService.

### Dificultad 5. Notificaciones repetidas
Problema: al recalcular eventos podia haber duplicados.
Solucion: tabla moodle_notification_emails con unique(user_id, notification_id) y deduplicacion por id.

## 6.8 Decisiones tecnicas clave y justificacion

1. Elegi Inertia para evitar duplicar API publica y frontend desacoplado completo en esta fase del TFG.
2. Mantuve JSON internos /api para necesidades de datos concretos del cliente.
3. Priorizo seguridad de sesion y cifrado frente a guardar credenciales planas.
4. Use colas y scheduler porque el modelo de notificaciones lo exige.
5. Dockerice con multi-stage para mejorar reproducibilidad de despliegue.
6. Nos arriesgamos en cierta parte por no prescindir de las notificaciones en segundo plano, como se explica en el problema 1 del punto anterior.

## 6.9 Control de versiones y flujo de trabajo
He trabajado con ramas y automatizacion en GitHub Actions:

1. tests.yml para validacion de build y tests.
2. lint.yml para calidad de codigo (Pint, ESLint, Prettier, TypeScript).
3. deploy-beta.yml para construir imagenes y desplegar en beta.

## 6.10 Fragmentos de codigo relevantes

### Estado asincrono de seccion

```php
// app/Services/Moodle/MoodleAsyncSectionCache.php
public function markPending(string $section, int $userId, string $scope = 'default'): void
public function markDone(string $section, int $userId, mixed $data, string $scope = 'default'): void
public function markError(string $section, int $userId, string $error, string $scope = 'default'): void
```

### Job de carga en background

```php
// app/Jobs/Moodle/FetchDashboardDataJob.php
$payload = $academicCache->getForUser($user);
$asyncCache->markDone('dashboard', $user->id, ['academicPayload' => $payload]);
```

### Comparticion de notificaciones en Inertia

```php
// app/Http/Middleware/HandleInertiaRequests.php
return $this->notificationCenter->buildForUser($user, $tasks, $messages, true);
```

## 6.11 Balance tecnico de desarrollo
El desarrollo ha estado centrado en resolver un caso real de organizacion academica, con una base de codigo mantenible y preparada para evolucion. La mayor complejidad ha estado en la integracion Moodle y su gestion de sesion, y ahi es donde mas valor tecnico he aportado, sin olvidar las notificaciones, que han supuesto un gran reto al enviarlas por mail ademas de controlar correctamente los jobs y las duplicidades.


