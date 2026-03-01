import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../css/WhatsAppQR.css';

/**
 * WhatsAppQR — Displays the WA QR code during connect flow.
 * @param {string|null} qr - QR data string emitted by socket
 */
export default function WhatsAppQR({ qr }) {
    if (!qr) {
        return (
            <div className="wa-qr-placeholder">
                <div className="wa-qr-spinner" />
                <p className="wa-qr-hint">Waiting for QR code...</p>
            </div>
        );
    }

    return (
        <div className="wa-qr-wrapper">
            <QRCodeSVG
                value={qr}
                size={220}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#128C7E"
            />
            <p className="wa-qr-hint">
                Open WhatsApp on your phone → <strong>Linked Devices</strong> → <strong>Link a device</strong> → Scan this code
            </p>
        </div>
    );
}
