import React from 'react';

/**
 * ErrorBoundary - Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '2rem', 
          margin: '2rem auto',
          maxWidth: '800px',
          fontFamily: 'system-ui, sans-serif',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24'
        }}>
          <h2>Something went wrong.</h2>
          <p>The application encountered an unexpected error.</p>
          <details style={{ 
            whiteSpace: 'pre-wrap', 
            marginTop: '1rem', 
            textAlign: 'left', 
            background: 'rgba(255,255,255,0.5)', 
            padding: '1rem', 
            borderRadius: '4px' 
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Error Details</summary>
            <div style={{ marginTop: '1rem', fontSize: '0.9em' }}>
              <strong>{this.state.error && this.state.error.toString()}</strong>
              <br />
              {this.state.errorInfo?.componentStack}
            </div>
          </details>
          <button 
             onClick={() => window.location.reload()} 
             style={{ 
               marginTop: '1.5rem', 
               padding: '0.5rem 1rem', 
               cursor: 'pointer',
               backgroundColor: '#dc3545',
               color: 'white',
               border: 'none',
               borderRadius: '4px',
               fontWeight: 'bold'
             }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
