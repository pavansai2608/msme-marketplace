import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RouteErrorBoundary from './components/RouteErrorBoundary'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import ErrorBoundary from './components/ErrorBoundary'
import {
  BuyerPageSkeleton,
  SellerPageSkeleton,
  AdminPageSkeleton,
  AuthPageSkeleton,
} from './components/Skeletons'

// Login and Register stay eager: they are the first paint for a signed-out
// visitor, and deferring them would trade a skeleton for the page itself.
import Login from './pages/Login'
import Register from './pages/Register'

// Everything else is split out. The seller workspace alone is ~4,800 lines and
// pulls in recharts; no buyer should download it to look at the catalogue.
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard'))
const BecomeSeller = lazy(() => import('./pages/seller/BecomeSeller'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))

const BuyerDashboard = lazy(() => import('./pages/buyer/BuyerDashboard'))
const ProductDetail = lazy(() => import('./pages/buyer/ProductDetail'))
const CartPage = lazy(() => import('./pages/buyer/CartPage'))
const Checkout = lazy(() => import('./pages/buyer/Checkout'))
const OrderSuccess = lazy(() => import('./pages/buyer/OrderSuccess'))
const MyOrders = lazy(() => import('./pages/buyer/MyOrders'))
const Addresses = lazy(() => import('./pages/buyer/Addresses'))
const Wishlist = lazy(() => import('./pages/buyer/Wishlist'))
const Profile = lazy(() => import('./pages/buyer/Profile'))

const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

/**
 * One wrapper per route section: its own error boundary (so a crash in the
 * seller workspace cannot blank the buyer pages) and its own skeleton (so the
 * chunk downloading looks like the page that is coming, not a spinner).
 */
const Section = ({ name, title, skeleton, children }) => (
  <RouteErrorBoundary section={name} title={title}>
    <Suspense fallback={skeleton}>{children}</Suspense>
  </RouteErrorBoundary>
)

const Buyer = ({ children }) => (
  <Section name="buyer" title="This page could not load" skeleton={<BuyerPageSkeleton />}>
    {children}
  </Section>
)

const Auth = ({ children }) => (
  <Section name="auth" title="This page could not load" skeleton={<AuthPageSkeleton />}>
    {children}
  </Section>
)

// Signed in, any role.
const RequireLogin = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>

function App() {
  return (
    <AuthProvider>
      <PWAInstallPrompt />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/buyer" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/forgot-password"
            element={
              <Auth>
                <ForgotPassword />
              </Auth>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <Auth>
                <ResetPassword />
              </Auth>
            }
          />
          <Route path="/dashboard" element={<Navigate to="/buyer" replace />} />

          {/* Public storefront. GET /api/products and /api/products/recommended
              are deliberately anonymous-friendly (optionalAuth), so browsing
              and product pages stay open to visitors who have not signed up. */}
          <Route
            path="/buyer"
            element={
              <Buyer>
                <BuyerDashboard />
              </Buyer>
            }
          />
          <Route
            path="/product/:id"
            element={
              <Buyer>
                <ProductDetail />
              </Buyer>
            }
          />

          {/* Buyer account pages: a session is required. */}
          <Route
            path="/cart"
            element={
              <RequireLogin>
                <Buyer>
                  <CartPage />
                </Buyer>
              </RequireLogin>
            }
          />
          <Route
            path="/checkout"
            element={
              <RequireLogin>
                <Buyer>
                  <Checkout />
                </Buyer>
              </RequireLogin>
            }
          />
          <Route
            path="/order-success"
            element={
              <RequireLogin>
                <Buyer>
                  <OrderSuccess />
                </Buyer>
              </RequireLogin>
            }
          />
          <Route
            path="/my-orders"
            element={
              <RequireLogin>
                <Buyer>
                  <MyOrders />
                </Buyer>
              </RequireLogin>
            }
          />
          <Route
            path="/addresses"
            element={
              <RequireLogin>
                <Buyer>
                  <Addresses />
                </Buyer>
              </RequireLogin>
            }
          />
          <Route
            path="/wishlist"
            element={
              <RequireLogin>
                <Buyer>
                  <Wishlist />
                </Buyer>
              </RequireLogin>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireLogin>
                <Buyer>
                  <Profile />
                </Buyer>
              </RequireLogin>
            }
          />

          {/* Conversion to seller. Open to any signed-in user, because the
              caller is by definition not a seller yet. */}
          <Route
            path="/become-seller"
            element={
              <RequireLogin>
                <Section
                  name="seller"
                  title="Onboarding could not load"
                  skeleton={<SellerPageSkeleton />}
                >
                  <BecomeSeller />
                </Section>
              </RequireLogin>
            }
          />

          {/* Workspace routes */}
          <Route
            path="/seller"
            element={
              <ProtectedRoute roles={['seller', 'admin']}>
                <Section
                  name="seller"
                  title="The seller workspace could not load"
                  skeleton={<SellerPageSkeleton />}
                >
                  <SellerDashboard />
                </Section>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Section
                  name="admin"
                  title="The admin dashboard could not load"
                  skeleton={<AdminPageSkeleton />}
                >
                  <AdminDashboard />
                </Section>
              </ProtectedRoute>
            }
          />

          {/* Catch-all for undefined routes */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>
    </AuthProvider>
  )
}

export default App
