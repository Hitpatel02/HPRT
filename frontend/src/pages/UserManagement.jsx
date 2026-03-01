import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectToken } from '../redux/authSlice';
import { Table, Button, Card, Alert, Modal, Spinner, Form, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { format } from 'date-fns';
import { authAPI } from '../api';

const UserManagement = () => {
  const token = useSelector(selectToken);
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Delete user states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Add create user states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [validationError, setValidationError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Add edit user states
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [editValidationError, setEditValidationError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  useEffect(() => {
    if (!token) return;
    
    fetchUsers();
  }, [token]);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await authAPI.getUsers(token);
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteUser = async () => {
    if (!userToDelete) {
      setShowDeleteModal(false);
      return;
    }
    
    try {
      setIsDeleting(true);
      await authAPI.deleteUser(token, userToDelete.id);
      
      setSuccess(`User "${userToDelete.username}" deleted successfully`);
      setUsers(users.filter(user => user.id !== userToDelete.id));
      
      setShowDeleteModal(false);
      setUserToDelete(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateForm = () => {
    if (!newUser.username.trim()) {
      setValidationError('Username is required');
      return false;
    }
    
    if (!newUser.email.trim()) {
      setValidationError('Email is required');
      return false;
    }
    
    if (!newUser.password.trim()) {
      setValidationError('Password is required');
      return false;
    }
    
    if (newUser.password !== newUser.confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }
    
    setValidationError(null);
    return true;
  };
  
  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsCreating(true);
      const userData = {
        username: newUser.username,
        email: newUser.email,
        password: newUser.password
      };
      
      await authAPI.createUser(token, userData);
      
      setSuccess(`User "${userData.username}" created successfully`);
      
      // Reset form and close modal
      setNewUser({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setShowAddModal(false);
      
      // Refresh users list
      fetchUsers();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleOpenEditModal = (user) => {
    setUserToEdit(user);
    setEditForm({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: ''
    });
    setShowEditModal(true);
  };
  
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const validateEditForm = () => {
    if (!editForm.username.trim()) {
      setEditValidationError('Username is required');
      return false;
    }
    
    if (!editForm.email.trim()) {
      setEditValidationError('Email is required');
      return false;
    }
    
    // Password is optional for editing, but if provided, confirm must match
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      setEditValidationError('Passwords do not match');
      return false;
    }
    
    setEditValidationError(null);
    return true;
  };
  
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!validateEditForm()) {
      return;
    }
    
    try {
      setIsUpdating(true);
      const userData = {
        username: editForm.username,
        email: editForm.email
      };
      
      // Only include password if it was provided
      if (editForm.password) {
        userData.password = editForm.password;
      }
      
      await authAPI.updateUser(token, userToEdit.id, userData);
      
      setSuccess(`User "${userData.username}" updated successfully`);
      
      // Reset form and close modal
      setShowEditModal(false);
      setUserToEdit(null);
      
      // Refresh users list
      fetchUsers();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container-fluid px-4 pt-4">
        <div className="text-center mt-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading users...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container-fluid px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>User Management</h2>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          Add New User
        </Button>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Card className="mb-4">
        <Card.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>Username</th>
                <th>Email</th>
                <th>Created At</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">No users found</td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy') : '-'}</td>
                    <td>{user.last_login ? format(new Date(user.last_login), 'dd/MM/yyyy HH:mm') : 'Never'}</td>
                    <td>
                      <OverlayTrigger
                        placement="top"
                        overlay={<Tooltip>Edit user</Tooltip>}
                      >
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          className="me-2"
                          onClick={() => handleOpenEditModal(user)}
                        >
                          <i className="bi bi-pencil-square"></i>
                        </Button>
                      </OverlayTrigger>
                      <OverlayTrigger
                        placement="top"
                        overlay={<Tooltip>Delete user</Tooltip>}
                      >
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => {
                            setUserToDelete(user);
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
        </Card.Body>
      </Card>
      
      {/* Delete User Modal */}
      <Modal show={showDeleteModal} onHide={() => !isDeleting && setShowDeleteModal(false)}>
        <Modal.Header closeButton={!isDeleting}>
          <Modal.Title>Confirm User Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {userToDelete && (
            <p>
              Are you sure you want to delete the user <strong>{userToDelete.username}</strong>?
              This action cannot be undone.
            </p>
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
            onClick={handleDeleteUser}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Deleting...
              </>
            ) : 'Delete User'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Add User Modal */}
      <Modal show={showAddModal} onHide={() => !isCreating && setShowAddModal(false)}>
        <Modal.Header closeButton={!isCreating}>
          <Modal.Title>Add New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {validationError && <Alert variant="danger">{validationError}</Alert>}
          <Form onSubmit={handleAddUser}>
            <Form.Group className="mb-3">
              <Form.Label>Username*</Form.Label>
              <Form.Control 
                type="text" 
                name="username" 
                value={newUser.username} 
                onChange={handleInputChange} 
                required 
                disabled={isCreating}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Email*</Form.Label>
              <Form.Control 
                type="email" 
                name="email" 
                value={newUser.email} 
                onChange={handleInputChange} 
                required 
                disabled={isCreating}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Password*</Form.Label>
              <Form.Control 
                type="password" 
                name="password" 
                value={newUser.password} 
                onChange={handleInputChange} 
                required 
                disabled={isCreating}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Confirm Password*</Form.Label>
              <Form.Control 
                type="password" 
                name="confirmPassword" 
                value={newUser.confirmPassword} 
                onChange={handleInputChange} 
                required 
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
                    Creating...
                  </>
                ) : 'Add User'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      
      {/* Edit User Modal */}
      <Modal show={showEditModal} onHide={() => !isUpdating && setShowEditModal(false)}>
        <Modal.Header closeButton={!isUpdating}>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editValidationError && <Alert variant="danger">{editValidationError}</Alert>}
          <Form onSubmit={handleUpdateUser}>
            <Form.Group className="mb-3">
              <Form.Label>Username*</Form.Label>
              <Form.Control 
                type="text" 
                name="username" 
                value={editForm.username} 
                onChange={handleEditInputChange} 
                required 
                disabled={isUpdating}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Email*</Form.Label>
              <Form.Control 
                type="email" 
                name="email" 
                value={editForm.email} 
                onChange={handleEditInputChange} 
                required 
                disabled={isUpdating}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Password (leave blank to keep current)</Form.Label>
              <Form.Control 
                type="password" 
                name="password" 
                value={editForm.password} 
                onChange={handleEditInputChange}
                disabled={isUpdating}
              />
              <Form.Text className="text-muted">
                Leave blank if you don't want to change the password
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control 
                type="password" 
                name="confirmPassword" 
                value={editForm.confirmPassword} 
                onChange={handleEditInputChange}
                disabled={isUpdating}
              />
            </Form.Group>
            
            <div className="d-flex justify-content-end">
              <Button 
                variant="secondary" 
                onClick={() => setShowEditModal(false)} 
                className="me-2"
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    Updating...
                  </>
                ) : 'Update User'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default UserManagement; 