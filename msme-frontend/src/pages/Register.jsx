import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import { registerUser } from '../api/authApi'
import { registerSchema } from '../lib/schemas'
import GoogleAuthBtn from '../components/GoogleAuthBtn'

export default function Register() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  // The setter was previously destructured away, so the eye button had nothing
  // to call and the field could never be revealed.
  const [showPass, setShowPass] = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: { name: '', email: '', password: '' },
  })

  const loading = isSubmitting

  const onSubmit = async (values) => {
    setApiError('')
    try {
      const data = await registerUser(values)
      setUser(data.user)
      setTimeout(() => navigate('/buyer'), 1500)
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Registration failed. Please try again.')
    }
  }

  const S = {
    page: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-page)',
      padding: '20px',
      fontFamily: "'Sora', sans-serif",
    },
    wrapper: {
      display: 'flex',
      width: '100%',
      maxWidth: '1060px',
      minHeight: '680px',
      borderRadius: '28px',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      background: '#fff',
    },
    left: {
      flex: '1.1',
      background: 'linear-gradient(145deg,#EEF2FF 0%,#E3E8FA 50%,#EDE9F8 100%)',
      padding: '48px 40px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
    },
    blob1: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: '50%',
      background: 'radial-gradient(circle,rgba(99,102,241,0.18),transparent 70%)',
      top: -60,
      right: -60,
    },
    blob2: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: '50%',
      background: 'radial-gradient(circle,rgba(255,152,0,0.13),transparent 70%)',
      bottom: 40,
      left: -40,
    },
    logoRow: { display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 },
    logoBox: {
      width: 48,
      height: 48,
      borderRadius: 12,
      background: 'linear-gradient(135deg,#FF9800,#FFB300)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Sora',sans-serif",
      fontWeight: 800,
      fontSize: 13,
      color: '#1A237E',
      boxShadow: '0 4px 16px rgba(255,152,0,0.35)',
    },
    logoText: { fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 18, color: '#1A1F5E' },
    tagline: {
      fontFamily: "'Sora',sans-serif",
      fontSize: 30,
      fontWeight: 800,
      color: '#1A1F5E',
      lineHeight: 1.2,
      position: 'relative',
      zIndex: 2,
      marginTop: 32,
    },
    taglineAccent: {
      background: 'linear-gradient(90deg,#FF9800,#3D5AFE)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    desc: {
      fontSize: 13,
      color: '#4A5578',
      lineHeight: 1.7,
      maxWidth: 280,
      marginTop: 10,
      position: 'relative',
      zIndex: 2,
      fontWeight: 500,
    },
    right: {
      flex: 1,
      background: '#FFFFFF',
      padding: '52px 48px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    formCard: { width: '100%', maxWidth: 400 },
    title: {
      fontFamily: "'Sora',sans-serif",
      fontSize: 26,
      fontWeight: 800,
      color: '#1A1F5E',
      lineHeight: 1.2,
    },
    subtitle: { fontSize: 13, color: '#5C6484', marginTop: 6, marginBottom: 20, fontWeight: 500 },
    fieldWrap: { marginBottom: 16 },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: '#4A5578',
      letterSpacing: '0.4px',
      textTransform: 'uppercase',
      display: 'block',
      marginBottom: 6,
    },
    input: {
      width: '100%',
      padding: '12px 14px',
      background: '#F8F9FE',
      border: '1.5px solid var(--border-soft)',
      borderRadius: 13,
      fontSize: 14,
      color: '#1A1F5E',
      transition: 'all 0.2s ease',
    },
    inputIcon: {
      position: 'absolute',
      left: 13,
      color: '#7B84A1',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
    },
    signinBtn: {
      width: '100%',
      padding: '14px',
      fontSize: 15,
      fontWeight: 600,
      color: '#FFFFFF',
      borderRadius: 14,
      transition: 'all 0.25s ease',
      background: 'linear-gradient(135deg,#3D5AFE,#1A237E)',
      boxShadow: 'var(--shadow-btn)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' },
    divLine: { flex: 1, height: '1.5px', background: '#D1D9F0' },
    divText: {
      fontSize: 11,
      color: '#5C6484',
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      fontWeight: 600,
    },
    registerRow: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 13,
      color: '#5C6484',
      fontWeight: 500,
    },
    registerLink: { color: '#3D5AFE', fontWeight: 700, marginLeft: 4, cursor: 'pointer' },
  }

  return (
    <div style={S.page}>
      <div style={S.wrapper}>
        <div className="left-panel" style={S.left}>
          <div style={S.blob1} />
          <div style={S.blob2} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={S.logoRow}>
              <div style={S.logoBox}>MSME</div>
              <div>
                <span style={S.logoText}>MSME Platform</span>
              </div>
            </div>
            <div style={S.tagline}>
              Join the Future of
              <br />
              <span style={S.taglineAccent}>Enterprise</span>
            </div>
            <p style={S.desc}>
              Start your journey with the AI-powered smart aggregator for Micro, Small & Medium
              Enterprises.
            </p>
          </div>
        </div>
        <div className="right-panel" style={S.right}>
          <div style={S.formCard}>
            <h1 style={S.title}>Create Account</h1>
            <p style={S.subtitle}>Sign up to start scale your business</p>

            {apiError && (
              <div
                style={{
                  background: '#FFEBEE',
                  color: '#C62828',
                  padding: '10px',
                  borderRadius: '10px',
                  marginBottom: '10px',
                  fontSize: '13px',
                }}
              >
                {apiError}
              </div>
            )}

            <GoogleAuthBtn loading={gLoading} setLoading={setGLoading} />

            <div style={S.divider}>
              <div style={S.divLine} />
              <span style={S.divText}>or use email</span>
              <div style={S.divLine} />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div style={S.fieldWrap}>
                <label style={S.label}>Full Name</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    placeholder="Enter your name"
                    autoComplete="name"
                    aria-invalid={Boolean(errors.name)}
                    {...register('name')}
                    style={S.input}
                  />
                </div>
                {errors.name && (
                  <div style={{ color: '#F44336', fontSize: '11px', marginTop: '4px' }}>
                    {errors.name.message}
                  </div>
                )}
              </div>

              <div style={S.fieldWrap}>
                <label style={S.label}>Email Address</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                    {...register('email')}
                    style={S.input}
                  />
                </div>
                {errors.email && (
                  <div style={{ color: '#F44336', fontSize: '11px', marginTop: '4px' }}>
                    {errors.email.message}
                  </div>
                )}
              </div>

              <div style={S.fieldWrap}>
                <label style={S.label}>Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Create a strong security password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.password)}
                    {...register('password')}
                    style={{ ...S.input, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: 12,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#7B84A1',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4,
                    }}
                  >
                    {showPass ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <div style={{ color: '#F44336', fontSize: '11px', marginTop: '4px' }}>
                    {errors.password.message}
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} style={S.signinBtn}>
                {loading ? 'Creating Account...' : 'Register Now →'}
              </button>
            </form>

            <div style={S.registerRow}>
              Already have an account?
              <Link to="/login" style={S.registerLink}>
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
