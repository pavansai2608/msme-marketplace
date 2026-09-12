import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import { FaBuilding, FaIdCard, FaCheckCircle } from 'react-icons/fa'

export default function SellerOnboarding({ onComplete }) {
  const { user, setUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    businessName: '',
    panCardName: '',
    district: '',
    state: '',
    role: 'seller'
  })

  const [allStates, setAllStates] = useState([])
  const [allDistricts, setAllDistricts] = useState([])

  useEffect(() => {
    if (user) {
      setFormData({
        businessName: user.businessName || '',
        panCardName: user.panCardName || '',
        district: user.district || '',
        state: user.state || '',
        role: 'seller'
      })
      if (user.state) {
        import('../../services/locationService').then(service => {
          service.fetchDistricts(user.state).then(setAllDistricts)
        })
      }
    }
  }, [user])

  useEffect(() => {
    import('../../services/locationService').then(service => {
      service.fetchStates().then(setAllStates)
    })
  }, [])

  const handleStateChange = (state) => {
    setFormData({...formData, state, district: ''})
    import('../../services/locationService').then(service => {
      service.fetchDistricts(state).then(setAllDistricts)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { updateProfile } = await import('../../api/authApi')
      const data = await updateProfile(formData)
      if (data.success) {
        setUser(data.user)
        onComplete()
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '40px auto', padding: '40px' }}>
      <div className="glass-card" style={{ padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FaBuilding size={24} style={{margin: 'auto'}} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '6px', fontFamily: "'Sora', sans-serif" }}>Seller Onboarding</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Tell us about your business to get started.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Business Name</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Acme MSME Solutions"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({...formData, businessName: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="input-group">
              <label className="input-label">State</label>
              <select 
                className="input-field" 
                required 
                value={formData.state}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                <option value="">Select State</option>
                {allStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">District</label>
              <select 
                className="input-field" 
                required 
                value={formData.district}
                disabled={!formData.state}
                onChange={(e) => setFormData({...formData, district: e.target.value})}
              >
                <option value="">Select District</option>
                {allDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Name as per PAN Card</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Full name as registered"
              required
              value={formData.panCardName}
              onChange={(e) => setFormData({...formData, panCardName: e.target.value})}
            />
          </div>


          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '0.9rem' }}
            >
              {loading ? 'Processing...' : 'Complete Registration'}
            </button>
            <button 
              type="button"
              onClick={async () => {
                localStorage.setItem('onboarding_skipped', 'true');
                try {
                  const { updateProfile } = await import('../../api/authApi')
                  await updateProfile({ role: 'seller', isProfileComplete: true })
                } catch (e) { console.error(e) }
                window.location.reload();
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              I'll do this later, take me to dashboard
            </button>
          </div>
        </form>

        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '0.875rem', justifyCenter: 'center' }}>
          <FaCheckCircle /> <span style={{margin:'auto'}}>Your data is secured with enterprise-grade encryption</span>
        </div>
      </div>
    </div>
  )
}
