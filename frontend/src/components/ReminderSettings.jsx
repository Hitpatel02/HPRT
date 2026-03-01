import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { format, parse } from 'date-fns';
import { formatDateForDisplay, getTodayDate } from '../utils/dateUtils';
import CommunicationDateInput, { DatePickerProvider } from './common/CommunicationDateInput';
import SetReminderDates from './SetReminderDates';
import WhatsAppControl from './WhatsAppControls';
import ReminderToggles from './ReminderToggles';
import { selectToken, setInitialDataLoaded } from '../redux/authSlice';
import LoadingSpinner from './common/LoadingSpinner';
import { settingsAPI } from '../api';
import axios from 'axios';

const ReminderSettings = () => {
  const token = useSelector(selectToken);
  const dispatch = useDispatch();
  
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Add month year picker state for the current active month
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // State to track available months with settings
  const [availableMonths, setAvailableMonths] = useState([]);
  
  // State to track which type of reminder to show in samples
  const [gstReminderType, setGstReminderType] = useState(1); // 1 for first, 2 for second
  const [tdsReminderType, setTdsReminderType] = useState(1); // 1 for first, 2 for second
  
  const [formData, setFormData] = useState({
    today_date: '',
    gst_due_date: '',
    gst_reminder_1_date: '',
    gst_reminder_2_date: '',
    tds_due_date: '',
    tds_reminder_1_date: '',
    tds_reminder_2_date: '',
    password: '',
    scheduler_hour: 10,
    scheduler_minute: '30',
    scheduler_minute_value: 30,
    scheduler_am_pm: 'AM'
  });

  useEffect(() => {
    if (!token) return;
    
    fetchAvailableMonths();
    fetchSettings();
  }, [token]);
  
  // Update today's date automatically when component mounts
  useEffect(() => {
    // Set today's date on initial load
    updateTodayDate();
    
    // Set up an interval to update the date at midnight
    const intervalId = setInterval(() => {
      const now = new Date();
      // Check if it's midnight (hour is 0, minute is 0)
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        updateTodayDate();
      }
    }, 60000); // Check every minute
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Fetch settings when selected month/year changes
  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [selectedMonth, selectedYear]);
  
  // Function to update today's date
  const updateTodayDate = () => {
    setFormData(prev => ({
      ...prev,
      today_date: getTodayDate() // Use the getTodayDate function to ensure consistent timezone handling
    }));
  };
  
  // Function to generate default dates based on selected month and year
  const generateDefaultDates = () => {
    // Create dates for the selected month/year
    const gstDueDate = new Date(selectedYear, selectedMonth, 10);
    const tdsDueDate = new Date(selectedYear, selectedMonth, 8);
    
    // Create reminder dates
    let gstReminder1Date = new Date(selectedYear, selectedMonth, 5);
    let gstReminder2Date = new Date(selectedYear, selectedMonth, 8);
    let tdsReminder1Date = new Date(selectedYear, selectedMonth, 1);
    let tdsReminder2Date = new Date(selectedYear, selectedMonth, 4);
    
    // Check if any reminder dates fall on Sunday (day 0) and adjust
    if (gstReminder1Date.getDay() === 0) gstReminder1Date.setDate(gstReminder1Date.getDate() + 1);
    if (gstReminder2Date.getDay() === 0) gstReminder2Date.setDate(gstReminder2Date.getDate() + 1);
    if (tdsReminder1Date.getDay() === 0) tdsReminder1Date.setDate(tdsReminder1Date.getDate() + 1);
    if (tdsReminder2Date.getDay() === 0) tdsReminder2Date.setDate(tdsReminder2Date.getDate() + 1);
    
    // Format dates to YYYY-MM-DD
    const formatDate = (date) => {
      return format(date, 'yyyy-MM-dd');
    };
    
    return {
      gst_due_date: formatDate(gstDueDate),
      tds_due_date: formatDate(tdsDueDate),
      gst_reminder_1_date: formatDate(gstReminder1Date),
      gst_reminder_2_date: formatDate(gstReminder2Date),
      tds_reminder_1_date: formatDate(tdsReminder1Date),
      tds_reminder_2_date: formatDate(tdsReminder2Date),
      scheduler_hour: 10,
      scheduler_minute: '30',
      scheduler_minute_value: 30,
      scheduler_am_pm: 'AM'
    };
  };
  
  // Helper function to format dates for the API
  const formatToYYYYMMDD = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Check if the date is already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      
      // Handle PostgreSQL timestamp format with timezone
      if (dateString.includes('T')) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format');
        }
        return format(date, 'yyyy-MM-dd');
      }
      
      // Parse the date from the display format (e.g., "22-Mar-2023")
      try {
        const parsedDate = parse(dateString, 'dd-MMM-yyyy', new Date());
        return format(parsedDate, 'yyyy-MM-dd');
      } catch (parseError) {
        // If parsing fails, try to create a date directly
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format');
        }
        return format(date, 'yyyy-MM-dd');
      }
    } catch (error) {
      // Return empty string for invalid dates
      return '';
    }
  };
  
  // Fetch available months with settings
  const fetchAvailableMonths = async () => {
    try {
      const response = await settingsAPI.getAvailableMonths(token);
      if (response && Array.isArray(response)) {
        setAvailableMonths(response);
      }
    } catch (error) {
      // Don't set error state as this shouldn't block the UI
    }
  };
  
  // Fetch settings for the selected month and year
  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const monthStr = (selectedMonth + 1).toString().padStart(2, '0');
      const yearStr = selectedYear.toString();
      const monthYear = `${yearStr}-${monthStr}`;
      
      const response = await settingsAPI.getSettingsForMonth(token, yearStr, monthStr);
      
      // Check if the response contains valid settings for the current month
      const selectedMonthName = months[selectedMonth];
      const selectedYearStr = selectedYear.toString();
      
      // Verify the settings are for the correct month/year - strict validation
      const responseHasValidSettings = response && 
                                       Object.keys(response).length > 0 && 
                                       response.current_month && 
                                       response.current_month.toLowerCase().includes(selectedMonthName.toLowerCase()) &&
                                       response.current_month.includes(selectedYearStr) &&
                                       // Add strict verification that this is an actual record for this specific month
                                       response.id && 
                                       // Check if the month in current_month matches the selected month exactly
                                       (response.current_month === `${selectedMonthName} ${selectedYearStr}` ||
                                        response.current_month === `${selectedMonthName.toLowerCase()} ${selectedYearStr}` ||
                                        response.current_month === `${selectedMonthName.toUpperCase()} ${selectedYearStr}`);
      

      if (responseHasValidSettings) {
        const formattedSettings = { ...response };
        const dateFields = [
          'gst_due_date', 'gst_reminder_1_date', 
          'gst_reminder_2_date', 'tds_due_date', 'tds_reminder_1_date', 
          'tds_reminder_2_date'
        ];
        
        // Always set today's date to the current date, ignoring what's in the server response
        formattedSettings.today_date = getTodayDate();
        
        // Format all date fields to ensure consistency
        dateFields.forEach(field => {
          if (formattedSettings[field]) {
            // Ensure dates are in YYYY-MM-DD format for internal storage
            formattedSettings[field] = formatToYYYYMMDD(formattedSettings[field]);
          }
        });
        
        // Only process scheduler settings if we have confirmed this is the correct month/year record
        
        // Process scheduler settings from DB - keep original values if they exist
        // Only validate and process if there are valid values
        if (formattedSettings.scheduler_hour !== null && formattedSettings.scheduler_hour !== undefined) {
          // Parse the hour value
          formattedSettings.scheduler_hour = parseInt(formattedSettings.scheduler_hour, 10);
          if (isNaN(formattedSettings.scheduler_hour) || formattedSettings.scheduler_hour < 1 || formattedSettings.scheduler_hour > 12) {
            formattedSettings.scheduler_hour = 10; // Default if invalid
          }
        } else {
          formattedSettings.scheduler_hour = 10; // Default if not present
        }
        
        // Process minute value
        if (formattedSettings.scheduler_minute !== null && formattedSettings.scheduler_minute !== undefined) {
          // Parse the minute to ensure it's a valid number
          const parsedMinute = parseInt(formattedSettings.scheduler_minute, 10);
          if (!isNaN(parsedMinute) && parsedMinute >= 0 && parsedMinute <= 59) {
            formattedSettings.scheduler_minute_value = parsedMinute;
            formattedSettings.scheduler_minute = parsedMinute.toString().padStart(2, '0');
          } else {
            formattedSettings.scheduler_minute_value = 30;
            formattedSettings.scheduler_minute = '30';
          }
        } else {
          formattedSettings.scheduler_minute_value = 30;
          formattedSettings.scheduler_minute = '30';
        }
        
        // Default to AM if no valid value is present
        formattedSettings.scheduler_am_pm = 
          (formattedSettings.scheduler_am_pm === 'PM' || formattedSettings.scheduler_am_pm === 'AM') ? 
          formattedSettings.scheduler_am_pm : 'AM';
        
        // Ensure password field is a string
        formattedSettings.password = formattedSettings.password || '';
        
        // Set default values for missing fields using our generateDefaultDates function
        const defaultDates = generateDefaultDates();
        formattedSettings.gst_due_date = formattedSettings.gst_due_date || defaultDates.gst_due_date;
        formattedSettings.gst_reminder_1_date = formattedSettings.gst_reminder_1_date || defaultDates.gst_reminder_1_date;
        formattedSettings.gst_reminder_2_date = formattedSettings.gst_reminder_2_date || defaultDates.gst_reminder_2_date;
        formattedSettings.tds_due_date = formattedSettings.tds_due_date || defaultDates.tds_due_date;
        formattedSettings.tds_reminder_1_date = formattedSettings.tds_reminder_1_date || defaultDates.tds_reminder_1_date;
        formattedSettings.tds_reminder_2_date = formattedSettings.tds_reminder_2_date || defaultDates.tds_reminder_2_date;
        
        // Set the formatted settings to the form data state
        setFormData(formattedSettings);
        setSettings(formattedSettings);
      } else {
        // No valid settings found for this month — use defaults
        
        // Get default dates for the selected month/year
        const defaultDates = generateDefaultDates();
        
        // Reset form data but keep the selected month/year and use default dates
        const newFormData = {
          today_date: format(new Date(), 'yyyy-MM-dd'),
          gst_due_date: defaultDates.gst_due_date,
          gst_reminder_1_date: defaultDates.gst_reminder_1_date,
          gst_reminder_2_date: defaultDates.gst_reminder_2_date,
          tds_due_date: defaultDates.tds_due_date,
          tds_reminder_1_date: defaultDates.tds_reminder_1_date,
          tds_reminder_2_date: defaultDates.tds_reminder_2_date,
          password: '',
          scheduler_hour: 10,
          scheduler_minute: '30',
          scheduler_minute_value: 30,
          scheduler_am_pm: 'AM',
          current_month: `${months[selectedMonth]} ${selectedYear}`
        };
        setFormData(newFormData);
        setSettings(null);
      }
      
      // Mark data as loaded
      dispatch(setInitialDataLoaded(true));
    } catch (error) {
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Check if this is a date clear event and handle it separately
    if (e.isDateClear) {
      // Just update the form data with empty value
      setFormData(prev => ({
        ...prev,
        [name]: value // Just update the form data with the cleared value (empty string)
      }));
      // Don't proceed further - prevents form submission
      return;
    }
    
    // Special handling for scheduler_hour
    if (name === 'scheduler_hour') {
      // Allow empty input
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          scheduler_hour: ''
        }));
      } else {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 1 && numValue <= 12) {
          setFormData(prev => ({
            ...prev,
            scheduler_hour: numValue // Store as number, not string
          }));
        }
      }
    }
    // Special handling for scheduler_minute
    else if (name === 'scheduler_minute') {
      // Allow empty input or only valid numbers between 0-59
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          scheduler_minute: '',
          scheduler_minute_value: 0
        }));
      } else {
        // Parse the input value and check the range
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 59) {
          setFormData(prev => ({
            ...prev,
            scheduler_minute: value,
            scheduler_minute_value: numValue
          }));
        }
        // Don't update state if outside valid range
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Add blur handlers for hour and minute fields
  const handleHourBlur = (e) => {
    const value = e.target.value;
    if (value === '') {
      setFormData(prev => ({
        ...prev,
        scheduler_hour: 10 // Default value 10
      }));
    }
  };

  const handleMinuteBlur = (e) => {
    const value = e.target.value;
    if (value === '') {
      setFormData(prev => ({
        ...prev,
        scheduler_minute: '00',
        scheduler_minute_value: 0
      }));
    } else {
      const numValue = parseInt(value.replace(/^0+/, ''), 10);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 59) {
        setFormData(prev => ({
          ...prev,
          scheduler_minute: numValue.toString().padStart(2, '0'),
          scheduler_minute_value: numValue
        }));
      } else {
        // If invalid, reset to default
        setFormData(prev => ({
          ...prev,
          scheduler_minute: '00',
          scheduler_minute_value: 0
        }));
      }
    }
  };

  // Add a new handler for setting reminder dates automatically
  const handleSetReminderDates = (dates) => {
    setFormData(prev => ({
      ...prev,
      gst_reminder_1_date: dates.reminder1,
      gst_reminder_2_date: dates.reminder2
    }));
  };
  
  // Add handler for TDS reminder dates
  const handleSetTDSReminderDates = (dates) => {
    setFormData(prev => ({
      ...prev,
      tds_reminder_1_date: dates.reminder1,
      tds_reminder_2_date: dates.reminder2
    }));
  };
  
  // Handle month and year changes
  const handleMonthChange = (e) => {
    const monthIndex = parseInt(e.target.value, 10);
    setSelectedMonth(monthIndex);
  };
  
  const handleYearChange = (e) => {
    const year = parseInt(e.target.value, 10);
    setSelectedYear(year);
  };
  
  // Generate years array (5 years before current year, current year, 5 years after)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i);
    }
    
    return years;
  };
  
  const years = generateYearOptions();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaving(true);
    setError(null);
    
    try {
      // Clone the form data to avoid modifying state directly
      const formDataToSubmit = { ...formData };
      
      // Always set today's date to the current date
      formDataToSubmit.today_date = getTodayDate();
      
      // Format all dates to YYYY-MM-DD format
      const dateFields = [
        'gst_due_date', 'gst_reminder_1_date', 
        'gst_reminder_2_date', 'tds_due_date', 'tds_reminder_1_date', 
        'tds_reminder_2_date'
      ];
      
      dateFields.forEach(field => {
        if (formDataToSubmit[field]) {
          formDataToSubmit[field] = formatToYYYYMMDD(formDataToSubmit[field]);
        }
      });
      
      // Validate required fields
      if (!formDataToSubmit.today_date) {
        throw new Error('Today\'s date is required');
      }
      
      // Validate scheduler hour
      const hourValue = parseInt(formDataToSubmit.scheduler_hour, 10);
      if (isNaN(hourValue) || hourValue < 1 || hourValue > 12) {
        throw new Error('Scheduler hour must be between 1 and 12');
      }
      
      // Validate scheduler minute
      const minuteValue = formDataToSubmit.scheduler_minute_value;
      if (isNaN(minuteValue) || minuteValue < 0 || minuteValue > 59) {
        throw new Error('Scheduler minute must be between 0 and 59');
      }
      
      // Use the stored minute value
      formDataToSubmit.scheduler_minute = minuteValue;
      
      // Ensure scheduler_am_pm is either 'AM' or 'PM'
      formDataToSubmit.scheduler_am_pm = 
        (formDataToSubmit.scheduler_am_pm === 'PM' ? 'PM' : 'AM');
      
      // Add current month based on month and year selection
      formDataToSubmit.current_month = `${months[selectedMonth]} ${selectedYear}`;
      
      // Remove month and year fields if they exist as they don't exist in the database
      delete formDataToSubmit.month;
      delete formDataToSubmit.year;
      
      // Remove the internal field before submission
      delete formDataToSubmit.scheduler_minute_value;
      
      // Use API service to save settings for the specific month/year
      await settingsAPI.saveSettingsForMonth(token, selectedYear, selectedMonth + 1, formDataToSubmit);
      
      setSuccessMessage('Settings saved successfully.');
      
      // Set a timeout to clear the success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      // Refresh available months list
      await fetchAvailableMonths();
      
      // Immediately fetch updated settings to ensure UI reflects current state
      await fetchSettings();
      
    } catch (error) {
      setError(error.message || 'An error occurred while saving settings');
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };


  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [selectedMonth, selectedYear]);

  return (
    <div className="settings-container">
      <h1 className="mb-4">Reminder Settings</h1>
      
      <DatePickerProvider>
        <div className="content-section">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            <>
              {successMessage && <Alert variant="success">{successMessage}</Alert>}

              <Card className="mb-4">
                <Card.Header as="h5">WhatsApp Connection</Card.Header>
                <Card.Body>
                  <WhatsAppControl />
                </Card.Body>
              </Card>
              
              {settings && Object.keys(settings).length > 0 && (
                <ReminderToggles 
                  settings={settings} 
                  onSettingsUpdated={fetchSettings} 
                />
              )}
              
              <Card className="mb-4">
                <Card.Header as="h5">How Reminders Work</Card.Header>
                <Card.Body>
                  <p>The reminder system helps you keep track of pending documents for your clients:</p>
                  <ol>
                    <li><strong>Current Month</strong>: Select which month you're tracking documents for.</li>
                    <li><strong>GST Due Date</strong>: Set the official due date for GST filing.</li>
                    <li><strong>TDS Due Date</strong>: Set the official due date for TDS filing.</li>
                    <li><strong>Reminder Dates</strong>: Set reminder dates for each document type.</li>
                  </ol>
                  <p className="mb-0">Reminders will be sent automatically according to the document types enabled for each client and the dates you set here.</p>
                </Card.Body>
              </Card>
              
              <Card className="mb-4">
                <Card.Header as="h5">Reminder Settings</Card.Header>
                <Card.Body>
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Month Selection</Form.Label>
                      <Row className="month-year-picker">
                        <Col sm={6}>
                          <Form.Select
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            className="mb-2"
                          >
                            {months.map((month, index) => (
                              <option key={index} value={index}>{month}</option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col sm={6}>
                          <Form.Select
                            value={selectedYear}
                            onChange={handleYearChange}
                          >
                            {years.map((year) => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </Form.Select>
                        </Col>
                      </Row>
                      <Form.Control 
                        type="hidden" 
                        name="current_month" 
                        value={`${months[selectedMonth]} ${selectedYear}`} 
                      />
                      <Form.Text className="text-muted">
                        Select a month to configure or view its reminder settings. You can set up reminders for future months in advance.
                        {availableMonths.length > 0 && (
                          <div className="mt-2">
                            <strong>Months with settings:</strong> {availableMonths.map(m => `${months[m.month-1]} ${m.year}`).join(', ')}
                          </div>
                        )}
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Today's Date</Form.Label>
                      <Form.Control
                        type="text"
                        name="today_date_display"
                        value={formatDateForDisplay(getTodayDate())}
                        readOnly
                        className="form-control"
                        style={{ backgroundColor: '#f8f9fa' }}
                      />
                      {/* Hidden field to store the actual value for form submission */}
                      <Form.Control 
                        type="hidden" 
                        name="today_date" 
                        value={getTodayDate()} 
                      />
                      <Form.Text className="text-muted">
                        Automatically set to current date based on your local timezone (India).
                      </Form.Text>
                    </Form.Group>
                    
                    <Row>
                      <Col md={6}>
                        <h4 className="mt-4 mb-3">GST Reminder Settings</h4>
                        
                        <CommunicationDateInput
                          label="GST Due Date"
                          name="gst_due_date"
                          value={formData.gst_due_date}
                          onChange={handleInputChange}
                          required={true}
                          helpText="The last date for GST return filing"
                        />
                        
                        <SetReminderDates 
                          gstDueDate={formData.gst_due_date}
                          onSetDates={handleSetReminderDates}
                          type="gst"
                        />
                        
                        <CommunicationDateInput
                          label="1st GST Reminder Date (Gentle Reminder)"
                          name="gst_reminder_1_date"
                          value={formData.gst_reminder_1_date}
                          onChange={handleInputChange}
                          helpText="Date when the first gentle reminder should be sent for GST documents."
                          onFocus={() => setGstReminderType(1)}
                        />
                        
                        <CommunicationDateInput
                          label="2nd GST Reminder Date (Urgent Reminder)"
                          name="gst_reminder_2_date"
                          value={formData.gst_reminder_2_date}
                          onChange={handleInputChange}
                          helpText="Date when the second urgent reminder should be sent for GST documents."
                          onFocus={() => setGstReminderType(2)}
                        />

                        <Card className="mt-3 mb-3">
                          <Card.Header className="d-flex justify-content-between align-items-center">
                            <strong>Sample GST Reminder Message</strong>
                            <div>
                              <Button 
                                variant={gstReminderType === 1 ? "primary" : "outline-primary"} 
                                size="sm" 
                                className="me-2"
                                onClick={() => setGstReminderType(1)}
                              >
                                Gentle
                              </Button>
                              <Button 
                                variant={gstReminderType === 2 ? "danger" : "outline-danger"} 
                                size="sm"
                                onClick={() => setGstReminderType(2)}
                              >
                                Urgent
                              </Button>
                            </div>
                          </Card.Header>
                          <Card.Body style={{ fontSize: '0.9rem', backgroundColor: '#f8f9fa' }}>
                            <p>
                              <strong>
                                {gstReminderType === 2 ? 
                                  "⚠️ URGENT REMINDER" : 
                                  "📢 Gentle reminder"}
                              </strong>
                            </p>
                            <p>Dear <strong>client_name</strong>,</p>
                            <p>This is {gstReminderType === 2 ? "an urgent" : "a gentle"} reminder to submit your pending <strong>GSTR 1 data</strong> for {months[selectedMonth]} {selectedYear}.</p>
                            <p><strong>Due Date:</strong> {formData.gst_due_date && formData.gst_due_date !== '' ? 
                              (() => {
                                try {
                                  const date = new Date(formData.gst_due_date);
                                  return isNaN(date.getTime()) ? '[Due Date]' : 
                                    date.toLocaleDateString('en-GB', { 
                                      day: '2-digit', 
                                      month: 'long', 
                                      year: 'numeric' 
                                    });
                                } catch (e) {
                                  return '[Due Date]';
                                }
                              })() 
                              : '[Due Date]'
                            }</p>
                            <p>Act now to avoid late fees. Please ignore if documents have already been provided.</p>
                            <p>Need assistance? Contact us ASAP.</p>
                            <p>Thank you for your prompt attention 🤝</p>
                            <p>Best regards,<br/>Team HPRT<br/>M. No. 966 468 7247</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      
                      <Col md={6}>
                        <h4 className="mt-4 mb-3">TDS Reminder Settings</h4>
                        
                        <CommunicationDateInput
                          label="TDS Due Date"
                          name="tds_due_date"
                          value={formData.tds_due_date}
                          onChange={handleInputChange}
                          helpText="The last date for TDS return filing. TDS reminder dates should be earlier than GST reminder dates."
                        />
                        
                        <SetReminderDates 
                          tdsDueDate={formData.tds_due_date}
                          onSetDates={handleSetTDSReminderDates}
                          type="tds"
                        />
                        
                        <CommunicationDateInput
                          label="1st TDS Reminder Date (Gentle Reminder)"
                          name="tds_reminder_1_date"
                          value={formData.tds_reminder_1_date}
                          onChange={handleInputChange}
                          helpText="Date when the first gentle reminder should be sent for TDS documents."
                          onFocus={() => setTdsReminderType(1)}
                        />
                        
                        <CommunicationDateInput
                          label="2nd TDS Reminder Date (Urgent Reminder)"
                          name="tds_reminder_2_date"
                          value={formData.tds_reminder_2_date}
                          onChange={handleInputChange}
                          helpText="Date when the second urgent reminder should be sent for TDS documents."
                          onFocus={() => setTdsReminderType(2)}
                        />

                        <Card className="mt-3 mb-3">
                          <Card.Header className="d-flex justify-content-between align-items-center">
                            <strong>Sample TDS Reminder Message</strong>
                            <div>
                              <Button 
                                variant={tdsReminderType === 1 ? "primary" : "outline-primary"} 
                                size="sm" 
                                className="me-2"
                                onClick={() => setTdsReminderType(1)}
                              >
                                Gentle
                              </Button>
                              <Button 
                                variant={tdsReminderType === 2 ? "danger" : "outline-danger"} 
                                size="sm"
                                onClick={() => setTdsReminderType(2)}
                              >
                                Urgent
                              </Button>
                            </div>
                          </Card.Header>
                          <Card.Body style={{ fontSize: '0.9rem', backgroundColor: '#f8f9fa' }}>
                            <p>
                              <strong>
                                {tdsReminderType === 2 ? 
                                  "⚠️ URGENT REMINDER" : 
                                  "📢 Gentle reminder"}
                              </strong>
                            </p>
                            <p>Dear <strong>client_name</strong>,</p>
                            <p>This is {tdsReminderType === 2 ? "an urgent" : "a gentle"} reminder to submit your pending <strong>TDS data and Bank statement</strong> for {months[selectedMonth]} {selectedYear}.</p>
                            <p><strong>Due Date:</strong> {formData.tds_due_date && formData.tds_due_date !== '' ? 
                              (() => {
                                try {
                                  const date = new Date(formData.tds_due_date);
                                  return isNaN(date.getTime()) ? '[Due Date]' : 
                                    date.toLocaleDateString('en-GB', { 
                                      day: '2-digit', 
                                      month: 'long', 
                                      year: 'numeric' 
                                    });
                                } catch (e) {
                                  return '[Due Date]';
                                }
                              })() 
                              : '[Due Date]'
                            }</p>
                            <p>Act now to avoid late fees. Please ignore if documents have already been provided.</p>
                            <p>Need assistance? Contact us ASAP.</p>
                            <p>Thank you for your prompt attention 🤝</p>
                            <p>Best regards,<br/>Team HPRT<br/>M. No. 966 468 7247</p>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                    
                    <h4 className="mt-4 mb-3">Scheduler Settings</h4>
                    <p className="text-muted mb-4">
                      These settings control when automatic reminders are sent out. They apply to all months.
                    </p>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Daily Scheduler Time</Form.Label>
                      <Row>
                        <Col sm={4}>
                          <Form.Label>Hour</Form.Label>
                          <Form.Control 
                            type="number" 
                            min="1" 
                            max="12" 
                            name="scheduler_hour" 
                            value={formData.scheduler_hour}
                            onChange={handleInputChange}
                            onBlur={handleHourBlur}
                          />
                        </Col>
                        <Col sm={4}>
                          <Form.Label>Minute</Form.Label>
                          <Form.Control 
                            type="text" 
                            name="scheduler_minute" 
                            value={formData.scheduler_minute} 
                            onChange={handleInputChange}
                            onBlur={handleMinuteBlur}
                          />
                        </Col>
                        <Col sm={4}>
                          <Form.Label>AM/PM</Form.Label>
                          <Form.Select
                            name="scheduler_am_pm"
                            value={formData.scheduler_am_pm}
                            onChange={handleInputChange}
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </Form.Select>
                        </Col>
                      </Row>
                      <Form.Text className="text-muted">
                        The time of day when reminders should be automatically sent. System will automatically convert to server time.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Password</Form.Label>
                      <Form.Control 
                        type="text" 
                        name="password" 
                        value={formData.password} 
                        onChange={handleInputChange} 
                      />
                      <Form.Text className="text-muted">
                        Optional password to protect generated PDF reports (leave blank for unprotected reports)
                      </Form.Text>
                    </Form.Group>
                    
                    <Button variant="primary" type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                          Saving...
                        </>
                      ) : !settings ? 'Create Settings' : 'Update Settings'}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </>
          )}
        </div>
      </DatePickerProvider>
    </div>
  );
};

export default ReminderSettings; 
