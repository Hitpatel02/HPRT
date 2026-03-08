import React, { useState, useEffect } from 'react';
import { Container, Table, Alert, Badge, Card, Form } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { selectToken } from '../redux/authSlice';
import { documentsAPI } from '../api';
import { getPreviousMonthFormatted } from '../utils/dateUtils';
import PageLoader from './common/PageLoader';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Format a timestamptz value as "08 Mar 2026 08:14" or return null */
function formatSentDate(dateVal) {
  if (!dateVal) return null;
  try {
    return new Date(dateVal).toLocaleString('en-GB', {
      day:    '2-digit',
      month:  'short',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return null;
  }
}

/** Reminder cell: green badge with timestamp if sent, grey "Not sent" otherwise */
function ReminderCell({ sent, sentDate }) {
  if (sent) {
    return (
      <Badge bg="success" style={{ fontSize: '0.75rem', whiteSpace: 'normal', textAlign: 'left' }}>
        ✓ {formatSentDate(sentDate) || 'Sent'}
      </Badge>
    );
  }
  return <Badge bg="secondary" style={{ fontSize: '0.73rem' }}>Not sent</Badge>;
}

/** Document received / pending / N/A badge */
function DocStatusBadge({ isReceived, isEnabled }) {
  if (!isEnabled) return <Badge bg="secondary">N/A</Badge>;
  return isReceived
    ? <Badge bg="success">Received</Badge>
    : <Badge bg="warning" text="dark">Pending</Badge>;
}

// ── Component ────────────────────────────────────────────────────────────────

const DocumentStatus = () => {
  const token = useSelector(selectToken);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [months, setMonths] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetchPendingDocuments();
  }, [token]);

  const fetchPendingDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await documentsAPI.getPending(token);
      setPendingDocuments(data);

      const uniqueMonths = [...new Set(data.map(doc => doc.document_month))];
      setMonths(uniqueMonths);

      const previousMonth = getPreviousMonthFormatted();
      if (uniqueMonths.includes(previousMonth)) {
        setFilterMonth(previousMonth);
      } else if (uniqueMonths.length > 0) {
        setFilterMonth([...uniqueMonths].sort().reverse()[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = filterMonth
    ? pendingDocuments.filter(doc => doc.document_month === filterMonth)
    : pendingDocuments;

  return (
    <Container fluid className="px-4">
      <h1 className="mb-4">Document Status</h1>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Filter Documents</Card.Title>
          <Form>
            <Form.Group>
              <Form.Label>Select Month</Form.Label>
              <Form.Select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                <option value="">All Months</option>
                {months.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Card.Body>
      </Card>

      {loading ? (
        <PageLoader message="Loading document status..." />
      ) : (
        <>
          <h3>Pending Documents</h3>
          {filteredDocuments.length === 0 ? (
            <Alert variant="warning">
              No pending documents found for {filterMonth || 'the selected month'}.
              Please select a different month.
            </Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Month</th>
                  <th>GST 1</th>
                  <th>Bank Statement</th>
                  <th>TDS</th>
                  {/* Reminder sent columns */}
                  <th title="GST Reminder 1 sent timestamp">GST R1 Sent</th>
                  <th title="GST Reminder 2 sent timestamp">GST R2 Sent</th>
                  <th title="TDS Reminder 1 sent timestamp">TDS R1 Sent</th>
                  <th title="TDS Reminder 2 sent timestamp">TDS R2 Sent</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map(doc => (
                  <tr key={doc.id}>
                    <td>{doc.client_name}</td>
                    <td>{doc.document_month}</td>
                    <td><DocStatusBadge isReceived={doc.gst_1_received}           isEnabled={doc.gst_1_enabled} /></td>
                    <td><DocStatusBadge isReceived={doc.bank_statement_received}   isEnabled={doc.bank_statement_enabled} /></td>
                    <td><DocStatusBadge isReceived={doc.tds_received}              isEnabled={doc.tds_document_enabled} /></td>
                    {/* Reminder timestamps */}
                    <td><ReminderCell sent={doc.gst_1_reminder_1_sent} sentDate={doc.gst_1_reminder_1_sent_date} /></td>
                    <td><ReminderCell sent={doc.gst_1_reminder_2_sent} sentDate={doc.gst_1_reminder_2_sent_date} /></td>
                    <td><ReminderCell sent={doc.tds_reminder_1_sent}   sentDate={doc.tds_reminder_1_sent_date} /></td>
                    <td><ReminderCell sent={doc.tds_reminder_2_sent}   sentDate={doc.tds_reminder_2_sent_date} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </Container>
  );
};

export default DocumentStatus;