/**
 * PageHeader.jsx — Consistent page title + subtitle + action slot
 * Usage: <PageHeader title="Clients" subtitle="Manage all registered clients" action={<Button>Add</Button>} />
 */
import React from 'react';
import './PageHeader.css';

export default function PageHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`ui-page-header ${className}`}>
      <div className="ui-page-header__text">
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
      </div>
      {action && <div className="ui-page-header__action">{action}</div>}
    </div>
  );
}
