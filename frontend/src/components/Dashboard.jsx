/**
 * Dashboard.jsx — Phase 5 redesign
 *
 * Changes:
 * - 4 stat cards with icons and Framer Motion stagger entrance
 * - Quick actions grid
 * - No console.log / console.error
 * - Uses ui/Card, ui/Spinner, ui/PageHeader components
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { selectToken } from '../redux/authSlice';
import Spinner from './ui/Spinner';
import Card from './ui/Card';
import AppLayout from '../layouts/AppLayout';
import { clientsAPI, documentsAPI, settingsAPI } from '../api';
import './Dashboard.css';

// ── Animation variants ────────────────────────────────────────────────────
const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// ── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon, iconColor, label, value, linkTo, linkLabel, loading }) {
  return (
    <motion.div variants={cardVariants}>
      <Link to={linkTo} className="stat-card-link">
        <div className="stat-card">
          <div className={`stat-card__icon stat-card__icon--${iconColor}`}>
            <i className={`bi ${icon}`} />
          </div>
          <div className="stat-card__body">
            <div className="stat-card__label">{label}</div>
            <div className="stat-card__value">
              {loading ? '—' : value}
            </div>
          </div>
          <div className="stat-card__link-label">
            {linkLabel} <i className="bi bi-arrow-right" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Quick Action ──────────────────────────────────────────────────────────
function QuickAction({ to, icon, label, description }) {
  return (
    <Link to={to} className="quick-action">
      <i className={`bi ${icon} quick-action__icon`} />
      <div>
        <div className="quick-action__label">{label}</div>
        <div className="quick-action__desc">{description}</div>
      </div>
      <i className="bi bi-chevron-right quick-action__arrow" />
    </Link>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const token = useSelector(selectToken);

  const [stats, setStats]   = useState({ clients: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [clientsData, pendingDocs] = await Promise.allSettled([
        clientsAPI.getAll(token),
        documentsAPI.getPending(token),
      ]);

      setStats({
        clients: clientsData.status === 'fulfilled' ? (clientsData.value?.length ?? 0) : 0,
        pending: pendingDocs.status === 'fulfilled' ? (pendingDocs.value?.length ?? 0) : 0,
      });
    } catch (err) {
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (error) {
    return (
      <AppLayout>
        <div className="dash-error" role="alert">
          <i className="bi bi-exclamation-triangle" />
          {error}
          <button className="dash-error__retry" onClick={fetchStats}>Retry</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Page header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-subtitle">Welcome back — here's your overview</p>
        </div>
      </div>

      {/* Stat cards */}
      <motion.div
        className="dash-stats"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <StatCard
          icon="bi-people-fill"
          iconColor="primary"
          label="Total Clients"
          value={stats.clients}
          linkTo="/clients"
          linkLabel="View clients"
          loading={loading}
        />
        <StatCard
          icon="bi-hourglass-split"
          iconColor="warning"
          label="Pending Documents"
          value={stats.pending}
          linkTo="/status"
          linkLabel="Check status"
          loading={loading}
        />
        <StatCard
          icon="bi-file-earmark-text"
          iconColor="accent"
          label="Agreements"
          value="Generate"
          linkTo="/agreements"
          linkLabel="Open"
          loading={false}
        />
        <StatCard
          icon="bi-whatsapp"
          iconColor="success"
          label="WhatsApp"
          value="Manage"
          linkTo="/whatsapp"
          linkLabel="Configure"
          loading={false}
        />
      </motion.div>

      {/* Quick actions */}
      <div className="dash-section">
        <h2 className="dash-section-title">Quick Actions</h2>
        <div className="dash-actions">
          <QuickAction to="/clients"    icon="bi-person-plus"     label="Add Client"          description="Register a new client" />
          <QuickAction to="/settings"   icon="bi-bell"            label="Configure Reminders"  description="Set GST & TDS reminder dates" />
          <QuickAction to="/submission" icon="bi-check2-square"   label="Mark Documents Received" description="Update document status" />
          <QuickAction to="/reports"    icon="bi-bar-chart-line"  label="Generate Report"      description="Download monthly summary" />
          <QuickAction to="/agreements" icon="bi-file-earmark-pdf" label="Create Agreement"   description="Generate a client PDF" />
          <QuickAction to="/logs"       icon="bi-card-text"       label="View Logs"            description="See communication history" />
        </div>
      </div>
    </AppLayout>
  );
}
