import React from 'react';
import '../css/DownloadButton.css';

/**
 * DownloadButton
 *
 * Triggers a browser-native file download using the object URL.
 * Disabled when pdfUrl is null (before generation).
 * Does NOT auto-click — only responds to user action.
 *
 * @param {string|null} pdfUrl      — object URL from URL.createObjectURL
 * @param {string}      clientName  — used to build filename
 */
export default function DownloadButton({ pdfUrl, clientName }) {
    const handleDownload = () => {
        if (!pdfUrl) return;

        const safeClientName = (clientName || 'Client').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
        const filename = `Agreement_${safeClientName}.pdf`;

        // Create a temporary anchor and trigger download
        const anchor = document.createElement('a');
        anchor.href = pdfUrl;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    };

    return (
        <button
            className={`dl-btn ${!pdfUrl ? 'dl-btn--disabled' : 'dl-btn--ready'}`}
            onClick={handleDownload}
            disabled={!pdfUrl}
            title={pdfUrl ? `Download Agreement_${clientName || 'Client'}.pdf` : 'Generate an agreement first'}
        >
            ⬇ Download PDF
        </button>
    );
}
