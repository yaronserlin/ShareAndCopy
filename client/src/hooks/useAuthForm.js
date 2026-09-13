/**
 * Generic controlled-form hook shared by the login and register forms:
 * tracks field values, touched state, and per-field validation errors.
 */

import { useState, useCallback, useMemo } from 'react';
import { validateField } from '../utils/validation';

/**
 * @param {Object} initialState - Initial values, keyed by field name.
 * @param {boolean} [validatePasswordMatch=false] - Whether to validate a `confirmPassword` field against `password`.
 * @returns {{
 *   formData: Object,
 *   errors: Object<string, string|null>,
 *   touched: Object<string, boolean>,
 *   isValid: boolean,
 *   handleChange: Function,
 *   handleBlur: Function,
 *   validateAll: () => boolean,
 *   setFormData: Function
 * }}
 */
export const useAuthForm = (initialState, validatePasswordMatch = false) => {
    const [formData, setFormData] = useState(initialState);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    /** A form is valid when every field is non-empty and error-free. */
    const checkValidity = useCallback((currentData, currentErrors) => {
        const hasErrors = Object.values(currentErrors).some(error => error !== null);
        if (hasErrors) return false;

        const allFilled = Object.values(currentData).every(value => value !== '');
        return allFilled;
    }, []);

    /** Updates a field's value, re-validating it if already touched. */
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            return newData;
        });

        if (touched[name]) {
            const error = validateField(name, value, !validatePasswordMatch, validatePasswordMatch && name === 'confirmPassword' ? formData.password : undefined);
            setErrors(prev => {
                const newErrors = { ...prev, [name]: error };
                return newErrors;
            });
        }
    }, [touched, validatePasswordMatch, formData.password]);

    /** Marks a field touched and validates it immediately. */
    const handleBlur = useCallback((e) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));

        const error = validateField(name, value, !validatePasswordMatch, validatePasswordMatch && name === 'confirmPassword' ? formData.password : undefined);
        setErrors(prev => {
            const newErrors = { ...prev, [name]: error };
            return newErrors;
        });
    }, [validatePasswordMatch, formData.password]);

    /** Recomputes overall form validity whenever field values change. */
    const isValid = useMemo(() => {
        const currentErrors = {};
        Object.keys(formData).forEach(key => {
            currentErrors[key] = validateField(key, formData[key], !validatePasswordMatch, validatePasswordMatch && key === 'confirmPassword' ? formData.password : undefined);
        });

        return checkValidity(formData, currentErrors);
    }, [formData, validatePasswordMatch, checkValidity]);

    /**
     * Validates every field and marks them all touched, for use on
     * form submission.
     *
     * @returns {boolean} Whether the form has no validation errors.
     */
    const validateAll = useCallback(() => {
        const newErrors = {};
        const newTouched = {};

        Object.keys(formData).forEach(key => {
            newErrors[key] = validateField(key, formData[key], !validatePasswordMatch, validatePasswordMatch && key === 'confirmPassword' ? formData.password : undefined);
            newTouched[key] = true;
        });

        const activeErrors = {};
        Object.keys(newErrors).forEach(key => {
            if (newErrors[key] !== null) activeErrors[key] = newErrors[key];
        });

        setErrors(activeErrors);
        setTouched(newTouched);

        return Object.keys(activeErrors).length === 0;
    }, [formData, validatePasswordMatch]);

    return {
        formData,
        errors,
        touched,
        isValid,
        handleChange,
        handleBlur,
        validateAll,
        setFormData
    };
};
