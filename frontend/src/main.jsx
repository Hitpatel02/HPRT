import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './redux/store';
import App from './App.jsx';

// ── Style load order matters ──────────────────────────────────────────────
// 1. Design system tokens (CSS custom properties) — must be first
import './styles/design-system.css';
// 2. Reset / base styles
import './css/index.css';
// 3. Bootstrap (overridden by tokens in App.css)
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
// 4. App-level overrides (imported in App.jsx too, but safe to double-import)

// Set browser locale for date display
document.documentElement.lang = 'en-IN';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <Router>
        <App />
      </Router>
    </Provider>
  </React.StrictMode>
);
