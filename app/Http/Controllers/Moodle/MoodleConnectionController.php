<?php

namespace App\Http\Controllers\Moodle;

use App\Http\Controllers\Controller;
use App\Jobs\Moodle\ConnectMoodleJob;
use App\Services\Moodle\MoodleAsyncSectionCache;
use App\Services\Moodle\MoodleCasClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MoodleConnectionController extends Controller
{
    public function __construct(
        private readonly MoodleCasClient $client,
        private readonly MoodleAsyncSectionCache $asyncCache,
    ) {}

    public function connect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'moodle_username' => ['required', 'string', 'max:255'],
            'moodle_password' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();

        $this->asyncCache->markPending('moodle-connect', $user->id);

        ConnectMoodleJob::dispatch($user->id, $data['moodle_username'], $data['moodle_password']);

        return response()->json(['status' => 'pending']);
    }

    public function connectStatus(Request $request): JsonResponse
    {
        $state = $this->asyncCache->getState('moodle-connect', $request->user()->id);

        return response()->json($state);
    }

    public function debug(Request $request): JsonResponse
    {
        abort_if(app()->isProduction(), 404);

        $data = $request->validate([
            'moodle_username' => ['required', 'string', 'max:255'],
            'moodle_password' => ['required', 'string', 'max:255'],
        ]);

        try {
            $session = $this->client->login($data['moodle_username'], $data['moodle_password'], withTrace: true);
            $response = [
                'message' => 'Login CAS completado.',
                'sesskey_detectado' => $session->sesskey !== '',
                'userid' => $session->userid,
                'trace' => $session->trace,
            ];
            $session->close();

            return response()->json($response);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => 'Falló en debug CAS.',
                'error' => $exception->getMessage(),
            ], 422);
        }
    }
}
