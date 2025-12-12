import { useState, useCallback, useEffect } from 'react';
import { validateField } from '../utils/validation';

export const useAuthForm = (initialState, validatePasswordMatch = false) => {
    const [formData, setFormData] = useState(initialState);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isValid, setIsValid] = useState(false);

    const checkValidity = useCallback((currentData, currentErrors) => {
        // Check if there are any errors
        const hasErrors = Object.values(currentErrors).some(error => error !== null);
        if (hasErrors) return false;

        // Check if all required fields are filled (basic check)
        // This assumes all fields in initialState are required
        const allFilled = Object.values(currentData).every(value => value !== '');
        return allFilled;
    }, []);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            return newData;
        });

        // Validate immediately if touched
        if (touched[name]) {
            const error = validateField(name, value, !validatePasswordMatch, validatePasswordMatch && name === 'confirmPassword' ? formData.password : undefined);
            setErrors(prev => {
                const newErrors = { ...prev, [name]: error };
                return newErrors;
            });
        }
    }, [touched, validatePasswordMatch, formData.password]);

    const handleBlur = useCallback((e) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));

        const error = validateField(name, value, !validatePasswordMatch, validatePasswordMatch && name === 'confirmPassword' ? formData.password : undefined);
        setErrors(prev => {
            const newErrors = { ...prev, [name]: error };
            return newErrors;
        });
    }, [validatePasswordMatch, formData.password]);

    // Check validity whenever data or errors change
    useEffect(() => {
        // We need to validate all fields to determine overall validity, 
        // but we don't want to show errors for untouched fields just yet.
        // So we calculate potential errors for everything.
        const currentErrors = {};
        Object.keys(formData).forEach(key => {
            currentErrors[key] = validateField(key, formData[key], !validatePasswordMatch, validatePasswordMatch && key === 'confirmPassword' ? formData.password : undefined);
        });

        setIsValid(checkValidity(formData, currentErrors));
    }, [formData, validatePasswordMatch, checkValidity]);


    const validateAll = useCallback(() => {
        const newErrors = {};
        const newTouched = {};

        Object.keys(formData).forEach(key => {
            newErrors[key] = validateField(key, formData[key], !validatePasswordMatch, validatePasswordMatch && key === 'confirmPassword' ? formData.password : undefined);
            newTouched[key] = true;
        });

        // Filter out null errors
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
        setFormData // Exposed in case we need to manually set it
    };
};
