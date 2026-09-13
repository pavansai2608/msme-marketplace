import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Where a signed-in user belongs, used when they reach a page their role is
// not allowed on. Sending them somewhere they CAN see avoids the redirect loop
// that bouncing everyone back to /login would create for a logged-in user.
const HOME_FOR = { admin: '/admin', seller: '/seller', buyer: '/buyer' }

/**
 * Gates a route on session and role.
 *
 * The decision is made before the child renders, so a page never mounts, fires
 * its requests and then fails on a 401/403. This is convenience, not security:
 * every one of these routes is enforced again on the server.
 *
 *   <ProtectedRoute>                      signed in, any role
 *   <ProtectedRoute roles={['admin']}>    signed in AND admin
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // The session is an httpOnly cookie, so it cannot be read synchronously.
  // Rendering nothing until /auth/me answers stops a brief flash of the login
  // page for a user who is in fact signed in.
  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontWeight: 600,
        }}
      >
        Checking your session...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={HOME_FOR[user.role] || '/buyer'} replace />
  }

  return children
}
