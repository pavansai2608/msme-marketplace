import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/dashboard'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import SellerDashboard from './pages/seller/SellerDashboard'
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

function App() {
  return (
    <AuthProvider>
      <PWAInstallPrompt />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/buyer" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Navigate to="/buyer" replace />} />

          {/* Buyer Routes */}
          <Route path="/buyer" element={<BuyerDashboard />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/addresses" element={<Addresses />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/profile" element={<Profile />} />

          {/* Workspace Routes */}
          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Catch-all for undefined routes */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>
    </AuthProvider>
  )
}

export default App;
