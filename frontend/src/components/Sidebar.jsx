/**
 * Sidebar.jsx — Collapsible left sidebar navigation
 *
 * Design:
 * - Fixed left panel, 220px expanded / 60px collapsed (icon-only)
 * - All 10 nav links + logout button always visible
 * - Active route pill highlight
 * - Smooth CSS transitions
 * - Mobile: hidden by default, opens as overlay via hamburger top bar
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectToken, logout } from '../redux/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import './Sidebar.css';

const NAV_LINKS = [
  { to: '/',           label: 'Dashboard',      icon: 'bi-grid-1x2' },
  { to: '/clients',    label: 'Client Master',  icon: 'bi-people' },
  { to: '/status',     label: 'Pending Status', icon: 'bi-hourglass-split' },
  { to: '/submission', label: 'Data Received',  icon: 'bi-check2-circle' },
  { to: '/settings',   label: 'Reminders',      icon: 'bi-bell' },
  { to: '/logs',       label: 'Logs',           icon: 'bi-card-text' },
  { to: '/reports',    label: 'Reports',        icon: 'bi-bar-chart' },
  { to: '/agreements', label: 'Agreements',     icon: 'bi-file-earmark-text' },
  { to: '/whatsapp',   label: 'WhatsApp',       icon: 'bi-whatsapp' },
  { to: '/users',      label: 'Users',          icon: 'bi-person-gear' },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const token    = useSelector(selectToken);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    setMobileOpen(false);
  };

  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  const handleLinkClick = () => setMobileOpen(false);

  if (!token) return null;

  const sidebarContent = (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Brand + toggle */}
      <div className="sidebar__header">
        <Link to="/" className="sidebar__brand" onClick={handleLinkClick}>
          <span className="sidebar__brand-mark">H</span>
          {!collapsed && (
            <span className="sidebar__brand-text">PRT Associates</span>
          )}
        </Link>
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="sidebar__nav">
        <ul className="sidebar__nav-list" role="list">
          {NAV_LINKS.map(({ to, label, icon }) => (
            <li key={to} className="sidebar__nav-item">
              <Link
                to={to}
                className={`sidebar__nav-link ${isActive(to) ? 'sidebar__nav-link--active' : ''}`}
                onClick={handleLinkClick}
                title={collapsed ? label : undefined}
              >
                <i className={`bi ${icon} sidebar__nav-icon`} aria-hidden="true" />
                {!collapsed && <span className="sidebar__nav-label">{label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="sidebar__footer">
        <motion.button
          className="sidebar__logout"
          onClick={handleLogout}
          whileTap={{ scale: 0.95 }}
          title="Logout"
        >
          <i className="bi bi-box-arrow-right sidebar__nav-icon" />
          {!collapsed && <span className="sidebar__logout-label">Logout</span>}
        </motion.button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="sidebar-wrapper sidebar-wrapper--desktop">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="sidebar-wrapper sidebar-wrapper--mobile"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
