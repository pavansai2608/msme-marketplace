import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import SellerDashboard from './pages/seller/SellerDashboard'
import BecomeSeller from './pages/seller/BecomeSeller'
import BuyerDashboard from './pages/buyer/BuyerDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import ProductDetail from './pages/buyer/ProductDetail'
import CartPage from './pages/buyer/CartPage'
import Checkout from './pages/buyer/Checkout'
import OrderSuccess from './pages/buyer/OrderSuccess'
import MyOrders from './pages/buyer/MyOrders'
import Addresses from './pages/buyer/Addresses'
import Wishlist from './pages/buyer/Wishlist'
import Profile from './pages/buyer/Profile'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import ErrorBoundary from './components/ErrorBoundary'

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Navigate to="/buyer" replace />} />

          {/* Public storefront. GET /api/products and /api/products/recommended
              are deliberately anonymous-friendly (optionalAuth), so browsing
              and product pages stay open to visitors who have not signed up. */}
          <Route path="/buyer" element={<BuyerDashboard />} />
          <Route path="/product/:id" element={<ProductDetail />} />

          {/* Buyer account pages: a session is required. */}
          <Route
            path="/cart"
            element={
              <RequireLogin>
                <CartPage />
              </RequireLogin>
            }
          />
          <Route
            path="/checkout"
            element={
              <RequireLogin>
                <Checkout />
              </RequireLogin>
            }
          />
          <Route
            path="/order-success"
            element={
              <RequireLogin>
                <OrderSuccess />
              </RequireLogin>
            }
          />
          <Route
            path="/my-orders"
            element={
              <RequireLogin>
                <MyOrders />
              </RequireLogin>
            }
          />
          <Route
            path="/addresses"
            element={
              <RequireLogin>
                <Addresses />
              </RequireLogin>
            }
          />
          <Route
            path="/wishlist"
            element={
              <RequireLogin>
                <Wishlist />
              </RequireLogin>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireLogin>
                <Profile />
              </RequireLogin>
            }
          />

          {/* Conversion to seller. Open to any signed-in user, because the
              caller is by definition not a seller yet. */}
          <Route
            path="/become-seller"
            element={
              <RequireLogin>
                <BecomeSeller />
              </RequireLogin>
            }
          />

          {/* Workspace routes */}
          <Route
            path="/seller"
            element={
              <ProtectedRoute roles={['seller', 'admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
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
