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
    ) {
    }

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
