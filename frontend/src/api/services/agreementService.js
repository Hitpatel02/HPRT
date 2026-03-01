/**
 * agreementService.js — Frontend API service
 * Generates a PDF blob from the backend Agreement endpoint.
 * Uses native fetch (not apiRequest) because we need binary blob response.
 */

const BASE_URL = '/api/agreements';

/**
 * Generate an agreement PDF.
 * @param {Object} formData
 * @returns {Promise<Blob>} PDF blob
 */
export const generateAgreement = async (formData) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${BASE_URL}/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
    });

    if (!response.ok) {
        // Try to parse error message from response
        let message = `PDF generation failed (${response.status})`;
        try {
            const errorJson = await response.json();
            if (errorJson.message) message = errorJson.message;
        } catch { }
        const err = new Error(message);
        // Attach status for caller inspection
        err.status = response.status;
        throw err;
    }

    return response.blob();
};
