/**
 * WhatsAppSettings.jsx — Phase 3
 *
 * Full-page component for WhatsApp connection management.
 * Connects to Socket.io on mount to receive real-time QR/status events.
 */
import React, { useEffect, useState, useRef } from 'react';
import { Container, Card } from 'react-bootstrap';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { selectToken } from '../redux/authSlice';
import WhatsAppQR from '../components/WhatsAppQR';
import WhatsAppControls from '../components/WhatsAppControls';
import '../css/WhatsAppSettings.css';

// Connect to the same origin as the API; adjust if frontend is on a different port
const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export default function WhatsAppSettings() {
    const token = useSelector(selectToken);

    const [state, setState] = useState('DISCONNECTED');
    const [qr, setQr] = useState(null);
    const [statusMessage, setStatusMessage] = useState('Not connected');
    const [info, setInfo] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);

    const socketRef = useRef(null);

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

            {/* Help section */}
            <Card className="wa-card wa-card--help">
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
