import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FaArrowLeft, FaTrash, FaShoppingBag } from 'react-icons/fa'
import BuyerNavbar from '../../components/BuyerNavbar'

export default function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCart() }, [])

  const fetchCart = async () => {
    try {
      const { data } = await axios.get('/api/cart', { withCredentials: true })
      setCart(data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const updateQuantity = async (productId, size, quantity, maxStock) => {
    if (quantity > maxStock) return
    try {
      const { data } = await axios.put('/api/cart/update', { productId, size, quantity }, { withCredentials: true })
      if (data.success) fetchCart()
      else alert(data.message)
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update quantity')
    }
  }

  const removeItem = async (productId, size) => {
    try {
      await axios.delete(`/api/cart/remove`, { data: { productId, size }, withCredentials: true })
      fetchCart()
    } catch (err) { console.error(err) }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div style={{ width: '40px', height: '40px', border: '4px solid #ddd', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div></div>

  const subtotal = cart?.items?.reduce((acc, i) => acc + (i.product?.price || 0) * i.quantity, 0) || 0
  const isEmpty = !cart?.items?.length

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh' }}>
      <BuyerNavbar />
      
      <div style={{ padding: '60px 40px 0', maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-1px', fontFamily: "'Sora', sans-serif" }}>Your Shopping Bag</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500, fontSize: '0.85rem' }}>{cart?.items?.length || 0} exquisite items ready for checkout</p>
        </div>
        {!isEmpty && (
          <button onClick={() => navigate('/buyer')} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.8rem' }} onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
            <FaArrowLeft size={10} /> Continue Shopping
          </button>
        )}
      </div>

      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 40px', display: 'grid', gridTemplateColumns: isEmpty ? '1fr' : '1fr 400px', gap: '60px' }}>
        {/* Cart Items */}
        <div>
          {isEmpty ? (
            <div style={{ background: 'white', borderRadius: '32px', padding: '100px 40px', textAlign: 'center', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow)' }}>
              <div style={{ background: '#F9FAFB', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                <FaShoppingBag size={42} color="#D1D5DB" />
              </div>
              <h2 style={{ fontSize: '1.75rem', color: '#111827', marginBottom: '12px' }}>Your bag is empty</h2>
              <p style={{ color: '#6B7280', marginBottom: '32px', fontSize: '1.1rem' }}>Looks like you haven't added anything yet.</p>
              <button className="btn-primary" style={{ padding: '18px 48px', borderRadius: '16px' }} onClick={() => navigate('/buyer')}>Start Exploring</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {cart.items.map((item) => {
                const availableStock = item.product?.sizes?.find(s => s.size === item.size)?.stock ?? 99
                return (
                <div key={`${item.product?._id}-${item.size}`} className="glass-card" style={{ padding: '20px', border: '1px solid var(--border-soft)', display: 'flex', gap: '24px', alignItems: 'center', background: '#ffffff' }}>
                  <div style={{ width: '100px', height: '130px', flexShrink: 0, overflow: 'hidden', borderRadius: '12px', background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                    <img
                      src={item.product?.images?.[0] || 'https://via.placeholder.com/200'}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={e => e.target.src = 'https://via.placeholder.com/200'}
                    />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-grey)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '6px' }}>{item.product?.category}</div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>{item.product?.name}</h3>
                    
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      <span style={{ border: '2px solid var(--border-soft)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Size: {item.size}</span>
                      {availableStock < 5 && availableStock > 0 && (
                        <span style={{ background: '#FFF7ED', color: '#C2410C', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                          Only {availableStock} left
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--border-soft)', borderRadius: '12px', padding: '3px', border: '1px solid var(--border)' }}>
                        <button onClick={() => item.quantity > 1 ? updateQuantity(item.product._id, item.size, item.quantity - 1, availableStock) : removeItem(item.product._id, item.size)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '1rem', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#000'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>−</button>
                        <span style={{ minWidth: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product._id, item.size, item.quantity + 1, availableStock)}
                          disabled={item.quantity >= availableStock}
                          style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.quantity >= availableStock ? 'var(--border-soft)' : 'white', border: '1px solid var(--border)', borderRadius: '8px', cursor: item.quantity >= availableStock ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '1rem', color: item.quantity >= availableStock ? '#D1D5DB' : 'inherit', transition: 'all 0.2s' }}
                          onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.borderColor = '#000')}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >+</button>
                      </div>
                      <button onClick={() => removeItem(item.product._id, item.size)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.75rem' }} onMouseEnter={e => e.currentTarget.style.opacity = 0.7} onMouseLeave={e => e.currentTarget.style.opacity = 1}>
                        <FaTrash size={12} /> REMOVE
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.4px' }}>₹{((item.product?.price || 0) * item.quantity).toLocaleString()}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>₹{item.product?.price?.toLocaleString()} / unit</div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Order Summary */}
        {!isEmpty && (
          <div>
            <div style={{ background: 'white', borderRadius: '32px', padding: '40px', border: '1px solid var(--border-soft)', position: 'sticky', top: '120px', boxShadow: 'var(--shadow)' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '24px' }}>Order Summary</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                  <span>Bag Subtotal</span>
                  <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>₹{subtotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                  <span>Shipping & Handling</span>
                  <span style={{ color: '#059669', fontWeight: 900, fontSize: '0.75rem' }}>FREE</span>
                </div>
              </div>
              
              <div style={{ borderTop: '2px solid var(--border-soft)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>Total Amount</span>
                <span style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--text-main)', letterSpacing: '-0.8px' }}>₹{subtotal.toLocaleString()}</span>
              </div>
              
              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '16px', fontSize: '0.95rem', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '1px' }} 
                onClick={() => navigate('/checkout')}
              >
                Checkout Now
              </button>

              <div style={{ marginTop: '24px', color: '#9CA3AF', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>
                Includes all tea and biscuits. No hidden fees.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
