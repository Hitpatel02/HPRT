import React, { useState, useEffect } from 'react';
import { Container, Table, Alert, Spinner, Card, Form, Button, Badge } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { selectToken } from '../redux/authSlice';
import { documentsAPI } from '../api';
import { getPreviousMonthFormatted } from '../utils/dateUtils';

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
      
      // Fetch all documents with pending status using the API service
      const data = await documentsAPI.getPending(token);
      setPendingDocuments(data);
      
      // Extract unique months for filtering
      const uniqueMonths = [...new Set(data.map(doc => doc.document_month))];
      setMonths(uniqueMonths);
      
      // Get the previous month in the expected format
      const previousMonth = getPreviousMonthFormatted();
      
      // Set the filter to the previous month if it exists in our data
      if (uniqueMonths.includes(previousMonth)) {
        setFilterMonth(previousMonth);
      } else if (uniqueMonths.length > 0) {
        // If previous month doesn't exist, use the most recent month
        const sortedMonths = [...uniqueMonths].sort().reverse();
        setFilterMonth(sortedMonths[0]);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter documents based on selected month
  const filteredDocuments = filterMonth 
    ? pendingDocuments.filter(doc => doc.document_month === filterMonth)
    : pendingDocuments;

  // Function to display document status
  const renderStatus = (isReceived, isEnabled) => {
    if (!isEnabled) {
      return <Badge bg="secondary">Not applicable</Badge>;
    }
    
    return isReceived ? (
      <Badge bg="success">Received</Badge>
    ) : (
      <Badge bg="warning" text="dark">Pending</Badge>
    );
  };

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
              <Form.Select 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)}
              >
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
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading document status...</p>
        </div>
      ) : (
        <>
          <h3>Pending Documents</h3>
          {filteredDocuments.length === 0 ? (
            <Alert variant="warning">
              No pending documents found for {filterMonth || "the selected month"}. Please select a different month.
            </Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Month</th>
                  <th>GST 1</th>
                  <th>Bank Statement</th>
                  <th>TDS Statement</th>
                  <th>Last Reminder</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map(doc => (
                  <tr key={doc.id}>
                    <td>{doc.client_name}</td>
                    <td>{doc.document_month}</td>
                    <td>
                      {renderStatus(doc.gst_1_received, doc.gst_1_enabled)}
                    </td>
                    <td>
                      {renderStatus(doc.bank_statement_received, doc.bank_statement_enabled)}
                    </td>
                    <td>
                      {renderStatus(doc.tds_received, doc.tds_document_enabled)}
                    </td>
                    <td>
                      {doc.last_reminder_date ? 
                        new Date(doc.last_reminder_date).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        }).replace(/\//g, '-') : 
                        "No reminders sent"}
                    </td>
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