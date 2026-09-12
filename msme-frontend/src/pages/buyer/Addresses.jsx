import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import BuyerNavbar from '../../components/BuyerNavbar'
import { FaPlus, FaEllipsisV, FaCrosshairs, FaMapMarkerAlt } from 'react-icons/fa'
import { fetchStates } from '../../services/locationService'

export default function Addresses() {
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [apiStates, setApiStates] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pincode, setPincode] = useState('')
  const [locality, setLocality] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [landmark, setLandmark] = useState('')
  const [altPhone, setAltPhone] = useState('')
  const [type, setType] = useState('Home')

  useEffect(() => {
    fetchAddresses()
    fetchStates().then(setApiStates)
  }, [])

  const fetchAddresses = async () => {
    try {
      const { data } = await axios.get('/api/auth/me', { withCredentials: true })
      setAddresses(data.user?.savedAddresses || [])
    } catch (err) { console.error(err) }
  }

  const resetForm = () => {
      setName('')
      setPhone('')
      setPincode('')
      setLocality('')
      setStreet('')
      setCity('')
      setState('')
      setLandmark('')
      setAltPhone('')
      setType('Home')
      setEditingId(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const addrData = { name, phone, pincode, locality, street, city, state, landmark, altPhone, type }
      
      if (editingId) {
        await axios.put(`/api/user/addresses/${editingId}`, addrData, { withCredentials: true })
      } else {
        await axios.post('/api/user/addresses', addrData, { withCredentials: true })
      }
      
      setShowForm(false)
      resetForm()
      fetchAddresses()
    } catch (err) {
      console.error(err)
      alert('Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (addr) => {
      setName(addr.name || '')
      setPhone(addr.phone || '')
      setPincode(addr.pincode || '')
      setLocality(addr.locality || '')
      setStreet(addr.street || '')
      setCity(addr.city || '')
      setState(addr.state || '')
      setLandmark(addr.landmark || '')
      setAltPhone(addr.altPhone || '')
      setType(addr.type || 'Home')
      setEditingId(addr._id)
      setShowForm(true)
  }

  const handleDelete = async (id) => {
      if (!window.confirm('Are you sure you want to delete this address?')) return
      try {
          await axios.delete(`/api/user/addresses/${id}`, { withCredentials: true })
          fetchAddresses()
      } catch (err) {
          console.error(err)
          alert('Failed to delete address')
      }
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation is not supported by your browser')
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
        if (res.data && res.data.address) {
          const addr = res.data.address
          setPincode(addr.postcode || '')
          setCity(addr.city || addr.town || addr.village || addr.county || '')
          setLocality(addr.suburb || addr.neighbourhood || addr.state_district || '')
          setStreet((addr.road || '') + (addr.house_number ? ', ' + addr.house_number : ''))
          
          if (addr.state) {
            setState(addr.state)
          }
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

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      <BuyerNavbar />
      
      <div style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '60px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', fontFamily: "'Sora', sans-serif" }}>Shipping Addresses</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontWeight: 600, fontSize: '0.75rem' }}>Your list of verified delivery addresses</p>
          </div>
          {!showForm && (
            <button 
              className="btn-primary" 
              onClick={() => { resetForm(); setShowForm(true); }}
              style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '0.85rem' }}
            >
              <FaPlus size={10} /> ADD NEW ADDRESS
            </button>
          )}
        </div>

        {showForm && (
          <div style={{ background: 'white', padding: '40px', borderRadius: '32px', marginBottom: '40px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-soft)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '32px', color: '#111827', fontFamily: "'Sora', sans-serif" }}>
              {editingId ? 'EDIT ADDRESS' : 'ADD NEW ADDRESS'}
            </h2>
            
            <button 
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation}
              style={{ width: '100%', background: '#000', color: '#fff', border: 'none', padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: gettingLocation ? 'default' : 'pointer', fontWeight: 800, fontSize: '1rem', marginBottom: '48px', transition: 'all 0.3s' }}
            >
              <FaCrosshairs /> {gettingLocation ? 'LOCATING...' : 'AUTODETECT MY LOCATION'}
            </button>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
                {[
                  { label: 'Recipient Name', val: name, set: setName, ph: 'Full legal name', key: 'name' },
                  { label: 'Primary Contact', val: phone, set: setPhone, ph: '10-digit mobile', key: 'phone' },
                  { label: 'Postal Code', val: pincode, set: setPincode, ph: '6-digit PIN', key: 'pincode' },
                  { label: 'Neighborhood', val: locality, set: setLocality, ph: 'Locality / Area', key: 'locality' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px', display: 'block' }}>{f.label}</label>
                    <input 
                      type="text" 
                      className="input-field"
                      placeholder={f.ph} 
                      required 
                      value={f.val} 
                      onChange={e => {
                        let val = e.target.value
                        if (f.key === 'phone') val = val.replace(/\D/g, '').slice(0, 10)
                        if (f.key === 'pincode') val = val.replace(/\D/g, '').slice(0, 6)
                        f.set(val)
                      }} 
                    />
                  </div>
                ))}
              </div>
              
              <div style={{ marginBottom: '40px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px', display: 'block' }}>Logistical Address</label>
                <textarea 
                  className="input-field"
                  placeholder="Street, Suite, Apartment details" required 
                  value={street} onChange={e => setStreet(e.target.value)}
                  style={{ minHeight: '140px', resize: 'none' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '48px' }}>
                <div>
                  <input type="text" className="input-field" placeholder="City" required value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px', display: 'block' }}>State</label>
                  <select className="input-field" value={state} onChange={e => setState(e.target.value)} required>
                    <option value="">Select State</option>
                    {apiStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '60px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '20px', display: 'block' }}>Classify Address As</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  {['Home', 'Work'].map(t => (
                    <button 
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      style={{ 
                        padding: '20px', borderRadius: '20px', border: '2px solid', 
                        borderColor: type === t ? '#000' : '#F3F4F6', 
                        background: type === t ? '#000' : 'white', 
                        color: type === t ? '#fff' : '#6B7280', 
                        fontWeight: 800, cursor: 'pointer', flex: 1, transition: 'all 0.3s',
                        fontSize: '0.9rem'
                      }}
                    >
                      {t.toUpperCase()} ADDRESS
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '24px', borderTop: '1px solid #F3F4F6', paddingTop: '48px' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2, padding: '24px', borderRadius: '20px', fontSize: '1.1rem' }}>
                    {loading ? 'SAVING...' : 'SAVE ADDRESS'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-outline" style={{ flex: 1, padding: '24px', borderRadius: '20px', fontSize: '1.1rem', color: '#EF4444', borderColor: '#FEE2E2' }}>DISCARD</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '40px' }}>
          {(addresses || []).length === 0 && !showForm && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '120px 40px', background: 'white', borderRadius: '40px', border: '1px solid #F3F4F6', boxShadow: 'var(--shadow)' }}>
              <div style={{ background: '#F9FAFB', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                <FaMapMarkerAlt size={42} color="#D1D5DB" />
              </div>
              <h3 style={{ fontSize: '2rem', color: '#111827', marginBottom: '12px' }}>Address list is empty</h3>
              <p style={{ color: '#6B7280', fontSize: '1.1rem' }}>Add your first delivery address to proceed.</p>
            </div>
          )}
          
          {(addresses || []).map((addr, idx) => (
            <div key={addr._id || idx} style={{ padding: '48px', background: 'white', border: '1px solid #F3F4F6', borderRadius: '40px', position: 'relative', boxShadow: 'var(--shadow)', transition: 'all 0.3s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <span style={{ background: '#000', color: 'white', fontSize: '0.65rem', fontWeight: 900, padding: '6px 12px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{addr.type || 'HOME'}</span>
                <div style={{ color: '#E5E7EB' }}><FaEllipsisV /></div>
              </div>
              
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px', letterSpacing: '-0.5px' }}>{addr.name}</h4>
              <p style={{ fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px', fontSize: '0.85rem' }}>{addr.phone}</p>
              
              <div style={{ fontSize: '0.85rem', color: 'var(--text-grey)', lineHeight: '1.6', marginBottom: '24px', fontWeight: 500 }}>
                {addr.street}<br/>
                {addr.locality}, {addr.city}<br/>
                {addr.state} — <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{addr.pincode}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '24px', borderTop: '1px solid #F3F4F6', paddingTop: '24px' }}>
                <button 
                    onClick={() => handleEdit(addr)}
                    style={{ background: 'none', border: 'none', color: '#111827', fontWeight: 900, cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.8px' }}
                >EDIT</button>
                <button 
                    onClick={() => handleDelete(addr._id)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: 900, cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '0.8px' }}
                >DELETE</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
