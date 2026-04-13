<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ (string) ($notification['title'] ?? 'Notificacion Moodle') }}</title>
</head>
<body style="margin:0;padding:0;background:#fbfcff;font-family:'Space Grotesk','Instrument Sans','Segoe UI',Tahoma,sans-serif;color:#12161f;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fbfcff;padding:14px 0;">
        <tr>
            <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #d7deea;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
                    <tr>
                        <td style="padding:18px 22px;background:linear-gradient(130deg,#3600c9 0%,#4f06f9 62%,#6526ff 100%);color:#ffffff;">
                            <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;opacity:0.86;">{{ $appName }} · Centro de notificaciones</p>
                            <h1 style="margin:0;font-size:21px;line-height:1.25;">{{ (string) ($notification['category'] ?? 'Notificacion academica') }}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 22px;">
                            <p style="margin:0 0 8px 0;font-size:15px;line-height:1.45;">
                                Hola{{ $recipientName !== '' ? ' '.$recipientName : '' }},
                            </p>
                            <p style="margin:0 0 10px 0;font-size:14px;line-height:1.45;color:#5a6475;">
                                {{ $introText }}
                            </p>

                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px 0;">
                                <tr>
                                    <td style="display:inline-block;padding:6px 10px;border-radius:999px;background:{{ $badgeBackground }};color:{{ $badgeText }};font-size:12px;font-weight:700;letter-spacing:0.2px;">
                                        {{ $triggerLabel }}
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;">
                                <tr>
                                    <td>
                                        <a href="{{ $actionUrl }}" style="display:inline-block;padding:10px 16px;border:1px solid transparent;border-radius:8px;background:#6a1cf6;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;line-height:1.2;">Abrir detalle</a>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #d7deea;border-radius:10px;overflow:hidden;background:#f2f4fb;">
                                <tr>
                                    <td style="padding:12px 14px 4px 14px;">
                                        <p style="margin:0;color:#5a6475;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Actividad</p>
                                        <p style="margin:4px 0 0 0;font-size:16px;font-weight:700;color:#12161f;">{{ (string) ($notification['title'] ?? 'Sin titulo') }}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:4px 14px;">
                                        <p style="margin:0;color:#5a6475;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Asignatura</p>
                                        <p style="margin:3px 0 0 0;font-size:14px;color:#12161f;">{{ (string) ($notification['course'] ?? 'Asignatura') }}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:4px 14px;">
                                        <p style="margin:0;color:#5a6475;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Fecha / referencia</p>
                                        <p style="margin:3px 0 0 0;font-size:14px;color:#12161f;">{{ (string) ($notification['dueLabel'] ?? 'Sin fecha') }}</p>
                                    </td>
                                </tr>
                                @if(trim((string) ($notification['meta'] ?? '')) !== '')
                                <tr>
                                    <td style="padding:4px 14px;">
                                        <p style="margin:0;color:#5a6475;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Contexto</p>
                                        <p style="margin:3px 0 0 0;font-size:13px;color:#6a1cf6;font-weight:700;">{{ (string) ($notification['meta'] ?? '') }}</p>
                                    </td>
                                </tr>
                                @endif
                                <tr>
                                    <td style="padding:4px 14px 12px 14px;">
                                        <p style="margin:0;color:#5a6475;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Detalle</p>
                                        <p style="margin:3px 0 0 0;font-size:14px;color:#12161f;line-height:1.45;">{{ (string) ($notification['message'] ?? '') }}</p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:10px 0 0 0;color:#5a6475;font-size:11px;line-height:1.4;">
                                Este mensaje fue enviado porque tienes activado el canal de correo para notificaciones Moodle.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
