import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FaArrowLeft, FaBox, FaTruck, FaCheckCircle, FaShippingFast } from 'react-icons/fa'
import BuyerNavbar from '../../components/BuyerNavbar'

const statusSteps = ['Ordered', 'Dispatched', 'Shipped', 'Delivered']

const statusIcon = { Ordered: <FaBox />, Dispatched: <FaShippingFast />, Shipped: <FaTruck />, Delivered: <FaCheckCircle /> }

export default function MyOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get('/api/orders/my-orders', { withCredentials: true })
      setOrders(data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const statusColor = {
    Ordered: { bg: '#dbeafe', text: '#1d4ed8' },
    Dispatched: { bg: '#fef3c7', text: '#d97706' },
    Shipped: { bg: '#e0f2fe', text: '#0369a1' },
    Delivered: { bg: '#dcfce7', text: '#166534' },
    Cancelled: { bg: '#fee2e2', text: '#dc2626' },
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid #ddd', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    </div>
  )

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      <BuyerNavbar />
      
      <div style={{ padding: '40px 40px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/buyer')} style={{ background: 'white', border: '1.5px solid var(--border-soft)', color: 'var(--text-main)', padding: '12px 24px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.85rem' }}>
          <FaArrowLeft size={11} /> BACK TO STORE
        </button>
      </div>

      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 40px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-1px', fontFamily: "'Sora', sans-serif" }}>Purchase History</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600, fontSize: '0.85rem' }}>Review and track your previous orders</p>
        </div>

        {orders.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '40px', padding: '120px 40px', textAlign: 'center', border: '1px solid #F3F4F6', boxShadow: 'var(--shadow)' }}>
            <div style={{ background: '#F9FAFB', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
              <FaBox size={42} color="#D1D5DB" />
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px' }}>No orders yet</h2>
            <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '24px' }}>Your purchase history will appear here once you place an order.</p>
            <button className="btn-primary" style={{ padding: '14px 32px', borderRadius: '12px', fontSize: '0.85rem' }} onClick={() => navigate('/buyer')}>Start Shopping</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {orders.map(order => (
              <div key={order._id} style={{ background: 'white', borderRadius: '32px', border: '1px solid #F3F4F6', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                {/* Order Header */}
                <div style={{ padding: '24px 32px', background: '#F9FAFB', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '40px' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-grey)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Order ID</div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.85rem' }}>#{order._id.slice(-8).toUpperCase()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-grey)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Placement Date</div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.85rem' }}>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-grey)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Total Amount</div>
                    <div style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: '1.1rem', letterSpacing: '-0.5px' }}>₹{order.totalAmount?.toLocaleString()}</div>
                  </div>
                </div>

                {/* Products */}
                <div style={{ padding: '40px' }}>
                  {order.products.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '32px', paddingBottom: '32px', marginBottom: i < order.products.length - 1 ? '32px' : 0, borderBottom: i < order.products.length - 1 ? '1.5px dashed var(--border-soft)' : 'none' }}>
                      <div style={{ width: '100px', height: '120px', background: 'var(--background)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
                        <img
                          src={item.product?.images?.[0] || 'https://via.placeholder.com/200'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ flex: 1, padding: '8px 0' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '6px' }}>{item.product?.name || 'Artifact'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Size: {item.size} • Qty: {item.quantity}</div>
                        <div style={{ fontWeight: 900, marginTop: '12px', fontSize: '1.1rem', color: 'var(--text-main)', letterSpacing: '-0.4px' }}>₹{((item.price || item.product?.price || 5999) * item.quantity).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tracking */}
                <div style={{ padding: '32px 40px', background: '#F9FAFB', borderTop: '1px solid #F3F4F6' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#111827', marginBottom: '24px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Shipment Progress</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0' }}>
                    {statusSteps.map((s, i) => {
                      const currentIdx = statusSteps.indexOf(order.status)
                      const isDone = i <= currentIdx
                      const isCurrent = i === currentIdx
                      return (
                        <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                          {i < statusSteps.length - 1 && (
                            <div style={{ position: 'absolute', top: '20px', right: '-50%', width: '100%', height: '2px', background: isDone && i < currentIdx ? '#000' : '#E5E7EB', zIndex: 0 }}></div>
                          )}
                          <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: isDone ? '#000' : 'white', color: isDone ? 'white' : '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, fontSize: '0.9rem', border: isCurrent ? '4px solid rgba(0,0,0,0.05)' : '1px solid #E5E7EB', transition: 'all 0.3s' }}>
                            {statusIcon[s]}
                          </div>
                          <div style={{ fontSize: '0.65rem', fontWeight: isCurrent ? 800 : 600, color: isDone ? '#000' : '#9CA3AF', marginTop: '12px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Delivery Address & Total */}
                <div style={{ padding: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-grey)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '1.5px' }}>Recipient & Destination</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>{order.shippingAddress?.name}</div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>{order.shippingAddress?.street}, {order.shippingAddress?.city} - {order.shippingAddress?.pincode}</div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>{order.shippingAddress?.phone}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-grey)', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>TOTAL AMOUNT</div>
                    <div style={{ fontWeight: 900, fontSize: '2rem', color: 'var(--text-main)', letterSpacing: '-1.5px', fontFamily: "'Sora', sans-serif" }}>₹{order.totalAmount?.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
