/**
 * WhatsAppSettings.jsx — Phase 3
 *
 * Full-page component for WhatsApp connection management.
 * Connects to Socket.io on mount to receive real-time QR/status events.
 */
import React, { useEffect, useState, useRef } from 'react';
import { Container, Card } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { selectToken } from '../redux/authSlice';
import WhatsAppQR from '../components/WhatsAppQR';
import WhatsAppControls from '../components/WhatsAppControls';
import '../css/WhatsAppSettings.css';
import axios from 'axios';

// Connect to the same origin as the API; adjust if frontend is on a different port
const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export default function WhatsAppSettings() {
    const token = useSelector(selectToken);

    const [state, setState] = useState('DISCONNECTED');
    const [qr, setQr] = useState(null);
    const [statusMessage, setStatusMessage] = useState('Not connected');
    const [info, setInfo] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);

    // New features state
    const [testGroupId, setTestGroupId] = useState('');
    const [testMessageLoading, setTestMessageLoading] = useState(false);
    const [testMessageFeedback, setTestMessageFeedback] = useState(null);
    const [groupRetrievalActive, setGroupRetrievalActive] = useState(false);

    const socketRef = useRef(null);

    // Helper for API calls
    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${token}` }
    });

    useEffect(() => {
        // Establish socket connection with auth
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setSocketConnected(true);
            // Request current status immediately
            socket.emit('whatsapp:get_status');
        });

        socket.on('disconnect', () => {
            setSocketConnected(false);
        });

        socket.on('whatsapp:status', (data) => {
            if (data.state) setState(data.state);
            if (data.message) setStatusMessage(data.message);
            if (data.info) setInfo(data.info);
        });

        socket.on('whatsapp:qr', ({ qr: qrData }) => {
            setQr(qrData);
            setState('INITIALIZING');
            setStatusMessage('Scan QR code with WhatsApp');
        });

        socket.on('whatsapp:ready', ({ info: readyInfo }) => {
            setState('CONNECTED');
            setQr(null);                   // Clear QR — no longer needed
            setStatusMessage('Connected');
            if (readyInfo) setInfo(readyInfo);
        });

        socket.on('whatsapp:disconnected', () => {
            setState('DISCONNECTED');
            setQr(null);
            setInfo(null);
            setStatusMessage('Disconnected');
        });

        socket.on('whatsapp:error', ({ message }) => {
            setStatusMessage(`Error: ${message}`);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('whatsapp:status');
            socket.off('whatsapp:qr');
            socket.off('whatsapp:ready');
            socket.off('whatsapp:disconnected');
            socket.off('whatsapp:error');
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token]);

    // After a REST action (connect/disconnect/delete), let the socket update state
    const handleAction = () => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('whatsapp:get_status');
        }
    };

    return (
        <Container className="wa-settings-container">
            <h2 className="wa-settings-title">WhatsApp Settings</h2>
            <p className="wa-settings-subtitle">
                Manage your WhatsApp connection for sending group reminders.
            </p>

            {/* Socket indicator */}
            <div className={`wa-socket-indicator ${socketConnected ? 'connected' : 'disconnected'}`}>
                {socketConnected ? '🟢 Live updates active' : '🔴 Reconnecting...'}
            </div>

            <div className="wa-settings-grid">
                {/* Control panel */}
                <Card className="wa-card">
                    <Card.Header className="wa-card-header">Connection</Card.Header>
                    <Card.Body>
                        <WhatsAppControls
                            state={state}
                            info={info}
                            onAction={handleAction}
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

                {/* Connected info panel */}
                {state === 'CONNECTED' && info && (
                    <Card className="wa-card wa-card--connected">
                        <Card.Header className="wa-card-header">Account Info</Card.Header>
                        <Card.Body>
                            <table className="wa-info-table">
                                <tbody>
                                    <tr>
                                        <td>Name</td>
                                        <td>{info.pushname || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td>Number</td>
                                        <td>{info.wid ? `+${info.wid}` : '—'}</td>
                                    </tr>
                                    <tr>
                                        <td>Platform</td>
                                        <td>{info.platform || '—'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </Card.Body>
                    </Card>
                )}
            </div>

            {/* WhatsApp Features Area */}
            {state === 'CONNECTED' && (
                <div className="wa-settings-grid mt-4">
                    {/* Test Message Panel */}
                    <Card className="wa-card">
                        <Card.Header className="wa-card-header">Test Message</Card.Header>
                        <Card.Body>
                            <p className="text-muted small">
                                Send a test message to ensure the bot can successfully message a specific group.
                            </p>
                            <div className="d-flex flex-column gap-2 mb-3">
                                <label className="form-label mb-0 fw-bold">Group ID</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="e.g. 120363384178779045@g.us"
                                    value={testGroupId}
                                    onChange={(e) => setTestGroupId(e.target.value)}
                                />
                            </div>
                            <button 
                                className="btn btn-primary w-100"
                                onClick={async () => {
                                    if (!testGroupId.trim()) {
                                        setTestMessageFeedback({ type: 'danger', text: 'Please enter a Group ID' });
                                        return;
                                    }
                                    setTestMessageLoading(true);
                                    setTestMessageFeedback(null);
                                    try {
                                        await axios.post(`${SOCKET_URL}/api/whatsapp/test`, { groupId: testGroupId }, getAuthHeaders());
                                        setTestMessageFeedback({ type: 'success', text: 'Test message sent successfully!' });
                                    } catch (err) {
                                        setTestMessageFeedback({ type: 'danger', text: err.response?.data?.message || 'Failed to send test message' });
                                    } finally {
                                        setTestMessageLoading(false);
                                    }
                                }}
                                disabled={testMessageLoading || !testGroupId.trim()}
                            >
                                {testMessageLoading ? 'Sending...' : 'Send Test Message'}
                            </button>
                            {testMessageFeedback && (
                                <div className={`alert alert-${testMessageFeedback.type} mt-3 py-2 px-3 mb-0 small`}>
                                    {testMessageFeedback.text}
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Group ID Lookup Panel */}
                    <Card className="wa-card">
                        <Card.Header className="wa-card-header">Group ID Lookup</Card.Header>
                        <Card.Body>
                            <p className="text-muted small mb-3">
                                Need to find a group ID? Start lookup mode and send <strong>!groupid</strong> in the WhatsApp group. The bot will automatically reply with the ID.
                            </p>
                            {groupRetrievalActive ? (
                                <div className="p-3 border rounded bg-light mb-3 text-center">
                                    <h6 className="text-primary mb-2">🟢 Lookup Mode Active</h6>
                                    <p className="small mb-0">Waiting for <strong>!groupid</strong> messages in WhatsApp...</p>
                                </div>
                            ) : null}
                            <button 
                                className={`btn ${groupRetrievalActive ? 'btn-danger' : 'btn-outline-primary'} w-100`}
                                onClick={async () => {
                                    try {
                                        if (groupRetrievalActive) {
                                            await axios.post(`${SOCKET_URL}/api/whatsapp/group-id/stop`, {}, getAuthHeaders());
                                            setGroupRetrievalActive(false);
                                        } else {
                                            await axios.post(`${SOCKET_URL}/api/whatsapp/group-id/start`, {}, getAuthHeaders());
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
                </div>
            )}

            {/* Help section */}
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
