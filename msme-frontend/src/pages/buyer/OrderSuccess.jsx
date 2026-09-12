import { useLocation, useNavigate } from 'react-router-dom'
import { FaCheckCircle, FaTruck } from 'react-icons/fa'

export default function OrderSuccess() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const order = state?.order

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'white', borderRadius: '40px', padding: '80px 60px', textAlign: 'center', maxWidth: '600px', width: '100%', boxShadow: 'var(--shadow)', border: '1px solid var(--border-soft)' }}>
        <div style={{ width: '100px', height: '100px', background: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
          <FaCheckCircle size={48} color="#166534" />
        </div>
        
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#111827', marginBottom: '16px', letterSpacing: '-2px', fontFamily: "'Sora', sans-serif" }}>Securely Placed.</h1>
        <p style={{ color: '#6B7280', marginBottom: '48px', lineHeight: 1.8, fontSize: '1.2rem', fontWeight: 500 }}>
          Your order has been authorized and is being prepared for express delivery.
        </p>

        {order && (
          <div style={{ background: '#F9FAFB', borderRadius: '24px', padding: '32px', marginBottom: '48px', textAlign: 'left', border: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Confirmation ID</span>
              <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#111827' }}>#{order._id?.slice(-8).toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Authorized Amount</span>
              <span style={{ fontWeight: 900, color: '#111827', fontSize: '1.1rem' }}>₹{order.totalAmount?.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EEF2F6', paddingTop: '16px' }}>
              <span style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Shipping Status</span>
              <span style={{ background: '#000', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900 }}>PRIORITY SHIPPING</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#F9FAFB', padding: '20px', borderRadius: '16px', marginBottom: '48px', border: '1px solid #F3F4F6' }}>
          <FaTruck color="#111827" size={20} />
          <span style={{ fontWeight: 800, color: '#111827', fontSize: '0.9rem' }}>ESTIMATED DELIVERY: TOMORROW BY 11 PM</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
          <button className="btn-outline" style={{ padding: '20px', borderRadius: '16px', fontWeight: 800, fontSize: '0.95rem' }} onClick={() => navigate('/my-orders')}>TRACK SHIPMENT</button>
          <button className="btn-primary" style={{ padding: '20px', borderRadius: '16px', fontWeight: 800, fontSize: '0.95rem' }} onClick={() => navigate('/buyer')}>BACK TO SHOPPING</button>
        </div>
      </div>
    </div>
  )
}
