/**
 * AppLayout.jsx — Authenticated page wrapper
 *
 * Provides:
 * - Consistent padding offset for fixed navbar
 * - Max-width container
 * - Framer Motion page fade-in transition
 */
import React from 'react';
import { motion } from 'framer-motion';
import './AppLayout.css';

const pageVariants = {
  initial:  { opacity: 0, y: 6 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -4 },
};

const pageTransition = {
  duration: 0.22,
  ease: 'easeOut',
};

export default function AppLayout({ children }) {
  return (
    <motion.main
      className="app-layout"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      <div className="app-layout__inner">
        {children}
      </div>
    </motion.main>
  );
}
