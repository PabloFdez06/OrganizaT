
# 10. Conclusiones

## 10.1 Evaluacion critica respecto a los objetivos iniciales
En conjunto, considero que el proyecto cumple su objetivo principal: convertir datos academicos dispersos en un sistema operativo de organización diaria para estudiante.

Comparando objetivo inicial vs resultado:

1. integración Moodle segura: cumplido.
2. Panel académico por secciones: cumplido.
3. Priorizacion de tareas: cumplido (modo base + modo IA opcional).
4. Exportaciones útiles (ICS/PDF): cumplido.
5. Despliegue reproducible y automatizado: cumplido.

## 10.2 Grado de cumplimiento del alcance propuesto
He cerrado un alcance funcional amplio, más y mejor de lo propuesto inicialmente:

1. Backend modular con servicios de dominio.
2. Frontend completo por módulo académico.
3. Seguridad de cuenta y 2FA.
4. Notificaciones en app y por correo.
5. Pipeline de calidad y despliegue.

Puntos que no considero cerrados al 100% para versión final profesional:

1. Publicación de cobertura cuantitativa de tests con umbral mínimo en CI.
2. Refuerzo de pruebas frontend automatizadas sobre componentes y hooks.

A nivel de trazabilidad de propuesta, también dejo explícito que la idea inicial de SPA + API REST completa evoluciono a una arquitectura SPA con Inertia y endpoints JSON de soporte. Funcionalmente mantiene el objetivo de panel académico, pero tecnicamente no es una API publica desacoplada al 100%.

## 10.3 Valor técnico aportado
Los bloques que más valor técnico aportan en este proyecto son:

1. gestión de sesión Moodle cifrada con flujo efimero y restauracion controlada.
2. Carga asíncrona por sección con jobs y cache de estado.
3. Capa de resolución de accesos a recursos Moodle.
4. Motor de notificaciones con deduplicación y envío en cola.

No son partes cosmeticas: son decisiones estructurales que condicionan robustez, seguridad y experiencia.

## 10.4 Lecciones aprendidas
Durante el desarrollo he consolidado aprendizajes importantes:

1. Integrar sistemas externos reales (Moodle/CAS) exige diseño defensivo de errores y sesión.
2. La experiencia de usuario mejora mucho cuando la asincronia esta bien planteada desde backend y frontend.
3. Sin automatizacion de despliegue y checks, mantener una beta estable consume demasiado tiempo.
4. Documentar en paralelo al desarrollo evita vacios al final.
5. Exponer los puertos necesarios nos brinda una bastante mejor seguridad en nuestra aplicación, como hacemos con el reverse proxy de nginx

## 10.5 Dificultades reales y madurez obtenida
La mayor dificultad no fue crear pantallas, sino asegurar consistencia de datos y comportamiento cuando Moodle responde lento, devuelve estructura incompleta o caduca sesión.

Resolver eso me obligo a:

1. Separar responsabilidades en servicios.
2. Definir estado explícito por sección.
3. Implementar políticas de fallback y mensajes claros.

Ese proceso ha mejorado claramente mi criterio de arquitectura y mantenimiento.

## 10.6 Mejoras futuras propuestas

1. Incorporar reporte formal de cobertura y umbrales en CI (HTML/Codecov).
2. Aumentar test frontend de componentes y hooks críticos con Vitest.
3. Introducir observabilidad más completa (métricas, alertas y dashboards).
4. Evaluar control de roles si evoluciona a escenario multi-perfil (profesorado).
5. Escalar PHP-FPM (`pm.max_children`) y añadir segundo nodo si la carga crece.

## 10.7 Preparacion para defensa
Para la defensa, mi mensaje central será que no he construido solo una interfaz sobre Moodle, sino una capa de organización académica con decisiones tecnicas justificadas por problemas reales:

1. Seguridad de sesión.
2. Priorizacion accionable.
3. operación reproducible en despliegue.

Este enfoque me permite argumentar con claridad tanto valor funcional como solidez técnica.

## 10.8 Cierre final
El proyecto esta terminado en una versión funcional y defendible, con una base de calidad suficiente para entrega y con una hoja de mejora clara para evolucion posterior. Mi evaluacion final es positiva porque he cumplido el alcance comprometido y he documentado de forma honesta lo que esta cerrado y lo que aún puedo reforzar.

La documentación de despliegue cubre tanto el proceso operativo completo ([08-despliegue.md](08-despliegue.md)) como la evaluación detallada de criterios de artefactos y red ([08-despliegue-eval.md](08-despliegue-eval.md)), con pruebas de carga reales y verificación técnica de red reproducible.

