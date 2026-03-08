import React, { useState, useEffect } from 'react';
import { Container, Table, Alert, Spinner, Card, Form, Badge, Button, Modal } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { selectToken } from '../redux/authSlice';
import { documentsAPI } from '../api';
import CommunicationDateInput, { DatePickerProvider } from './common/CommunicationDateInput';
import { getTodayDate, getPreviousMonthFormatted } from '../utils/dateUtils';
import PageLoader from './common/PageLoader';

const SubmissionPage = () => {
  const token = useSelector(selectToken);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [months, setMonths] = useState([]);
  
  // State for date picker modal
  const [showDateModal, setShowDateModal] = useState(false);
  const [currentField, setCurrentField] = useState('');
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchDocuments();
  }, [token]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all documents using the API service
      const data = await documentsAPI.getAll(token);
      setDocuments(data);
      
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
    ? documents.filter(doc => doc.document_month === filterMonth)
    : documents;

  // Handle checkbox change
  const handleCheckboxChange = (documentId, field) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document) return;
    
    // If document is being marked as received, show date picker modal
    if (!document[field] && field.includes('received')) {
      setCurrentDocumentId(documentId);
      setCurrentField(field);
      setSelectedDate(getTodayDate()); // Default to today
      setShowDateModal(true);
    } 
    // If document is being marked as not received, clear the date
    else if (document[field] && field.includes('received')) {
      const updates = {
        [field]: false,
        [`${field}_date`]: null
      };
      handleUpdateDocument(documentId, updates);
    }
  };

  // Handle date selection from the modal
  const handleDateSelect = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const updates = {
        [currentField]: true,
        [`${currentField}_date`]: selectedDate
      };
      
      await documentsAPI.update(token, currentDocumentId, updates);
      
      // Refresh the documents list
      await fetchDocuments();
      
      // Close the modal
      setShowDateModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle document update
  const handleUpdateDocument = async (id, updates) => {
    try {
      setError(null);
      
      await documentsAPI.update(token, id, updates);
      
      // Refresh the documents list
      await fetchDocuments();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container fluid className="px-4">
      <h1 className="mb-4">Document Submission</h1>
      
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
        <PageLoader message="Loading documents..." />
      ) : (
        <>
          {filteredDocuments.length === 0 ? (
            <Alert variant="warning">
              No documents found for {filterMonth || "the selected month"}. Please select a different month.
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
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map(doc => (
                  <tr key={doc.id}>
                    <td>{doc.client_name}</td>
                    <td>{doc.document_month}</td>
                    <td>
                      {doc.gst_1_enabled ? (
                        <Form.Check 
                          type="checkbox" 
                          checked={doc.gst_1_received} 
                          onChange={() => handleCheckboxChange(doc.id, 'gst_1_received')}
                          label={doc.gst_1_received ? "Submitted" : "Not Submitted"}
                        />
                      ) : (
                        <Badge bg="secondary">Not applicable</Badge>
                      )}
                    </td>
                    <td>
                      {doc.bank_statement_enabled ? (
                        <Form.Check 
                          type="checkbox" 
                          checked={doc.bank_statement_received} 
                          onChange={() => handleCheckboxChange(doc.id, 'bank_statement_received')}
                          label={doc.bank_statement_received ? "Submitted" : "Not Submitted"}
                        />
                      ) : (
                        <Badge bg="secondary">Not applicable</Badge>
                      )}
                    </td>
                    <td>
                      {doc.tds_document_enabled ? (
                        <Form.Check 
                          type="checkbox" 
                          checked={doc.tds_received} 
                          onChange={() => handleCheckboxChange(doc.id, 'tds_received')}
                          label={doc.tds_received ? "Submitted" : "Not Submitted"}
                        />
                      ) : (
                        <Badge bg="secondary">Not applicable</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}

      {/* Date Picker Modal */}
      <Modal show={showDateModal} onHide={() => setShowDateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Select Submission Date</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <DatePickerProvider>
            <CommunicationDateInput
              label="Submission Date"
              name="submission_date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />
          </DatePickerProvider>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDateModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleDateSelect}
            disabled={isUpdating || !selectedDate}
          >
            {isUpdating ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Updating...
              </>
            ) : 'Submit'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SubmissionPage;