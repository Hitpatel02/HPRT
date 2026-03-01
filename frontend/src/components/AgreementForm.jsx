import React, { useState } from 'react';
import '../css/AgreementForm.css';

// PAN regex: 5 uppercase letters, 4 digits, 1 uppercase letter
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const INITIAL_FORM = {
    client_name:    '',
    pan_number:     '',
    percentage:     '',
    party_name:     '',
    address:        '',
    agreement_date: '',
};

/**
 * AgreementForm
 *
 * @param {Function} onGenerate(formData)  — called with validated form data
 * @param {boolean}  isLoading             — shows spinner on Generate button
 */
export default function AgreementForm({ onGenerate, isLoading }) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        // Clear error for this field on change
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const errs = {};

        if (!form.client_name.trim())
            errs.client_name = 'Client name is required';

        const pan = form.pan_number.trim().toUpperCase();
        if (!pan)
            errs.pan_number = 'PAN number is required';
        else if (!PAN_REGEX.test(pan))
            errs.pan_number = 'Invalid PAN format (e.g. ABCDE1234F)';

        const pct = parseFloat(form.percentage);
        if (form.percentage.trim() === '')
            errs.percentage = 'Percentage is required';
        else if (isNaN(pct) || pct < 0 || pct > 100)
            errs.percentage = 'Must be a number between 0 and 100';

        if (!form.party_name.trim())
            errs.party_name = 'Party name is required';

        if (!form.address.trim())
            errs.address = 'Address is required';

        if (!form.agreement_date)
            errs.agreement_date = 'Agreement date is required';

        return errs;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        // Pass normalised PAN to parent
        onGenerate({
            ...form,
            pan_number: form.pan_number.trim().toUpperCase(),
            client_name: form.client_name.trim(),
            party_name: form.party_name.trim(),
            address: form.address.trim(),
        });
    };

    const Field = ({ label, name, type = 'text', placeholder, required = true }) => (
        <div className="agf-field">
            <label htmlFor={name} className="agf-label">
                {label}{required && <span className="agf-required">*</span>}
            </label>
            {name === 'address' ? (
                <textarea
                    id={name}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    rows={3}
                    className={`agf-input agf-textarea ${errors[name] ? 'agf-input--error' : ''}`}
                />
            ) : (
                <input
                    id={name}
                    name={name}
                    type={type}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className={`agf-input ${errors[name] ? 'agf-input--error' : ''}`}
                />
            )}
            {errors[name] && <span className="agf-error">{errors[name]}</span>}
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="agf-form" noValidate>
            <Field label="Client Name"      name="client_name"    placeholder="e.g. Sharma Enterprises" />
            <Field label="PAN Number"       name="pan_number"     placeholder="e.g. ABCDE1234F" />
            <Field label="Fee Percentage"   name="percentage"     type="number" placeholder="e.g. 18" />
            <Field label="Party / Firm Name" name="party_name"   placeholder="e.g. HPRT Associates" />
            <Field label="Client Address"   name="address"        placeholder="Full registered address" />
            <Field label="Agreement Date"   name="agreement_date" type="date" placeholder="" />

            <button
                type="submit"
                className="agf-submit-btn"
                disabled={isLoading}
            >
                {isLoading
                    ? <><span className="agf-btn-spinner" /> Generating...</>
                    : '📄 Generate Agreement'}
            </button>
        </form>
    );
}
