# Panel Inteligente de Gestión de Tareas Académicas para Alumnado de FP basado en datos de Moodle

**Autor:** Pablo Fernández Fernández  
**Ciclo:** Desarrollo de Aplicaciones Web  
**Centro:** IES Rafael Alberti  
**Fecha:** 6 de marzo de 2026  

---

# Índice

1. Identificación de necesidades  
2. Oportunidades de negocio  
3. Tipo de proyecto  
4. Características específicas  
5. Obligaciones legales y prevención  
6. Ayudas y subvenciones  
7. Guión de trabajo  
8. Referencias  
9. Extras de valor añadido 

---

# 1. Identificación de necesidades (Criterio 1c)

## Problema identificado

Muchos estudiantes de Formación Profesional que utilizan la plataforma educativa Moodle Centros experimentan dificultades para gestionar de forma eficiente sus tareas académicas. Entre los principales problemas detectados destacan:

- Interfaz poco optimizada para la gestión rápida de tareas.
- Información dispersa entre distintas asignaturas.
- Dificultad para visualizar de forma clara los plazos de entrega.
- Falta de recordatorios configurables y notificaciones útiles.
- Escasa visualización consolidada de calificaciones y progreso académico.

Esto provoca que el alumnado tenga que revisar manualmente cada asignatura para comprobar tareas pendientes, lo que aumenta el riesgo de olvidos, retrasos en entregas y una menor organización académica.

## Detección de la necesidad

La necesidad se ha identificado a partir de:

- Experiencia personal como alumno usuario de Moodle Centros.
- Observación del uso de la plataforma por parte de otros estudiantes de FP.
- Conversaciones informales con compañeros que han manifestado dificultades similares para gestionar tareas y plazos.
- Análisis de la interfaz de Moodle y sus limitaciones en cuanto a visualización de tareas y planificación académica.

## Usuarios objetivo

Los usuarios principales de la aplicación serán:

### Alumnado de Formación Profesional

**Características:**

- Estudiantes que utilizan Moodle Centros como plataforma educativa.
- Usuarios que gestionan múltiples asignaturas con tareas simultáneas.
- Estudiantes que buscan mejorar su organización académica.

### Usuarios secundarios potenciales:

- Estudiantes universitarios que utilizan Moodle.
- Centros educativos que quieran mejorar la experiencia de sus aulas virtuales.

---

# 2. Oportunidades de negocio (Criterio 1d)

## Análisis del mercado

Actualmente existen algunas herramientas relacionadas con la gestión de tareas académicas:

### Moodle

**Ventajas:**

- Plataforma oficial utilizada por centros educativos.
- Integración directa con cursos y profesores.

**Limitaciones:**

- Interfaz orientada a gestión educativa general, no a productividad del estudiante.
- Visualización poco optimizada para gestionar múltiples asignaturas.
- Falta de herramientas avanzadas de planificación personal.

### Herramientas externas de organización (Notion, Todoist, Google Calendar)

**Ventajas:**

- Permiten organizar tareas personales.
- Interfaz moderna.

**Limitaciones:**

- No están integradas con Moodle.
- Requieren introducir manualmente todas las tareas.

Esto supone una carga adicional para el estudiante y provoca que muchas veces estas herramientas no se utilicen de forma constante.

## Propuesta de valor diferencial

La propuesta plantea una capa de visualización optimizada para estudiantes que se sitúa sobre los datos de Moodle.

**Elementos diferenciadores:**

- Vista unificada de tareas de todas las asignaturas.
- Priorización automática según fecha de entrega.
- Sistema inteligente de recordatorios.
- Visualización clara de progreso y calificaciones.
- Integración con calendario personal.

El objetivo es transformar los datos existentes en Moodle en una herramienta de productividad académica real para el estudiante.

## Potencial de la solución

El proyecto tiene potencial debido a que:

- Moodle es utilizado por multitud de estudiantes en España.
- En España es la plataforma más común en educación pública y universitaria.
- Muchos estudiantes buscan herramientas que mejoren su organización académica.

Aunque el proyecto se desarrollará como prototipo académico, la idea podría escalar en el futuro hacia:

- Extensiones o plugins para Moodle.
- Aplicaciones educativas para centros.
- Integraciones con otras plataformas educativas o de productividad académica.

---

# 3. Tipo de proyecto (Criterio 1e)

## Tipo de aplicación

El proyecto consistirá en una aplicación web tipo SPA (Single Page Application).

**Características:**

- Interfaz dinámica en el cliente.
- Comunicación con servidor mediante API REST.
- Experiencia fluida similar a aplicaciones modernas.

## Justificación

Este tipo de arquitectura es adecuada porque:

- Permite actualizaciones rápidas de datos sin recargar la página.
- Facilita la implementación de dashboards interactivos.
- Mejora la experiencia de usuario frente a aplicaciones tradicionales.

Además, se podría implementar como PWA (Progressive Web App) para permitir:

- Instalación en dispositivos móviles.
- Uso de notificaciones push.
- Experiencia similar a una aplicación nativa.

Esto supone un valor añadido al proyecto y aprovecha los conocimientos adquiridos durante el periodo de prácticas en la empresa.

## Arquitectura propuesta

La arquitectura se basaría en un modelo cliente-servidor.

### Frontend

**Responsabilidades:**

- Interfaz de usuario
- Visualización de tareas
- Filtros y estadísticas
- Notificaciones

**Tecnologías posibles:**

- React
- HTML5
- CSS3
- JavaScript moderno (ES6+)
- PHP
- TypeScript

### Backend

**Responsabilidades:**

- API REST
- Gestión de datos
- Integración con Moodle
- Lógica de notificaciones

**Tecnologías posibles:**

- Spring Boot  
o  
- Laravel

### Base de datos

- PostgreSQL o MySQL

## Integración con Moodle

### Escenarios posibles

#### Escenario ideal

Uso de Web Services de Moodle:

- core_course_get_contents
- mod_assign_get_assignments

Autenticación mediante token.

#### Escenario alternativo

Si no hay acceso a Moodle Centros:

- Instancia local de Moodle en Docker.
- API propia que replica la estructura de datos relevante.

Esto permitirá desarrollar y probar la aplicación de forma realista.

---

# 4. Características específicas (Criterio 1f)

## MVP (Producto Mínimo Viable)

Las funcionalidades mínimas del proyecto serán:

### Dashboard de tareas

- Vista centralizada de tareas.
- Agrupación por asignaturas.
- Ordenación por fecha de entrega.

### Filtros avanzados

Posibilidad de filtrar tareas por:

- Asignatura
- Profesor
- Tipo de entrega
- Estado (pendiente / entregada / corregida)
- Prioridad
- Fecha

### Vista de calificaciones

- Historial de notas por asignatura.
- Cálculo de media.

### Sistema de notificaciones

Notificaciones configurables:

- 48 horas antes de la entrega
- Recordatorio diario
- Notificación el mismo día

**Posibles canales:**

- Web Push
- Email

### Integración con calendario

- Exportación a formato ICS
- Integración con Google Calendar o calendarios externos.

### Estadísticas básicas

- Tareas entregadas vs pendientes vs expiradas
- Cumplimiento de plazos
- Actividad por asignatura

## Funcionalidades opcionales

Si el tiempo lo permite:

- Predicción de carga de trabajo semanal.
- Sistema de prioridades automáticas.
- Modo móvil optimizado.
- Sistema de etiquetas personalizadas.

## Requisitos técnicos

- API REST para comunicación cliente-servidor
- Base de datos relacional
- Sistema de autenticación
- Integración con servicios externos (notificaciones / calendario)
- Arquitectura modular

---

# 5. Obligaciones legales y prevención (Criterio 1g)

El proyecto debe cumplir con la normativa vigente en materia de protección de datos y servicios digitales.

## RGPD (Reglamento General de Protección de Datos)

Si se almacenan datos de usuario se deberán aplicar medidas como:

- Consentimiento del usuario.
- Minimización de datos.
- Derecho de acceso, rectificación y eliminación.
- Uso seguro de la información.

## LSSI-CE (Ley de Servicios de la Sociedad de la Información)

En caso de despliegue público será necesario:

- Aviso legal
- Política de privacidad
- Información sobre cookies

## Seguridad

**Medidas previstas:**

- Autenticación segura.
- Uso de HTTPS.
- Validación de datos en servidor.
- Protección contra ataques comunes (XSS, CSRF, SQL Injection).

## Accesibilidad web

La aplicación intentará cumplir con las recomendaciones de WCAG 2.1:

- Contrastes adecuados.
- Navegación por teclado.
- Uso de etiquetas semánticas HTML.
- Compatibilidad con lectores de pantalla.

---

# 6. Ayudas y subvenciones (Criterio 1h)

Existen diferentes programas de financiación para proyectos tecnológicos.

## Kit Digital

Programa del Gobierno de España para digitalización de empresas.

**Características:**

- Financiación de soluciones digitales.
- Orientado principalmente a pymes y autónomos.

Aunque este proyecto es académico, podría evolucionar a una herramienta para centros educativos.

## ENISA

La Empresa Nacional de Innovación ofrece financiación a startups tecnológicas mediante préstamos participativos.

Este tipo de financiación sería relevante si el proyecto evolucionara hacia un producto comercial.

## Github Student Pack (El utilizado para el proyecto)

Para el desarrollo del proyecto se utilizarán herramientas de este pack o gratuitas:

### Hosting

- Digital Ocean (Pack de estudiante de github)

### Base de datos

- Cluster o Kubernetes en Digital Ocean

### Servicios adicionales

- Firebase Cloud Messaging (notificaciones)
- GitHub para control de versiones
- Docker para entorno de desarrollo

Estas herramientas permiten desarrollar el proyecto sin costes significativos.

---

# 7. Guión de trabajo (Criterio 1i)

## Metodología de desarrollo

Se utilizará una metodología SCRUM similar a la utilizada en proyectos previos.

**Herramientas:**

- GitHub
- GitHub Projects
- Git para control de versiones
- Toggl Track para control de tiempo

## Fases del proyecto

### Fase 1 — Análisis y diseño

**Duración aproximada:** 1 semana

**Tareas:**

- Definición de requisitos.
- Diseño de arquitectura.
- Diseño de base de datos.
- Diseño de interfaz inicial.

### Fase 2 — Desarrollo del backend

**Duración aproximada:** 2 semanas

**Tareas:**

- Creación de API REST.
- Integración con Moodle o simulación de datos.
- Implementación de base de datos.

### Fase 3 — Desarrollo del frontend

**Duración aproximada:** 2 semanas

**Tareas:**

- Implementación del dashboard.
- Desarrollo de filtros y visualizaciones.
- Conexión con API.

### Fase 4 — Funcionalidades avanzadas

**Duración aproximada:** 1 semana

**Tareas:**

- Sistema de notificaciones.
- Integración con calendario.
- Estadísticas.

### Fase 5 — Pruebas y despliegue

**Duración aproximada:** 1 semana

**Tareas:**

- Pruebas de funcionalidad.
- Corrección de errores.
- Despliegue en hosting.

## Hitos principales

- Arquitectura definida
- API funcional
- Dashboard operativo
- Integración de notificaciones
- Despliegue final

---

# 8. Referencias

- Documentación oficial de Moodle
- Documentación Web Services API de Moodle
- Reglamento General de Protección de Datos (RGPD)
- WCAG 2.1 Web Accessibility Guidelines
- Documentación de GitHub, Docker, PHP y Laravel o Spring Boot

---

# 9. Extras posibles para valor añadido

Me gustaría añadir estos extras en caso de que me diera tiempo y fuera posible, el tema IA es algo que me da muchísimo interés y que me gustaría integrar, además por las amplias funcionalidades que te puede ofrecer. En cuanto a la APP móvil, es debido a los conocimientos que estoy obteniendo en la empresa, y viendo que no supone mucha dificultad, realmente aunque sea algo más de DAM, no deja de añadir valor a mi proyecto y sigue siendo programar, por lo que si el equipo académico, y el tiempo me lo permite me gustaría implementarlo.

## Sistema de recomendación de prioridad de tareas mediante IA

Este sistema analizaría:

- fechas de entrega
- volumen de tareas
- historial de entregas del usuario

y sugeriría qué tareas deberían priorizarse primero.

## Diseño de APP Móvil tanto IOS como Android

En caso de desarrollarse cliente móvil, se utilizará el framework Ionic con React y Capacitor, permitiendo reutilizar gran parte del frontend web y consumir la misma API desarrollada. (tecnología utilizada en la empresa)