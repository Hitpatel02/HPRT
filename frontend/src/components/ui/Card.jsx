/**
 * Card.jsx — Base UI component
 *
 * Usage:
 *   <Card title="Clients" subtitle="..." action={<Button size="sm">Add</Button>}>
 *     content
 *   </Card>
 */
import React from 'react';
import { motion } from 'framer-motion';
import './Card.css';

export default function Card({
  children,
  title,
  subtitle,
  action,
  footer,
  elevated   = false,
  hoverable  = false,
  padding    = true,
  className  = '',
}) {
  const Tag = hoverable ? motion.div : 'div';
  const motionProps = hoverable
    ? { whileHover: { y: -2, boxShadow: 'var(--shadow-lg)' }, transition: { duration: 0.18 } }
    : {};

  return (
    <Tag
      className={`ui-card ${elevated ? 'ui-card--elevated' : ''} ${hoverable ? 'ui-card--hoverable' : ''} ${className}`}
      {...motionProps}
    >
      {(title || action) && (
        <div className="ui-card__header">
          <div className="ui-card__header-text">
            {title && <h3 className="ui-card__title">{title}</h3>}
            {subtitle && <p className="ui-card__subtitle">{subtitle}</p>}
          </div>
          {action && <div className="ui-card__action">{action}</div>}
        </div>
      )}
      <div className={`ui-card__body ${!padding ? 'ui-card__body--no-pad' : ''}`}>
        {children}
      </div>
      {footer && <div className="ui-card__footer">{footer}</div>}
    </Tag>
  );
}
