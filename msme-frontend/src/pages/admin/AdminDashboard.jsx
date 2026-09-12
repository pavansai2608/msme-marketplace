import { useState } from 'react'
import { FaUsers, FaCheckCircle, FaExclamationTriangle, FaShieldAlt } from 'react-icons/fa'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div style={{ padding: '40px' }} className="animate-fade-in">
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <FaShieldAlt color="var(--primary)" /> Admin Control Center
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Monitor platform health and manage verification requests.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        {[
          { icon: <FaUsers />, label: 'Total Users', value: '1,284', color: '#2563eb' },
          { icon: <FaCheckCircle />, label: 'Verified MSMEs', value: '452', color: '#059669' },
          { icon: <FaExclamationTriangle />, label: 'Pending Reviews', value: '28', color: '#f59e0b' },
          { icon: <FaShieldAlt />, label: 'Active Sessions', value: '156', color: '#7c3aed' }
        ].map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: '24px' }}>
            <div style={{ color: stat.color, marginBottom: '12px', fontSize: '1.5rem' }}>{stat.icon}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{stat.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: '32px' }}>
        <h3 style={{ marginBottom: '24px' }}>Recent Seller Applications</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '16px' }}>Business Name</th>
              <th style={{ textAlign: 'left', padding: '16px' }}>Owner</th>
              <th style={{ textAlign: 'left', padding: '16px' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '16px' }}>Review</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '16px' }}>Handicrafts Elite</td>
              <td style={{ padding: '16px' }}>Rajesh Kumar</td>
              <td style={{ padding: '16px' }}>
                <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#fef3c7', color: '#d97706', fontSize: '0.75rem', fontWeight: 700 }}>PENDING</span>
              </td>
              <td style={{ padding: '16px', textAlign: 'right' }}>
                <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>View Details</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
