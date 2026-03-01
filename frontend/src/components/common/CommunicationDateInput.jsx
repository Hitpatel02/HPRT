import React, { useEffect, useState, useContext, createContext } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import '../../css/DateInput.css';
import { parse, format } from 'date-fns';
import { formatDateForDisplay } from '../../utils/dateUtils';


// Create a context to track which calendar is open
const DatePickerContext = createContext({
  openDatePickerId: null,
  setOpenDatePickerId: () => {}
});

// Provider component to be used in parent components
export const DatePickerProvider = ({ children }) => {
  const [openDatePickerId, setOpenDatePickerId] = useState(null);

  return (
    <DatePickerContext.Provider value={{ openDatePickerId, setOpenDatePickerId }}>
      {children}
    </DatePickerContext.Provider>
  );
};

/**
 * Custom date input component with consistent DD/MM/YYYY formatting
 * Specifically for Communication Logs
 */
const CommunicationDateInput = ({
  label,
  name, 
  value,
  onChange,
  required = false,
  helpText,
  maxDate,
  minDate,
  disabled = false
}) => {
  const [localDate, setLocalDate] = useState(null);
  const { openDatePickerId, setOpenDatePickerId } = useContext(DatePickerContext);

  // Generate a unique ID for this instance
  const datePickerId = name || Math.random().toString(36).substring(2, 9);

  // Is this specific calendar open?
  const isOpen = openDatePickerId === datePickerId;

  // Update local date when external value changes
  useEffect(() => {
    const parsedDate = parseDate(value);
    setLocalDate(parsedDate);
  }, [value]);

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

  // Handle date change from the date picker - for selecting a date
  const handleDateChange = (date) => {
    setLocalDate(date);
    
    if (!date) {
      // Handle null date (clear)
      // Just update our local state and pass the change
      const modifiedEvent = {
        target: {
          name,
          value: ''
        },
        isDateClear: true,
        preventDefault: () => {} // Prevent form submission
      };
      onChange(modifiedEvent);
      return;
    }
    
    const formattedDate = formatDate(date);
    
    const modifiedEvent = {
      target: {
        name,
        value: formattedDate
      },
      preventDefault: () => {} // Prevent form submission
    };
    onChange(modifiedEvent);
    
    // Close the calendar after date selection
    setOpenDatePickerId(null);
  };
  
  // Handle Clear button click - separate handler to ensure it just clears
  const handleClearClick = (e) => {
    e.stopPropagation(); // Stop event propagation
    e.preventDefault(); // Prevent any form submission
    
    // Just clear the date locally first
    setLocalDate(null);
    
    // Then notify parent with a clear event that won't trigger form submission
    const clearEvent = {
      target: {
        name,
        value: ''
      },
      isDateClear: true,
      stopPropagation: () => {},
      preventDefault: () => {}
    };
    
    onChange(clearEvent);
    
    // Close the calendar
    setOpenDatePickerId(null);
  };

  // Handle input click to open/close the calendar
  const handleInputClick = () => {
    if (disabled) return;
    
    if (isOpen) {
      setOpenDatePickerId(null); // Close this calendar
    } else {
      setOpenDatePickerId(datePickerId); // Open this calendar, which will close any other
    }
  };

  // Handle calendar icon click
  const handleCalendarClick = (e) => {
    if (disabled) return;
    
    e.stopPropagation();
    if (isOpen) {
      setOpenDatePickerId(null); // Close this calendar
    } else {
      setOpenDatePickerId(datePickerId); // Open this calendar, which will close any other
    }
  };

  // Handle outside click to close the calendar
  useEffect(() => {
    const handleOutsideClick = (e) => {
      // If the calendar is open and the click is outside the calendar container and input
      if (isOpen && e.target.closest('.custom-datepicker-container') === null && 
          e.target.closest('.date-input') === null &&
          e.target.closest('.calendar-icon') === null) {
        setOpenDatePickerId(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isOpen, setOpenDatePickerId]);

  return (
    <Form.Group className="mb-3">
      {label && (
        <Form.Label>
          {label}
          {required && <span className="text-danger">*</span>}
        </Form.Label>
      )}

      <InputGroup>
        <Form.Control
          name={name}
          type="text"
          className="date-input"
          value={localDate ? formatDateForDisplay(localDate) : ''}
          placeholder="DD/MM/YYYY"
          readOnly
          onClick={handleInputClick}
          disabled={disabled}
        />
        <InputGroup.Text
          className="calendar-icon"
          onClick={handleCalendarClick}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          <i className="bi bi-calendar3" style={{ fontSize: '1.1rem' }}></i>
        </InputGroup.Text>
      </InputGroup>

      {isOpen && !disabled && (
        <div className="custom-datepicker-container">
          <DatePicker
            selected={localDate}
            onChange={handleDateChange}
            dateFormat="dd/MM/yyyy"
            inline
            showYearDropdown
            showMonthDropdown
            yearDropdownItemNumber={15}
            dropdownMode="select"
            maxDate={maxDate ? new Date(maxDate) : undefined}
            minDate={minDate ? new Date(minDate) : undefined}
            highlightDates={[new Date()]}
            calendarClassName="custom-datepicker"
            renderCustomHeader={({
              date,
              changeYear,
              changeMonth,
              decreaseMonth,
              increaseMonth,
              prevMonthButtonDisabled,
              nextMonthButtonDisabled,
            }) => (
              <div className="react-datepicker__custom-header">
                <button
                  type="button"
                  className="react-datepicker__navigation react-datepicker__navigation--previous"
                  onClick={decreaseMonth}
                  disabled={prevMonthButtonDisabled}
                >
                  <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--previous">
                    {"<"}
                  </span>
                </button>
                <div className="react-datepicker__current-month-year">
                  <select
                    className="react-datepicker__month-select"
                    value={date.getMonth()}
                    onChange={({ target: { value } }) => changeMonth(value)}
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={i}>
                        {new Date(2000, i).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                  <select
                    className="react-datepicker__year-select"
                    value={date.getFullYear()}
                    onChange={({ target: { value } }) => changeYear(value)}
                  >
                    {Array.from({ length: 15 }, (_, i) => (
                      <option key={i} value={date.getFullYear() - 7 + i}>
                        {date.getFullYear() - 7 + i}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="react-datepicker__navigation react-datepicker__navigation--next"
                  onClick={increaseMonth}
                  disabled={nextMonthButtonDisabled}
                >
                  <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--next">
                    {">"}
                  </span>
                </button>
              </div>
            )}
          />
          <div className="react-datepicker__buttons-container">
            <button
              className="react-datepicker__today-button"
              onClick={() => handleDateChange(new Date())}
              type="button"
            >
              Today
            </button>
            <button
              className="react-datepicker__clear-button"
              onClick={handleClearClick}
              type="button"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {helpText && <Form.Text className="text-muted">{helpText}</Form.Text>}
    </Form.Group>
  );
};

export default CommunicationDateInput; 