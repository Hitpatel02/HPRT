/**
 * EmptyState.jsx — No-data placeholder
 * Usage: <EmptyState icon="📂" title="No clients" message="Add a client to get started." action={<Button>Add Client</Button>} />
 */
import React from 'react';
import './EmptyState.css';

export default function EmptyState({ icon = '📋', title = 'No data', message, action }) {
  return (
    <div className="ui-empty">
      <div className="ui-empty__icon">{icon}</div>
      <h4 className="ui-empty__title">{title}</h4>
      {message && <p className="ui-empty__message">{message}</p>}
      {action && <div className="ui-empty__action">{action}</div>}
    </div>
  );
}
