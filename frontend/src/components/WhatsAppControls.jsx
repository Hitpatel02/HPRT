import React, { useState } from 'react';
import { Button, Badge, Modal } from 'react-bootstrap';
import { connectWhatsApp, disconnectWhatsApp, deleteWhatsAppSession } from '../api/services/whatsappService';
import '../css/WhatsAppControls.css';

const STATE_LABELS = {
    DISCONNECTED: { label: 'Disconnected', variant: 'danger' },
    INITIALIZING: { label: 'Connecting...', variant: 'warning' },
    CONNECTED:    { label: 'Connected',    variant: 'success' },
};

/**
 * WhatsAppControls — Status badge + connect/disconnect/delete buttons.
 *
 * @param {string}   state         - 'DISCONNECTED' | 'INITIALIZING' | 'CONNECTED'
 * @param {Function} onAction      - called after any successful action
 * @param {Object}   info          - WA client info { wid, pushname, platform }
 */
export default function WhatsAppControls({ state, onAction, info }) {
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const { label, variant } = STATE_LABELS[state] || STATE_LABELS.DISCONNECTED;

    const doAction = async (fn, label) => {
        setLoading(true);
        setFeedback(null);
        try {
            const res = await fn();
            setFeedback({ type: 'success', text: res.message || `${label} successful` });
            if (onAction) onAction();
        } catch (err) {
            setFeedback({ type: 'danger', text: err?.response?.data?.message || err.message || `${label} failed` });
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = () => doAction(connectWhatsApp, 'Connect');
    const handleDisconnect = () => doAction(disconnectWhatsApp, 'Disconnect');
    const handleDeleteConfirmed = async () => {
        setShowDeleteConfirm(false);
        await doAction(deleteWhatsAppSession, 'Delete Session');
    };

    return (
        <div className="wa-controls">
            {/* Status badge */}
            <div className="wa-status-row">
                <span className="wa-status-label">Status:</span>
                <Badge bg={variant} className="wa-status-badge">{label}</Badge>
                {state === 'CONNECTED' && info?.pushname && (
                    <span className="wa-user-info">
                        {info.pushname} (+{info.wid})
                    </span>
                )}
            </div>

            {/* Feedback alert */}
            {feedback && (
                <div className={`wa-feedback wa-feedback--${feedback.type}`}>
                    {feedback.text}
                </div>
            )}

            {/* Action buttons */}
            <div className="wa-btn-row">
                <Button
                    variant="success"
                    disabled={loading || state === 'CONNECTED' || state === 'INITIALIZING'}
                    onClick={handleConnect}
                    className="wa-btn"
                >
                    {loading ? '...' : '🔌 Connect'}
                </Button>

                <Button
                    variant="warning"
                    disabled={loading || state === 'DISCONNECTED'}
                    onClick={handleDisconnect}
                    className="wa-btn"
                >
                    {loading ? '...' : '⏹ Disconnect'}
                </Button>

                <Button
                    variant="danger"
                    disabled={loading || state === 'INITIALIZING'}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="wa-btn"
                >
                    🗑 Delete Session
                </Button>
            </div>

            {/* Delete confirmation modal */}
            <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Delete WhatsApp Session?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    This will permanently delete the WhatsApp session files. You will need to scan a new QR code to reconnect.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteConfirmed}>Yes, Delete Session</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
