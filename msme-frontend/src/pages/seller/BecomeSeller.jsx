import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SellerOnboarding from './SellerOnboarding'

/**
 * Onboarding lives on its own route because /seller is now gated to the seller
 * and admin roles. A buyer converting to a seller has neither yet, so the
 * guard would bounce them off the very page that does the conversion.
 */
export default function BecomeSeller() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  // Already a seller: nothing to onboard.
  if (user && (user.role === 'seller' || user.role === 'admin')) {
    navigate('/seller', { replace: true })
    return null
  }

  return (
    <SellerOnboarding
      onComplete={async () => {
        // become-seller has changed the role server-side; the context has to
        // re-read it before the /seller guard will let them through.
        await refreshUser()
        navigate('/seller', { replace: true })
      }}
    />
  )
}
