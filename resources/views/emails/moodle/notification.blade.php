<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>{{ (string) ($notification['title'] ?? 'Notificacion Moodle') }}</title>
</head>

<body style="margin:0;padding:0;background:#f2f4fb;font-family:'Space Grotesk','Instrument Sans','Segoe UI',Tahoma,sans-serif;color:#12161f;-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">

<!-- ░░ Outer wrapper ░░ -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="background:#f2f4fb;padding:32px 0 48px;">
    <tr>
        <td align="center" style="padding:0 16px;">

            <!-- ░░ Card ░░ -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                   style="max-width:600px;background:#ffffff;border:1px solid #d7deea;border-radius:4px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.08);">

                <!-- ═══ HEADER ═══ -->
                <tr>
                    <td style="background:#0b1a49;padding:0;">
                        <!-- Top accent line -->
                        <div style="height:3px;background:linear-gradient(90deg,#3600c9 0%,#4f06f9 55%,#6526ff 100%);"></div>

                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <!-- Icon column -->
                                <td width="72" valign="middle"
                                    style="padding:24px 0 24px 28px;">
                                    <div style="width:48px;height:48px;background:#ffffff;border:1px solid #e2e8f0;border-radius:4px;text-align:center;line-height:48px;overflow:hidden;box-shadow:0 0 0 1px rgba(167,139,250,0.45),0 6px 14px rgba(15,23,42,0.22);">
                                        <img src="{{ isset($message) && is_object($message) && method_exists($message, 'embed') ? $message->embed(public_path('favicon.png')) : asset('favicon.png') }}" alt="OrganizaT" width="48" height="48" style="display:block;width:48px;height:48px;border:0;object-fit:contain;background:#ffffff;" />
                                    </div>
                                </td>

                                <!-- Text column -->
                                <td valign="middle" style="padding:24px 28px 24px 16px;">
                                    <!-- Eyebrow -->
                                    <p style="margin:0 0 4px 0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(167,139,250,0.7);font-weight:700;">
                                        {{ $appName }}&nbsp;&nbsp;·&nbsp;&nbsp;{{ trim((string) ($notification['category'] ?? 'Notificacion academica')) }}
                                    </p>
                                    <!-- Title -->
                                    <p style="margin:0;font-size:18px;font-weight:700;color:#f8f9fc;letter-spacing:-0.02em;line-height:1.2;">
                                        {{ (string) ($notification['title'] ?? 'Sin titulo') }}
                                    </p>
                                </td>

                                <!-- Badge column -->
                                <td valign="middle" align="right"
                                    style="padding:24px 28px 24px 0;white-space:nowrap;">
                                    <span style="display:inline-block;padding:4px 10px;background:{{ $badgeBackground }};color:{{ $badgeText }};font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;border-radius:2px;">
                                        {{ $triggerLabel }}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- ═══ BODY ═══ -->
                <tr>
                    <td style="padding:28px 28px 0 28px;">

                        <!-- Greeting -->
                        <p style="margin:0 0 6px 0;font-size:15px;line-height:1.5;color:#12161f;">
                            Hola{!! trim((string) ($recipientName ?? '')) !== '' ? ', <strong>' . e(trim((string) ($recipientName ?? ''))) . '</strong>' : '' !!}.
                        </p>
                        <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#5a6475;">
                            {{ $introText }}
                        </p>

                        <!-- ─── Info card ─── -->
                        <!-- Left-border accent matches severity level -->
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                               style="background:#f2f4fb;border:1px solid #d7deea;border-left:3px solid {{ ($notification['level'] ?? 'info') === 'critical' ? '#dc2626' : (($notification['level'] ?? 'info') === 'warning' ? '#ea580c' : '#4f06f9') }};border-radius:2px;margin-bottom:24px;">

                            <!-- Course + Date row -->
                            <tr>
                                <td width="50%" valign="top"
                                    style="padding:16px 16px 8px 18px;border-right:1px solid #d7deea;">
                                    <p style="margin:0 0 3px 0;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#5a6475;">
                                        Asignatura
                                    </p>
                                    <p style="margin:0;font-size:14px;font-weight:700;color:#12161f;line-height:1.35;">
                                        {{ (string) ($notification['course'] ?? '—') }}
                                    </p>
                                </td>
                                <td width="50%" valign="top"
                                    style="padding:16px 16px 8px 16px;">
                                    <p style="margin:0 0 3px 0;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#5a6475;">
                                        Fecha&nbsp;/&nbsp;Referencia
                                    </p>
                                    <p style="margin:0;font-size:14px;font-weight:700;color:#12161f;line-height:1.35;">
                                        {{ (string) ($notification['dueLabel'] ?? '—') }}
                                    </p>
                                </td>
                            </tr>

                            <!-- Divider -->
                            <tr>
                                <td colspan="2" style="padding:0 18px;">
                                    <div style="height:1px;background:#d7deea;"></div>
                                </td>
                            </tr>

                            @if(trim((string) ($notification['meta'] ?? '')) !== '')
                            <!-- Meta row -->
                            <tr>
                                <td colspan="2" style="padding:10px 18px 0 18px;">
                                    <p style="margin:0 0 3px 0;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#5a6475;">
                                        Contexto
                                    </p>
                                    <p style="margin:0;font-size:13px;font-weight:700;color:#4f06f9;line-height:1.4;">
                                        {{ (string) ($notification['meta'] ?? '') }}
                                    </p>
                                </td>
                            </tr>
                            <!-- Divider -->
                            <tr>
                                <td colspan="2" style="padding:10px 18px 0 18px;">
                                    <div style="height:1px;background:#d7deea;"></div>
                                </td>
                            </tr>
                            @endif

                            <!-- Detail row -->
                            @if(trim((string) ($notification['message'] ?? '')) !== '')
                            <tr>
                                <td colspan="2" style="padding:10px 18px 16px 18px;">
                                    <p style="margin:0 0 3px 0;font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#5a6475;">
                                        Detalle
                                    </p>
                                    <p style="margin:0;font-size:13px;color:#12161f;line-height:1.55;">
                                        {{ (string) ($notification['message'] ?? '') }}
                                    </p>
                                </td>
                            </tr>
                            @endif

                        </table>

                        <!-- CTA -->
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                               style="margin-bottom:28px;">
                            <tr>
                                <td>
                                    <a href="{{ $actionUrl }}"
                                       style="display:inline-block;padding:13px 28px;background:#4f06f9;color:#f7f0ff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;border-radius:2px;box-shadow:0 8px 16px -6px rgba(79,6,249,0.4);">
                                        Abrir en {{ $appName }}
                                    </a>
                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>

                <!-- ═══ FOOTER ═══ -->
                <tr>
                    <td style="padding:0 28px 24px 28px;">
                        <!-- Thin divider -->
                        <div style="height:1px;background:#d7deea;margin-bottom:16px;"></div>

                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <!-- App wordmark -->
                                <td valign="middle">
                                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#5a6475;">
                                        {{ $appName }}<span style="color:#4f06f9;">.</span>
                                    </p>
                                </td>
                                <!-- Disclaimer -->
                                <td valign="middle" align="right">
                                    <p style="margin:0;font-size:10px;color:#94a3b8;line-height:1.4;text-align:right;">
                                        Recibiste este aviso porque tienes activo<br>el canal de correo en tus preferencias.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

            </table>
            <!-- /Card -->

        </td>
    </tr>
</table>

</body>
</html>