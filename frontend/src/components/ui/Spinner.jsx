/**
 * Spinner.jsx — Consistent loading indicator
 * Usage: <Spinner /> or <Spinner size="lg" label="Loading data..." />
 */
import React from 'react';
import './Spinner.css';

export default function Spinner({ size = 'md', label = '', center = true }) {
  return (
    <div className={`ui-spinner-wrap ${center ? 'ui-spinner-wrap--center' : ''}`}>
      <div className={`ui-spinner ui-spinner--${size}`} role="status" aria-label={label || 'Loading'} />
      {label && <p className="ui-spinner-label">{label}</p>}
    </div>
  );
}
