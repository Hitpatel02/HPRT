import React from 'react';
import { Spinner } from 'react-bootstrap';

/**
 * A reusable loading spinner component with consistent styling
 * @param {Object} props - Component props
 * @param {string} props.message - Optional message to display below the spinner
 * @param {string} props.variant - Spinner color variant (primary, secondary, etc.)
 * @param {string} props.size - Size of the spinner (sm, md, lg)
 */
const LoadingSpinner = ({ 
  message = 'Loading...', 
  variant = 'primary',
  size = 'md' 
}) => {
  // Map size to actual dimensions
  const sizeMap = {
    'sm': { width: '1.5rem', height: '1.5rem' },
    'md': { width: '3rem', height: '3rem' },
    'lg': { width: '4rem', height: '4rem' }
  };
  
  const dimensions = sizeMap[size] || sizeMap.md;
  
  return (
    <div className="loading-spinner-container">
      <Spinner 
        animation="border" 
        role="status" 
        variant={variant}
        style={dimensions}
      >
        <span className="visually-hidden">Loading...</span>
      </Spinner>
      {message && <p className="loading-text">{message}</p>}
    </div>
  );
};

export default LoadingSpinner; 