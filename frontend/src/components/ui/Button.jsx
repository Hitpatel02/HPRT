/**
 * Button.jsx — Base UI component
 *
 * Usage:
 *   <Button>Save</Button>
 *   <Button variant="secondary" size="sm">Cancel</Button>
 *   <Button variant="danger" loading>Deleting...</Button>
 *   <Button variant="ghost" icon={<i className="bi bi-plus"/>}>Add</Button>
 */
import React from 'react';
import { motion } from 'framer-motion';
import './Button.css';

const VARIANTS = {
  primary:   'btn--primary',
  secondary: 'btn--secondary',
  danger:    'btn--danger',
  success:   'btn--success',
  ghost:     'btn--ghost',
  outline:   'btn--outline',
};

const SIZES = {
  xs: 'btn--xs',
  sm: 'btn--sm',
  md: 'btn--md',
  lg: 'btn--lg',
};

export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  icon     = null,
  type     = 'button',
  onClick,
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      className={`ui-btn ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`}
      disabled={isDisabled}
      onClick={onClick}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      transition={{ duration: 0.1 }}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {!loading && icon && <span className="btn-icon">{icon}</span>}
      {children && <span className="btn-label">{children}</span>}
    </motion.button>
  );
}
