<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Bienvenido a {{ $appName }}</title>
</head>
<body style="margin:0;padding:0;background:#f2f4fb;font-family:'Space Grotesk','Instrument Sans','Segoe UI',Tahoma,sans-serif;color:#12161f;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f4fb;padding:32px 0 48px;">
    <tr>
        <td align="center" style="padding:0 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #d7deea;border-radius:4px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.08);">
                <tr>
                    <td style="background:#0b1a49;padding:0;">
                        <div style="height:3px;background:linear-gradient(90deg,#3600c9 0%,#4f06f9 55%,#6526ff 100%);"></div>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td width="72" valign="middle" style="padding:24px 0 24px 28px;">
                                    <div style="width:48px;height:48px;background:#ffffff;border:1px solid #e2e8f0;border-radius:4px;text-align:center;line-height:48px;overflow:hidden;">
                                        <img src="{{ isset($message) && is_object($message) && method_exists($message, 'embed') ? $message->embed(public_path('favicon.png')) : asset('favicon.png') }}" alt="{{ $appName }}" width="48" height="48" style="display:block;width:48px;height:48px;border:0;object-fit:contain;background:#ffffff;" />
                                    </div>
                                </td>
                                <td valign="middle" style="padding:24px 28px 24px 16px;">
                                    <p style="margin:0 0 4px 0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(167,139,250,0.7);font-weight:700;">
                                        {{ $appName }} · NUEVA CUENTA
                                    </p>
                                    <p style="margin:0;font-size:20px;font-weight:700;color:#f8f9fc;letter-spacing:-0.02em;line-height:1.2;">
                                        Bienvenido, nos alegra tenerte aqui
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr>
                    <td style="padding:28px;">
                        <p style="margin:0 0 8px 0;font-size:15px;line-height:1.5;color:#12161f;">
                            Hola{!! $recipientName !== '' ? ', <strong>' . e($recipientName) . '</strong>' : '' !!}.
                        </p>
                        <p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:#4b5565;">
                            Gracias por registrarte en <strong>{{ $appName }}</strong> y por confiar en nosotros para organizar tu dia a dia academico.
                        </p>
                        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.65;color:#4b5565;">
                            Ya puedes acceder a tu panel para revisar tu progreso, tareas y recursos. Si quieres reforzar la seguridad de tu cuenta, te recomendamos revisar la seccion de seguridad.
                        </p>

                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                            <tr>
                                <td>
                                    <a href="{{ $dashboardUrl }}" style="display:inline-block;padding:13px 28px;background:#4f06f9;color:#f7f0ff;text-decoration:none;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;border-radius:2px;">
                                        Ir a mi panel
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                            Gestiona tu seguridad aqui:
                            <a href="{{ $securityUrl }}" style="color:#4f06f9;text-decoration:none;">{{ $securityUrl }}</a>
                        </p>
                    </td>
                </tr>

                <tr>
                    <td style="padding:0 28px 24px 28px;">
                        <div style="height:1px;background:#d7deea;margin-bottom:16px;"></div>
                        <p style="margin:0;font-size:10px;color:#94a3b8;line-height:1.5;">
                            Este correo fue enviado automaticamente por {{ $appName }}.
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
