/**
 * Badge.jsx — Status / label badge
 * Usage: <Badge color="success">Active</Badge>
 */
import React from 'react';
import './Badge.css';

const COLOR_MAP = {
  default: 'badge--default',
  primary: 'badge--primary',
  success: 'badge--success',
  warning: 'badge--warning',
  error:   'badge--error',
  info:    'badge--info',
};

export default function Badge({ children, color = 'default', className = '', dot = false }) {
  return (
    <span className={`ui-badge ${COLOR_MAP[color] || COLOR_MAP.default} ${className}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}
