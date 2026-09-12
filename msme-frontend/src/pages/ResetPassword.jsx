import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

export default function ResetPassword() {
  const { token }             = useParams()
  const navigate              = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/reset-password/${token}`, { password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Token is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  const S = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '20px', fontFamily: "'Sora', sans-serif" },
    wrapper: { width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '28px', padding: '48px', boxShadow: 'var(--shadow-card)', textAlign: 'center' },
    title: { fontFamily: "'Sora',sans-serif", fontSize: '26px', fontWeight: 800, color: '#1A1F5E', marginBottom: '12px' },
    subtitle: { fontSize: '14px', color: '#5C6484', marginBottom: '32px' },
    label: { display: 'block', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#4A5578', marginBottom: '8px', textTransform: 'uppercase' },
    input: { width: '100%', padding: '14px', background: '#F8F9FE', border: '1.5px solid var(--border-soft)', borderRadius: '13px', fontSize: '14px', color: '#1A1F5E', marginBottom: '24px' },
    btn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#3D5AFE,#1A237E)', color: '#fff', borderRadius: '14px', fontWeight: 600, fontSize: '15px', border: 'none', cursor: 'pointer' },
    banner: { padding: '12px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px' }
  }

  return (
    <div style={S.page}>
      <div style={S.wrapper}>
        <h1 style={S.title}>New Password</h1>
        <p style={S.subtitle}>Please enter your new secure password below.</p>

        {success && <div style={{ ...S.banner, background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7' }}>✓ Password updated! Redirecting to login...</div>}
        {error && <div style={{ ...S.banner, background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2' }}>⚠ {error}</div>}

        <form onSubmit={handleReset}>
          <label style={S.label}>New Password</label>
          <input 
            type="password" 
            placeholder="Min. 6 characters" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={S.input} 
            required
            minLength={6}
          />
          <button type="submit" style={S.btn} disabled={loading || success}>
            {loading ? 'Updating...' : 'Update Password →'}
          </button>
        </form>
      </div>
    </div>
  )
}
