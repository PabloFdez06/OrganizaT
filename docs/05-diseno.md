
# 5. Diseño

## 5.1 Arquitectura de la aplicación
La arquitectura que he aplicado es MVC con separacion clara de capas:

1. Rutas y controladores en Laravel.
2. Servicios de dominio para lógica Moodle, cache, notificaciones y reglas academicas.
3. Jobs de cola para carga asíncrona por sección.
4. Frontend Inertia + React para renderizado y UX.

### Diagrama de arquitectura lógica

```mermaid
flowchart LR
	U[Usuario autenticado] --> R[Routes web/settings]
	R --> C[Controllers Laravel]
	C --> S[Moodle Services]
	S --> X[Moodle CAS/HTML]
	C --> A[Async Section Cache]
	C --> J[Queue Jobs]
	J --> S
	C --> N[Notification Center]
	N --> M[Mail Queue]
	C --> I[Inertia Response]
	I --> F[React Pages]
	F --> P[Polling status endpoints]
	P --> C
```

![diagrama-arquitectura-lógica](image.png)

## 5.2 Modelo de datos (ER)
El proyecto se apoya en tablas base de Laravel y ampliaciones en users para integración Moodle y seguridad.

### Entidades principales

1. users.
2. sessions.
3. password_reset_tokens.
4. cache y cache_locks.
5. jobs, job_batches, failed_jobs.
6. moodle_notification_emails.

### Diagrama entidad-relacion

```mermaid
erDiagram
	USERS {
		bigint id PK
		string name
		string email UK
		string password
		string moodle_username
		json moodle_notification_preferences
		json dashboard_quick_subject_ids
		text moodle_session_data
		datetime moodle_session_expires_at
		boolean moodle_background_notifications
		text two_factor_secret
		text two_factor_recovery_codes
		datetime two_factor_confirmed_at
	}

	MOODLE_NOTIFICATION_EMAILS {
		bigint id PK
		bigint user_id FK
		string notification_id
		datetime sent_at
	}

	SESSIONS {
		string id PK
		bigint user_id
		longtext payload
		int last_activity
	}

	PASSWORD_RESET_TOKENS {
		string email PK
		string token
		datetime created_at
	}

	CACHE {
		string key PK
		mediumtext value
		int expiration
	}

	CACHE_LOCKS {
		string key PK
		string owner
		int expiration
	}

	JOBS {
		bigint id PK
		string queue
		longtext payload
		tinyint attempts
		int reserved_at
		int available_at
		int created_at
	}

	JOB_BATCHES {
		string id PK
		string name
		int total_jobs
		int pending_jobs
		int failed_jobs
		longtext failed_job_ids
	}

	FAILED_JOBS {
		bigint id PK
		string uuid UK
		text connection
		text queue
		longtext payload
		longtext exception
		datetime failed_at
	}

	USERS ||--o{ MOODLE_NOTIFICATION_EMAILS : "user_id"
	USERS o|--o{ SESSIONS : "user_id (opcional)"
```
![diagrama-entidad-relacion1](image-2.png)
![diagrama-entidad-relacion2](image-1.png)
![diagrama-entidad-relacion3](image-3.png)

## 5.3 Casos de uso

```mermaid
flowchart TD
	A[Estudiante] --> B[Iniciar sesión en app]
	A --> C[Conectar Moodle]
	A --> D[Consultar dashboard]
	A --> E[Revisar asignaturas]
	A --> F[Revisar tareas]
	A --> G[Exportar calendario ICS]
	A --> H[Consultar calificaciones]
	A --> I[Descargar informe PDF]
	A --> J[Consultar recursos]
	A --> K[Configurar notificaciones]
	A --> L[Reportar incidencia 404]
```

![diagrama-casos-de-uso](image-4.png)

## 5.4 Flujo principal de sincronizacion académica

```mermaid
sequenceDiagram
	participant U as Usuario
	participant P as Pagina React
	participant C as Controller
	participant AC as Async Cache
	participant J as Job
	participant S as Moodle Service

	U->>P: Abre seccion (dashboard/tareas/...)
	P->>C: GET seccion
	C->>AC: getState(section,user)
	alt estado done
		C-->>P: Inertia con datos
	else estado idle/pending
		C->>AC: markPending
		C->>J: dispatch job
		C-->>P: Inertia loading=true
		P->>C: Poll /status cada 5s
		J->>S: obtener datos Moodle
		J->>AC: markDone o markError
		C-->>P: estado final
	end
```

![diagrama-sincronizacion-academica](image-5.png)

## 5.5 Diseño de API y endpoints
He separado rutas de vista y endpoints JSON de soporte.

### Rutas de vista (web)

1. /dashboard, /asignaturas, /tareas, /calificaciones, /recursos.
2. /settings/security y /settings/profile.
3. /moodle-console.

### Endpoints de estado asíncrono

1. /dashboard/status
2. /asignaturas/status
3. /tareas/status
4. /calificaciones/status
5. /recursos/status

### Endpoints funcionales

1. POST /dashboard/matrix
2. GET /tareas/export-all.ics
3. GET /calificaciones/report
4. POST /moodle-notifications/read-all
5. GET /moodle/media y GET /moodle/redirect
6. POST /moodle-connect y POST /moodle-debug
7. POST /moodle/preferences/background-notifications

### Endpoints bajo prefijo /api

1. GET /api/asignaturas
2. GET /api/tareas/{courseId}
3. GET /api/all-tareas
4. GET /api/calificaciones
5. GET /api/recursos/{courseId}
6. GET /api/all-recursos
7. GET/POST /api/configuración

## 5.6 Decisiones de diseño destacadas

1. Capa de acceso Moodle separada en servicios para no contaminar controladores con parsing HTTP/HTML.
2. Cache por sección + jobs para mejorar respuesta inicial y controlar errores por dominio.
3. URLs de recursos Moodle tratadas mediante servicio dedicado para evitar roturas de sesión en navegador.
4. Persistencia de sesión Moodle en DB solo si el usuario activa notificaciones en background.

## 5.7 Coherencia diseño-desarrollo
Los diagramas anteriores no son teóricos: corresponden a rutas, clases y métodos reales ya presentes en el proyecto, y son la base que he usado para justificar decisiones en la implementación.



