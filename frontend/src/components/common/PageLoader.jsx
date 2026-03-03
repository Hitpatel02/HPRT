import React from 'react';
import { Spinner } from 'react-bootstrap';

/**
 * A reusable loading spinner component with consistent styling
 * @param {Object} props - Component props
 * @param {string} props.message - Optional message to display below the spinner
 * @param {string} props.variant - Spinner color variant (primary, secondary, etc.)
 */
const PageLoader = ({ 
  message = 'Loading...', 
  variant = 'primary'
}) => {
  return (
    <div className="text-center my-5 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '200px' }}>
      <Spinner animation="border" role="status" variant={variant}>
        <span className="visually-hidden">Loading...</span>
      </Spinner>
      {message && <p className="mt-3 text-muted">{message}</p>}
    </div>
  );
};

export default PageLoader;
