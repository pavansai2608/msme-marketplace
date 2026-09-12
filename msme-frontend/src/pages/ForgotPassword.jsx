import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

export default function ForgotPassword() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError]     = useState('')

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`, { email })
      setMessage(data.message || 'Reset link sent to your email successfully!')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const S = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '20px', fontFamily: "'Sora', sans-serif" },
    wrapper: { width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '28px', padding: '48px', boxShadow: 'var(--shadow-card)', textAlign: 'center' },
    title: { fontFamily: "'Sora',sans-serif", fontSize: '26px', fontWeight: 800, color: '#1A1F5E', marginBottom: '12px' },
    subtitle: { fontSize: '14px', color: '#5C6484', marginBottom: '32px', lineHeight: '1.6' },
    label: { display: 'block', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#4A5578', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' },
    input: { width: '100%', padding: '14px', background: '#F8F9FE', border: '1.5px solid var(--border-soft)', borderRadius: '13px', fontSize: '14px', color: '#1A1F5E', marginBottom: '24px' },
    btn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#3D5AFE,#1A237E)', color: '#fff', borderRadius: '14px', fontWeight: 600, fontSize: '15px', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-btn)' },
    link: { display: 'block', marginTop: '24px', fontSize: '14px', color: '#3D5AFE', fontWeight: 600, textDecoration: 'none' },
    banner: { padding: '12px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px' }
  }

  return (
    <div style={S.page}>
      <div style={S.wrapper}>
        <h1 style={S.title}>Reset Password</h1>
        <p style={S.subtitle}>Enter your email address and we'll send you a secure link to reset your password.</p>

        {message && <div style={{ ...S.banner, background: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7' }}>✓ {message}</div>}
        {error && <div style={{ ...S.banner, background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2' }}>⚠ {error}</div>}

        <form onSubmit={handleForgot}>
          <label style={S.label}>Email Address</label>
          <input 
            type="email" 
            placeholder="name@gmail.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            style={S.input} 
            required
          />
          <button type="submit" style={S.btn} disabled={loading}>
            {loading ? 'Sending Link...' : 'Send Reset Link →'}
          </button>
        </form>

        <Link to="/login" style={S.link}>← Back to Sign In</Link>
      </div>
    </div>
  )
}
