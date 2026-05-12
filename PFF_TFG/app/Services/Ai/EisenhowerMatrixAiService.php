<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class EisenhowerMatrixAiService
{
    /**
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array{matrix: array<string, array<int, array<string, string|null>>>, explanation: ?string, provider: string}
     */
    public function analyze(
        array $tasks,
        bool $includeExplanation = false,
        ?string $userApiKey = null,
        ?string $userPreferences = null,
    ): array {
        $apiKey = trim((string) ($userApiKey ?? config('services.ai.api_key', '')));
        $configuredBaseUrl = rtrim((string) config('services.ai.base_url', ''), '/');
        $timeout = max(15, (int) config('services.ai.timeout', 45));
        $verifySsl = (bool) config('services.ai.verify_ssl', true);
        $preferences = trim((string) ($userPreferences ?? ''));
        $provider = $this->detectProvider($apiKey, $configuredBaseUrl);
        [$baseUrl, $model] = $this->resolveEndpointAndModel($provider);

        if ($apiKey === '' || $baseUrl === '') {
            return [
                'matrix' => $this->emptyMatrix(),
                'explanation' => 'No se pudo generar la matriz IA porque falta configurar API key o proveedor.',
                'provider' => 'unconfigured',
            ];
        }

        $taskPayload = array_map(static function (array $task): array {
            return [
                'title' => (string) ($task['title'] ?? ''),
                'course' => (string) ($task['course'] ?? ''),
                'days_remaining' => isset($task['daysRemaining']) ? (int) $task['daysRemaining'] : null,
                'due_label' => (string) ($task['dueLabel'] ?? ''),
                'status' => (string) ($task['status'] ?? ''),
                'link' => is_string($task['link'] ?? null) ? (string) $task['link'] : null,
            ];
        }, $tasks);

        $systemPrompt = <<<'PROMPT'
Eres un tutor academico experto en productividad universitaria y priorizacion realista.

Objetivo:
Clasificar tareas en una matriz de Eisenhower para estudiantes:
- doNow: urgente e importante
- schedule: importante no urgente
- delegate: urgente con menor impacto academico
- optimize: bajo impacto y baja urgencia

Criterios de priorizacion:
- Prioriza fechas limite cercanas, tareas vencidas y entregas calificables.
- Da mayor peso a examenes, proyectos, entregas finales y actividades evaluables.
- Usa curso, estado y dias restantes para desempatar.
- Si no hay fecha, estima urgencia por estado y contexto academico.

Reglas estrictas:
- Solo usa tareas del input.
- No inventes ni renombres tareas.
- Maximo 3 tareas por cuadrante.
- Devuelve SIEMPRE JSON valido, sin markdown ni texto extra.
PROMPT;

        $userPrompt = json_encode([
            'request' => 'Clasifica tareas para la matriz de Eisenhower y devuelve justificacion breve por tarea.',
            'include_explanation' => $includeExplanation,
            'user_preferences' => $preferences !== '' ? $preferences : null,
            'tasks' => $taskPayload,
            'expected_output_schema' => [
                'matrix' => [
                    'doNow' => [['title' => 'string', 'reason' => 'string']],
                    'schedule' => [['title' => 'string', 'reason' => 'string']],
                    'delegate' => [['title' => 'string', 'reason' => 'string']],
                    'optimize' => [['title' => 'string', 'reason' => 'string']],
                ],
                'explanation' => 'string|null',
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        try {
            $response = match ($provider) {
                'anthropic' => $this->callAnthropic($apiKey, $baseUrl, $model, $systemPrompt, $userPrompt, $timeout, $verifySsl),
                'gemini' => $this->callGemini($apiKey, $baseUrl, $model, $systemPrompt, $userPrompt, $timeout, $verifySsl),
                default => $this->callOpenAiCompatible($apiKey, $baseUrl, $model, $systemPrompt, $userPrompt, $timeout, $verifySsl),
            };

            if (! $response->ok()) {
                $status = (int) $response->status();
                $providerError = $this->sanitizeErrorMessage($this->extractProviderError($response->json()));

                return [
                    'matrix' => $this->emptyMatrix(),
                    'explanation' => 'No se pudo conectar con la IA ('.$status.'). '.$providerError,
                    'provider' => $provider,
                ];
            }

            $content = match ($provider) {
                'anthropic' => (string) data_get($response->json(), 'content.0.text', ''),
                'gemini' => (string) data_get($response->json(), 'candidates.0.content.parts.0.text', ''),
                default => (string) data_get($response->json(), 'choices.0.message.content', ''),
            };
            $decoded = json_decode($this->stripCodeBlock($content), true);

            if (! is_array($decoded)) {
                return [
                    'matrix' => $this->emptyMatrix(),
                    'explanation' => 'La respuesta del proveedor IA no fue un JSON valido.',
                    'provider' => $provider,
                ];
            }

            $matrix = $this->hydrateMatrixFromAi($decoded, $tasks);
            $explanation = $includeExplanation ? $this->extractExplanation($decoded) : null;

            return [
                'matrix' => $matrix,
                'explanation' => $explanation,
                'provider' => $provider,
            ];
        } catch (\Throwable $exception) {
            return [
                'matrix' => $this->emptyMatrix(),
                'explanation' => 'No se pudo contactar con el servicio de IA: '.$this->sanitizeErrorMessage($exception->getMessage()),
                'provider' => $provider,
            ];
        }
    }

    private function sanitizeErrorMessage(string $message): string
    {
        return (string) preg_replace('/key=[^&\s]+/i', 'key=[redacted]', $message);
    }

    /**
     * @param  array<string, mixed>|null  $payload
     */
    private function extractProviderError(?array $payload): string
    {
        if (! is_array($payload)) {
            return 'Respuesta no valida del proveedor.';
        }

        $message = data_get($payload, 'error.message');
        if (is_string($message) && trim($message) !== '') {
            return trim($message);
        }

        return 'Error de autenticacion o endpoint del proveedor.';
    }

    private function detectProvider(string $apiKey, string $configuredBaseUrl): string
    {
        if (str_starts_with($apiKey, 'sk-ant-')) {
            return 'anthropic';
        }

        if (str_starts_with($apiKey, 'sk-or-')) {
            return 'openrouter';
        }

        if (str_starts_with($apiKey, 'AIza')) {
            return 'gemini';
        }

        $normalizedBaseUrl = mb_strtolower(trim($configuredBaseUrl));

        if ($normalizedBaseUrl !== '') {
            if (str_contains($normalizedBaseUrl, 'anthropic.com')) {
                return 'anthropic';
            }

            if (str_contains($normalizedBaseUrl, 'generativelanguage.googleapis.com')) {
                return 'gemini';
            }

            if (str_contains($normalizedBaseUrl, 'openrouter.ai')) {
                return 'openrouter';
            }

            if (! str_contains($normalizedBaseUrl, 'openai.com')) {
                return 'custom';
            }
        }

        return 'openai';
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function resolveEndpointAndModel(string $provider): array
    {
        $configuredBaseUrl = rtrim((string) config('services.ai.base_url', ''), '/');
        $configuredModel = trim((string) config('services.ai.model', ''));
        $normalizedBaseUrl = mb_strtolower($configuredBaseUrl);
        $normalizedModel = mb_strtolower($configuredModel);

        return match ($provider) {
            'anthropic' => [
                'https://api.anthropic.com',
                $configuredModel !== '' && ! str_starts_with($normalizedModel, 'gpt-')
                    ? $configuredModel
                    : 'claude-haiku-4-5-20251001',
            ],
            'openrouter' => [
                'https://openrouter.ai/api/v1',
                $configuredModel !== '' && ! str_starts_with($normalizedModel, 'gpt-')
                    ? $configuredModel
                    : 'openai/gpt-4o-mini',
            ],
            'gemini' => [
                str_contains($normalizedBaseUrl, 'generativelanguage.googleapis.com') && $configuredBaseUrl !== ''
                    ? $configuredBaseUrl
                    : 'https://generativelanguage.googleapis.com',
                str_starts_with($normalizedModel, 'gemini')
                    ? ($configuredModel !== '' ? $configuredModel : 'gemini-1.5-flash')
                    : 'gemini-1.5-flash',
            ],
            default => [
                $configuredBaseUrl !== '' ? $configuredBaseUrl : 'https://api.openai.com/v1',
                $configuredModel !== '' ? $configuredModel : 'gpt-4o-mini',
            ],
        };
    }

    private function callOpenAiCompatible(
        string $apiKey,
        string $baseUrl,
        string $model,
        string $systemPrompt,
        string $userPrompt,
        int $timeout,
        bool $verifySsl,
    ): Response {
        return Http::withToken($apiKey)
            ->acceptJson()
            ->timeout($timeout)
            ->withOptions(['verify' => $verifySsl])
            ->post($baseUrl.'/chat/completions', [
                'model' => $model,
                'temperature' => 0.1,
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
            ]);
    }

    private function callAnthropic(
        string $apiKey,
        string $baseUrl,
        string $model,
        string $systemPrompt,
        string $userPrompt,
        int $timeout,
        bool $verifySsl,
    ): Response {
        return Http::withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
        ])
            ->acceptJson()
            ->timeout($timeout)
            ->withOptions(['verify' => $verifySsl])
            ->post($baseUrl.'/v1/messages', [
                'model' => $model,
                'max_tokens' => 1024,
                'system' => $systemPrompt,
                'messages' => [
                    ['role' => 'user', 'content' => $userPrompt],
                ],
            ]);
    }

    private function callGemini(
        string $apiKey,
        string $baseUrl,
        string $model,
        string $systemPrompt,
        string $userPrompt,
        int $timeout,
        bool $verifySsl,
    ): Response {
        return Http::acceptJson()
            ->timeout($timeout)
            ->withOptions(['verify' => $verifySsl])
            ->post($baseUrl.'/v1beta/models/'.$model.':generateContent?key='.$apiKey, [
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [
                            ['text' => $systemPrompt."\n\n".$userPrompt],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.1,
                    'responseMimeType' => 'application/json',
                ],
            ]);
    }

    private function extractExplanation(array $decoded): ?string
    {
        $text = data_get($decoded, 'explanation');

        if (! is_string($text)) {
            return null;
        }

        $trimmed = trim($text);

        return $trimmed !== '' ? $trimmed : null;
    }

    /**
     * @param  array<string, mixed>  $decoded
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array<string, array<int, array<string, string|null>>>
     */
    private function hydrateMatrixFromAi(array $decoded, array $tasks): array
    {
        $taskMap = [];

        foreach ($tasks as $task) {
            $title = trim((string) ($task['title'] ?? ''));
            if ($title === '') {
                continue;
            }

            $key = mb_strtolower($title);

            if (! isset($taskMap[$key])) {
                $taskMap[$key] = [];
            }

            $taskMap[$key][] = $task;
        }

        $quadrants = ['doNow', 'schedule', 'delegate', 'optimize'];
        $result = $this->emptyMatrix();

        foreach ($quadrants as $quadrant) {
            $items = data_get($decoded, 'matrix.'.$quadrant, []);
            if (! is_array($items)) {
                continue;
            }

            foreach ($items as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $title = trim((string) ($item['title'] ?? ''));
                if ($title === '') {
                    continue;
                }

                $reason = trim((string) ($item['reason'] ?? ''));
                $taskData = $this->consumeTaskByTitle($taskMap, $title);

                if ($taskData === null) {
                    continue;
                }

                $result[$quadrant][] = [
                    'title' => (string) ($taskData['title'] ?? $title),
                    'course' => (string) ($taskData['course'] ?? 'Sin asignatura'),
                    'reason' => $reason !== '' ? $reason : 'Priorizada por analisis IA.',
                    'link' => is_string($taskData['link'] ?? null) ? (string) $taskData['link'] : null,
                ];

                if (count($result[$quadrant]) >= 3) {
                    break;
                }
            }
        }

        $remaining = [];
        foreach ($taskMap as $bucket) {
            foreach ($bucket as $task) {
                $remaining[] = $task;
            }
        }

        foreach ($remaining as $task) {
            if (count($result['schedule']) >= 3) {
                break;
            }

            $result['schedule'][] = [
                'title' => (string) ($task['title'] ?? 'Tarea'),
                'course' => (string) ($task['course'] ?? 'Sin asignatura'),
                'reason' => 'Priorizacion de respaldo mientras se completa el analisis IA.',
                'link' => is_string($task['link'] ?? null) ? (string) $task['link'] : null,
            ];
        }

        return $result;
    }

    /**
     * @param  array<string, array<int, array<string, mixed>>>  $taskMap
     * @return array<string, mixed>|null
     */
    private function consumeTaskByTitle(array &$taskMap, string $title): ?array
    {
        $key = mb_strtolower(trim($title));

        if (! isset($taskMap[$key]) || $taskMap[$key] === []) {
            return null;
        }

        $task = array_shift($taskMap[$key]);

        if ($taskMap[$key] === []) {
            unset($taskMap[$key]);
        }

        return $task;
    }

    /**
     * @return array<string, array<int, array<string, string|null>>>
     */
    private function emptyMatrix(): array
    {
        return [
            'doNow' => [],
            'schedule' => [],
            'delegate' => [],
            'optimize' => [],
        ];
    }

    private function stripCodeBlock(string $content): string
    {
        $trimmed = trim($content);

        if (! str_starts_with($trimmed, '```')) {
            return $trimmed;
        }

        $trimmed = preg_replace('/^```[a-zA-Z0-9_-]*\s*/', '', $trimmed) ?? $trimmed;
        $trimmed = preg_replace('/```$/', '', $trimmed) ?? $trimmed;

        return trim($trimmed);
    }
}
