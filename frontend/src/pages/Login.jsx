/**
 * Login.jsx — Phase 5 redesign
 * Premium centered auth card with Framer Motion entrance animation.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { loginUser, selectToken, selectIsLoading, selectError } from '../redux/authSlice';
import './Login.css';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const token   = useSelector(selectToken);
  const loading = useSelector(selectIsLoading);
  const error   = useSelector(selectError);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(loginUser({ email, password })).unwrap();
    } catch {
      // Error shown from Redux state
    }
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
      >
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="login-brand__mark">HPRT</div>
          <div className="login-brand__name">Associates</div>
          <p className="login-brand__sub">Chartered Accountants &amp; Tax Consultants</p>
        </div>

        <h1 className="login-title">Sign in to your account</h1>

        {/* Error */}
        {error && (
          <motion.div
            className="login-error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            role="alert"
          >
            <i className="bi bi-exclamation-circle" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Email */}
          <div className="login-field">
            <label htmlFor="login-email" className="login-label">Email address</label>
            <div className="login-input-wrap">
              <i className="bi bi-envelope login-input-icon" />
              <input
                id="login-email"
                type="email"
                className="login-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="login-password" className="login-label">Password</label>
            <div className="login-input-wrap">
              <i className="bi bi-lock login-input-icon" />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="login-input login-input--pass"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-pass-toggle"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            className="login-submit"
            disabled={loading}
            whileTap={loading ? {} : { scale: 0.98 }}
          >
            {loading
              ? <><span className="login-spinner" />&nbsp;Signing in…</>
              : 'Sign In'}
          </motion.button>
        </form>
      </motion.div>

      {/* Background accent */}
      <div className="login-bg-accent" aria-hidden="true" />
    </div>
  );
}
