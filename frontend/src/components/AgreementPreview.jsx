import React from 'react';
import '../css/AgreementPreview.css';

/**
 * AgreementPreview
 *
 * Renders the generated PDF inside an iframe.
 * Shows a placeholder when no PDF has been generated yet.
 *
 * @param {string|null} pdfUrl  — object URL created from PDF blob
 */
export default function AgreementPreview({ pdfUrl }) {
    if (!pdfUrl) {
        return (
            <div className="agp-placeholder">
                <div className="agp-placeholder-icon">📄</div>
                <p className="agp-placeholder-text">
                    Fill in the form and click <strong>Generate Agreement</strong> to preview the PDF here.
                </p>
            </div>
        );
    }

    return (
        <div className="agp-wrapper">
            <iframe
                src={pdfUrl}
                className="agp-iframe"
                title="Agreement PDF Preview"
            />
        </div>
    );
}
