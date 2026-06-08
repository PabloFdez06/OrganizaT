<?php

namespace App\Http\Controllers\Moodle;

use App\Http\Controllers\Controller;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleAcademicService;
use App\Services\Moodle\MoodleEphemeralSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MoodleDataController extends Controller
{
    public function __construct(
        private readonly MoodleAcademicService $academicService,
        private readonly MoodleEphemeralSessionService $sessionService,
    ) {}

    /**
     * Obtiene la lista de asignaturas (cursos) Moodle del usuario autenticado.
     *
     * Devuelve los cursos activos del alumno obtenidos de la caché interna de OrganizaT.
     * Si la sesión Moodle ha expirado se devuelve 401.
     *
     * @return JsonResponse Array de cursos con id, nombre, progreso y metadatos.
     */
    public function asignaturas(Request $request): JsonResponse
    {
        try {
            $session = $this->sessionService->reopenForUser($request->user());

            $courses = $this->academicService->getCourses($session, includeTutor: true);

            return response()->json($courses);
        } catch (MoodleAuthenticationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        } catch (MoodleRequestException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        } catch (\Throwable) {
            return response()->json(['message' => 'Error inesperado al obtener asignaturas.'], 500);
        } finally {
            if (isset($session)) {
                $session->close();
            }
        }
    }

    /**
     * Obtiene las tareas de una asignatura concreta.
     *
     * @param  int  $courseId  Identificador del curso Moodle.
     * @return JsonResponse Array de tareas con nombre, fecha de entrega, estado y calificación.
     */
    public function tareas(Request $request, int $courseId): JsonResponse
    {
        try {
            $session = $this->sessionService->reopenForUser($request->user());

            $tasks = $this->academicService->getAssignmentsByCourse($session, $courseId);

            return response()->json($tasks);
        } catch (MoodleAuthenticationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        } catch (MoodleRequestException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        } catch (\Throwable) {
            return response()->json(['message' => 'Error inesperado al obtener tareas.'], 500);
        } finally {
            if (isset($session)) {
                $session->close();
            }
        }
    }

    /**
     * Obtiene el agregado de todas las tareas de todas las asignaturas.
     *
     * @return JsonResponse Payload con cursos y tareas agrupadas, listas para dashboard y calendario.
     */
    public function allTareas(Request $request): JsonResponse
    {
        try {
            $session = $this->sessionService->reopenForUser($request->user());

            $payload = $this->academicService->getAllAssignments($session);

            return response()->json($payload);
        } catch (MoodleAuthenticationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        } catch (MoodleRequestException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        } catch (\Throwable) {
            return response()->json(['message' => 'Error inesperado al obtener tareas agregadas.'], 500);
        } finally {
            if (isset($session)) {
                $session->close();
            }
        }
    }

    /**
     * Obtiene las calificaciones del usuario en todas las asignaturas.
     *
     * @return JsonResponse Array de calificaciones por asignatura con notas por tarea/actividad.
     */
    public function calificaciones(Request $request): JsonResponse
    {
        try {
            $session = $this->sessionService->reopenForUser($request->user());

            $grades = $this->academicService->getGrades($session);

            return response()->json($grades);
        } catch (MoodleAuthenticationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        } catch (MoodleRequestException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        } catch (\Throwable) {
            return response()->json(['message' => 'Error inesperado al obtener calificaciones.'], 500);
        } finally {
            if (isset($session)) {
                $session->close();
            }
        }
    }

    /**
     * Obtiene los recursos de una asignatura concreta.
     *
     * @param  int  $courseId  Identificador del curso Moodle.
     * @return JsonResponse Array de recursos (ficheros, URLs, actividades) de la asignatura.
     */
    public function recursos(Request $request, int $courseId): JsonResponse
    {
        try {
            $session = $this->sessionService->reopenForUser($request->user());

            $resources = $this->academicService->getResourcesByCourse($session, $courseId);

            return response()->json($resources);
        } catch (MoodleAuthenticationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        } catch (MoodleRequestException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        } catch (\Throwable) {
            return response()->json(['message' => 'Error inesperado al obtener recursos.'], 500);
        } finally {
            if (isset($session)) {
                $session->close();
            }
        }
    }

    /**
     * Obtiene el agregado de todos los recursos de todas las asignaturas.
     *
     * @return JsonResponse Payload con recursos agrupados por asignatura.
     */
    public function allRecursos(Request $request): JsonResponse
    {
        try {
            $session = $this->sessionService->reopenForUser($request->user());

            $payload = $this->academicService->getAllResources($session);

            return response()->json($payload);
        } catch (MoodleAuthenticationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        } catch (MoodleRequestException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        } catch (\Throwable) {
            return response()->json(['message' => 'Error inesperado al obtener recursos agregados.'], 500);
        } finally {
            if (isset($session)) {
                $session->close();
            }
        }
    }
}
