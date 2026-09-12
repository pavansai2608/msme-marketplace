import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FaSearch, FaShoppingCart, FaUserCircle, FaBars, FaChevronRight, FaMapMarkerAlt, FaTimes, FaExchangeAlt, FaShoppingBag, FaCrosshairs, FaHeart, FaSignOutAlt } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'

import { fetchStates, fetchDistricts } from '../services/locationService'

export default function BuyerNavbar({ onSearchChange, onCategoryChange, currentSearch, currentCategory }) {
  const { user, logout, loading } = useAuth()
  const navigate = useNavigate()
  
  // Helper to get cookie for instant name display
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }
  
  const [displayName, setDisplayName] = useState(() => {
    return user?.name?.split(' ')[0] || getCookie('display_name') || ''
  })

  useEffect(() => {
    if (user?.name) setDisplayName(user.name.split(' ')[0])
  }, [user])
  
  const [localSearch, setLocalSearch] = useState(currentSearch || '')
  const [cart, setCart] = useState({ items: [] })
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [categories, setCategories] = useState([])
  const [wishlistCount, setWishlistCount] = useState(0)
  const [district, setDistrict] = useState(() => {
    return localStorage.getItem('user_district') || user?.district || ''
  })

  // Stop syncing from user object to allow independent buyer location
  /*
  useEffect(() => {
    if (user?.district) {
      setDistrict(user.district);
    }
  }, [user])
  */

  useEffect(() => {
    localStorage.setItem('user_district', district);
  }, [district])

  const [showLocationModal, setShowLocationModal] = useState(false)
  const [selectedStateForLoc, setSelectedStateForLoc] = useState('')
  const [gettingLocation, setGettingLocation] = useState(false)
  const [apiStates, setApiStates] = useState([])
  const [apiDistricts, setApiDistricts] = useState([])

  useEffect(() => {
    fetchStates().then(setApiStates)
  }, [])

  useEffect(() => {
    if (selectedStateForLoc) fetchDistricts(selectedStateForLoc).then(setApiDistricts)
    else setApiDistricts([])
  }, [selectedStateForLoc])

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation is not supported by your browser')
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
        if (res.data && res.data.address) {
          const addr = res.data.address
          const resolvedCity = addr.city || addr.town || addr.village || addr.county || addr.suburb || ''
          
          if (addr.state) {
            setSelectedStateForLoc(addr.state)
            if (resolvedCity) {
              setDistrict(resolvedCity)
              setShowLocationModal(false)
            }
          } else {
            if (resolvedCity) {
              setDistrict(resolvedCity)
              setShowLocationModal(false)
            }
          }
        }
      } catch (err) {
        console.error('Geo error', err)
      } finally {
        setGettingLocation(false)
      }
    }, (err) => {
      alert('Unable to retrieve your location. Check browser permissions.')
      setGettingLocation(false)
    })
  }

  useEffect(() => {
    fetchCategories()
    
    // Fetch user-specific data only if user is available
    if (user) {
      fetchCart()
      fetchWishlistCount()
    }
    
    const handleCartUpdate = () => fetchCart()
    const handleWishlistUpdate = () => fetchWishlistCount()
    
    window.addEventListener('cartUpdated', handleCartUpdate)
    window.addEventListener('wishlistUpdated', handleWishlistUpdate)
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate)
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate)
    }
  }, [user])
  
  useEffect(() => {
    if (currentSearch !== undefined) setLocalSearch(currentSearch)
  }, [currentSearch])

  const fetchCategories = async () => {
    try {
      const cached = localStorage.getItem('msme_categories')
      if (cached) setCategories(JSON.parse(cached))
      
      const { data } = await axios.get('/api/products/categories')
      setCategories(data.data)
      localStorage.setItem('msme_categories', JSON.stringify(data.data))
    } catch (err) { console.error(err) }
  }

  const fetchCart = async () => {
    try {
      const { data } = await axios.get('/api/cart', { withCredentials: true })
      setCart(data.data)
    } catch (err) { console.error(err) }
  }

  const fetchWishlistCount = async () => {
    try {
      if (!user) return
      const { data } = await axios.get('/api/user/wishlist', { withCredentials: true })
      setWishlistCount(data.data.length || 0)
    } catch (err) { console.error(err) }
  }
  
  const handleSearchCommit = () => {
    if (onSearchChange) {
      onSearchChange(localSearch)
    } else {
      navigate('/buyer') // Ideally would pass search query
    }
  }

  const handleCategorySelect = (cat) => {
    if (onCategoryChange) {
      onCategoryChange(cat)
      if (onSearchChange) { onSearchChange(''); setLocalSearch(''); }
    } else {
      navigate('/buyer')
    }
    setSidebarOpen(false)
  }

  const handleHomeClick = () => {
    if (onCategoryChange) onCategoryChange('All')
    if (onSearchChange) onSearchChange('')
    setLocalSearch('')
    navigate('/buyer')
  }

  const activeCategory = currentCategory || 'All'

  return (
    <>
      <nav className="buyer-nav" style={{ 
        background: 'var(--premium-gradient)', 
        borderBottom: 'none', 
        height: '84px', 
        padding: '0 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
      }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} 
          onClick={handleHomeClick}
        >
          <div style={{ background: 'white', width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <FaShoppingBag size={16} color="var(--primary)" />
          </div>
          <span style={{ 
            fontSize: '1.4rem', 
            fontWeight: 800, 
            color: 'white', 
            letterSpacing: '-1px', 
            fontFamily: "'Sora', sans-serif" 
          }}>
            MSME<span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>Market</span>
          </span>
        </div>

        <div className="nav-search-container" style={{ 
          maxWidth: '500px', 
          flex: 1, 
          margin: '0 40px',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.2)',
          transition: 'var(--transition)',
          display: 'flex',
          alignItems: 'center'
        }}>
          <input 
            type="text" 
            className="nav-search-input" 
            placeholder="Search products or business names..."
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value)
              if (onSearchChange) onSearchChange(e.target.value)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchCommit()}
            style={{ 
              background: 'transparent', 
              padding: '12px 24px', 
              fontSize: '0.95rem',
              color: 'white',
              border: 'none',
              outline: 'none',
              flex: 1,
              fontWeight: 500
            }}
          />
          <button 
            className="nav-search-btn" 
            onClick={handleSearchCommit} 
            style={{ background: 'transparent', border: 'none', padding: '0 24px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}
          >
            <FaSearch size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div 
            style={{ cursor: 'pointer', textAlign: 'center' }}
            onClick={() => setShowLocationModal(true)}
          >
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Delivery to</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
              <FaMapMarkerAlt size={12} color="white" /> {district || 'India'}
            </div>
          </div>

          <div 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
            onClick={() => setSidebarOpen(true)}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800, textTransform: 'uppercase' }}>Account</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>{displayName || (loading ? 'Checking...' : 'Sign In')}</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition)' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#fff'}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <FaUserCircle size={30} color="white" />
              )}
            </div>
          </div>

          <div 
            onClick={() => navigate('/wishlist')}
            style={{ 
              position: 'relative', 
              cursor: 'pointer',
              color: 'white',
              padding: '12px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <FaHeart size={20} />
            {wishlistCount > 0 && (
              <span style={{ 
                position: 'absolute', top: '4px', right: '4px',
                background: '#EF4444', color: 'white', borderRadius: '50%', 
                width: '18px', height: '18px', fontSize: '10px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900,
                border: '2px solid white'
              }}>
                {wishlistCount}
              </span>
            )}
          </div>

          <div 
            onClick={() => navigate('/cart')} 
            style={{ 
              position: 'relative', 
              cursor: 'pointer',
              background: 'white',
              color: 'var(--primary)',
              padding: '14px 28px',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'var(--transition)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.25)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)'
            }}
          >
            <FaShoppingCart size={16} color="var(--primary)" />
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.2px' }}>Bag</span>
            <span style={{ 
              background: 'var(--primary)', 
              color: '#ffffff', 
              borderRadius: '8px', 
              minWidth: '22px', 
              height: '22px', 
              fontSize: '11px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 900,
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}>
              {cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0}
            </span>
          </div>
        </div>
      </nav>

      {/* Subnav */}
      <div className="buyer-subnav" style={{ alignItems: 'center', gap: '20px' }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', borderRight: '1px solid #eee', paddingRight: '15px', color: 'var(--primary)', fontWeight: 800 }} 
          onClick={() => setSidebarOpen(true)}
        >
          <FaBars /> All
        </div>
        
        <div 
          className={`subnav-link ${activeCategory === 'All' ? 'active' : ''}`} 
          onClick={() => handleCategorySelect('All')}
          style={{ 
            color: activeCategory === 'All' ? 'var(--primary)' : 'inherit', 
            borderBottom: activeCategory === 'All' ? '2px solid var(--primary)' : 'none',
            whiteSpace: 'nowrap'
          }}
        >
          All Products
        </div>

        <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <div 
              key={cat} 
              className={`subnav-link ${activeCategory === cat ? 'active' : ''}`} 
              onClick={() => handleCategorySelect(cat)}
              style={{ 
                color: activeCategory === cat ? 'var(--primary)' : 'inherit', 
                borderBottom: activeCategory === cat ? '2px solid var(--primary)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setSidebarOpen(false)}
        style={{ 
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', 
          backdropFilter: 'blur(4px)', zIndex: 1999, 
          visibility: isSidebarOpen ? 'visible' : 'hidden',
          opacity: isSidebarOpen ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      ></div>

      {/* Premium Sidebar Drawer */}
      <div 
        className={`buyer-sidebar ${isSidebarOpen ? 'open' : ''}`}
        style={{ 
          position: 'fixed', top: 0, left: 0, right: 'auto', bottom: 0, width: '340px', 
          background: 'white', zIndex: 2000, 
          boxShadow: '20px 0 60px rgba(0,0,0,0.1)',
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-out',
          display: 'flex', flexDirection: 'column',
          willChange: 'transform'
        }}
      >
        <div style={{ background: '#000000', padding: '32px', color: 'white', position: 'relative' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setSidebarOpen(false); }} 
            style={{ 
              position: 'absolute', top: '24px', right: '24px', 
              background: 'rgba(255,255,255,0.1)', border: 'none', 
              color: 'white', cursor: 'pointer', width: '32px', height: '32px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'var(--transition)' 
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <FaTimes size={14} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <FaUserCircle size={28} />
            </div>
          </div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9CA3AF', marginBottom: '4px' }}>Welcome back</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Sora', sans-serif" }}>{user?.name || 'Guest User'}</div>
        </div>

        <div style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Order History', icon: <FaShoppingBag />, path: '/my-orders' },
              { label: 'Shopping Bag', icon: <FaShoppingCart />, path: '/cart' },
              { label: 'Favorites', icon: <FaHeart />, path: '/wishlist' },
              { label: 'Saved Addresses', icon: <FaMapMarkerAlt />, path: '/addresses' },
              { label: 'Account Settings', icon: <FaUserCircle />, path: '/profile' },
            ].map(item => (
              <div 
                key={item.label} 
                onClick={() => { setSidebarOpen(false); navigate(item.path) }}
                style={{ 
                  padding: '16px 0', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  fontWeight: 700, color: '#374151', fontSize: '0.9rem', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#000'}
                onMouseLeave={e => e.currentTarget.style.color = '#374151'}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ color: '#9CA3AF', display: 'flex' }}>{item.icon}</span>
                  {item.label}
                </span>
                <FaChevronRight size={10} color="#D1D5DB" />
              </div>
            ))}
          </div>

          <div style={{ marginTop: '32px', padding: '24px', borderRadius: '20px', background: '#F9FAFB', border: '2px solid #F3F4F6', boxShadow: '0 8px 20px rgba(0,0,0,0.02)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
              <FaExchangeAlt size={12} color="#4B5563" /> Business Mode
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '16px', lineHeight: 1.4 }}>Manage your shop and fulfill orders with our AI dashboard.</p>
            <button 
              onClick={() => { setSidebarOpen(false); navigate('/seller'); }} 
              style={{ background: '#000000', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#2D2D2D'}
              onMouseLeave={e => e.currentTarget.style.background = '#000'}
            >
              Seller Hub
            </button>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
            <button 
              onClick={() => { logout(); setSidebarOpen(false); }}
              style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
              onMouseLeave={e => e.currentTarget.style.opacity = 1}
            >
              <FaSignOutAlt size={16} /> Logout Securely
            </button>
          </div>
        </div>
      </div>

      {/* Location Modal */}
      {showLocationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowLocationModal(false)}>
          <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '500px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Select Delivery Location</h2>
              <FaTimes style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowLocationModal(false)} />
            </div>

            <button 
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation}
              style={{ width: '100%', background: gettingLocation ? '#f1f5f9' : '#F3F4F6', color: gettingLocation ? '#94a3b8' : '#0F172A', border: `1.5px solid ${gettingLocation ? '#e2e8f0' : '#0F172A'}`, padding: '14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: gettingLocation ? 'default' : 'pointer', fontWeight: 700, marginBottom: '24px', transition: 'all 0.3s ease' }}
            >
              <FaCrosshairs color={gettingLocation ? '#94a3b8' : '#0F172A'} /> {gettingLocation ? 'Locating via GPS...' : 'Auto-detect my location'}
            </button>

            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '24px', textTransform: 'uppercase' }}>-- OR SELECT MANUALLY --</div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>1. Select State</label>
              <select 
                value={selectedStateForLoc} 
                onChange={(e) => { setSelectedStateForLoc(e.target.value) }}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem', outline: 'none' }}
              >
                <option value="">-- Choose State --</option>
                {apiStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            {selectedStateForLoc && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>2. Select District</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {apiDistricts.map(dist => (
                    <button 
                      key={dist}
                      onClick={() => { setDistrict(dist); setShowLocationModal(false); }}
                      style={{ padding: '12px', background: district === dist ? 'var(--primary)' : '#f8fafc', color: district === dist ? 'white' : 'var(--text-main)', border: district === dist ? 'none' : '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', textAlign: 'left' }}
                    >
                      {dist}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
