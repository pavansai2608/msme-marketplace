import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa'

const ToastContext = createContext(null)

const VARIANTS = {
  success: { icon: FaCheckCircle, bar: '#059669', tint: '#ECFDF5', fg: '#065F46' },
  error: { icon: FaExclamationCircle, bar: '#DC2626', tint: '#FEF2F2', fg: '#991B1B' },
  info: { icon: FaInfoCircle, bar: '#2563EB', tint: '#EFF6FF', fg: '#1E40AF' },
}

const DURATION = { success: 3000, info: 3500, error: 5000 }

function ToastItem({ toast, onDismiss }) {
  const variant = VARIANTS[toast.variant] || VARIANTS.info
  const Icon = variant.icon
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef(null)

  const close = useCallback(() => {
    setLeaving(true)
    // Let the exit transition finish before the node is removed, otherwise the
    // toast vanishes instantly and the stack jumps.
    setTimeout(() => onDismiss(toast.id), 180)
  }, [onDismiss, toast.id])

  useEffect(() => {
    timerRef.current = setTimeout(close, DURATION[toast.variant] || 3500)
    return () => clearTimeout(timerRef.current)
  }, [close, toast.variant])

  return (
    <div
      role="status"
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => clearTimeout(timerRef.current)}
      onMouseLeave={() => {
        timerRef.current = setTimeout(close, 1500)
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        background: '#fff',
        borderRadius: '14px',
        padding: '14px 16px',
        minWidth: '280px',
        maxWidth: '420px',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
        border: '1px solid #E2E8F0',
        borderLeft: `4px solid ${variant.bar}`,
        transform: leaving ? 'translateX(16px)' : 'translateX(0)',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 180ms ease, transform 180ms ease',
        pointerEvents: 'auto',
      }}
    >
      <span
        style={{
          background: variant.tint,
          color: variant.bar,
          borderRadius: '8px',
          padding: '6px',
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <Icon size={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: variant.fg }}>
            {toast.title}
          </div>
        )}
        <div
          style={{
            fontSize: '0.82rem',
            color: '#334155',
            fontWeight: 600,
            lineHeight: 1.45,
            wordBreak: 'break-word',
          }}
        >
          {toast.message}
        </div>
      </div>
      <button
        onClick={close}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#94A3B8',
          padding: '2px',
          flexShrink: 0,
        }}
      >
        <FaTimes size={11} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((variant, message, title) => {
    const id = ++nextId.current
    // Capped so a loop of failures cannot paper over the whole screen.
    setToasts((prev) => [...prev.slice(-3), { id, variant, message: String(message), title }])
    return id
  }, [])

  // Stable identity, so putting `toast` in a dependency array does not re-run
  // the effect on every render. `push` is already stable.
  const toast = useMemo(
    () => ({
      success: (m, t) => push('success', m, t),
      error: (m, t) => push('error', m, t),
      info: (m, t) => push('info', m, t),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * Replaces alert(). Unlike alert() it does not block the event loop, so a
 * failed mutation can roll its optimistic update back while the message shows.
 *
 *   const toast = useToast()
 *   toast.error('Could not update wishlist')
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// For the few call sites that are class components or run outside React.
export { ToastContext }
