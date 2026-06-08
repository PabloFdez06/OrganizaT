<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe de calificaciones</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: DejaVu Sans, Arial, sans-serif;
            color: #1f2937;
            background: #f8fafc;
            font-size: 12px;
            line-height: 1.4;
        }
        .page {
            padding: 28px 30px;
        }
        .header {
            border-bottom: 2px solid #6a1cf6;
            padding-bottom: 14px;
            margin-bottom: 20px;
        }
        .title {
            margin: 0;
            font-size: 26px;
            line-height: 1;
            letter-spacing: -0.6px;
            color: #111827;
        }
        .title span {
            color: #6a1cf6;
        }
        .subtitle {
            margin-top: 8px;
            color: #4b5563;
            font-size: 11px;
        }
        .stats {
            margin-bottom: 20px;
            border-collapse: collapse;
            width: 100%;
        }
        .stats td {
            width: 25%;
            padding: 10px;
            border: 1px solid #e2e8f0;
            vertical-align: top;
            background: #ffffff;
        }
        .stats-label {
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #64748b;
            font-size: 9px;
            margin-bottom: 6px;
        }
        .stats-value {
            color: #111827;
            font-size: 20px;
            font-weight: 700;
            line-height: 1;
        }
        .subject {
            margin-bottom: 18px;
            border: 1px solid #e2e8f0;
            background: #ffffff;
        }
        .subject-head {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            background: #f8fafc;
        }
        .subject-code {
            text-transform: uppercase;
            color: #6a1cf6;
            font-size: 9px;
            letter-spacing: 0.8px;
        }
        .subject-name {
            margin: 3px 0 2px;
            font-size: 16px;
            line-height: 1.2;
            color: #111827;
        }
        .subject-meta {
            font-size: 10px;
            color: #475569;
        }
        .grades-table {
            border-collapse: collapse;
            width: 100%;
            table-layout: fixed;
        }
        .grades-table th,
        .grades-table td {
            border-top: 1px solid #e2e8f0;
            padding: 7px 8px;
            vertical-align: top;
            word-break: break-word;
            overflow-wrap: anywhere;
        }
        .grades-table th {
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            font-size: 9px;
            background: #f8fafc;
            border-top: 0;
        }
        .col-task { width: 50%; }
        .col-unit { width: 24%; }
        .col-grade { width: 13%; text-align: right; }
        .col-num { width: 13%; text-align: right; }
        .feedback-row td {
            background: #faf7ff;
            border-top: 0;
            padding-top: 6px;
            padding-bottom: 10px;
        }
        .feedback-label {
            display: block;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6b7280;
            font-size: 9px;
            margin-bottom: 4px;
        }
        .feedback-content {
            color: #334155;
            font-size: 10px;
            line-height: 1.45;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-wrap: anywhere;
        }
        .grade-badge {
            display: inline-block;
            background: #ede9fe;
            border: 1px solid #c4b5fd;
            color: #5b21b6;
            padding: 2px 6px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 700;
        }
        .feedback-empty {
            color: #94a3b8;
            font-style: italic;
        }
        .footer {
            margin-top: 12px;
            color: #64748b;
            font-size: 10px;
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="page">
        <header class="header">
            <h1 class="title">INFORME DE CALIFICACIONES<span>.</span></h1>
            <p class="subtitle">
                Alumno: <strong>{{ $studentName }}</strong> |
                Fecha: <strong>{{ $generatedAt->format('d/m/Y H:i') }}</strong>
            </p>
        </header>

        <table class="stats" role="presentation">
            <tr>
                <td>
                    <div class="stats-label">Media global</div>
                    <div class="stats-value">{{ $report['stats']['globalAverage'] !== null ? number_format($report['stats']['globalAverage'], 2) : 'N/A' }}</div>
                </td>
                <td>
                    <div class="stats-label">Asignaturas</div>
                    <div class="stats-value">{{ $report['stats']['subjectsCount'] }}</div>
                </td>
                <td>
                    <div class="stats-label">Tareas calificadas</div>
                    <div class="stats-value">{{ $report['stats']['gradedTasksCount'] }}</div>
                </td>
                <td>
                    <div class="stats-label">Con retroalimentación</div>
                    <div class="stats-value">{{ $report['stats']['feedbackTasksCount'] }}</div>
                </td>
            </tr>
        </table>

        @forelse($report['subjects'] as $subject)
            <section class="subject">
                <header class="subject-head">
                    @if($subject['code'] !== '')
                        <div class="subject-code">{{ $subject['code'] }}</div>
                    @endif
                    <h2 class="subject-name">{{ $subject['name'] }}</h2>
                    <div class="subject-meta">
                        Docente: {{ $subject['teacher'] }} |
                        Media asignatura: {{ $subject['average'] !== null ? number_format($subject['average'], 2) : 'N/A' }}
                    </div>
                </header>

                <table class="grades-table">
                    <thead>
                        <tr>
                            <th class="col-task">Actividad</th>
                            <th class="col-unit">Unidad</th>
                            <th class="col-grade">Calificación</th>
                            <th class="col-num">Sobre 10</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($subject['tasks'] as $task)
                            <tr>
                                <td class="col-task">{{ $task['task'] }}</td>
                                <td class="col-unit">{{ $task['unit'] }}</td>
                                <td class="col-grade">
                                    <span class="grade-badge">{{ $task['grade'] }}</span>
                                </td>
                                <td class="col-num">{{ $task['numericGrade'] !== null ? number_format($task['numericGrade'], 2) : 'N/A' }}</td>
                            </tr>
                            <tr class="feedback-row">
                                <td colspan="4">
                                    <span class="feedback-label">Retroalimentación</span>
                                    @if($task['feedback'])
                                        <div class="feedback-content">{{ $task['feedback'] }}</div>
                                    @else
                                        <span class="feedback-empty">Sin comentario</span>
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="4" class="feedback-empty">No hay tareas calificadas para esta asignatura.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </section>
        @empty
            <p class="feedback-empty">No hay datos de calificaciones disponibles para generar el informe.</p>
        @endforelse

        <footer class="footer">
            Informe generado automaticamente por OrganizaT
        </footer>
    </div>
</body>
</html>
