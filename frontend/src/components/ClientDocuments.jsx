import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectToken } from '../redux/authSlice';
import { Table, Button, Form, Modal, Alert, Card, Row, Col, OverlayTrigger, Tooltip, Spinner, Badge } from 'react-bootstrap';
import { formatDateForDisplay, getTodayDate } from '../utils/dateUtils';
import CommunicationDateInput, { DatePickerProvider } from './common/CommunicationDateInput';
import { clientsAPI, documentsAPI } from '../api';

const ClientDocuments = () => {
  const token = useSelector(selectToken);
  const { clientId } = useParams();
  const navigate = useNavigate();
  
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingCurrentMonthDoc, setIsGeneratingCurrentMonthDoc] = useState(false);
  
  // State for date picker modal
  const [showDateModal, setShowDateModal] = useState(false);
  const [currentField, setCurrentField] = useState('');
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Month and year selection state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Get list of months for date selection
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Generate array of years (current year and 5 years before and after)
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 11}, (_, i) => currentYear - 5 + i);
  
  // Initialize new document state
  const [newDocument, setNewDocument] = useState({
    document_month: '',
    gst_1_received: false,
    gst_1_received_date: '',
    bank_statement_received: false,
    bank_statement_received_date: '',
    tds_received: false,
    tds_received_date: '',
    notes: ''
  });

  // Add delete document state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Add state for month selector modal
  const [showMonthSelectModal, setShowMonthSelectModal] = useState(false);
  const [createDocMonth, setCreateDocMonth] = useState(new Date().getMonth());
  const [isCreatingWithMonth, setIsCreatingWithMonth] = useState(false);
  
  useEffect(() => {
    if (!token || !clientId) return;
    
    fetchClientAndDocuments();
  }, [token, clientId]);
  
  // Update document_month when month or year selection changes
  useEffect(() => {
    setNewDocument(prev => ({
      ...prev,
      document_month: `${months[selectedMonth]} ${selectedYear}`
    }));
  }, [selectedMonth, selectedYear]);

  const fetchClientAndDocuments = async () => {
    try {
      setLoading(true);
      
      // Fetch client details using API service
      const clientData = await clientsAPI.getById(token, clientId);
      setClient(clientData);
      
      // Fetch client documents using API service
      const documentsData = await documentsAPI.getByClient(token, clientId);
      setDocuments(documentsData);
      
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle month change
  const handleMonthChange = (e) => {
    const value = parseInt(e.target.value, 10);
    
    // Check which modal is open and update the appropriate state
    if (showMonthSelectModal) {
      setCreateDocMonth(value);
    } else {
      setSelectedMonth(value);
    }
  };
  
  // Handle year change
  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for date clear events
    if (e.isDateClear) {
      e.preventDefault && e.preventDefault(); // Ensure we prevent any form submission
      
      // Only update the document state without triggering any side effects
      setNewDocument(prev => ({
        ...prev,
        [name]: '' // Just clear the date without side effects
      }));
      
      // Stop further processing to prevent unintended form submission
      return;
    }
    
    setNewDocument(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    
    try {
      setIsCreating(true);
      
      // Reset form
      setNewDocument({
        document_month: '',
        gst_1_received: false,
        gst_1_received_date: '',
        bank_statement_received: false,
        bank_statement_received_date: '',
        tds_received: false,
        tds_received_date: '',
        notes: ''
      });
      
      // Close modal and refresh documents
      setShowAddModal(false);
      fetchClientAndDocuments();
      
      // Show success message
      setSuccessMessage('Document added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateDocument = async (id, updates) => {
    try {
      setSuccessMessage(null);
      setError(null);
      
      // Process date fields to ensure they are properly formatted
      const processedUpdates = { ...updates };
      
      if ('gst_1_received_date' in processedUpdates) {
        processedUpdates.gst_1_received_date = processedUpdates.gst_1_received_date || null;
      }
      
      if ('bank_statement_received_date' in processedUpdates) {
        processedUpdates.bank_statement_received_date = processedUpdates.bank_statement_received_date || null;
      }
      
      if ('tds_received_date' in processedUpdates) {
        processedUpdates.tds_received_date = processedUpdates.tds_received_date || null;
      }
      
      await documentsAPI.update(token, id, processedUpdates);
      
      // Update local state to reflect changes
      fetchClientAndDocuments();
      
      // Show success message
      setSuccessMessage('Document updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

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
  const handleDateSelection = () => {
    if (!currentDocumentId || !currentField || !selectedDate) {
      setShowDateModal(false);
      return;
    }
    
    const updates = {
      [currentField]: true,
      [`${currentField}_date`]: selectedDate
    };
    
    handleUpdateDocument(currentDocumentId, updates);
    setShowDateModal(false);
    
    // Reset state
    setCurrentDocumentId(null);
    setCurrentField('');
    setSelectedDate('');
  };

  // Add a new handler for date changes in the modal
  const handleModalDateChange = (e) => {
    // Check if this is a date clear action
    if (e.isDateClear) {
      e.preventDefault && e.preventDefault(); // Ensure we prevent any form submission
      setSelectedDate(''); // Just clear the date value without triggering save
      return; // Don't proceed with normal processing
    }
    
    // Normal date change
    setSelectedDate(e.target.value);
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) {
      setShowDeleteModal(false);
      return;
    }
    
    try {
      setIsDeleting(true);
      await documentsAPI.delete(token, documentToDelete);
      
      // Refresh documents list
      fetchClientAndDocuments();
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateCurrentMonthDocument = async () => {
    setShowMonthSelectModal(true);
  };

  // Add a dedicated handler for the create document modal
  const handleCreateDocMonthChange = (e) => {
    setCreateDocMonth(parseInt(e.target.value, 10));
  };

  // Handle creating document for selected month
  const handleCreateForSelectedMonth = async () => {
    try {
      setIsCreatingWithMonth(true);
      setError(null);
      setSuccessMessage(null);
      
      const formattedMonth = `${months[createDocMonth]} ${selectedYear}`;
      const result = await documentsAPI.createForClient(token, clientId, formattedMonth);
      
      if (result.isNewDocument) {
        setSuccessMessage(`Created new document for ${client.name} for ${formattedMonth}`);
      } else {
        setSuccessMessage(`Document for ${formattedMonth} already exists`);
      }
      
      // Refresh documents list
      fetchClientAndDocuments();
      
      // Close the modal
      setShowMonthSelectModal(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreatingWithMonth(false);
    }
  };

  if (loading) return <div className="container-fluid px-4 pt-4">Loading client documents...</div>;
  if (!client) return <div className="container-fluid px-4 pt-4">Client not found</div>;
  
  return (
    <div className="container-fluid px-4">
      <Button 
        variant="outline-secondary" 
        onClick={() => navigate('/clients')}
        className="mb-3"
      >
        &larr; Back to Clients
      </Button>
      
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>{client.name}</Card.Title>
          <Card.Subtitle className="mb-3 text-muted">
            GST Filing Type: {client.gst_filing_type}
          </Card.Subtitle>
          
          <Table bordered size="sm" className="client-details-table">
            <tbody>
              <tr>
                <th className="bg-light">Email Addresses</th>
                {client.email_id_1 && client.email_id_2 && client.email_id_3 ? (
                  <>
                    <td>{client.email_id_1}</td>
                    <td>{client.email_id_2}</td>
                    <td>{client.email_id_3}</td>
                  </>
                ) : client.email_id_1 && client.email_id_2 ? (
                  <>
                    <td>{client.email_id_1}</td>
                    <td colSpan="2">{client.email_id_2}</td>
                  </>
                ) : client.email_id_1 ? (
                  <td colSpan="3">{client.email_id_1}</td>
                ) : (
                  <td colSpan="3">No email addresses</td>
                )}
              </tr>
              {(client.gst_number || client.phone_number) && (
                <tr>
                  <th className="bg-light">Contact Information</th>
                  {client.gst_number && client.phone_number ? (
                    <>
                      <td>GST Number: {client.gst_number}</td>
                      <td colSpan="2">Phone Number: {client.phone_number}</td>
                    </>
                  ) : client.gst_number ? (
                    <td colSpan="3">GST Number: {client.gst_number}</td>
                  ) : (
                    <td colSpan="3">Phone Number: {client.phone_number}</td>
                  )}
                </tr>
              )}
              <tr>
                <th className="bg-light">Document Types</th>
                {client.gst_1_enabled && client.bank_statement_enabled && client.tds_document_enabled ? (
                  <>
                    <td className="text-center">GST 1</td>
                    <td className="text-center">Bank Statement</td>
                    <td className="text-center">TDS</td>
                  </>
                ) : client.gst_1_enabled && client.bank_statement_enabled ? (
                  <>
                    <td className="text-center">GST 1</td>
                    <td colSpan="2" className="text-center">Bank Statement</td>
                  </>
                ) : client.gst_1_enabled && client.tds_document_enabled ? (
                  <>
                    <td className="text-center">GST 1</td>
                    <td colSpan="2" className="text-center">TDS</td>
                  </>
                ) : client.bank_statement_enabled && client.tds_document_enabled ? (
                  <>
                    <td className="text-center">Bank Statement</td>
                    <td colSpan="2" className="text-center">TDS</td>
                  </>
                ) : client.gst_1_enabled ? (
                  <td colSpan="3" className="text-center">GST 1</td>
                ) : client.bank_statement_enabled ? (
                  <td colSpan="3" className="text-center">Bank Statement</td>
                ) : client.tds_document_enabled ? (
                  <td colSpan="3" className="text-center">TDS</td>
                ) : (
                  <td colSpan="3">No document types enabled</td>
                )}
              </tr>
              <tr>
                <th className="bg-light">WhatsApp Group</th>
                <td colSpan="3">{client.whatsapp_group_id || 'Not set'}</td>
              </tr>
            </tbody>
          </Table>
        </Card.Body>
      </Card>
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Document History</h2>
        <div>
          <Button 
            variant="outline-secondary" 
            onClick={handleCreateCurrentMonthDocument}
            disabled={isGeneratingCurrentMonthDoc || isCreatingWithMonth}
            className="me-2"
          >
            {isGeneratingCurrentMonthDoc || isCreatingWithMonth ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Creating Document...
              </>
            ) : 'Create Document'}
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            Add New Month
          </Button>
        </div>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Month</th>
            <th>GST 1</th>
            <th>Receive Date</th>
                <th>Bank Statement</th>
            <th>Receive Date</th>
                <th>TDS</th>
            <th>Receive Date</th>
            <th>Notes</th>
            <th>Reminders Sent</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.length === 0 ? (
            <tr>
              <td colSpan="10">
                <div className="text-center">No document records found</div>
              </td>
            </tr>
          ) : (
            documents.map(doc => (
              <tr key={doc.id}>
                <td>{doc.document_month}</td>
                    <td>
                  {client.gst_1_enabled || doc.gst_1_received ? (
                      <Form.Check 
                        type="checkbox" 
                      checked={doc.gst_1_received} 
                      onChange={() => handleCheckboxChange(doc.id, 'gst_1_received')}
                      label={doc.gst_1_received ? "Received" : "Pending"}
                      disabled={!client.gst_1_enabled}
                    />
                  ) : (
                    <Badge bg="secondary">Not applicable</Badge>
                  )}
                    </td>
                    <td>
                  {(client.gst_1_enabled || doc.gst_1_received) ? (
                    doc.gst_1_received_date ? 
                      formatDateForDisplay(doc.gst_1_received_date) : 
                      '-'
                  ) : '-'}
                    </td>
                    <td>
                  {client.bank_statement_enabled || doc.bank_statement_received ? (
                      <Form.Check 
                        type="checkbox" 
                      checked={doc.bank_statement_received} 
                      onChange={() => handleCheckboxChange(doc.id, 'bank_statement_received')}
                      label={doc.bank_statement_received ? "Received" : "Pending"}
                      disabled={!client.bank_statement_enabled}
                    />
                  ) : (
                    <Badge bg="secondary">Not applicable</Badge>
                  )}
                    </td>
                    <td>
                  {(client.bank_statement_enabled || doc.bank_statement_received) ? (
                    doc.bank_statement_received_date ? 
                      formatDateForDisplay(doc.bank_statement_received_date) : 
                      '-'
                  ) : '-'}
                    </td>
                    <td>
                  {client.tds_document_enabled || doc.tds_received ? (
                      <Form.Check 
                        type="checkbox" 
                      checked={doc.tds_received} 
                      onChange={() => handleCheckboxChange(doc.id, 'tds_received')}
                      label={doc.tds_received ? "Received" : "Pending"}
                      disabled={!client.tds_document_enabled}
                    />
                  ) : (
                    <Badge bg="secondary">Not applicable</Badge>
                  )}
                    </td>
                    <td>
                  {(client.tds_document_enabled || doc.tds_received) ? (
                    doc.tds_received_date ? 
                      formatDateForDisplay(doc.tds_received_date) : 
                      '-'
                  ) : '-'}
                    </td>
                <td>
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => {
                      const notes = prompt('Enter notes:', doc.notes || '');
                      if (notes !== null) {
                        handleUpdateDocument(doc.id, { notes });
                      }
                    }}
                  >
                    {doc.notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                </td>
                <td>
                  {doc.gst_1_reminder_1_sent &&
                    <div>GST 1st: {formatDateForDisplay(doc.gst_1_reminder_1_sent_date)} {new Date(doc.gst_1_reminder_1_sent_date).toLocaleTimeString('en-GB')}</div>}
                  {doc.gst_1_reminder_2_sent &&
                    <div>GST 2nd: {formatDateForDisplay(doc.gst_1_reminder_2_sent_date)} {new Date(doc.gst_1_reminder_2_sent_date).toLocaleTimeString('en-GB')}</div>}
                  {doc.tds_reminder_1_sent &&
                    <div>TDS 1st: {formatDateForDisplay(doc.tds_reminder_1_sent_date)} {new Date(doc.tds_reminder_1_sent_date).toLocaleTimeString('en-GB')}</div>}
                  {doc.tds_reminder_2_sent &&
                    <div>TDS 2nd: {formatDateForDisplay(doc.tds_reminder_2_sent_date)} {new Date(doc.tds_reminder_2_sent_date).toLocaleTimeString('en-GB')}</div>}
                  {doc.bank_reminder_1_sent &&
                    <div>Bank 1st: {formatDateForDisplay(doc.bank_reminder_1_sent_date)} {new Date(doc.bank_reminder_1_sent_date).toLocaleTimeString('en-GB')}</div>}
                  {doc.bank_reminder_2_sent &&
                    <div>Bank 2nd: {formatDateForDisplay(doc.bank_reminder_2_sent_date)} {new Date(doc.bank_reminder_2_sent_date).toLocaleTimeString('en-GB')}</div>}
                  {!doc.gst_1_reminder_1_sent && !doc.gst_1_reminder_2_sent && 
                    !doc.tds_reminder_1_sent && !doc.tds_reminder_2_sent && 
                    !doc.bank_reminder_1_sent && !doc.bank_reminder_2_sent && '-'}
                </td>
                <td>
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Delete document</Tooltip>}
                  >
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => {
                        setDocumentToDelete(doc.id);
                        setShowDeleteModal(true);
                      }}
                    >
                      <i className="bi bi-trash3-fill"></i>
                    </Button>
                  </OverlayTrigger>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      
      {/* Date Selection Modal */}
      <Modal show={showDateModal} onHide={() => !isUpdating && setShowDateModal(false)}>
        <Modal.Header closeButton={!isUpdating}>
          <Modal.Title>
            {currentField && currentField.includes('gst_1') 
              ? 'Select GST Receive Date' 
              : currentField && currentField.includes('bank_statement') 
                ? 'Select Bank Statement Receive Date'
                : currentField && currentField.includes('tds')
                  ? 'Select TDS Receive Date'
                  : 'Select Receive Date'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="position-relative">
          <DatePickerProvider>
            <Form className="mb-0">
              <CommunicationDateInput
                label="Date"
                name="selectedDate"
                value={selectedDate}
                onChange={handleModalDateChange}
                helpText="Select the date when the document was received"
                disabled={isUpdating}
                maxDate={getTodayDate()}
              />
            </Form>
          </DatePickerProvider>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowDateModal(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleDateSelection}
            disabled={isUpdating || !selectedDate}
          >
            {isUpdating ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Saving...
              </>
            ) : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Add Document Modal */}
      <Modal show={showAddModal} onHide={() => !isCreating && setShowAddModal(false)}>
        <Modal.Header closeButton={!isCreating}>
          <Modal.Title>Add New Month</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <DatePickerProvider>
            <Form onSubmit={handleAddDocument}>
              <Form.Group className="mb-3">
                <Form.Label>Select Month and Year*</Form.Label>
                <Row>
                  <Col md={6}>
                    <Form.Select 
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      className="mb-2"
                      disabled={isCreating}
                    >
                      {months.map((month, index) => (
                        <option key={index} value={index}>{month}</option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={6}>
                    <Form.Select 
                      value={selectedYear}
                      onChange={handleYearChange}
                      disabled={isCreating}
                    >
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>
                <Form.Text className="text-muted">
                  Selected: {newDocument.document_month}
                </Form.Text>
              </Form.Group>
              
                <Form.Group className="mb-3">
                  <Form.Check 
                    type="checkbox" 
                  label="GST 1 Received" 
                  name="gst_1_received" 
                  checked={newDocument.gst_1_received} 
                    onChange={handleInputChange} 
                  disabled={isCreating || !client.gst_1_enabled}
                  />
                {!client.gst_1_enabled && <span className="text-muted ms-2">(Not applicable)</span>}
                </Form.Group>
              
              {client.gst_1_enabled && newDocument.gst_1_received && (
                <CommunicationDateInput
                  label="GST 1 Receive Date"
                  name="gst_1_received_date"
                  value={newDocument.gst_1_received_date}
                  onChange={handleInputChange}
                  helpText="Select the date when GST 1 was received"
                  disabled={isCreating}
                  maxDate={getTodayDate()}
                />
              )}
              
                <Form.Group className="mb-3">
                  <Form.Check 
                    type="checkbox" 
                  label="Bank Statement Received" 
                  name="bank_statement_received" 
                  checked={newDocument.bank_statement_received} 
                    onChange={handleInputChange} 
                  disabled={isCreating || !client.bank_statement_enabled}
                  />
                {!client.bank_statement_enabled && <span className="text-muted ms-2">(Not applicable)</span>}
                </Form.Group>
              
              {client.bank_statement_enabled && newDocument.bank_statement_received && (
                <CommunicationDateInput
                  label="Bank Statement Receive Date"
                  name="bank_statement_received_date"
                  value={newDocument.bank_statement_received_date}
                  onChange={handleInputChange}
                  helpText="Select the date when bank statement was received"
                  disabled={isCreating}
                  maxDate={getTodayDate()}
                />
              )}
              
                <Form.Group className="mb-3">
                  <Form.Check 
                    type="checkbox" 
                  label="TDS Received" 
                  name="tds_received" 
                  checked={newDocument.tds_received} 
                    onChange={handleInputChange} 
                  disabled={isCreating || !client.tds_document_enabled}
                  />
                {!client.tds_document_enabled && <span className="text-muted ms-2">(Not applicable)</span>}
                </Form.Group>

              {client.tds_document_enabled && newDocument.tds_received && (
                <CommunicationDateInput
                  label="TDS Receive Date"
                  name="tds_received_date"
                  value={newDocument.tds_received_date}
                  onChange={handleInputChange}
                  helpText="Select the date when TDS was received"
                  disabled={isCreating}
                  maxDate={getTodayDate()}
                />
              )}
              
              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  name="notes" 
                  value={newDocument.notes} 
                  onChange={handleInputChange} 
                  disabled={isCreating}
                />
              </Form.Group>
              
              <div className="d-flex justify-content-end">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowAddModal(false)} 
                  className="me-2"
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  type="submit"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                      Adding...
                    </>
                  ) : 'Add Month'}
                </Button>
              </div>
            </Form>
          </DatePickerProvider>
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => !isDeleting && setShowDeleteModal(false)}>
        <Modal.Header closeButton={!isDeleting}>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this document record? This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteDocument}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Deleting...
              </>
            ) : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Month Selection Modal */}
      <Modal show={showMonthSelectModal} onHide={() => !isCreatingWithMonth && setShowMonthSelectModal(false)}>
        <Modal.Header closeButton={!isCreatingWithMonth}>
          <Modal.Title>Create Document</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Select the month and year for creating a document for {client.name}:</p>
          <Form>
            <Form.Group className="mb-3">
              <Row>
                <Col md={6}>
                  <Form.Label>Month</Form.Label>
                  <Form.Select 
                    value={createDocMonth}
                    onChange={handleCreateDocMonthChange}
                    disabled={isCreatingWithMonth}
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index}>{month}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <Form.Label>Year</Form.Label>
                  <Form.Select 
                    value={selectedYear}
                    onChange={handleYearChange}
                    disabled={isCreatingWithMonth}
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>
            </Form.Group>
            <p className="mb-3">
              Selected: <strong>{months[createDocMonth]} {selectedYear}</strong>
            </p>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowMonthSelectModal(false)}
            disabled={isCreatingWithMonth}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateForSelectedMonth}
            disabled={isCreatingWithMonth}
          >
            {isCreatingWithMonth ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Creating...
              </>
            ) : 'Create Document'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ClientDocuments; 