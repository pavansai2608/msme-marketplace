import React, { useState, useEffect } from 'react'
import axios from 'axios'
import BuyerNavbar from '../../components/BuyerNavbar'
import { useAuth } from '../../context/AuthContext'
import { FaUserEdit, FaEnvelope, FaIdBadge, FaCalendarAlt } from 'react-icons/fa'

export default function Profile() {
  const { user, setUser, refreshUser } = useAuth()
  const [profile, setProfile] = useState(user || {})
  const [isEditing, setIsEditing] = useState(false)
  const [newAvatar, setNewAvatar] = useState('')
  const [updating, setUpdating] = useState(false)

  // Keep local profile in sync with AuthContext
  useEffect(() => {
    if (user) setProfile(user)
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get('/api/auth/me', { withCredentials: true })
      setProfile(data.user || {})
      setNewAvatar(data.user?.avatar || '')
      // Sync the global AuthContext too!
      if (data.user) setUser(data.user)
    } catch (err) { console.error(err) }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('Image size should be less than 2MB')
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewAvatar(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateAvatar = async () => {
    if (!newAvatar) return alert('Please select an image first')
    setUpdating(true)
    try {
      const { data } = await axios.put('/api/auth/update-profile', { avatar: newAvatar }, { withCredentials: true })
      setProfile(data.user)
      setUser(data.user)
      setIsEditing(false)
      alert('Profile image updated successfully!')
    } catch (err) {
      console.error('Update Error:', err)
      const msg = err.response?.data?.message || err.message || 'Failed to update image'
      alert(msg)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '60px' }}>
      <BuyerNavbar />
      
      <div style={{ maxWidth: '850px', margin: '60px auto', padding: '0 20px' }}>
        <div style={{ background: 'white', borderRadius: '32px', boxShadow: 'var(--shadow)', overflow: 'hidden', border: '1px solid var(--border-soft)' }}>
          
          <div style={{ background: '#000000', padding: '60px 40px', color: 'white', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 20px' }}>
              <div style={{ 
                width: '100%', height: '100%', 
                background: '#111827', 
                borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '3rem', fontWeight: 800,
                overflow: 'hidden',
                border: '4px solid rgba(255,255,255,0.1)'
              }}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profile.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <button 
                onClick={() => setIsEditing(true)}
                style={{ 
                  position: 'absolute', bottom: '2px', right: '2px', 
                  background: '#ffffff', color: '#000', border: 'none', 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 6px 12px rgba(0,0,0,0.1)'
                }}
              >
                <FaUserEdit size={14} />
              </button>
            </div>

            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Sora', sans-serif", letterSpacing: '-1px' }}>{profile.name || 'Member'}</h1>
            <p style={{ margin: '8px 0 0', opacity: 0.8, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.7rem' }}>Premium Account</p>
          </div>

          {isEditing && (
            <div style={{ padding: '32px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
              <label className="input-label">Update Profile Image</label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ 
                        opacity: 0, 
                        position: 'absolute', 
                        top: 0, left: 0, width: '100%', height: '100%', 
                        cursor: 'pointer' 
                      }}
                    />
                    <div style={{ padding: '20px', border: '2px dashed #D1D5DB', borderRadius: '12px', textAlign: 'center', background: 'white' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>Click to select or drag image</p>
                    </div>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 500 }}>Max size 2MB. Preferred: Square (1:1)</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={handleUpdateAvatar}
                    disabled={updating}
                    className="btn-primary"
                    style={{ padding: '12px 24px' }}
                  >
                    {updating ? 'Saving...' : 'Save Profile'}
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="btn-outline"
                    style={{ padding: '12px 24px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {newAvatar && newAvatar.startsWith('data:image') && (
                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={newAvatar} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #000' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.7rem', color: '#000' }}>NEW PREVIEW</div>
                </div>
              )}
            </div>
          )}

          <div style={{ padding: '40px 40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--border-soft)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                <FaIdBadge size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-grey)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>Account Name</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{profile.name || 'Anonymous'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--border-soft)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                <FaEnvelope size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-grey)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>Email Contact</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{profile.email || 'Not verified'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--border-soft)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                <FaCalendarAlt size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-grey)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>Join Date</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Today'}
                </div>
              </div>
            </div>

          </div>

          <div style={{ background: '#F9FAFB', padding: '24px 40px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>Manage your personal details and security.</div>
            {!isEditing && <button 
              onClick={() => setIsEditing(true)}
              style={{ background: '#000', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Update Details
            </button>}
          </div>

        </div>
      </div>
    </div>
  )
}
