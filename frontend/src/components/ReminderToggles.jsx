import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Button, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { settingsAPI } from '../api';

const ReminderToggles = ({ settings, onSettingsUpdated }) => {
  const [reminderSettings, setReminderSettings] = useState({
    enable_whatsapp_reminders: true,
    enable_email_reminders: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setReminderSettings({
        enable_whatsapp_reminders: settings.enable_whatsapp_reminders ?? true,
        enable_email_reminders: settings.enable_email_reminders ?? true
      });
    }
  }, [settings]);

  const handleToggleChange = (field) => {
    setReminderSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = async () => {
    if (!settings) {
      toast.error('No settings found to update');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      // Check if we have an existing record or it's a new month
      if (settings.id) {
        // Update existing settings
        await settingsAPI.updateSettings(token, settings.id, {
          enable_whatsapp_reminders: reminderSettings.enable_whatsapp_reminders,
          enable_email_reminders: reminderSettings.enable_email_reminders
        });
      } else if (settings.isNewRecord) {
        // Save for month-specific settings
        // Extract year and month from settings or current date
        let year, month;
        
        if (settings.current_month) {
          // Handle different formats of current_month
          if (settings.current_month.includes('-')) {
            // Format: "2025-02"
            const parts = settings.current_month.split('-');
            year = parseInt(parts[0]);
            month = parseInt(parts[1]);
          } else {
            // Format: "February 2025"
            const parts = settings.current_month.split(' ');
            const monthName = parts[0];
            const monthNames = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            month = monthNames.findIndex(m => m === monthName) + 1;
            year = parseInt(parts[1]);
          }
        } else {
          // Default to current date
          const today = new Date();
          year = today.getFullYear();
          month = today.getMonth() + 1;
        }
        

        
        // For a new record, we need to use the month-specific endpoint
        await settingsAPI.saveSettingsForMonth(token, year, month, {
          enable_whatsapp_reminders: reminderSettings.enable_whatsapp_reminders,
          enable_email_reminders: reminderSettings.enable_email_reminders,
          today_date: new Date().toISOString().split('T')[0], // Add today's date since it's required
          gst_due_date: new Date().toISOString().split('T')[0] // Required field
        });
      }
      
      toast.success('Reminder settings updated successfully');
      
      // Call the callback to refresh settings in parent component
      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
    } catch (error) {
      console.error('Error updating reminder settings:', error);
      toast.error('Failed to update reminder settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5>Reminder Channel Settings</h5>
      </Card.Header>
      <Card.Body>
        <p className="text-muted mb-4">
          Enable or disable reminder channels. When disabled, reminders will not be sent through that channel
          regardless of the schedule.
        </p>

        <Row className="mb-3">
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="whatsapp-toggle"
                label="Enable WhatsApp Reminders"
                checked={reminderSettings.enable_whatsapp_reminders}
                onChange={() => handleToggleChange('enable_whatsapp_reminders')}
                disabled={loading || saving}
              />
              <Form.Text className="text-muted">
                {reminderSettings.enable_whatsapp_reminders 
                  ? "WhatsApp reminders are enabled. Reminders will be sent according to schedule." 
                  : "WhatsApp reminders are disabled. No reminders will be sent via WhatsApp."}
              </Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="email-toggle"
                label="Enable Email Reminders"
                checked={reminderSettings.enable_email_reminders}
                onChange={() => handleToggleChange('enable_email_reminders')}
                disabled={loading || saving}
              />
              <Form.Text className="text-muted">
                {reminderSettings.enable_email_reminders 
                  ? "Email reminders are enabled. Reminders will be sent according to schedule." 
                  : "Email reminders are disabled. No reminders will be sent via email."}
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        <div className="d-flex justify-content-end">
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? <><Spinner as="span" animation="border" size="sm" /> Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ReminderToggles; 