/**
 * Header.jsx — Professional fixed navbar (Phase 5 redesign)
 *
 * Design:
 * - White/light surface with subtle bottom shadow
 * - HPRT brand mark (indigo, bold)
 * - Pill-style active route indicator
 * - Tight horizontal spacing with dividers between sections
 * - Mobile-collapse works via Bootstrap Navbar toggle
 */
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectToken, logout } from '../redux/authSlice';
import { motion } from 'framer-motion';
import './Header.css';

const NAV_LINKS = [
  { to: '/',           label: 'Dashboard',           icon: 'bi-grid-1x2' },
  { to: '/clients',    label: 'Client Master',        icon: 'bi-people' },
  { to: '/status',     label: 'Pending Status',       icon: 'bi-hourglass-split' },
  { to: '/submission', label: 'Data Received',        icon: 'bi-check2-circle' },
  { to: '/settings',   label: 'Reminders',            icon: 'bi-bell' },
  { to: '/logs',       label: 'Logs',                 icon: 'bi-card-text' },
  { to: '/reports',    label: 'Reports',              icon: 'bi-bar-chart' },
  { to: '/agreements', label: 'Agreements',           icon: 'bi-file-earmark-text' },
  { to: '/whatsapp',   label: 'WhatsApp',             icon: 'bi-whatsapp' },
  { to: '/users',      label: 'Users',                icon: 'bi-person-gear' },
];

export default function Header() {
  const token    = useSelector(selectToken);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  return (
    <header className="app-header">
      <div className="app-header__inner">
        
        {/* Brand */}
        <Link to="/" className="app-header__brand" onClick={() => setOpen(false)}>
          <span className="app-header__brand-mark">HPRT</span>
          <span className="app-header__brand-sub">Associates</span>
        </Link>

        {/* Mobile toggle */}
        {token && (
          <button
            className="app-header__toggle"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <i className={`bi ${open ? 'bi-x-lg' : 'bi-list'}`} />
          </button>
        )}

        {/* Nav links */}
        {token && (
          <nav className={`app-header__nav ${open ? 'app-header__nav--open' : ''}`}>
            <ul className="app-header__nav-list" role="list">
              {NAV_LINKS.map(({ to, label, icon }) => (
                <li key={to} className="app-header__nav-item">
                  <Link
                    to={to}
                    className={`app-header__nav-link ${isActive(to) ? 'app-header__nav-link--active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    <i className={`bi ${icon} app-header__nav-icon`} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Logout */}
            <div className="app-header__actions">
              <motion.button
                className="app-header__logout"
                onClick={handleLogout}
                whileTap={{ scale: 0.95 }}
                title="Logout"
              >
                <i className="bi bi-box-arrow-right" />
                <span className="app-header__logout-label">Logout</span>
              </motion.button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
