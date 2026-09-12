import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FaArrowLeft, FaCheck, FaMapMarkerAlt, FaCrosshairs } from 'react-icons/fa'
import { fetchStates } from '../../services/locationService'

const steps = ['Address', 'Order Summary', 'Payment']

export default function Checkout() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [address, setAddress] = useState({ name: '', phone: '', street: '', city: '', state: '', pincode: '' })
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [gettingLocation, setGettingLocation] = useState(false)
  const [apiStates, setApiStates] = useState([])

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation is not supported by your browser')
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
        if (res.data && res.data.address) {
          const addr = res.data.address
          setAddress(prev => ({
            ...prev,
            pincode: addr.postcode || '',
            city: addr.city || addr.town || addr.village || addr.county || '',
            state: addr.state || '',
            street: (addr.road || '') + (addr.house_number ? ', ' + addr.house_number : '') + (addr.suburb ? ', ' + addr.suburb : '')
          }))
        }
      } catch (err) {
        console.error('Geo error', err)
      } finally {
        setGettingLocation(false)
      }
    }, (err) => {
      alert('Unable to retrieve your location. Please grant permission.')
      setGettingLocation(false)
    })
  }

  useEffect(() => { 
    fetchCart() 
    fetchStates().then(setApiStates)
  }, [])

  const fetchCart = async () => {
    try {
      const { data } = await axios.get('/api/cart', { withCredentials: true })
      setCart(data.data)
    } catch (err) { navigate('/login') }
    finally { setLoading(false) }
  }

  const subtotal = cart?.items?.reduce((acc, i) => acc + (i.product?.price || 0) * i.quantity, 0) || 0

  const handlePlaceOrder = async () => {
    if (!address.street || !address.city || !address.pincode || !address.phone)
      return alert('Please fill all address fields')
    setPlacing(true)
    try {
      const { data } = await axios.post('/api/orders/checkout', {
        shippingAddress: address,
        paymentMethod
      }, { withCredentials: true })
      navigate('/order-success', { state: { order: data.data } })
    } catch (err) {
      alert(err.response?.data?.message || 'Order placement failed')
    } finally { setPlacing(false) }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div style={{ width:'40px',height:'40px',border:'4px solid #ddd',borderTopColor:'var(--primary)',borderRadius:'50%',animation:'spin 1s linear infinite' }}></div></div>

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', fontFamily: "'Outfit', sans-serif" }}>
      {/* Sleek Header */}
      <header style={{ height: '100px', background: '#ffffff', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', padding: '0 60px', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => navigate('/cart')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#6B7280', fontWeight: 800, fontSize: '0.9rem' }} onMouseEnter={e => e.currentTarget.style.color = '#000'} onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}>
          <FaArrowLeft size={14} /> BACK TO BAG
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.5px', color: '#111827' }}>
          Secure Checkout
        </div>
        <div style={{ width: '120px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#ECFDF5', color: '#059669', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #D1FAE5' }}>
            <FaCheck size={10} /> ENCRYPTED
          </div>
        </div>
      </header>

      {/* Modern Progress Line */}
      <div style={{ maxWidth: '700px', margin: '40px auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '0 20px' }}>
        <div style={{ position: 'absolute', top: '24%', left: '40px', right: '40px', height: '2px', background: '#F1F5F9', zIndex: 1 }}></div>
        <div style={{ position: 'absolute', top: '24%', left: '40px', width: `${(step / (steps.length - 1)) * 100 - 8}%`, height: '2px', background: 'var(--primary)', zIndex: 2, transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}></div>
        
        {steps.map((s, i) => (
          <div key={i} style={{ zIndex: 10, position: 'relative', textAlign: 'center', flex: 1 }}>
            <div style={{ 
              width: '14px', height: '14px', borderRadius: '50%', 
              background: i <= step ? 'var(--primary)' : '#ffffff', 
              border: `3px solid ${i <= step ? 'var(--primary)' : '#E2E8F0'}`,
              margin: '0 auto 12px',
              transition: 'all 0.4s ease',
              boxShadow: i <= step ? '0 0 0 4px var(--primary-glow)' : 'none'
            }}></div>
            <span style={{ fontSize: '0.7rem', fontWeight: i <= step ? 800 : 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: i <= step ? '#111827' : '#9CA3AF' }}>{s}</span>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: '1300px', margin: '60px auto', padding: '0 60px', display: 'grid', gridTemplateColumns: '1fr 440px', gap: '80px' }}>
        {/* Left Side: Form Blocks */}
        <div className="animate-fade-in">
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <h2 style={{ fontSize: '1.6rem', color: '#111827', fontWeight: 800 }}>Shipping</h2>
                <button 
                  onClick={handleGetCurrentLocation}
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#111827', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', padding: '10px 20px', borderRadius: '12px', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
                >
                  <FaCrosshairs size={14} /> {gettingLocation ? 'LOCATING...' : 'USE CURRENT LOCATION'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">RECIPIENT NAME</label>
                  <input className="input-field" placeholder="Full name" value={address.name} onChange={e => setAddress({...address, name: e.target.value})} />
                </div>
                <div>
                  <label className="input-label">CONTACT NUMBER</label>
                  <input className="input-field" placeholder="10-digit mobile" value={address.phone} onChange={e => setAddress({...address, phone: e.target.value.replace(/\D/g, '').slice(0,10)})} />
                </div>
                <div>
                  <label className="input-label">POSTAL CODE</label>
                  <input className="input-field" placeholder="6-digit PIN" value={address.pincode} onChange={e => setAddress({...address, pincode: e.target.value.replace(/\D/g, '').slice(0,6)})} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">STREET ADDRESS</label>
                  <input className="input-field" placeholder="Building, Street, Area" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} />
                </div>
                <div>
                  <label className="input-label">CITY</label>
                  <input className="input-field" placeholder="City" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} />
                </div>
                <div>
                  <label className="input-label">STATE</label>
                  <select className="input-field" value={address.state} onChange={e => setAddress({...address, state: e.target.value})}>
                    <option value="">Choose State</option>
                    {apiStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <button className="btn-primary" style={{ padding: '18px', borderRadius: '12px', fontSize: '0.9rem' }} onClick={() => setStep(1)}>
                CONTINUE TO SUMMARY
              </button>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <h2 style={{ fontSize: '1.6rem', color: '#111827', fontWeight: 800 }}>Review Order</h2>
              
              <div style={{ background: '#ffffff', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '1px' }}>Shipping Address</span>
                  <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', color: '#111827', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>CHANGE</button>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827' }}>{address.name}</div>
                <div style={{ color: '#6B7280', marginTop: '8px', lineHeight: 1.6, fontSize: '0.85rem', fontWeight: 500 }}>
                  {address.street}, {address.city}, {address.state} - <span style={{ color: '#111827', fontWeight: 700 }}>{address.pincode}</span><br/>
                  {address.phone}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '1px' }}>Order Contents</span>
                {cart?.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                    <div style={{ width: '100px', height: '130px', background: '#F9FAFB', borderRadius: '16px', overflow: 'hidden', border: '1px solid #F3F4F6' }}>
                      <img src={item.product?.images?.[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#111827', fontSize: '1.15rem' }}>{item.product?.name}</div>
                      <div style={{ fontSize: '0.9rem', color: '#6B7280', marginTop: '8px', fontWeight: 600 }}>Size: {item.size} • Quantitity: {item.quantity}</div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#111827' }}>₹{((item.product?.price || 0) * item.quantity).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <button className="btn-primary" style={{ padding: '24px', borderRadius: '16px', fontSize: '1.1rem' }} onClick={() => setStep(2)}>
                CONTINUE TO PAYMENT
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '56px' }}>
              <h2 style={{ fontSize: '2.25rem', color: '#111827' }}>Payment</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { id: 'COD', label: 'Cash on Delivery', desc: 'Secure payment at your door' },
                  { id: 'UPI', label: 'Instant UPI', desc: 'Pay with any BHIM UPI app' },
                  { id: 'CARD', label: 'Debit / Credit Card', desc: 'Visa, Mastercard, RuPay' },
                ].map(m => (
                  <div 
                    key={m.id} 
                    onClick={() => setPaymentMethod(m.id)}
                    style={{ 
                      padding: '32px', borderRadius: '24px', border: '2px solid', 
                      borderColor: paymentMethod === m.id ? '#000000' : '#F3F4F6',
                      background: paymentMethod === m.id ? '#F9FAFB' : '#ffffff',
                      cursor: 'pointer', display: 'flex', gap: '24px', alignItems: 'center', transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid', borderColor: paymentMethod === m.id ? '#000' : '#D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
                      {paymentMethod === m.id && <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#000' }}></div>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#111827' }}>{m.label}</div>
                      <div style={{ fontSize: '0.95rem', color: '#6B7280', marginTop: '4px', fontWeight: 500 }}>{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="btn-primary" 
                style={{ padding: '24px', borderRadius: '16px', background: '#000000', fontSize: '1.1rem' }} 
                onClick={handlePlaceOrder}
                disabled={placing}
              >
                {placing ? 'AUTHORIZING...' : `COMPLETE PURCHASE • ₹${subtotal.toLocaleString()}`}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Summary Card */}
        <div>
          <div style={{ background: '#ffffff', padding: '48px', borderRadius: '32px', position: 'sticky', top: '160px', border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow)' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '40px', color: '#9CA3AF' }}>Checkout Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280', fontSize: '1.05rem', fontWeight: 500 }}>
                <span>Subtotal</span>
                <span style={{ color: '#111827', fontWeight: 700 }}>₹{subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280', fontSize: '1.05rem', fontWeight: 500 }}>
                <span>Shipping</span>
                <span style={{ color: '#059669', fontWeight: 800 }}>COMPLIMENTARY</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #F3F4F6', paddingTop: '32px', marginBottom: '40px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#111827' }}>TOTAL DUE</span>
              <span style={{ fontWeight: 800, fontSize: '1.6rem', color: '#111827' }}>₹{subtotal.toLocaleString()}</span>
            </div>
            
            <div style={{ fontSize: '0.85rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600, background: '#F9FAFB', padding: '16px', borderRadius: '12px' }}>
              <FaMapMarkerAlt size={14} color="#10B981" />
              Secure delivery to your doorstep.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
