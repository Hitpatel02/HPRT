/**
 * AgreementPage.jsx
 *
 * Page orchestrator for the Client Agreement PDF Generator.
 *
 * State flow:
 *   idle    → user fills form → handleGenerate → loading → PDF blob received
 *   loading → pdfUrl set      → preview shown  → download button enabled
 *
 * Memory management:
 *   - Old object URL is revoked before each new generation
 *   - useEffect cleanup revokes URL on unmount
 */
import React, { useState, useEffect, useRef } from 'react';
import AgreementForm from '../components/AgreementForm';
import AgreementPreview from '../components/AgreementPreview';
import DownloadButton from '../components/DownloadButton';
import { generateAgreement } from '../api/services/agreementService';
import '../css/AgreementPage.css';

export default function AgreementPage() {
    const [pdfUrl, setPdfUrl]       = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]         = useState(null);
    const [clientName, setClientName] = useState('');

    // Keep a ref to the current URL so the cleanup effect can revoke it
    const pdfUrlRef = useRef(null);

    // Cleanup: revoke object URL when component unmounts
    useEffect(() => {
        return () => {
            if (pdfUrlRef.current) {
                URL.revokeObjectURL(pdfUrlRef.current);
            }
        };
    }, []);

    const handleGenerate = async (formData) => {
        setIsLoading(true);
        setError(null);

        // Revoke previous object URL to prevent memory leak
        if (pdfUrlRef.current) {
            URL.revokeObjectURL(pdfUrlRef.current);
            pdfUrlRef.current = null;
            setPdfUrl(null);
        }

        try {
            const blob = await generateAgreement(formData);
            const url = URL.createObjectURL(blob);
            pdfUrlRef.current = url;
            setPdfUrl(url);
            setClientName(formData.client_name);
        } catch (err) {
            // Parse error message from blob if the server returned a JSON error
            let message = 'Failed to generate PDF. Please try again.';
            try {
                if (err.response?.data instanceof Blob) {
                    const text = await err.response.data.text();
                    const json = JSON.parse(text);
                    if (json.message) message = json.message;
                } else if (err.response?.data?.message) {
                    message = err.response.data.message;
                }
            } catch {}
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ag-page">
            <div className="ag-page-header">
                <h1 className="ag-page-title">Client Agreements</h1>
                <p className="ag-page-subtitle">
                    Fill in the client details to generate a professional service agreement PDF.
                </p>
            </div>

            <div className="ag-layout">
                {/* LEFT: Form + action bar */}
                <div className="ag-form-panel">
                    <div className="ag-card">
                        <div className="ag-card-header">Agreement Details</div>
                        <div className="ag-card-body">
                            <AgreementForm onGenerate={handleGenerate} isLoading={isLoading} />
                        </div>
                    </div>

                    {/* Error alert */}
                    {error && (
                        <div className="ag-error-alert" role="alert">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {/* Download button — disabled until PDF is ready */}
                    <div className="ag-download-row">
                        <DownloadButton pdfUrl={pdfUrl} clientName={clientName} />
                        {pdfUrl && (
                            <span className="ag-ready-label">✅ PDF ready — preview shown on the right</span>
                        )}
                    </div>
                </div>

                {/* RIGHT: Preview (sticky on desktop) */}
                <div className="ag-preview-panel">
                    <div className="ag-card ag-card--preview">
                        <div className="ag-card-header ag-card-header--preview">
                            PDF Preview
                            {pdfUrl && <span className="ag-preview-badge">Ready</span>}
                        </div>
                        <div className="ag-card-body ag-card-body--preview">
                            {isLoading ? (
                                <div className="ag-loading">
                                    <div className="ag-spinner" />
                                    <p>Generating PDF — this may take up to 30 seconds on first run…</p>
                                </div>
                            ) : (
                                <AgreementPreview pdfUrl={pdfUrl} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
