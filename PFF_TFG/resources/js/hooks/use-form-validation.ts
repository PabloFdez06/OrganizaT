import { useCallback, useState } from 'react';
import type { ChangeEvent, FocusEvent } from 'react';

/**
 * Regla de validación: recibe el valor del campo y todos los valores actuales del formulario.
 * Devuelve un mensaje de error (string) o null si es válido.
 */
export type ValidationRule = (value: string, allValues: Record<string, string>) => string | null;

/** Mapa de campo → lista de reglas */
export type ValidationSchema = Record<string, ValidationRule[]>;

/** Reglas de validación reutilizables */
export const rules = {
    required: (msg = 'Este campo es obligatorio.'): ValidationRule =>
        (v) => v.trim().length > 0 ? null : msg,

    email: (msg = 'Introduce un correo electrónico válido.'): ValidationRule =>
        (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : msg,

    minLength: (min: number, msg?: string): ValidationRule =>
        (v) => v.trim().length >= min ? null : (msg ?? `Mínimo ${min} caracteres.`),

    maxLength: (max: number, msg?: string): ValidationRule =>
        (v) => v.trim().length <= max ? null : (msg ?? `Máximo ${max} caracteres.`),

    /** Comprueba que el valor coincide con otro campo del formulario */
    matches: (field: string, msg = 'Los valores no coinciden.'): ValidationRule =>
        (v, all) => v === (all[field] ?? '') ? null : msg,
};

type Values = Record<string, string>;
type Errors = Record<string, string>;
type Touched = Record<string, boolean>;

/**
 * Hook de validación de formularios client-side.
 *
 * Uso:
 * ```tsx
 * const { clientErrors, handleChange, handleBlur, validateAll } = useFormValidation({
 *     email: [rules.required(), rules.email()],
 *     password: [rules.required(), rules.minLength(8)],
 * });
 * ```
 * - Añade `onChange={handleChange}` y `onBlur={handleBlur}` a los inputs.
 * - Añade `onBefore={() => validateAll()}` al componente `<Form>` de Inertia.
 * - Muestra errores con `clientErrors.fieldName`.
 */
export function useFormValidation(schema: ValidationSchema) {
    const [values, setValues] = useState<Values>({});
    const [clientErrors, setClientErrors] = useState<Errors>({});
    const [touched, setTouched] = useState<Touched>({});

    const runField = useCallback(
        (name: string, value: string, currentValues: Values): string => {
            for (const rule of schema[name] ?? []) {
                const error = rule(value, currentValues);
                if (error) return error;
            }
            return '';
        },
        [schema],
    );

    const handleChange = useCallback(
        (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const { name, value } = e.target;
            const updated = { ...values, [name]: value };
            setValues(updated);

            if (!touched[name]) return;

            // Re-valida todos los campos tocados para actualizar errores cruzados
            const newErrors: Errors = { ...clientErrors };
            newErrors[name] = runField(name, value, updated);

            for (const field in schema) {
                if (field !== name && touched[field]) {
                    newErrors[field] = runField(field, updated[field] ?? '', updated);
                }
            }

            setClientErrors(newErrors);
        },
        [values, touched, clientErrors, schema, runField],
    );

    const handleBlur = useCallback(
        (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const { name, value } = e.target;
            const updated = { ...values, [name]: value };
            setTouched((prev) => ({ ...prev, [name]: true }));
            const error = runField(name, value, updated);
            setClientErrors((prev) => ({ ...prev, [name]: error }));
        },
        [values, runField],
    );

    /** Valida todos los campos del schema. Devuelve true si el formulario es válido. */
    const validateAll = useCallback((): boolean => {
        const newErrors: Errors = {};
        const newTouched: Touched = {};
        let valid = true;

        for (const name in schema) {
            const value = values[name] ?? '';
            newTouched[name] = true;
            const error = runField(name, value, values);
            newErrors[name] = error;
            if (error) valid = false;
        }

        setClientErrors(newErrors);
        setTouched((prev) => ({ ...prev, ...newTouched }));
        return valid;
    }, [schema, values, runField]);

    const clearClientErrors = useCallback(() => {
        setClientErrors({});
        setTouched({});
    }, []);

    return { clientErrors, handleChange, handleBlur, validateAll, clearClientErrors };
}
