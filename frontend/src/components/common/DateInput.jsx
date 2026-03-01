import React, { useEffect, useState, useRef } from 'react';
import { Form } from 'react-bootstrap';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import '../../css/DateInput.css'; // Import the custom styles from new location
import { parse, format } from 'date-fns';

/**
 * Custom date input component with consistent DD/MM/YYYY formatting
 */
const DateInput = ({ 
  label, 
  name, 
  value, 
  onChange, 
  required = false, 
  helpText,
  maxDate,
  minDate
}) => {
  const [localDate, setLocalDate] = useState(null);
  const datePickerRef = useRef(null);
  
  // Update local date when external value changes
  useEffect(() => {
    const parsedDate = parseDate(value);
    setLocalDate(parsedDate);
  }, [value, name]);
  
  // Parse the YYYY-MM-DD string to a Date object
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    try {
      // Handle different date formats
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD format
        return parse(dateStr, 'yyyy-MM-dd', new Date());
      } else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        // DD/MM/YYYY format
        return parse(dateStr, 'dd/MM/yyyy', new Date());
      } else {
        // Try standard date parsing for ISO strings, etc.
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          return null;
        }
        return date;
      }
    } catch (e) {
      console.error(`Error parsing date:`, e);
      return null;
    }
  };

  // Format the Date object to YYYY-MM-DD string for form data
  const formatDate = (date) => {
    if (!date) return '';
    
    try {
      // Validate that we have a valid Date object
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
      }
      
      return format(date, 'yyyy-MM-dd');
    } catch (e) {
      console.error(`Error formatting date:`, e);
      return '';
    }
  };

  // Handle date change from the date picker
  const handleDateChange = (date) => {
    setLocalDate(date);
    
    if (!date) {
      // Handle null date
      const modifiedEvent = {
        target: {
          name,
          value: ''
        }
      };
      onChange(modifiedEvent);
      return;
    }
    
    const formattedDate = formatDate(date);
    
    const modifiedEvent = {
      target: {
        name,
        value: formattedDate
      }
    };
    onChange(modifiedEvent);
    
    // Close the calendar after date selection
    if (datePickerRef.current) {
      datePickerRef.current.setOpen(false);
    }
  };
  
  // Handle calendar icon click
  const handleCalendarClick = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    if (datePickerRef.current) {
      datePickerRef.current.setOpen(true);
    }
  };

  // Custom input component for datepicker
  const CustomInput = React.forwardRef(({ value, onClick, onChange }, ref) => (
    <div className="input-group">
      <input
        type="text"
        className="form-control date-input"
        value={value}
        onChange={onChange}
        onClick={onClick}
        placeholder="DD/MM/YYYY"
        readOnly
        ref={ref}
      />
      <div 
        className="input-group-text calendar-icon"
        onClick={handleCalendarClick}
      >
        <i className="bi bi-calendar3" style={{ fontSize: '1.1rem' }}></i>
      </div>
    </div>
  ));
  
  CustomInput.displayName = 'CustomInput';

  return (
    <Form.Group className="mb-3">
      {label && (
        <Form.Label>
          {label}
          {required && <span className="text-danger">*</span>}
        </Form.Label>
      )}
      <DatePicker
        selected={localDate}
        onChange={handleDateChange}
        dateFormat="dd/MM/yyyy"
        customInput={<CustomInput />}
        ref={datePickerRef}
        showYearDropdown
        showMonthDropdown
        yearDropdownItemNumber={15}
        dropdownMode="select"
        maxDate={maxDate ? new Date(maxDate) : undefined}
        minDate={minDate ? new Date(minDate) : undefined}
        popperPlacement="bottom-start"
        popperModifiers={{
          preventOverflow: {
            enabled: true,
            escapeWithReference: false,
            boundariesElement: 'viewport'
          },
          flip: {
            enabled: true
          },
          offset: {
            enabled: true,
            offset: '0, 10'
          }
        }}
        popperClassName="date-picker-popper"
        todayButton="Today"
        highlightDates={[new Date()]}
        calendarClassName="custom-datepicker"
        portalId="root"
        usePortal
      />
      {helpText && <Form.Text className="text-muted">{helpText}</Form.Text>}
      {/* Hidden debug info - remove in production */}
      <div className="d-none">
        <small>Debug - raw value: {value}</small>
      </div>
    </Form.Group>
  );
};

export default DateInput; 