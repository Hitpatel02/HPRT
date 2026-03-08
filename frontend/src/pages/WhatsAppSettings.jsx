/**
 * WhatsAppSettings.jsx — Phase 3 (updated)
 *
 * Full-page component for WhatsApp connection management.
 * - Fetches initial status via HTTP on mount (no blank "Disconnected" flash)
 * - Connects to Socket.io for real-time QR/status events
 * - Shows sessionExists state to disable Delete Session when no session exists
 * - Group Message Tester always visible (disabled when disconnected)
 * - 90-second timeout when stuck in INITIALIZING state
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Container, Card } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { selectToken } from '../redux/authSlice';
import WhatsAppQR from '../components/WhatsAppQR';
import WhatsAppControls from '../components/WhatsAppControls';
import PageLoader from '../components/common/PageLoader';
import '../css/WhatsAppSettings.css';
import axios from 'axios';

// In production both frontend + backend are served from the same origin.
// VITE_API_URL is set in development .env only; window.location.origin is fine for production.
const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;

// How many seconds to wait in INITIALIZING before giving up (3 min — Puppeteer auth is slow)
const CONNECTING_TIMEOUT_S = 180;

export default function WhatsAppSettings() {
    const token = useSelector(selectToken);

    const [state, setState] = useState(null); // null = loading
    const [qr, setQr] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [info, setInfo] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const [sessionExists, setSessionExists] = useState(false);

    // Group Message Tester state
    const [testGroupId, setTestGroupId] = useState('');
    const [testGroupIdTouched, setTestGroupIdTouched] = useState(false);
    const [testCustomMsg, setTestCustomMsg] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [testFeedback, setTestFeedback] = useState(null);

    // Group ID Lookup state
    const [groupRetrievalActive, setGroupRetrievalActive] = useState(false);

    const socketRef = useRef(null);
    const connectingTimerRef = useRef(null);

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // ── Clear connecting timeout ───────────────────────────────────────────
    const clearConnectingTimer = useCallback(() => {
        if (connectingTimerRef.current) {
            clearTimeout(connectingTimerRef.current);
            connectingTimerRef.current = null;
        }
    }, []);

    // ── Start 90-second connecting timeout ────────────────────────────────
    const startConnectingTimer = useCallback(() => {
        clearConnectingTimer();
        connectingTimerRef.current = setTimeout(() => {
            setState((prev) => {
                if (prev === 'INITIALIZING') {
                    setStatusMessage('Connection timed out. Please try again.');
                    return 'DISCONNECTED';
                }
                return prev;
            });
        }, CONNECTING_TIMEOUT_S * 1000);
    }, [clearConnectingTimer]);

    // ── Apply status from data object (from HTTP or socket) ────────────────
    const applyStatus = useCallback((data) => {
        if (!data) return;
        const newState = data.state || data.status;
        if (newState) {
            setState(newState);
            if (newState === 'INITIALIZING') {
                startConnectingTimer();
            } else {
                clearConnectingTimer();
            }
        }
        if (data.message) setStatusMessage(data.message);
        if (data.info) setInfo(data.info);
        if (typeof data.sessionExists === 'boolean') setSessionExists(data.sessionExists);
    }, [startConnectingTimer, clearConnectingTimer]);

    // ── Fetch status via HTTP on mount ────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        axios.get(`${API_BASE}/api/whatsapp/status`, authHeaders)
            .then(({ data }) => {
                if (cancelled) return;
                applyStatus(data);
            })
            .catch(() => {
                if (!cancelled) setState('DISCONNECTED');
            });
        return () => { cancelled = true; };
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Socket.io connection ───────────────────────────────────────────────
    useEffect(() => {
        const socket = io(API_BASE, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setSocketConnected(true);
            socket.emit('whatsapp:get_status');
        });

        socket.on('connect_error', (err) => {
            // Log only once; socket.io handles reconnect silently
            setSocketConnected(false);
        });

        socket.on('disconnect', () => {
            setSocketConnected(false);
        });

        socket.on('whatsapp:status', (data) => {
            applyStatus(data);
        });

        socket.on('whatsapp:qr', ({ qr: qrData }) => {
            setQr(qrData);
            setState('INITIALIZING');
            setStatusMessage('Scan QR code with WhatsApp');
            startConnectingTimer();
        });

        socket.on('whatsapp:ready', ({ info: readyInfo }) => {
            setState('CONNECTED');
            setQr(null);
            setStatusMessage('Connected');
            setSessionExists(true);
            clearConnectingTimer();
            if (readyInfo) setInfo(readyInfo);
        });

        socket.on('whatsapp:disconnected', () => {
            setState('DISCONNECTED');
            setQr(null);
            setInfo(null);
            clearConnectingTimer();
            setStatusMessage('Disconnected');
        });

        socket.on('whatsapp:error', ({ message }) => {
            setStatusMessage(`Error: ${message}`);
            clearConnectingTimer();
        });

        return () => {
            clearConnectingTimer();
            socket.off('connect');
            socket.off('connect_error');
            socket.off('disconnect');
            socket.off('whatsapp:status');
            socket.off('whatsapp:qr');
            socket.off('whatsapp:ready');
            socket.off('whatsapp:disconnected');
            socket.off('whatsapp:error');
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token, applyStatus, startConnectingTimer, clearConnectingTimer]);

    // ── Refresh status after a REST action ───────────────────────────────
    const handleAction = () => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('whatsapp:get_status');
        }
        // Also refresh via HTTP so sessionExists is up-to-date
        axios.get(`${API_BASE}/api/whatsapp/status`, authHeaders)
            .then(({ data }) => applyStatus(data))
            .catch(() => {});
    };

    // ── Refresh sessionExists after delete ────────────────────────────────
    const handleSessionDeleted = () => {
        setSessionExists(false);
        handleAction();
    };

    // ── Send test message ─────────────────────────────────────────────────
    const handleSendTest = async () => {
        setTestGroupIdTouched(true);
        if (!testGroupId.trim()) return;
        setTestLoading(true);
        setTestFeedback(null);
        try {
            await axios.post(
                `${API_BASE}/api/whatsapp/test`,
                { groupId: testGroupId.trim(), message: testCustomMsg.trim() || undefined },
                authHeaders
            );
            setTestFeedback({ type: 'success', text: '✅ Message sent successfully to the group' });
        } catch (err) {
            setTestFeedback({
                type: 'danger',
                text: err.response?.data?.message || 'Failed to send message',
            });
        } finally {
            setTestLoading(false);
        }
    };

    const isConnected = state === 'CONNECTED';

    // Show skeleton/loading until HTTP status resolves
    if (state === null) {
        return (
            <Container className="wa-settings-container">
                <h2 className="wa-settings-title">WhatsApp Settings</h2>
                <PageLoader message="Loading WhatsApp status..." />
            </Container>
        );
    }

    return (
        <Container className="wa-settings-container">
            <h2 className="wa-settings-title">WhatsApp Settings</h2>
            <p className="wa-settings-subtitle">
                Manage your WhatsApp connection for sending group reminders.
            </p>

            {/* Socket live-update indicator */}
            <div className={`wa-socket-indicator ${socketConnected ? 'connected' : 'disconnected'}`}>
                {socketConnected ? '🟢 Live updates active' : '🔴 Reconnecting...'}
            </div>

            {/* Timeout alert */}
            {state === 'DISCONNECTED' && statusMessage.includes('timed out') && (
                <div className="alert alert-warning py-2 px-3 small mb-3">
                    ⚠️ {statusMessage}
                </div>
            )}

            <div className="wa-settings-grid">
                {/* Connection control card */}
                <Card className="wa-card">
                    <Card.Header className="wa-card-header">Connection</Card.Header>
                    <Card.Body>
                        <WhatsAppControls
                            state={state}
                            info={info}
                            sessionExists={sessionExists}
                            onAction={handleAction}
                            onSessionDeleted={handleSessionDeleted}
                        />
                        <div className="wa-status-message">{statusMessage}</div>
                    </Card.Body>
                </Card>

                {/* QR panel — only visible during INITIALIZING */}
                {state === 'INITIALIZING' && (
                    <Card className="wa-card">
                        <Card.Header className="wa-card-header">Scan QR Code</Card.Header>
                        <Card.Body className="wa-qr-card-body">
                            <WhatsAppQR qr={qr} />
                        </Card.Body>
                    </Card>
                )}

                {/* Connected account info panel */}
                {state === 'CONNECTED' && info && (
                    <Card className="wa-card wa-card--connected">
                        <Card.Header className="wa-card-header">Account Info</Card.Header>
                        <Card.Body>
                            <table className="wa-info-table">
                                <tbody>
                                    <tr><td>Name</td><td>{info.pushname || '—'}</td></tr>
                                    <tr><td>Number</td><td>{info.wid ? `+${info.wid}` : '—'}</td></tr>
                                    <tr><td>Platform</td><td>{info.platform || '—'}</td></tr>
                                </tbody>
                            </table>
                        </Card.Body>
                    </Card>
                )}
            </div>

            {/* ── Features area — always visible ─────────────────────────── */}
            <div className="wa-settings-grid mt-4">

                {/* Group Message Tester — always shown, button disabled when disconnected */}
                <Card className="wa-card">
                    <Card.Header className="wa-card-header">Group Message Tester</Card.Header>
                    <Card.Body>
                        <p className="text-muted small">
                            Send a test message to a WhatsApp group to verify connectivity.
                        </p>

                        {/* Group ID field */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold mb-1">WhatsApp Group ID</label>
                            <input
                                type="text"
                                className={`form-control${testGroupIdTouched && !testGroupId.trim() ? ' is-invalid' : ''}`}
                                placeholder="e.g. 120363XXXXXXXXXX@g.us"
                                value={testGroupId}
                                onChange={(e) => setTestGroupId(e.target.value)}
                                onBlur={() => setTestGroupIdTouched(true)}
                            />
                            {testGroupIdTouched && !testGroupId.trim() && (
                                <div className="invalid-feedback">Group ID is required</div>
                            )}
                        </div>

                        {/* Optional custom message */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold mb-1">
                                Message <span className="text-muted fw-normal">(optional)</span>
                            </label>
                            <textarea
                                className="form-control"
                                placeholder="Leave blank to send default test message"
                                rows={3}
                                value={testCustomMsg}
                                onChange={(e) => setTestCustomMsg(e.target.value)}
                            />
                        </div>

                        <button
                            className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                            onClick={handleSendTest}
                            disabled={testLoading || !isConnected || !testGroupId.trim()}
                        >
                            {testLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                    Sending...
                                </>
                            ) : 'Send to Group'}
                        </button>

                        {!isConnected && (
                            <p className="text-muted small text-center mt-2 mb-0">
                                ⚠️ WhatsApp must be connected to send messages
                            </p>
                        )}

                        {testFeedback && (
                            <div className={`alert alert-${testFeedback.type} mt-3 py-2 px-3 mb-0 small`}>
                                {testFeedback.text}
                            </div>
                        )}

                        <p className="text-muted small mt-3 mb-0">
                            💡 Tip: To find your group ID, add the bot to a WhatsApp group and send <strong>!groupid</strong> in the group
                        </p>
                    </Card.Body>
                </Card>

                {/* Group ID Lookup — only useful when connected */}
                {isConnected && (
                    <Card className="wa-card">
                        <Card.Header className="wa-card-header">Group ID Lookup</Card.Header>
                        <Card.Body>
                            <p className="text-muted small mb-3">
                                Need to find a group ID? The bot automatically replies with the group ID
                                whenever anyone sends <strong>!groupid</strong> in any group the bot is a member of.
                                No mode-switching needed.
                            </p>
                            <div className="alert alert-info py-2 px-3 small mb-3">
                                <strong>How to use:</strong> Add the bot to your WhatsApp group, then send <code>!groupid</code> — the bot will reply instantly.
                            </div>
                            {groupRetrievalActive ? (
                                <div className="p-3 border rounded bg-light mb-3 text-center">
                                    <h6 className="text-primary mb-2">🟢 Lookup Mode Active</h6>
                                    <p className="small mb-0">
                                        Waiting for <strong>!groupid</strong> messages in WhatsApp...
                                    </p>
                                </div>
                            ) : null}
                            <button
                                className={`btn ${groupRetrievalActive ? 'btn-danger' : 'btn-outline-primary'} w-100`}
                                onClick={async () => {
                                    try {
                                        if (groupRetrievalActive) {
                                            await axios.post(`${API_BASE}/api/whatsapp/group-id/stop`, {}, authHeaders);
                                            setGroupRetrievalActive(false);
                                        } else {
                                            await axios.post(`${API_BASE}/api/whatsapp/group-id/start`, {}, authHeaders);
                                            setGroupRetrievalActive(true);
                                        }
                                    } catch (err) {
                                        alert(err.response?.data?.message || 'Action failed');
                                    }
                                }}
                            >
                                {groupRetrievalActive ? 'Stop Lookup Mode' : 'Start Lookup Mode'}
                            </button>
                        </Card.Body>
                    </Card>
                )}
            </div>

            {/* Help */}
            <Card className="wa-card wa-card--help mt-4">
                <Card.Header className="wa-card-header">How it works</Card.Header>
                <Card.Body>
                    <ol className="wa-help-list">
                        <li>Click <strong>Connect</strong> — a QR code will appear above.</li>
                        <li>Open WhatsApp on your phone → <strong>Linked Devices</strong> → <strong>Link a device</strong>.</li>
                        <li>Scan the QR code. Status will change to <strong>Connected</strong>.</li>
                        <li>If you restart the server, the session persists — no re-scan needed.</li>
                        <li>Use <strong>Disconnect</strong> to stop sending without deleting the session.</li>
                        <li>Use <strong>Delete Session</strong> to fully reset (requires a new QR scan).</li>
                    </ol>
                </Card.Body>
            </Card>
        </Container>
    );
}
