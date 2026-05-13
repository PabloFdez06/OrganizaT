/**
 * Traduce mensajes de error del servidor (Laravel, en inglés) a mensajes en español
 * comprensibles para el usuario.
 */

const EXACT: Record<string, string> = {
    'These credentials do not match our records.':
        'El correo o la contraseña son incorrectos.',
    'The provided password is incorrect.': 'La contraseña actual es incorrecta.',
    'The password is incorrect.': 'La contraseña actual es incorrecta.',
    'The given password does not match your current password.':
        'La contraseña actual no es correcta.',
    'The email has already been taken.': 'Este correo ya está registrado.',
    'The name has already been taken.': 'Este nombre ya está en uso.',
    'The password field confirmation does not match.': 'Las contraseñas no coinciden.',
    'The password field must be at least 8 characters.':
        'La contraseña debe tener al menos 8 caracteres.',
    'The email field must be a valid email address.':
        'Introduce un correo electrónico válido.',
    'The email field is required.': 'El correo electrónico es obligatorio.',
    'The password field is required.': 'La contraseña es obligatoria.',
    'The name field is required.': 'El nombre es obligatorio.',
    'This password reset token is invalid.':
        'El enlace de recuperación no es válido o ha expirado.',
    'The token is invalid.': 'El enlace de recuperación no es válido o ha expirado.',
    'Too many requests. Please try again in a few seconds.':
        'Demasiados intentos. Por favor, espera unos segundos.',
    'Too many login attempts. Please try again in 60 seconds.':
        'Demasiados intentos de acceso. Por favor, espera 60 segundos.',
    'The given data was invalid.': 'Los datos proporcionados no son válidos.',
    'Your account is not active.': 'Tu cuenta no está activa.',
    'We can\'t find a user with that email address.':
        'No encontramos ninguna cuenta con ese correo.',
    'Please wait before retrying.': 'Por favor, espera antes de volver a intentarlo.',
    'The moodle_username field is required.': 'El usuario de Moodle es obligatorio.',
    'The moodle_password field is required.': 'La contraseña de Moodle es obligatoria.',
    'Credenciales Moodle inválidas.': 'Las credenciales de Moodle son incorrectas.',
    'No se pudo conectar con Moodle.': 'No se pudo conectar con Moodle. Comprueba tus datos.',
    'Invalid Moodle credentials.': 'Las credenciales de Moodle son incorrectas.',
    'CAS login succeeded but sesskey could not be extracted.': 'El inicio de sesión se completó, pero no se pudo verificar la sesión. Inténtalo de nuevo.',
    'Missing Moodle/CAS configuration.': 'Error de configuración del servidor Moodle. Contacta con el administrador.',
    'Moodle request failed after retries.': 'No se pudo conectar con Moodle tras varios intentos. Comprueba tu conexión.',
};

const PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [
        /The .+ field is required\./,
        () => 'Este campo es obligatorio.',
    ],
    [
        /The .+ must be at least (\d+) characters\./,
        (m) => `Debe tener al menos ${m[1]} caracteres.`,
    ],
    [
        /The .+ field must be at least (\d+) characters\./,
        (m) => `Debe tener al menos ${m[1]} caracteres.`,
    ],
    [
        /The .+ may not be greater than (\d+) characters\./,
        (m) => `No puede superar los ${m[1]} caracteres.`,
    ],
    [
        /The .+ must be a valid email address\./,
        () => 'Introduce un correo electrónico válido.',
    ],
    [
        /The .+ has already been taken\./,
        () => 'Este valor ya está en uso.',
    ],
    [
        /The .+ confirmation does not match\./,
        () => 'Las contraseñas no coinciden.',
    ],
    [
        /The password must be at least (\d+) characters\./,
        (m) => `La contraseña debe tener al menos ${m[1]} caracteres.`,
    ],
    [
        /Moodle request failed with HTTP 401/i,
        () => {
            return 'Las credenciales de Moodle son incorrectas.';
        },
    ],
    [
        /Moodle request failed with HTTP 403/i,
        () => {
            return 'No tienes permiso para acceder a Moodle.';
        },
    ],
    [
        /Moodle request failed with HTTP 404/i,
        () => {
            return 'No se encontró el servidor de Moodle. Comprueba la configuración.';
        },
    ],
    [
        /Moodle request failed with HTTP 429/i,
        () => {
            return 'Demasiadas solicitudes a Moodle. Espera unos momentos e inténtalo de nuevo.';
        },
    ],
    [
        /Moodle request failed with HTTP 5\d\d/i,
        () => {
            return 'El servidor de Moodle no está disponible en este momento. Inténtalo más tarde.';
        },
    ],
    [
        /Moodle request failed with HTTP 4\d\d/i,
        () => {
            return 'Error al conectar con Moodle. La solicitud fue rechazada.';
        },
    ],
    [
        /Moodle request failed with HTTP \d+/i,
        () => {
            return 'Error inesperado al conectar con Moodle.';
        },
    ],
    [
        /cURL request failed:/i,
        () => {
            return 'No se pudo establecer conexión con Moodle. Comprueba tu conexión a internet.';
        },
    ],
    [
        /Falta la configuración Moodle/i,
        () => {
            return 'Error de configuración del servidor Moodle. Contacta con el administrador.';
        },
    ],
];

/** Traduce un único mensaje de error del servidor. Si ya está en español, lo devuelve tal cual. */
export function translateServerError(message?: string): string | undefined {
    if (!message) {
        return undefined;
    }

    if (EXACT[message]) {
        return EXACT[message];
    }

    for (const [pattern, translate] of PATTERNS) {
        const match = message.match(pattern);

        if (match) {
            return translate(match);
        }
    }

    return message;
}

/** Traduce todos los errores de un objeto de errores de Inertia/Laravel. */
export function translateErrors(
    errors: Record<string, string>,
): Record<string, string> {
    return Object.fromEntries(
        Object.entries(errors).map(([key, msg]) => [key, translateServerError(msg) ?? msg]),
    );
}
