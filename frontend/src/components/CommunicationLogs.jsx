import React, { useState, useEffect } from 'react';
import { Container, Table, Tabs, Tab, Card, Form, Button, Alert, Spinner, Row, Col, Modal } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { selectToken } from '../redux/authSlice';
import CommunicationDateInput, { DatePickerProvider } from './common/CommunicationDateInput';
import { logsAPI } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-toastify';
import { formatDateForDisplay, getTodayDate } from '../utils/dateUtils';

const CommunicationLogs = () => {
  const token = useSelector(selectToken);
  const today = getTodayDate();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('whatsapp');
  
  // Date filter state
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  // WhatsApp logs state
  const [whatsappLogs, setWhatsappLogs] = useState([]);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [whatsappError, setWhatsappError] = useState(null);
  const [whatsappDownloading, setWhatsappDownloading] = useState(false);
  const [whatsappPdfDownloading, setWhatsappPdfDownloading] = useState(false);
  const [showWhatsappClearModal, setShowWhatsappClearModal] = useState(false);
  const [clearingWhatsapp, setClearingWhatsapp] = useState(false);
  
  // Email logs state
  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [emailDownloading, setEmailDownloading] = useState(false);
  const [emailPdfDownloading, setEmailPdfDownloading] = useState(false);
  const [showEmailClearModal, setShowEmailClearModal] = useState(false);
  const [clearingEmail, setClearingEmail] = useState(false);
  
  useEffect(() => {
    if (!token) return;
    
    // Remove automatic loading of logs on date change
    // The fetchWhatsappLogs and fetchEmailLogs functions will be called manually by the Apply Filter button
  }, [token, activeTab]);
  
  // Handle tab switching
  const handleTabChange = (key) => {
    setActiveTab(key);
    
    if (key === 'whatsapp') {
      setEmailError(null);
    } else if (key === 'email') {
      setWhatsappError(null);
    }
  };
  
  // Validate date range
  const isInvalidRange = () => {
    return dateRange.startDate && 
           dateRange.endDate && 
           dateRange.endDate < dateRange.startDate;
  };
  
  // Handle date changes
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    
    if (e.isDateClear) {
      e.preventDefault && e.preventDefault();
      
      setDateRange(prev => ({
        ...prev,
        [name]: ''
      }));
      
      return;
    }
    
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error if date is changed
    if (activeTab === 'whatsapp' && whatsappError) {
        setWhatsappError(null);
    } else if (activeTab === 'email' && emailError) {
        setEmailError(null);
    }
  };
  
  const fetchWhatsappLogs = async () => {
    try {
      if (!dateRange.startDate || !dateRange.endDate) {
        toast.error("Please select a date range first");
        return;
      }
      
      if (isInvalidRange()) {
        toast.error("Invalid date range: Start date cannot be after end date");
        return;
      }
      
      // Clear previous logs first
      setWhatsappLogs([]);
      setLoadingWhatsapp(true);
      setWhatsappError(null);
      
      const logs = await logsAPI.getWhatsappLogs(token, dateRange.startDate, dateRange.endDate);
      
      if (!logs || logs.length === 0) {
        setWhatsappError("No WhatsApp logs found for the selected date range");
        setLoadingWhatsapp(false);
        return;
      }
      
      setWhatsappLogs(logs);
    } catch (error) {
      toast.error(`Error fetching WhatsApp logs: ${error.message}`);
      setWhatsappError(`Error fetching WhatsApp logs: ${error.message}`);
    } finally {
      setLoadingWhatsapp(false);
    }
  };
  
  const fetchEmailLogs = async () => {
    try {
      if (!dateRange.startDate || !dateRange.endDate) {
        toast.error("Please select a date range first");
        return;
      }
      
      if (isInvalidRange()) {
        toast.error("Invalid date range: Start date cannot be after end date");
        return;
      }
      
      // Clear previous logs first
      setEmailLogs([]);
      setLoadingEmail(true);
      setEmailError(null);
      
      const logs = await logsAPI.getEmailLogs(token, dateRange.startDate, dateRange.endDate);
      
      if (!logs || logs.length === 0) {
        setEmailError("No email logs found for the selected date range");
        setLoadingEmail(false);
        return;
      }
      
      setEmailLogs(logs);
    } catch (error) {
      toast.error(`Error fetching email logs: ${error.message}`);
      setEmailError(`Error fetching email logs: ${error.message}`);
    } finally {
      setLoadingEmail(false);
    }
  };
  
  const downloadWhatsappLogs = async () => {
    try {
      if (!dateRange.startDate || !dateRange.endDate) {
        toast.error("Please select a date range first");
        return;
      }
      
      if (isInvalidRange()) {
        toast.error("Invalid date range: Start date cannot be after end date");
        return;
      }
      
      setWhatsappDownloading(true);
      
      // Use existing logs if available, or fetch new ones
      let logs = whatsappLogs;
      if (!logs || logs.length === 0) {
        try {
          logs = await logsAPI.getWhatsappLogs(token, dateRange.startDate, dateRange.endDate);
          
          if (!logs || logs.length === 0) {
            toast.error("No WhatsApp logs found for the selected date range");
            return;
          }
        } catch (error) {
          toast.error(`Error fetching WhatsApp logs: ${error.message}`);
          return;
        }
      }
      
      // Format dates for filename and headers
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const formattedStartDate = startDate.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      const formattedEndDate = endDate.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      
      // Build CSV content
      let csvContent = "sep=,\n";
      csvContent += `WhatsApp Logs (${formattedStartDate} - ${formattedEndDate})\n`;
      csvContent += `Generated on: ${new Date().toLocaleDateString('en-GB')}\n\n`;
      csvContent += "SR No.,Date & Time,Client,Group ID,Status,Message,Error\n";
      
      logs.forEach((log, index) => {
        const dateObj = log.sent_at || log.created_at ? 
          new Date(log.sent_at || log.created_at) : new Date();
        const formattedDate = dateObj.toLocaleDateString('en-GB', {
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        
        const rowData = [
          index + 1,
          `"${formattedDate}"`,
          `"${log.client_name || 'Unknown'}"`,
          `"${log.group_id || 'Not Applicable'}"`,
          `"${log.status || 'Not Applicable'}"`,
          `"${log.message ? log.message.replace(/"/g, '""') : 'Not Applicable'}"`,
          `"${log.error_message ? log.error_message.replace(/"/g, '""') : '-'}"`
        ];
        
        csvContent += rowData.join(',') + '\n';
      });
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `whatsapp_logs_${formattedStartDate.replace(/\//g, '-')}_to_${formattedEndDate.replace(/\//g, '-')}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success('WhatsApp logs downloaded successfully as CSV.');
    } catch (error) {
      toast.error(`Error downloading WhatsApp logs: ${error.message}`);
    } finally {
      setWhatsappDownloading(false);
    }
  };
  
  const downloadWhatsappLogsPDF = async () => {
    try {
      if (isInvalidRange()) {
        toast.error("Invalid date range: Start date cannot be after end date");
        return;
      }
      
      if (whatsappLogs.length === 0) {
        toast.error("No WhatsApp logs to download.");
        return;
      }
      
      setWhatsappPdfDownloading(true);
      
      // Create jsPDF instance with proper configuration for v3
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });
      
      doc.setFontSize(16);
      doc.text('WhatsApp Communication Logs', doc.internal.pageSize.width / 2, 15, { align: 'center' });
      
      doc.setFontSize(12);
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
      
      const startFormatted = startDate ? startDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-') : '';
      
      const endFormatted = endDate ? endDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-') : '';
      
      doc.text(`Date Range: ${startFormatted} to ${endFormatted}`, doc.internal.pageSize.width / 2, 22, { align: 'center' });
      
      const generatedDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
      
      doc.text(`Generated on: ${generatedDate}`, doc.internal.pageSize.width / 2, 29, { align: 'center' });
      
      const tableData = whatsappLogs.map((log, index) => [
        index + 1,
        formatDateTime(log.sent_at || log.created_at || new Date()),
        log.client_name || 'Unknown',
        log.group_id || 'Not Applicable',
        log.status || 'Not Applicable',
        log.message ? (log.message.length > 200 ? log.message.substring(0, 200) + '...' : log.message) : 'Not Applicable',
        log.error_message || '-'
      ]);
      
      // Apply autotable to the document using the correct syntax for jsPDF v3
      autoTable(doc, {
        startY: 35,
        head: [['SR No.', 'Date & Time', 'Client', 'Group ID', 'Status', 'Message', 'Error']],
        body: tableData,
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        styles: { overflow: 'linebreak', cellWidth: 'wrap', cellPadding: 3, fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 45 },
          2: { cellWidth: 30 },
          3: { cellWidth: 45 },
          4: { cellWidth: 25 },
          5: { cellWidth: 120 },
          6: { cellWidth: 50 }
        }
      });
      
      doc.save(`whatsapp_logs_${startFormatted}_to_${endFormatted}.pdf`);
      toast.success('WhatsApp logs downloaded successfully as PDF.');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(`Error generating PDF: ${error.message}`);
    } finally {
      setWhatsappPdfDownloading(false);
    }
  };
  
  const downloadEmailLogs = async () => {
    try {
      if (!dateRange.startDate || !dateRange.endDate) {
        toast.error("Please select a date range first");
        return;
      }
      
      if (isInvalidRange()) {
        toast.error("Invalid date range: Start date cannot be after end date");
        return;
      }
      
      setEmailDownloading(true);
      
      // Use existing logs if available, or fetch new ones
      let logs = emailLogs;
      if (!logs || logs.length === 0) {
        try {
          logs = await logsAPI.getEmailLogs(token, dateRange.startDate, dateRange.endDate);
          
          if (!logs || logs.length === 0) {
            toast.error("No email logs found for the selected date range");
            return;
          }
        } catch (error) {
          toast.error(`Error fetching email logs: ${error.message}`);
          return;
        }
      }
      
      // Format dates for filename and headers
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const formattedStartDate = startDate.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      const formattedEndDate = endDate.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      
      // Build CSV content
      let csvContent = "sep=,\n";
      csvContent += `Email Logs (${formattedStartDate} - ${formattedEndDate})\n`;
      csvContent += `Generated on: ${new Date().toLocaleDateString('en-GB')}\n\n`;
      csvContent += "SR No.,Date & Time,Client,To,Subject,Status,Body,Error\n";
      
      logs.forEach((log, index) => {
        const dateObj = log.sent_date || log.sent_at || log.created_at ? 
          new Date(log.sent_date || log.sent_at || log.created_at) : new Date();
        const formattedDate = dateObj.toLocaleDateString('en-GB', {
          day: '2-digit', month: '2-digit', year: 'numeric', 
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
        
        const clientName = log.client_name || extractClientNameFromSubject(log.email_subject || log.subject) || 'Unknown';
        const recipient = log.email_to || 'Not Applicable';
        const subject = log.email_subject || log.subject || 'Not Applicable';
        const body = log.email_body || log.body || 'Not Applicable';
        const bodyForCSV = body.length > 2000 ? body.substring(0, 2000) + '...' : body;
        
        const rowData = [
          index + 1,
          `"${formattedDate}"`,
          `"${clientName}"`,
          `"${recipient}"`,
          `"${subject.replace(/"/g, '""')}"`,
          `"${log.status || 'Not Applicable'}"`,
          `"${bodyForCSV.replace(/"/g, '""')}"`,
          `"${log.error_message ? log.error_message.replace(/"/g, '""') : '-'}"`
        ];
        
        csvContent += rowData.join(',') + '\n';
      });
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `email_logs_${formattedStartDate.replace(/\//g, '-')}_to_${formattedEndDate.replace(/\//g, '-')}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success('Email logs downloaded successfully as CSV.');
    } catch (error) {
      toast.error(`Error downloading email logs: ${error.message}`);
    } finally {
      setEmailDownloading(false);
    }
  };
  
  const downloadEmailLogsPDF = async () => {
    try {
      if (isInvalidRange()) {
        toast.error("Invalid date range: Start date cannot be after end date");
        return;
      }
      
      if (emailLogs.length === 0) {
        toast.error("No email logs to download.");
        return;
      }
      
      setEmailPdfDownloading(true);
      
      // Create jsPDF instance with proper configuration for v3
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });
      
      doc.setFontSize(16);
      doc.text('Email Communication Logs', doc.internal.pageSize.width / 2, 15, { align: 'center' });
      
      doc.setFontSize(12);
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
      
      const startFormatted = startDate ? startDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-') : '';
      
      const endFormatted = endDate ? endDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-') : '';
      
      doc.text(`Date Range: ${startFormatted} to ${endFormatted}`, doc.internal.pageSize.width / 2, 22, { align: 'center' });
      
      const generatedDate = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
      
      doc.text(`Generated on: ${generatedDate}`, doc.internal.pageSize.width / 2, 29, { align: 'center' });
      
      const tableData = emailLogs.map((log, index) => [
        index + 1,
        formatDateTime(log.sent_date || log.sent_at || log.created_at),
        log.client_name || extractClientNameFromSubject(log.email_subject || log.subject) || 'Unknown',
        log.email_to || 'Not Applicable',
        log.email_subject || log.subject || 'Not Applicable',
        log.status || 'Not Applicable',
        log.email_body || log.body ? 
          (log.email_body || log.body).length > 200 ? 
            (log.email_body || log.body).substring(0, 200) + '...' : 
            log.email_body || log.body : 
          'Not Applicable',
        log.error_message || '-'
      ]);
      
      // Apply autotable to the document using the correct syntax for jsPDF v3
      autoTable(doc, {
        startY: 35,
        head: [['SR No.', 'Date & Time', 'Client', 'To', 'Subject', 'Status', 'Body', 'Error']],
        body: tableData,
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        styles: { overflow: 'linebreak', cellWidth: 'wrap', cellPadding: 3, fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 40 },
          2: { cellWidth: 30 },
          3: { cellWidth: 40 },
          4: { cellWidth: 50 },
          5: { cellWidth: 25 },
          6: { cellWidth: 80 },
          7: { cellWidth: 25 }
        }
      });
      
      doc.save(`email_logs_${startFormatted}_to_${endFormatted}.pdf`);
      toast.success('Email logs downloaded successfully as PDF.');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(`Error generating PDF: ${error.message}`);
    } finally {
      setEmailPdfDownloading(false);
    }
  };
  
  // Clear WhatsApp logs
  const clearWhatsappLogs = async () => {
    try {
      if (isInvalidRange()) {
        toast.error("Invalid date range: Start date cannot be after end date");
        setShowWhatsappClearModal(false);
        return;
      }
      
      setClearingWhatsapp(true);
      await logsAPI.clearWhatsappLogs(token, dateRange.startDate, dateRange.endDate);
      
      toast.success('WhatsApp logs cleared successfully');
      fetchWhatsappLogs();
      setShowWhatsappClearModal(false);
    } catch (error) {
      toast.error(`Error clearing WhatsApp logs: ${error.message}`);
    } finally {
      setClearingWhatsapp(false);
    }
  };
  
  // Clear email logs
  const clearEmailLogs = async () => {
    try {
      if (isInvalidRange()) {
        toast.error("Invalid date range: Start date cannot be after end date");
        setShowEmailClearModal(false);
        return;
      }
      
      setClearingEmail(true);
      await logsAPI.clearEmailLogs(token, dateRange.startDate, dateRange.endDate);
      
      toast.success('Email logs cleared successfully');
      fetchEmailLogs();
      setShowEmailClearModal(false);
    } catch (error) {
      toast.error(`Error clearing email logs: ${error.message}`);
    } finally {
      setClearingEmail(false);
    }
  };
  
  // Format date and time for display
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) {
      const now = new Date();
      return now.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    }
    
    try {
    const date = new Date(dateTimeString);
      
      if (isNaN(date.getTime())) {
        const now = new Date();
        return now.toLocaleString('en-GB', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
      }
      
    return date.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      const now = new Date();
      return now.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    }
  };
  
  // Extract client name from email subject
  const extractClientNameFromSubject = (subject) => {
    if (!subject) return 'Unknown';
    // Try to extract client name from "Reminder to share GST 1 for March 2025 - Client Name" format
    const match = subject.match(/- (.+)$/);
    return match ? match[1].trim() : 'Unknown';
  };
  
  // Show content in modal
  const showContentModal = (content, title) => {
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `<pre style="white-space: pre-wrap; max-height: 70vh; overflow-y: auto;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
    
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';
    
    const modalDialog = document.createElement('div');
    modalDialog.style.backgroundColor = 'white';
    modalDialog.style.borderRadius = '5px';
    modalDialog.style.padding = '20px';
    modalDialog.style.width = '80%';
    modalDialog.style.maxWidth = '800px';
    
    const modalHeader = document.createElement('div');
    modalHeader.style.display = 'flex';
    modalHeader.style.justifyContent = 'space-between';
    modalHeader.style.marginBottom = '15px';
    
    const modalTitle = document.createElement('h5');
    modalTitle.textContent = title || 'Content';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.fontSize = '1.5rem';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(modal);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    modalDialog.appendChild(modalHeader);
    modalDialog.appendChild(modalContent);
    
    modal.appendChild(modalDialog);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  };
  
  // Get reminder badge by type
  const getReminderBadge = (type) => {
    if (type === 'urgent') {
      return (
        <span className="badge bg-danger d-inline-flex align-items-center me-2">
          <span style={{ fontSize: '1.2em', marginRight: '4px' }}>⚠️</span> URGENT REMINDER
        </span>
      );
    } else if (type === 'gentle') {
      return (
        <span className="badge bg-primary d-inline-flex align-items-center me-2">
          <span style={{ fontSize: '1.2em', marginRight: '4px' }}>📢</span> Gentle Reminder
        </span>
      );
    }
    return null;
  };
  
  // Render WhatsApp logs tab
  const renderWhatsappLogsTab = () => {
    return (
      <div>
        {whatsappError && <Alert variant="danger">{whatsappError}</Alert>}
        
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Filter WhatsApp Logs</Card.Title>
            <Form>
              <Row>
                <Col md={5}>
                  <CommunicationDateInput
                    label="Start Date"
                    name="startDate"
                    value={dateRange.startDate}
                    onChange={handleDateChange}
                    maxDate={today}
                  />
                </Col>
                <Col md={5}>
                  <CommunicationDateInput
                    label="End Date"
                    name="endDate"
                    value={dateRange.endDate}
                    onChange={handleDateChange}
                    maxDate={today}
                  />
                </Col>
                <Col md={2} className="d-flex align-items-end">
                  <Button 
                    variant={isInvalidRange() ? "danger" : "primary"}
                    onClick={fetchWhatsappLogs}
                    disabled={loadingWhatsapp || isInvalidRange() || !dateRange.startDate || !dateRange.endDate}
                    className="mb-3 w-100"
                  >
                    {loadingWhatsapp ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        Loading...
                      </>
                    ) : isInvalidRange() ? "Invalid Date Range" : "Apply Filter"}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
        
        <div className="d-flex justify-content-end mb-3">
          <Button 
            variant="success" 
            onClick={downloadWhatsappLogs} 
            className="me-2"
            disabled={whatsappDownloading || !whatsappLogs.length || isInvalidRange()}
          >
            {whatsappDownloading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Downloading...
              </>
            ) : 'Download CSV'}
          </Button>
          
          <Button 
            variant="primary" 
            onClick={downloadWhatsappLogsPDF} 
            className="me-2"
            disabled={whatsappPdfDownloading || !whatsappLogs.length || isInvalidRange()}
          >
            {whatsappPdfDownloading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Generating PDF...
              </>
            ) : 'Download PDF'}
          </Button>
          
          <Button 
            variant="danger" 
            onClick={() => setShowWhatsappClearModal(true)} 
            disabled={clearingWhatsapp || !whatsappLogs.length || isInvalidRange()}
          >
            Clear Logs
          </Button>
        </div>
        
        {loadingWhatsapp ? (
          <div className="text-center my-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-2">Loading WhatsApp logs...</p>
          </div>
        ) : whatsappLogs.length === 0 ? (
          <Alert variant="info">
            {dateRange.startDate && dateRange.endDate && !whatsappError ? 
              "No WhatsApp logs found for the selected date range." : 
              "Select a date range and click 'Apply Filter' to view WhatsApp logs."}
          </Alert>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Client</th>
                <th>Group ID</th>
                <th>Status</th>
                <th>Message</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {whatsappLogs.map((log, index) => (
                <tr key={index}>
                  <td>{formatDateTime(log.sent_at || log.created_at || new Date())}</td>
                  <td>{log.client_name || 'Unknown'}</td>
                  <td>{log.group_id || 'Not Applicable'}</td>
                  <td>
                    <span className={`badge bg-${log.status === 'sent' ? 'success' : 'danger'}`}>
                      {log.status || 'Not Applicable'}
                    </span>
                  </td>
                  <td>
                    <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                      {log.message ? (
                        <>
                          {log.message.includes('⚠️ URGENT REMINDER') ? 
                            getReminderBadge('urgent') : 
                           (log.message.includes('📢 Gentle Reminder') || log.message.includes('📢 Gentle reminder')) ? 
                            getReminderBadge('gentle') : null}
                          {log.message.includes('submit your pending') && (
                            <>
                              {" to submit your pending "}
                              {log.message.split('submit your pending ')[1]?.split(' for ')[0] || ''}
                              {" for "}
                              {log.message.split('for ')[1]?.split('.')[0] || ''}
                              {"..."}
                            </>
                          )}
                        </>
                      ) : 'Not Applicable'}
                    </div>
                    <button 
                      className="btn btn-sm btn-link" 
                      onClick={() => log.message && showContentModal(log.message, 'WhatsApp Message Content')}
                    >
                      View Full Content
                    </button>
                  </td>
                  <td>{log.error_message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        
        <Modal show={showWhatsappClearModal} onHide={() => !clearingWhatsapp && setShowWhatsappClearModal(false)}>
          <Modal.Header closeButton={!clearingWhatsapp}>
            <Modal.Title>Confirm Clear WhatsApp Logs</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {dateRange.startDate && dateRange.endDate ? (
              <p>Are you sure you want to clear WhatsApp logs from {formatDateForDisplay(new Date(dateRange.startDate))} to {formatDateForDisplay(new Date(dateRange.endDate))}?</p>
            ) : (
              <p>Are you sure you want to clear WhatsApp logs for the selected period?</p>
            )}
            <p className="text-danger"><strong>Warning:</strong> This action cannot be undone.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowWhatsappClearModal(false)}
              disabled={clearingWhatsapp}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={clearWhatsappLogs}
              disabled={clearingWhatsapp}
            >
              {clearingWhatsapp ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Clearing...
                </>
              ) : 'Clear Logs'}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  };
  
  // Render Email logs tab
  const renderEmailLogsTab = () => {
    return (
      <div>
        {emailError && <Alert variant="danger">{emailError}</Alert>}
        
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Filter Email Logs</Card.Title>
            <Form>
              <Row>
                <Col md={5}>
                  <CommunicationDateInput
                    label="Start Date"
                    name="startDate"
                    value={dateRange.startDate}
                    onChange={handleDateChange}
                    maxDate={today}
                  />
                </Col>
                <Col md={5}>
                  <CommunicationDateInput
                    label="End Date"
                    name="endDate"
                    value={dateRange.endDate}
                    onChange={handleDateChange}
                    maxDate={today}
                  />
                </Col>
                <Col md={2} className="d-flex align-items-end">
                  <Button 
                    variant={isInvalidRange() ? "danger" : "primary"}
                    onClick={fetchEmailLogs}
                    disabled={loadingEmail || isInvalidRange() || !dateRange.startDate || !dateRange.endDate}
                    className="mb-3 w-100"
                  >
                    {loadingEmail ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        Loading...
                      </>
                    ) : isInvalidRange() ? "Invalid Date Range" : "Apply Filter"}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
        
        {/* Action buttons */}
        <div className="d-flex justify-content-end mb-3">
          <Button 
            variant="success" 
            onClick={downloadEmailLogs} 
            className="me-2"
            disabled={emailDownloading || !emailLogs.length || isInvalidRange()}
          >
            {emailDownloading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Downloading...
              </>
            ) : 'Download CSV'}
          </Button>
          
          <Button 
            variant="primary" 
            onClick={downloadEmailLogsPDF} 
            className="me-2"
            disabled={emailPdfDownloading || !emailLogs.length || isInvalidRange()}
          >
            {emailPdfDownloading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Generating PDF...
              </>
            ) : 'Download PDF'}
          </Button>
          
          <Button 
            variant="danger" 
            onClick={() => setShowEmailClearModal(true)} 
            disabled={clearingEmail || !emailLogs.length || isInvalidRange()}
          >
            Clear Logs
          </Button>
        </div>
        
        {/* Loading state or empty state */}
        {loadingEmail ? (
          <div className="text-center my-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-2">Loading email logs...</p>
          </div>
        ) : emailLogs.length === 0 ? (
          <Alert variant="info">
            {dateRange.startDate && dateRange.endDate && !emailError ? 
              "No email logs found for the selected date range." : 
              "Select a date range and click 'Apply Filter' to view email logs."}
          </Alert>
        ) : (
          /* Logs table */
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Client</th>
                <th>Email To</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Email Body</th>
              </tr>
            </thead>
            <tbody>
              {emailLogs.map((log, index) => (
                <tr key={index}>
                  <td>{formatDateTime(log.sent_date || log.sent_at || log.created_at)}</td>
                  <td>{log.client_name || extractClientNameFromSubject(log.email_subject || log.subject) || 'Unknown'}</td>
                  <td>{log.email_to || 'Not Applicable'}</td>
                  <td>
                    <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.email_subject || log.subject || 'Not Applicable'}
                    </div>
                  </td>
                  <td>
                    <span className={`badge bg-${log.status === 'sent' ? 'success' : 'danger'}`}>
                      {log.status || 'Not Applicable'}
                    </span>
                  </td>
                  <td>
                    <div style={{ maxHeight: '100px', overflow: 'auto' }}>
                      {log.email_body || log.body ? (
                        <>
                          {(log.email_body || log.body).includes('URGENT REMINDER') || 
                           (log.email_body || log.body).includes('Last reminder') ? 
                            getReminderBadge('urgent') : 
                           (log.email_body || log.body).includes('Gentle reminder') ? 
                            getReminderBadge('gentle') : null}
                          {" to share "}
                          {(log.email_body || log.body).split('to share ')[1]?.split(' for the month')[0] || ''}
                          {" for the month of "}
                          {(log.email_body || log.body).split('for the month of ')[1]?.split('.')[0] || ''}
                          {"..."}
                        </>
                      ) : 'Not Applicable'}
                    </div>
                    <button 
                      className="btn btn-sm btn-link" 
                      onClick={() => {
                        const body = log.email_body || log.body;
                        body && showContentModal(body, 'Email Content');
                      }}
                      disabled={!(log.email_body || log.body)}
                    >
                      View Full Content
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        
        {/* Confirmation modal for clearing logs */}
        <Modal show={showEmailClearModal} onHide={() => !clearingEmail && setShowEmailClearModal(false)}>
          <Modal.Header closeButton={!clearingEmail}>
            <Modal.Title>Confirm Clear Email Logs</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {dateRange.startDate && dateRange.endDate ? (
              <p>Are you sure you want to clear email logs from {formatDateForDisplay(new Date(dateRange.startDate))} to {formatDateForDisplay(new Date(dateRange.endDate))}?</p>
            ) : (
              <p>Are you sure you want to clear email logs for the selected period?</p>
            )}
            <p className="text-danger"><strong>Warning:</strong> This action cannot be undone.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowEmailClearModal(false)}
              disabled={clearingEmail}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={clearEmailLogs}
              disabled={clearingEmail}
            >
              {clearingEmail ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Clearing...
                </>
              ) : 'Clear Logs'}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  };
  
  // Main component render
  return (
    <DatePickerProvider>
      <Container className="mt-4 mb-5">
        <h1>Communication Logs</h1>
        <Tabs activeKey={activeTab} onSelect={handleTabChange} className="mb-4">
        <Tab eventKey="whatsapp" title="WhatsApp Logs">
          {renderWhatsappLogsTab()}
        </Tab>
        <Tab eventKey="email" title="Email Logs">
          {renderEmailLogsTab()}
        </Tab>
      </Tabs>
    </Container>
    </DatePickerProvider>
  );
};

export default CommunicationLogs; 