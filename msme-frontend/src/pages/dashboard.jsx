import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FaShoppingBag, FaStore, FaUserShield, FaArrowRight } from 'react-icons/fa'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading, navigate])

  if (loading || !user) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading session...</div>

  const roles = [
    {
      id: 'buyer',
      title: 'Buyer',
      desc: 'Shop from local MSMEs. Clean, fast, and secure marketplace experience.',
      icon: <FaShoppingBag size={24} />,
      color: '#2563eb',
      path: '/buyer'
    },
    {
      id: 'seller',
      title: 'Seller',
      desc: 'Grow your business. Manage products, stock, and track your orders.',
      icon: <FaStore size={24} />,
      color: '#7c3aed',
      path: '/seller'
    },
    {
      id: 'admin',
      title: 'Administrator',
      desc: 'Oversee platform operations, verify sellers, and manage users.',
      icon: <FaUserShield size={24} />,
      color: '#334155',
      path: '/admin'
    }
  ]

  const handleRoleSelection = (rolePath) => {
    navigate(rolePath)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1100px', width: '100%' }}>
        <header style={{ textAlign: 'center', marginBottom: '60px' }} className="animate-fade-in">
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px', letterSpacing: '-0.025em' }}>
            Welcome back, <span style={{ color: 'var(--primary)' }}>{user?.name?.split(' ')[0] || 'Partner'}</span>!
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Choose your gateway to the MSME ecosystem. Each workspace is tailored to your specific goals.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {roles.map((role, idx) => (
            <div 
              key={role.id}
              onClick={() => handleRoleSelection(role.path)}
              className="glass-card animate-fade-in"
              style={{ 
                padding: '40px', 
                cursor: 'pointer', 
                transition: 'all 0.3s ease',
                animationDelay: `${idx * 0.1}s`,
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-10px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              }}
            >
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '16px', 
                backgroundColor: role.color, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white', 
                marginBottom: '24px',
                boxShadow: `0 8px 16px -4px ${role.color}44`
              }}>
                {role.icon}
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>{role.title}</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: '1.6', flexGrow: 1 }}>
                {role.desc}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)', fontWeight: 600 }}>
                Enter Workspace <FaArrowRight style={{ marginLeft: '8px' }} />
              </div>
            </div>
          ))}
        </div>

        <footer style={{ marginTop: '80px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
          &copy; 2026 MSME Platform Aggregator. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
