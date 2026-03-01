import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Alert, Spinner, Card, Form, Row, Col } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { selectToken } from '../redux/authSlice';
import { formatDateForDisplay, getTodayDate } from '../utils/dateUtils';
import CommunicationDateInput, { DatePickerProvider } from './common/CommunicationDateInput';
import { reportsAPI } from '../api';

const ReportPage = () => {
  const token = useSelector(selectToken);
  const [report, setReport] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [csvGenerating, setCsvGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Get today's date in YYYY-MM-DD format for max date validation
  const today = getTodayDate();

  // Helper function to check if date range is invalid (start date after end date)
  const isInvalidRange = () => {
    return dateRange.startDate && 
           dateRange.endDate && 
           dateRange.endDate < dateRange.startDate;
  };

  useEffect(() => {
    if (token) {
      // Don't automatically fetch report on page load
      // We'll wait for user to select dates and click generate
    }
  }, [token]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    
    // Update the date range first
    const updatedDateRange = {
      ...dateRange,
      [name]: value
    };
    
    // Set the date range
    setDateRange(updatedDateRange);
    
    // Clear any existing report data when dates change
    setReport(null);
    setReportData([]);
    
    // After setting the state, check if the range is now invalid
    setTimeout(() => {
      if (updatedDateRange.startDate && 
          updatedDateRange.endDate && 
          updatedDateRange.endDate < updatedDateRange.startDate) {
        setError('Invalid date range: Start date cannot be after end date');
      } else {
        // Only clear this specific error if it exists
        if (error && error.includes('Invalid date range')) {
          setError(null);
        }
      }
    }, 0);
  };

  const fetchReport = async () => {
    try {
      // Double-check that date range is valid before proceeding
      if (isInvalidRange()) {
        setError('Invalid date range: Start date cannot be after end date');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      // Use our API service to generate the report
      const reportResult = await reportsAPI.generateReport(
        token, 
        dateRange.startDate, 
        dateRange.endDate
      );
      
      setReport(reportResult);
      
      // Fetch report data to display in table
      if (reportResult && reportResult.filePath) {
        const reportData = await reportsAPI.getReportData(
          token, 
          dateRange.startDate, 
          dateRange.endDate
        );
        
        // Make sure we got data
        if (reportData && reportData.length === 0) {
          setSuccess('Report generated, but no data found for the selected date range.');
        } else {
          setReportData(reportData);
          setSuccess('Report generated successfully. Click the Download button to save the PDF.');
        }
      }
      
      // Clear success message after 6 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 6000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setGenerating(true);
      
      // Use our API service to download the report
      const blob = await reportsAPI.downloadReport(
        token, 
        dateRange.startDate, 
        dateRange.endDate
      );
      
      // Create a link element to download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HPRT_Monthly_Report_${dateRange.startDate || 'all'}_to_${dateRange.endDate || 'all'}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess('Report downloaded successfully as PDF');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };
  
  const handleDownloadCSV = async () => {
    try {
      setCsvGenerating(true);
      
      // Use our API service to download the report as CSV
      const csvData = await reportsAPI.downloadReportCSV(
        token, 
        dateRange.startDate, 
        dateRange.endDate
      );
      
      // Create a download link
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `HPRT_Monthly_Report_${dateRange.startDate || 'all'}_to_${dateRange.endDate || 'all'}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setSuccess('Report downloaded successfully as CSV');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(`Error downloading CSV: ${err.message}`);
    } finally {
      setCsvGenerating(false);
    }
  };

  return (
    <Container fluid className="px-4">
      <h1 className="mb-4">Reports</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <DatePickerProvider>
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Report Date Range</Card.Title>
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
                    onClick={fetchReport}
                    disabled={loading || isInvalidRange()}
                    className="mb-3 w-100"
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        Generating...
                      </>
                    ) : isInvalidRange() ? "Invalid Date Range" : "Generate Report"}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      </DatePickerProvider>
      
      <div className="d-flex justify-content-end mb-4">
        <Button 
          variant="primary" 
          onClick={handleDownload}
          disabled={generating || !report}
          className="me-2"
        >
          {generating ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Downloading...
            </>
          ) : 'Download PDF'}
        </Button>
        
        <Button 
          variant="success" 
          onClick={handleDownloadCSV}
          disabled={csvGenerating || !reportData.length}
        >
          {csvGenerating ? (
            <>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Downloading CSV...
            </>
          ) : 'Download CSV'}
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Generating report...</p>
        </div>
      ) : report ? (
        <div>
          <h3>Report Details</h3>
          {report.dateRange && (
            <p>Date range: {report.dateRange.startDate ? formatDateForDisplay(report.dateRange.startDate) : 'All'} to {report.dateRange.endDate ? formatDateForDisplay(report.dateRange.endDate) : 'All'}</p>
          )}
          
          <Alert variant="info" className="mb-3">
            <strong>Note:</strong> This report includes:
            <ul className="mb-0">
              <li>Documents where <strong>ANY</strong> submission date (GST, Bank Statement, or TDS) falls within the selected date range</li>
              <li>All documents with pending status that were created or updated within the selected date range</li>
            </ul>
          </Alert>
          
          {reportData.length > 0 ? (
            <Table striped bordered hover responsive className="mt-4">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Client Name</th>
                  <th>Month</th>
                  <th>GST Type</th>
                  <th>GST 1</th>
                  <th>GST Date</th>
                  <th>Bank Statement</th>
                  <th>Bank Date</th>
                  <th>TDS Statement</th>
                  <th>TDS Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((doc, index) => (
                  <tr key={doc.id}>
                    <td>{index + 1}</td>
                    <td>{doc.client_name}</td>
                    <td>{doc.document_month}</td>
                    <td>{doc.gst_filing_type || '-'}</td>
                    <td>
                      {doc.gst_1_enabled ? (
                        <span className={doc.gst_1_received ? "text-success" : "text-danger"}>
                          {doc.gst_1_received ? "Received" : "Pending"}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      {doc.gst_1_enabled && doc.gst_1_received && doc.gst_1_received_date 
                        ? formatDateForDisplay(doc.gst_1_received_date) 
                        : '-'}
                    </td>
                    <td>
                      {doc.bank_statement_enabled ? (
                        <span className={doc.bank_statement_received ? "text-success" : "text-danger"}>
                          {doc.bank_statement_received ? "Received" : "Pending"}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      {doc.bank_statement_enabled && doc.bank_statement_received && doc.bank_statement_received_date 
                        ? formatDateForDisplay(doc.bank_statement_received_date) 
                        : '-'}
                    </td>
                    <td>
                      {doc.tds_received ? (
                        <span className="text-success">Received</span>
                      ) : (
                        doc.tds_document_enabled ? (
                          <span className="text-danger">Pending</span>
                        ) : '-'
                      )}
                    </td>
                    <td>
                      {doc.tds_received && doc.tds_received_date 
                        ? formatDateForDisplay(doc.tds_received_date) 
                        : '-'}
                    </td>
                    <td>{doc.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info" className="mt-4">
              No document records found for the selected date range.
            </Alert>
          )}
        </div>
      ) : (
        <Alert variant="info">
          Select a date range and click "Generate Report" to create a GST status report.
          Leave dates empty to include all records.
        </Alert>
      )}
    </Container>
  );
};

export default ReportPage;
