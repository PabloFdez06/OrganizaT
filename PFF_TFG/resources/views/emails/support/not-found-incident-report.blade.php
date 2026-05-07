<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Incidencia 404 reportada</title>
</head>
<body style="margin:0;padding:0;background:#f2f4fb;font-family:'Space Grotesk','Instrument Sans','Segoe UI',Tahoma,sans-serif;color:#12161f;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f4fb;padding:32px 0 48px;">
    <tr>
        <td align="center" style="padding:0 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #d7deea;border-radius:4px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.08);">
                <tr>
                    <td style="background:#0b1a49;padding:0;">
                        <div style="height:3px;background:linear-gradient(90deg,#3600c9 0%,#4f06f9 55%,#6526ff 100%);"></div>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td valign="middle" style="padding:24px 28px;">
                                    <p style="margin:0 0 4px 0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(167,139,250,0.7);font-weight:700;">
                                        {{ $appName }} · INCIDENT REPORT
                                    </p>
                                    <p style="margin:0;font-size:20px;font-weight:700;color:#f8f9fc;letter-spacing:-0.02em;line-height:1.2;">
                                        Nueva incidencia 404 reportada
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <tr>
                    <td style="padding:28px;">
                        <p style="margin:0 0 18px 0;font-size:14px;line-height:1.65;color:#4b5565;">
                            Se ha enviado un nuevo reporte manual desde la pantalla de error 404.
                        </p>

                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f4fb;border:1px solid #d7deea;border-radius:2px;margin-bottom:16px;">
                            <tr>
                                <td style="padding:14px 16px;border-bottom:1px solid #d7deea;">
                                    <p style="margin:0 0 4px 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#5a6475;font-weight:700;">URL DEL ERROR</p>
                                    <p style="margin:0;font-size:14px;line-height:1.5;color:#12161f;word-break:break-all;">{{ $errorUrl }}</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:14px 16px;border-bottom:1px solid #d7deea;">
                                    <p style="margin:0 0 4px 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#5a6475;font-weight:700;">TIMESTAMP (UTC)</p>
                                    <p style="margin:0;font-size:14px;line-height:1.5;color:#12161f;">{{ $reportedAt }}</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:14px 16px;border-bottom:1px solid #d7deea;">
                                    <p style="margin:0 0 4px 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#5a6475;font-weight:700;">REPORTADO POR</p>
                                    <p style="margin:0;font-size:14px;line-height:1.5;color:#12161f;">
                                        {{ $reporterName }} ({{ $reporterEmail }})
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding:14px 16px;">
                                    <p style="margin:0 0 4px 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#5a6475;font-weight:700;">DESCRIPCION</p>
                                    <p style="margin:0;font-size:14px;line-height:1.65;color:#12161f;white-space:pre-line;">{{ $description }}</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
