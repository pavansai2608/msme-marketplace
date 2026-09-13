import React from 'react'
import { QueryErrorResetBoundary, useQueryClient } from '@tanstack/react-query'
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa'

/**
 * A section-scoped error boundary.
 *
 * The app-wide ErrorBoundary blanks the whole screen and can only offer a full
 * page reload. This one wraps a single route section, so a crash in the seller
 * workspace leaves the rest of the app mounted, and its retry re-renders the
 * subtree in place - no reload, no lost scroll position.
 */
class Boundary extends React.Component {
  constructor(props) {
    super(props)
    // `attempt` is bumped on retry and used as the subtree's key, so the
    // children fully remount with fresh component state rather than being
    // re-rendered in whatever half-built state they crashed in.
    this.state = { error: null, attempt: 0 }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(`[${this.props.section || 'route'}] render error:`, error, info)
  }

  retry = () => {
    // Clear the cached server state first. A render crash is usually caused by
    // the data the subtree was handed, and that data is still in the cache -
    // so simply re-rendering would throw on exactly the same value. Resetting
    // sends the remounted children back through a real fetch.
    this.props.onReset?.()
    this.setState((prev) => ({ error: null, attempt: prev.attempt + 1 }))
  }

  render() {
    if (!this.state.error) {
      return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>
    }

    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid #FECACA',
            borderRadius: '20px',
            padding: '40px 32px',
            maxWidth: '460px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <FaExclamationTriangle size={22} />
          </div>

          <h3
            style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: '8px', color: '#111827' }}
          >
            {this.props.title || 'This section could not load'}
          </h3>
          <p
            style={{
              color: '#6B7280',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              marginBottom: '22px',
              fontWeight: 500,
            }}
          >
            {this.state.error?.message || 'Something went wrong while rendering this page.'}
          </p>

          <button
            onClick={this.retry}
            className="btn-primary"
            style={{ padding: '12px 28px', borderRadius: '12px', fontSize: '0.85rem' }}
          >
            <FaRedo style={{ verticalAlign: '-2px', marginRight: '8px' }} />
            Try again
          </button>
        </div>
      </div>
    )
  }
}

/**
 * Wraps the class boundary so its retry also resets React Query's error state.
 * Without the reset, a query that threw stays in its error state and the
 * remounted subtree throws on the very first render.
 */
export default function RouteErrorBoundary({ section, title, children }) {
  const queryClient = useQueryClient()

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <Boundary
          section={section}
          title={title}
          onReset={() => {
            // reset() clears React Query's "this error should throw" flag;
            // resetQueries() discards the cached values themselves. Both are
            // needed: the first alone leaves the bad data in place.
            reset()
            queryClient.resetQueries()
          }}
        >
          {children}
        </Boundary>
      )}
    </QueryErrorResetBoundary>
  )
}
