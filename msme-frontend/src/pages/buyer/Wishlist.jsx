import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import BuyerNavbar from '../../components/BuyerNavbar'
import { FaTrash, FaRegHeart } from 'react-icons/fa'

export default function Wishlist() {
  const navigate = useNavigate()
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWishlist()
  }, [])

  const fetchWishlist = async () => {
    try {
      // the endpoint might not exist yet, we'll gracefully fallback
      const { data } = await axios.get('/api/user/wishlist', { withCredentials: true })
      // Filter out nulls in case products were deleted
      setWishlist((data.data || []).filter(item => item !== null))
    } catch (err) {
      console.error(err)
      setWishlist([])
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (id) => {
    try {
      await axios.delete(`/api/user/wishlist/${id}`, { withCredentials: true })
      fetchWishlist()
      window.dispatchEvent(new Event('wishlistUpdated'))
    } catch (err) {
      console.error(err)
    }
  }

  const handleMoveToBag = async (product) => {
    const firstSize = product.sizes?.find(s => s.stock > 0)?.size
    if (!firstSize) {
      // If no size found (shouldn't happen with totalStock > 0), just go to product page
      navigate(`/product/${product._id}`)
      return
    }

    try {
      await axios.post('/api/cart/add', { 
        productId: product._id, 
        quantity: 1, 
        size: firstSize 
      }, { withCredentials: true })
      
      // Remove from wishlist after moving to bag
      await axios.delete(`/api/user/wishlist/${product._id}`, { withCredentials: true })
      
      window.dispatchEvent(new Event('cartUpdated'))
      window.dispatchEvent(new Event('wishlistUpdated'))
      navigate('/cart')
    } catch (err) {
      console.error(err)
      // On error (e.g. not logged in), navigate to product page as fallback
      navigate(`/product/${product._id}`)
    }
  }

  if (loading) return (
    <div style={{ background: 'var(--background)', minHeight: '100vh' }}>
      <BuyerNavbar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
        <p style={{ color: 'var(--text-grey)', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '1px' }}>SYNCHRONIZING YOUR WISHLIST...</p>
      </div>
    </div>
  )

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      <BuyerNavbar />

      <div style={{ maxWidth: '1000px', margin: '60px auto', padding: '0 40px' }}>
        <div style={{ background: 'white', borderRadius: '32px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-soft)', overflow: 'hidden' }}>
          <div style={{ padding: '30px 40px', borderBottom: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.5px' }}>My Wishlist ({wishlist.length})</h2>
            {wishlist.length > 0 && <button onClick={() => navigate('/buyer')} style={{ background: 'var(--border-soft)', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>CONTINUE SHOPPING</button>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {wishlist.map(item => (
              <div key={item._id} style={{ display: 'flex', gap: '32px', padding: '32px 40px', borderBottom: '1px solid #F3F4F6', position: 'relative', transition: 'background 0.3s' }} className="wishlist-item-row">
                <button 
                  style={{ position: 'absolute', right: '40px', top: '32px', background: '#F9FAFB', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', color: '#9CA3AF' }} 
                  onClick={() => handleRemove(item._id)}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#EF4444' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#9CA3AF' }}
                >
                  <FaTrash size={12} />
                </button>
                
                <div 
                  style={{ width: '150px', height: '180px', background: 'transparent', borderRadius: '16px', overflow: 'hidden', border: 'none', cursor: 'pointer' }}
                  onClick={() => navigate(`/product/${item._id}`)}
                >
                  <img src={item.images?.[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: item.totalStock === 0 ? 0.6 : 1 }} />
                </div>

                <div style={{ flex: 1, paddingRight: '40px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-grey)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '6px' }}>{item.category}</div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800, marginBottom: '8px', cursor: 'pointer', fontFamily: "'Sora', sans-serif" }} onClick={() => navigate(`/product/${item._id}`)}>
                    {item.name}
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ background: 'var(--primary)', color: 'white', fontSize: '0.6rem', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', letterSpacing: '1px' }}>ELITE QC PASS</div>
                    {item.totalStock === 0 && <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 800 }}>SOLD OUT</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: 'auto' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>₹{item.price.toLocaleString()}</span>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-grey)', textDecoration: 'line-through', fontWeight: 600 }}>₹{item.originalPrice.toLocaleString()}</span>
                    )}
                  </div>

                  <button 
                    className="btn-primary" 
                    style={{ marginTop: '20px', padding: '12px 24px', borderRadius: '10px', alignSelf: 'flex-start', fontSize: '0.8rem' }}
                    onClick={() => item.totalStock === 0 ? navigate(`/product/${item._id}`) : handleMoveToBag(item)}
                  >
                    {item.totalStock === 0 ? 'VIEW DETAILS' : 'MOVE TO BAG'}
                  </button>
                </div>

              </div>
            ))}

            {wishlist.length === 0 && !loading && (
               <div style={{ padding: '80px 48px', textAlign: 'center' }}>
                 <div style={{ background: '#F9FAFB', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <FaRegHeart size={42} color="#D1D5DB" />
                 </div>
                 <h3 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px' }}>Your wishlist is empty</h3>
                 <p style={{ color: '#9CA3AF', marginBottom: '32px' }}>Explore our collection and save your favorite pieces here.</p>
                 <button className="btn-primary" style={{ padding: '16px 48px', borderRadius: '16px' }} onClick={() => navigate('/buyer')}>Start Exploring</button>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
