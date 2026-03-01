import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Table, Button, Modal, Form, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { selectToken, setInitialDataLoaded } from '../redux/authSlice';
import LoadingSpinner from './common/LoadingSpinner';
import { clientsAPI, documentsAPI } from '../api';

const ClientList = () => {
  const token = useSelector(selectToken);
  const dispatch = useDispatch();
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [isGeneratingDocuments, setIsGeneratingDocuments] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [newClient, setNewClient] = useState({
    name: '',
    email_id_1: '',
    email_id_2: '',
    email_id_3: '',
    gst_filing_type: 'Monthly',
    whatsapp_group_id: '',
    gst_1_enabled: true,
    bank_statement_enabled: true,
    tds_document_enabled: false,
    gst_number: '',
    phone_number: ''
  });
  
  const navigate = useNavigate();

  // Add delete client states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add state for month selector modal
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isCreatingWithMonth, setIsCreatingWithMonth] = useState(false);
  
  // Get list of months and years for selection
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Generate a list of years from 5 years ago to current year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);
  
  useEffect(() => {
    if (!token) return;
    
    fetchClients();
  }, [token]);

  // Fix: Bootstrap Modal leaves body overflow:hidden when navigating away via SPA routing.
  // Clean it up whenever this component mounts (i.e. when user navigates back) and on unmount.
  useEffect(() => {
    const restoreBodyScroll = () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-open');
      // Remove any lingering modal-backdrop divs
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    };
    // Run on mount (returning from client documents page)
    restoreBodyScroll();
    // Run on unmount (leaving this page)
    return restoreBodyScroll;
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientsAPI.getAll(token);
      setClients(data);
      setError(null);
      dispatch(setInitialDataLoaded(true));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewClient(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    
    // Reset any previous errors
    setValidationError(null);
    
    // Client-side validation
    if (!newClient.name) {
      setValidationError('Client name is required');
      return;
    }
    
    if (!newClient.email_id_1) {
      setValidationError('Primary email is required');
      return;
    }
    
    if (!newClient.gst_filing_type) {
      setValidationError('GST filing type is required');
      return;
    }
    
    try {
      setIsCreating(true);
      await clientsAPI.create(token, newClient);
      
      // Reset form and close modal
      setNewClient({
        name: '',
        email_id_1: '',
        email_id_2: '',
        email_id_3: '',
        gst_filing_type: 'Monthly',
        whatsapp_group_id: '',
        gst_1_enabled: true,
        bank_statement_enabled: true,
        tds_document_enabled: false,
        gst_number: '',
        phone_number: ''
      });
      setShowAddModal(false);
      
      // Refresh client list
      fetchClients();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewDocuments = (clientId) => {
    navigate(`/client/${clientId}/documents`);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) {
      setShowDeleteModal(false);
      return;
    }
    
    try {
      setIsDeleting(true);
      await clientsAPI.delete(token, clientToDelete.id);
      
      // Remove client from state
      setClients(clients.filter(client => client.id !== clientToDelete.id));
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setClientToDelete(null);
      
      // Show success message (you may want to add a success state)
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateDocuments = async () => {
    try {
      setIsGeneratingDocuments(true);
      setError(null);
      const result = await documentsAPI.createForAll(token);
      
      // Clear any previous success message
      setSuccessMessage(null);
      
      if (result.count === 0 && result.existingCount === result.totalClients) {
        // When all clients already have documents for the current month
        setSuccessMessage(`All clients (${result.existingCount}/${result.totalClients}) already have documents for ${result.currentMonth}`);
      } else if (result.count > 0 && result.existingCount > 0) {
        // When some new documents were created and some already existed
        setSuccessMessage(
          `Created ${result.count} new document records for ${result.currentMonth}. ` +
          `${result.existingCount} of ${result.totalClients} clients already had documents.`
        );
        
        // Refresh the client list to ensure we have the latest data
        fetchClients();
      } else {
        // When all documents were created newly
        setSuccessMessage(`Created ${result.count} new document records for ${result.currentMonth}`);
        
        // Refresh the client list
        fetchClients();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGeneratingDocuments(false);
    }
  };

  // Handle month change
  const handleMonthChange = (e) => {
    setSelectedMonth(parseInt(e.target.value, 10));
  };
  
  // Handle year change
  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };
  
  // Handle creating documents for a specific month
  const handleCreateDocumentsForMonth = async () => {
    try {
      setIsCreatingWithMonth(true);
      setError(null);
      
      const formattedMonth = `${months[selectedMonth]} ${selectedYear}`;
      const result = await documentsAPI.createForAll(token, formattedMonth);
      
      // Clear previous success message
      setSuccessMessage(null);
      
      if (result.count === 0 && result.existingCount === result.totalClients) {
        // When all clients already have documents for the selected month
        setSuccessMessage(`All clients (${result.existingCount}/${result.totalClients}) already have documents for ${formattedMonth}`);
      } else if (result.count > 0) {
        // When documents were created
        setSuccessMessage(
          `Created ${result.count} new document records for ${formattedMonth}. ` +
          `${result.existingCount || 0} of ${result.totalClients} clients already had documents.`
        );
        
        // Refresh the client list
        fetchClients();
      }
      
      // Close the modal
      setShowMonthModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreatingWithMonth(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid px-4">
        <LoadingSpinner message="Loading clients..." />
      </div>
    );
  }
  
  return (
    <div className="container-fluid px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Client Management</h2>
        <div>
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowMonthModal(true)}
            disabled={isGeneratingDocuments || isCreatingWithMonth}
            className="me-2"
          >
            {isGeneratingDocuments ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Creating Documents...
              </>
            ) : 'Create Monthly Documents'}
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            Add New Client
          </Button>
        </div>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Primary Email</th>
            <th>GST Filing Type</th>
            <th>WhatsApp Group</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr>
              <td colSpan="6" className="text-center">No clients found</td>
            </tr>
          ) : (
            clients.map((client, index) => (
              <tr key={client.id}>
                <td>{index + 1}</td>
                <td>{client.name}</td>
                <td>{client.email_id_1}</td>
                <td>{client.gst_filing_type}</td>
                <td>{client.whatsapp_group_id || '-'}</td>
                <td>
                  <Button 
                    variant="info" 
                    size="sm" 
                    onClick={() => handleViewDocuments(client.id)}
                    className="me-2"
                  >
                    View Documents
                  </Button>
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    onClick={() => navigate(`/client/${client.id}/edit`)}
                    className="me-2"
                  >
                    <i className="bi bi-pencil-square"></i>
                  </Button>
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    onClick={() => {
                      setClientToDelete(client);
                      setShowDeleteModal(true);
                    }}
                  >
                    <i className="bi bi-trash3-fill"></i>
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      
      {/* Add Client Modal */}
      <Modal show={showAddModal} onHide={() => !isCreating && setShowAddModal(false)} scrollable>
        <Modal.Header closeButton={!isCreating}>
          <Modal.Title>Add New Client</Modal.Title>
        </Modal.Header>
        <Modal.Body className="overflow-auto" style={{ maxHeight: '110vh' }}>
          {validationError && <Alert variant="danger">{validationError}</Alert>}
          <Form onSubmit={handleAddClient}>
            <Form.Group className="mb-3">
              <Form.Label>Client Name*</Form.Label>
              <Form.Control 
                type="text" 
                name="name" 
                value={newClient.name} 
                onChange={handleInputChange} 
                required 
                disabled={isCreating}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Primary Email*</Form.Label>
              <Form.Control 
                type="email" 
                name="email_id_1" 
                value={newClient.email_id_1} 
                onChange={handleInputChange} 
                required
                disabled={isCreating}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Secondary Email</Form.Label>
              <Form.Control 
                type="email" 
                name="email_id_2" 
                value={newClient.email_id_2} 
                onChange={handleInputChange} 
                disabled={isCreating}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Tertiary Email</Form.Label>
              <Form.Control 
                type="email" 
                name="email_id_3" 
                value={newClient.email_id_3} 
                onChange={handleInputChange} 
                disabled={isCreating}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>GST Number</Form.Label>
              <Form.Control 
                type="text" 
                name="gst_number" 
                value={newClient.gst_number} 
                onChange={handleInputChange} 
                disabled={isCreating}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Phone Number</Form.Label>
              <Form.Control 
                type="text" 
                name="phone_number" 
                value={newClient.phone_number} 
                onChange={handleInputChange} 
                disabled={isCreating}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>GST Filing Type*</Form.Label>
              <Form.Select 
                name="gst_filing_type" 
                value={newClient.gst_filing_type} 
                onChange={handleInputChange}
                required
                disabled={isCreating}
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Composition">Composition</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Document Types*</Form.Label>
              <div className="mb-2">
                <Form.Check 
                  type="checkbox" 
                  id="add-gst-document-enabled"
                  label="GST 1" 
                  name="gst_1_enabled" 
                  checked={newClient.gst_1_enabled} 
                  onChange={handleInputChange}
                  disabled={isCreating}
                />
              </div>
              <div className="mb-2">
                <Form.Check 
                  type="checkbox" 
                  id="add-bank-statement-enabled"
                  label="Bank Statement" 
                  name="bank_statement_enabled" 
                  checked={newClient.bank_statement_enabled} 
                  onChange={handleInputChange}
                  disabled={isCreating}
                />
              </div>
              <div className="mb-2">
                <Form.Check 
                  type="checkbox" 
                  id="add-tds-document-enabled"
                  label="TDS" 
                  name="tds_document_enabled" 
                  checked={newClient.tds_document_enabled} 
                  onChange={handleInputChange}
                  disabled={isCreating}
                />
              </div>
              <Form.Text className="text-muted">
                Select at least one document type required for this client.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>WhatsApp Group ID</Form.Label>
              <Form.Control 
                type="text" 
                name="whatsapp_group_id" 
                value={newClient.whatsapp_group_id} 
                onChange={handleInputChange}
                placeholder="e.g. 120363384178779045@g.us"
                disabled={isCreating}
              />
              <Form.Text className="text-muted">
                Enter the WhatsApp group ID (e.g. 120363384178779045@g.us)
              </Form.Text>
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
                disabled={isCreating || (!newClient.gst_1_enabled && !newClient.bank_statement_enabled && !newClient.tds_document_enabled)}
              >
                {isCreating ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    Creating...
                  </>
                ) : 'Add Client'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Delete Client Modal */}
      <Modal show={showDeleteModal} onHide={() => !isDeleting && setShowDeleteModal(false)}>
        <Modal.Header closeButton={!isDeleting}>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {clientToDelete && (
            <p>Are you sure you want to delete client <strong>{clientToDelete.name}</strong>? This will also delete all documents associated with this client. This action cannot be undone.</p>
          )}
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
            onClick={handleDeleteClient}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Deleting...
              </>
            ) : 'Delete Client'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Month Selection Modal */}
      <Modal show={showMonthModal} onHide={() => !isCreatingWithMonth && setShowMonthModal(false)}>
        <Modal.Header closeButton={!isCreatingWithMonth}>
          <Modal.Title>Create Monthly Documents</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Select the month and year for creating documents for all clients:</p>
          <Form>
            <Form.Group className="mb-3">
              <Row>
                <Col md={6}>
                  <Form.Label>Month</Form.Label>
                  <Form.Select 
                    value={selectedMonth}
                    onChange={handleMonthChange}
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
              Selected: <strong>{months[selectedMonth]} {selectedYear}</strong>
            </p>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowMonthModal(false)}
            disabled={isCreatingWithMonth}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateDocumentsForMonth}
            disabled={isCreatingWithMonth}
          >
            {isCreatingWithMonth ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Creating...
              </>
            ) : 'Create Documents'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ClientList; 