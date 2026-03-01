import React from 'react';
import { Button, Form } from 'react-bootstrap';
import { format, sub, isBefore, parseISO } from 'date-fns';

/**
 * Utility component to auto-set reminder dates based on due dates
 * Works for both GST and TDS reminder dates
 */
const SetReminderDates = ({ gstDueDate, tdsDueDate, onSetDates, type = 'gst' }) => {
  const calculateReminderDates = () => {
    const dueDate = type === 'gst' ? gstDueDate : tdsDueDate;
    
    if (!dueDate) {
      alert(`Please set a ${type.toUpperCase()} due date first`);
      return;
    }

    try {
      // Parse the due date from string to Date object
      const dueDateObj = parseISO(dueDate);
      
      // Reminder 1: 5 days before due date
      const reminder1 = sub(dueDateObj, { days: 5 });
      
      // Reminder 2: 2 days before due date
      const reminder2 = sub(dueDateObj, { days: 2 });

      // Format dates for output
      const formattedReminder1 = format(reminder1, 'yyyy-MM-dd');
      const formattedReminder2 = format(reminder2, 'yyyy-MM-dd');

      // Call the passed callback with the calculated dates
      onSetDates({
        reminder1: formattedReminder1,
        reminder2: formattedReminder2
      });
    } catch (error) {
      console.error(`Error calculating ${type.toUpperCase()} reminder dates:`, error);
      alert(`Error calculating ${type.toUpperCase()} reminder dates. Please ensure the due date is valid.`);
    }
  };

  return (
    <Form.Group className="mb-3">
      <Button 
        variant="outline-secondary" 
        size="sm"
        onClick={calculateReminderDates}
        className="mb-2"
      >
        Auto-Set {type.toUpperCase()} Reminder Dates
      </Button>
      <Form.Text className="text-muted d-block">
        Automatically set reminder dates to 5 days and 2 days before the {type.toUpperCase()} due date.
      </Form.Text>
    </Form.Group>
  );
};

export default SetReminderDates; 