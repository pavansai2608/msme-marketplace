import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-page, #f8fafc)',
          fontFamily: "'Sora', sans-serif",
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '48px 36px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '28px'
            }}>⚠️</div>
            <h2 style={{ color: '#1A1F5E', fontWeight: 800, fontSize: '1.5rem', marginBottom: '12px' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#5C6484', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>
              The application encountered an unexpected error. Please try refreshing the page or contact support if the issue persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg,#3D5AFE,#1A237E)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 28px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(61,90,254,0.35)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
            >
              Refresh Page
            </button>
            {this.state.errorInfo && (
              <details style={{ marginTop: '24px', textAlign: 'left' }}>
                <summary style={{ color: '#3D5AFE', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                  View error details
                </summary>
                <pre style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#F8F9FE',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#4A5578',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

