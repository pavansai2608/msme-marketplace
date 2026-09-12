import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginUser } from '../api/authApi'
import GoogleAuthBtn from '../components/GoogleAuthBtn'

/* ── Keyframes injected once ── */
const styleTag = document.createElement('style')
styleTag.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
  @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(18px,-14px) scale(1.04)} }
  @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-14px,18px) scale(1.06)} }
  @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(10px,12px) scale(0.97)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  .form-card { animation: slideUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
  .input-field:focus { border-color: var(--border-focus) !important; box-shadow: var(--shadow-input) !important; }
  .signin-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(61,90,254,0.45) !important; }
  .signin-btn:active:not(:disabled) { transform: scale(0.98); }
  .feat-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.9) !important; }
`
if (!document.head.querySelector('#msme-styles')) {
  styleTag.id = 'msme-styles'
  document.head.appendChild(styleTag)
}

export default function Login() {
  const navigate              = useNavigate()
  const { user, setUser }           = useAuth()
  
  useEffect(() => {
    if (user) navigate('/buyer')
  }, [user, navigate])
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [gLoading, setGLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [apiError, setApiError] = useState('')

  const validate = () => {
    const e = {}
    if (!email)                            e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address'
    if (!password)                         e.password = 'Password is required'
    else if (password.length < 6)          e.password = 'Password must be at least 6 characters'
    return e
  }

  const handleSubmit = async () => {
    setApiError('')
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    try {
      const data = await loginUser({ email, password })
      setUser(data.user)
      setSuccess(true)
      setTimeout(() => navigate('/buyer'), 1500)
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }

  /* ── STYLES ── */
  const S = {
    page: {
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-page)',
      padding: '20px', fontFamily: "'Sora', sans-serif",
    },
    wrapper: {
      display: 'flex', width: '100%', maxWidth: '1060px',
      minHeight: '620px', borderRadius: '28px', overflow: 'hidden',
      boxShadow: 'var(--shadow-card)', background: '#fff',
    },
    left: {
      flex: '1.1', background: 'linear-gradient(145deg,#EEF2FF 0%,#E3E8FA 50%,#EDE9F8 100%)',
      padding: '48px 40px', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
    },
    blob1: {
      position:'absolute', width:260, height:260, borderRadius:'50%',
      background:'radial-gradient(circle,rgba(99,102,241,0.18),transparent 70%)',
      top:-60, right:-60, animation:'float1 7s ease-in-out infinite',
    },
    blob2: {
      position:'absolute', width:200, height:200, borderRadius:'50%',
      background:'radial-gradient(circle,rgba(255,152,0,0.13),transparent 70%)',
      bottom:40, left:-40, animation:'float2 9s ease-in-out infinite',
    },
    blob3: {
      position:'absolute', width:140, height:140, borderRadius:'50%',
      background:'radial-gradient(circle,rgba(61,90,254,0.12),transparent 70%)',
      bottom:160, right:20, animation:'float3 6s ease-in-out infinite',
    },
    logoRow: { display:'flex', alignItems:'center', gap:12, position:'relative', zIndex:2 },
    logoBox: {
      width:48, height:48, borderRadius:12,
      background:'linear-gradient(135deg,#FF9800,#FFB300)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:13,
      color:'#1A237E', letterSpacing:'-0.5px', flexShrink:0,
      boxShadow:'0 4px 16px rgba(255,152,0,0.35)',
    },
    logoText: { fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:18, color:'#1A1F5E' },
    logoSub: { fontSize:10, color:'#8B93B8', letterSpacing:'0.6px', textTransform:'uppercase', display:'block', marginTop:2 },
    tagline: {
      fontFamily:"'Sora',sans-serif", fontSize:30, fontWeight:800,
      color:'#1A1F5E', lineHeight:1.2, position:'relative', zIndex:2, marginTop:32,
    },
    taglineAccent: {
      background:'linear-gradient(90deg,#FF9800,#3D5AFE)',
      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
      backgroundClip:'text',
    },
    desc: { fontSize: 13, color: '#4A5578', lineHeight: 1.7, maxWidth: 280, marginTop: 10, position: 'relative', zIndex: 2, fontWeight: 500 },
    features: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28, position: 'relative', zIndex: 2 },
    featCard: {
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,1)',
      borderRadius: 14, padding: '12px 14px', transition: 'all 0.25s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    },
    featIcon: {
      width:36, height:36, borderRadius:10, flexShrink:0,
      background:'linear-gradient(135deg,#FF9800,#FFB300)',
      display:'flex', alignItems:'center', justifyContent:'center',
      boxShadow:'0 4px 12px rgba(255,152,0,0.3)',
    },
    featTitle: { fontSize: 13, fontWeight: 700, color: '#1A1F5E' },
    featDesc: { fontSize: 11, color: '#4A5578', marginTop: 2, fontWeight: 500 },
    badges: { display:'flex', gap:8, flexWrap:'wrap', position:'relative', zIndex:2, marginTop:'auto', paddingTop:24 },
    badge: {
      background:'rgba(61,90,254,0.08)', border:'1px solid rgba(61,90,254,0.15)',
      borderRadius:20, padding:'5px 12px', fontSize:11,
      color:'#3D5AFE', fontWeight:500, letterSpacing:'0.2px',
    },
    right: {
      flex:1, background:'#FFFFFF', padding:'52px 48px',
      display:'flex', flexDirection:'column', justifyContent:'center',
    },
    mobileHeader: { display:'none' },
    formCard: { width:'100%', maxWidth:400 },
    chipRow: { display:'flex', alignItems:'center', gap:8, marginBottom:28 },
    chipBox: {
      width:36, height:36, borderRadius:9,
      background:'linear-gradient(135deg,#FF9800,#FFB300)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:10,
      color:'#1A237E', flexShrink:0,
    },
    chipText: { fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:14, color:'#1A1F5E' },
    title: { fontFamily:"'Sora',sans-serif", fontSize:26, fontWeight:800, color:'#1A1F5E', lineHeight:1.2 },
    titleBlue: { color:'#3D5AFE' },
    subtitle: { fontSize:13, color:'#5C6484', marginTop:6, marginBottom:28, fontWeight: 500 },
    successBanner: {
      background:'#E8F5E9', border:'1px solid #A5D6A7', borderRadius:12,
      padding:'11px 14px', fontSize:13, color:'#2E7D32', marginBottom:18,
      animation:'fadeIn 0.4s ease', display:'flex', alignItems:'center', gap:8,
    },
    errorBanner: {
      background:'#FFEBEE', border:'1px solid #FFCDD2', borderRadius:12,
      padding:'11px 14px', fontSize:13, color:'#C62828', marginBottom:18,
      animation:'fadeIn 0.4s ease',
    },
    divider: { display:'flex', alignItems:'center', gap:12, margin:'18px 0' },
    divLine: { flex: 1, height: '1.5px', background: '#D1D9F0' },
    divText: { fontSize: 11, color: '#5C6484', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap', fontWeight: 600 },
    fieldWrap: { marginBottom: 16 },
    label: { fontSize: 11, fontWeight: 700, color: '#4A5578', letterSpacing: '0.4px', textTransform: 'uppercase', display: 'block', marginBottom: 6 },
    inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
    inputIcon: { position: 'absolute', left: 13, color: '#7B84A1', pointerEvents: 'none', display: 'flex', alignItems: 'center' },
    input: {
      width:'100%', padding:'12px 14px',
      background:'#F8F9FE', border:'1.5px solid #E4E8F7',
      borderRadius:13, fontSize:14, color:'#1A1F5E',
      transition:'all 0.2s ease',
    },
    inputErr: { borderColor:'#F44336 !important' },
    eyeBtn: {
      position: 'absolute', right: 12, background: 'none', border: 'none',
      cursor: 'pointer', color: '#7B84A1', display: 'flex', alignItems: 'center', padding: 4,
    },
    errMsg: { fontSize: 11, color: '#F44336', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 },
    forgotRow: { textAlign:'right', marginBottom:20, marginTop:-6 },
    forgotLink: { fontSize:12, color:'#3D5AFE', fontWeight:500, cursor:'pointer' },
    signinBtn: {
      width:'100%', padding:'14px', fontSize:15, fontWeight:600,
      color:'#FFFFFF', borderRadius:14, transition:'all 0.25s ease',
      background:'linear-gradient(135deg,#3D5AFE,#1A237E)',
      boxShadow:'var(--shadow-btn)', display:'flex', alignItems:'center',
      justifyContent:'center', gap:8, letterSpacing:'0.2px',
    },
    signinBtnDisabled: { opacity:0.75, cursor:'not-allowed', transform:'none !important' },
    spinner: {
      width:17, height:17, border:'2px solid rgba(255,255,255,0.35)',
      borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.7s linear infinite',
    },
    registerRow: { textAlign: 'center', marginTop: 20, fontSize: 13, color: '#5C6484', fontWeight: 500 },
    registerLink: { color: '#3D5AFE', fontWeight: 700, marginLeft: 4, cursor: 'pointer' },
  }

  const features = [
    { icon: '🔗', title: 'Connect with Buyers', desc: 'Direct access to verified buyers & markets' },
    { icon: '🚚', title: 'Smart Logistics', desc: 'Optimised delivery & supply chain' },
    { icon: '💰', title: 'Finance & Schemes', desc: 'Loans, subsidies & govt. programmes' },
  ]

  return (
    <div style={S.page}>
      {/* ── MOBILE HEADER (shown only on mobile via media query via inline style override) ── */}
      <style>{`
        @media (max-width: 767px) {
          .left-panel   { display: none !important; }
          .right-panel  { padding: 28px 22px !important; }
          .form-wrapper { max-width: 100% !important; }
          .mobile-hdr   { display: flex !important; }
          .page-wrap    { border-radius: 20px !important; min-height: unset !important; flex-direction: column !important; }
          .form-title   { font-size: 21px !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .left-panel  { flex: 0 0 42% !important; padding: 36px 28px !important; }
          .right-panel { padding: 40px 32px !important; }
          .left-tagline { font-size: 24px !important; }
        }
      `}</style>

      <div className="page-wrap" style={S.wrapper}>

        {/* ── LEFT PANEL ── */}
        <div className="left-panel" style={S.left}>
          <div style={S.blob1} /><div style={S.blob2} /><div style={S.blob3} />
          <div style={{ position:'relative', zIndex:2 }}>
            <div style={S.logoRow}>
              <div style={S.logoBox}>MSME</div>
              <div>
                <span style={S.logoText}>MSME Platform</span>
                <span style={S.logoSub}>AI Aggregation for MSMEs</span>
              </div>
            </div>
            <div className="left-tagline" style={S.tagline}>
              Empowering Every<br /><span style={S.taglineAccent}>Enterprise</span>
            </div>
            <p style={S.desc}>An AI-powered smart aggregator connecting Micro, Small & Medium Enterprises with buyers, logistics, finance & government schemes.</p>
            <div style={S.features}>
              {features.map((f, i) => (
                <div key={i} className="feat-card" style={S.featCard}>
                  <div style={S.featIcon}><span style={{ fontSize:16 }}>{f.icon}</span></div>
                  <div><div style={S.featTitle}>{f.title}</div><div style={S.featDesc}>{f.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div style={S.badges}>
            {['District-level AI','Govt. Integrated','MSME Focused','Cloud-based'].map(b => (
              <span key={b} style={S.badge}>{b}</span>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel" style={S.right}>

          {/* Mobile-only top header */}
          <div className="mobile-hdr" style={{ ...S.mobileHeader, alignItems:'center', gap:10, marginBottom:24, background:'linear-gradient(135deg,#EEF2FF,#E8EDFB)', borderRadius:16, padding:'16px 18px' }}>
            <div style={S.logoBox}>MSME</div>
            <div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:15, color:'#1A1F5E' }}>MSME Platform</div>
              <div style={{ fontSize:10, color:'#8B93B8', textTransform:'uppercase', letterSpacing:'0.6px' }}>AI Aggregation for MSMEs</div>
            </div>
          </div>

          <div className="form-card form-wrapper" style={S.formCard}>
            <div style={S.chipRow}>
              <div style={S.chipBox}>MSME</div>
              <span style={S.chipText}>MSME Platform</span>
            </div>

            <h1 className="form-title" style={S.title}>
              Welcome back to<br /><span style={S.titleBlue}>MSME Platform</span>
            </h1>
            <p style={S.subtitle}>Sign in to your account to continue</p>

            {success && (
              <div style={S.successBanner}>
                <span>✓</span> Signed in successfully! Redirecting to dashboard...
              </div>
            )}
            {apiError && <div style={S.errorBanner}>{apiError}</div>}

            <GoogleAuthBtn loading={gLoading} setLoading={setGLoading} />

            <div style={S.divider}>
              <div style={S.divLine} />
              <span style={S.divText}>or continue with email</span>
              <div style={S.divLine} />
            </div>

            {/* Email */}
            <div style={S.fieldWrap}>
              <label style={S.label}>Email Address</label>
              <div style={S.inputWrap}>
                <input
                  className="input-field"
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email:''})) }}
                  onKeyDown={handleKeyDown}
                  style={{ ...S.input, borderColor: errors.email ? '#F44336' : '#E4E8F7' }}
                />
              </div>
              {errors.email && <div style={S.errMsg}><span>⚠</span>{errors.email}</div>}
            </div>

            {/* Password */}
            <div style={S.fieldWrap}>
              <label style={S.label}>Password</label>
              <div style={S.inputWrap}>
                <input
                  className="input-field"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your security password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password:''})) }}
                  onKeyDown={handleKeyDown}
                  style={{ ...S.input, paddingRight:44, borderColor: errors.password ? '#F44336' : '#E4E8F7' }}
                />
                <button style={S.eyeBtn} onClick={() => setShowPass(!showPass)} type="button">
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {errors.password && <div style={S.errMsg}><span>⚠</span>{errors.password}</div>}
            </div>

            <div style={S.forgotRow}>
              <Link to="/forgot-password" style={S.forgotLink}>Forgot password?</Link>
            </div>

            <button
              className="signin-btn"
              onClick={handleSubmit}
              disabled={loading || success}
              style={{ ...S.signinBtn, ...(loading || success ? S.signinBtnDisabled : {}) }}
            >
              {loading ? <><div style={S.spinner} /> Signing in...</> : 'Sign In →'}
            </button>

            <div style={S.registerRow}>
              Don't have an account?
              <Link to="/register" style={S.registerLink}>Register here</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
