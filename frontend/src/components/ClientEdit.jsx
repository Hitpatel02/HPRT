import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectToken } from '../redux/authSlice';
import { Form, Button, Card, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { clientsAPI } from '../api';

const ClientEdit = () => {
  const token = useSelector(selectToken);
  const { clientId } = useParams();
  const navigate = useNavigate();
  
  const [client, setClient] = useState({
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
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  useEffect(() => {
    if (!token || !clientId) return;
    
    fetchClient();
  }, [token, clientId]);
  
  const fetchClient = async () => {
    try {
      setLoading(true);
      
      const data = await clientsAPI.getById(token, clientId);
      setClient(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClient(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!client.name) {
      setError('Client name is required');
      return;
    }
    
    if (!client.email_id_1) {
      setError('Primary email is required');
      return;
    }
    
    if (!client.gst_filing_type) {
      setError('GST filing type is required');
      return;
    }
    
    try {
      setSaving(true);
      
      await clientsAPI.update(token, clientId, client);
      
      // Navigate back to clients list immediately
      navigate('/clients');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  
  return (
    <div className="container-fluid px-4">
      <Button 
        variant="outline-secondary" 
        onClick={() => navigate('/clients')}
        className="mb-3"
      >
        &larr; Back to Clients
      </Button>
      
      <h2 className="mb-4">Edit Client</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Client Name*</Form.Label>
              <Form.Control 
                type="text" 
                name="name" 
                value={client.name} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Primary Email*</Form.Label>
              <Form.Control 
                type="email" 
                name="email_id_1" 
                value={client.email_id_1 || ''} 
                onChange={handleInputChange} 
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Secondary Email</Form.Label>
              <Form.Control 
                type="email" 
                name="email_id_2" 
                value={client.email_id_2 || ''} 
                onChange={handleInputChange} 
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Tertiary Email</Form.Label>
              <Form.Control 
                type="email" 
                name="email_id_3" 
                value={client.email_id_3 || ''} 
                onChange={handleInputChange} 
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>GST Number</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="gst_number" 
                    value={client.gst_number || ''} 
                    onChange={handleInputChange} 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="phone_number" 
                    value={client.phone_number || ''} 
                    onChange={handleInputChange} 
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>GST Filing Type*</Form.Label>
              <Form.Select 
                name="gst_filing_type" 
                value={client.gst_filing_type || 'Monthly'} 
                onChange={handleInputChange}
                required
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Composition">Composition</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Document Types</Form.Label>
              <div className="mb-2">
                <Form.Check 
                  type="checkbox" 
                  id="gst-1-enabled"
                  label="GST 1" 
                  name="gst_1_enabled" 
                  checked={client.gst_1_enabled} 
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-2">
                <Form.Check 
                  type="checkbox" 
                  id="bank-statement-enabled"
                  label="Bank Statement" 
                  name="bank_statement_enabled" 
                  checked={client.bank_statement_enabled} 
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-2">
                <Form.Check 
                  type="checkbox" 
                  id="tds-document-enabled"
                  label="TDS" 
                  name="tds_document_enabled" 
                  checked={client.tds_document_enabled} 
                  onChange={handleInputChange}
                />
              </div>
              <Form.Text className="text-muted">
                Select the document types required for this client. At least one document type is required.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>WhatsApp Group ID</Form.Label>
              <Form.Control 
                type="text" 
                name="whatsapp_group_id" 
                value={client.whatsapp_group_id || ''} 
                onChange={handleInputChange}
                placeholder="e.g. 120363384178779045@g.us"
              />
              <Form.Text className="text-muted">
                Enter the WhatsApp group ID (e.g. 120363384178779045@g.us)
              </Form.Text>
            </Form.Group>
            
            <div className="d-flex justify-content-end">
              <Button 
                variant="secondary" 
                onClick={() => navigate('/clients')} 
                className="me-2"
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={saving || (!client.gst_1_enabled && !client.bank_statement_enabled && !client.tds_document_enabled)}
              >
                {saving ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    Saving...
                  </>
                ) : 'Save Changes'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ClientEdit; 