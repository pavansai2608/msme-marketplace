import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import axios from 'axios'
import {
  FaSearch, FaShoppingCart, FaUserCircle, FaBars, FaChevronLeft, FaChevronRight,
  FaMapMarkerAlt, FaStar, FaShoppingBag, FaTimes, FaExchangeAlt, FaHeart, FaRegHeart, FaStore
} from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import BuyerNavbar from '../../components/BuyerNavbar'

const ProductCard = ({ p, handleAddToCart, wishlistIds = [], toggleWishlist }) => {
  const [currentImg, setCurrentImg] = useState(0)
  const navigate = useNavigate()

  return (
    <div
      className="product-card-premium"
      onClick={() => navigate(`/product/${p._id}`)}
      style={{ 
        padding: '0', 
        background: '#ffffff', 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column', 
        cursor: 'pointer', 
        position: 'relative',
        borderRadius: '24px',
        border: '1px solid #F3F4F6',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-8px)'
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)'
        e.currentTarget.style.borderColor = '#000'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = '#F3F4F6'
      }}
    >
      <div
        onClick={(e) => { e.stopPropagation(); toggleWishlist(p._id) }}
        style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '20px', 
          zIndex: 10, 
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {wishlistIds.includes(p._id) ? <FaHeart color="#000" size={18} /> : <FaRegHeart color="#9CA3AF" size={18} />}
      </div>
      
      <div style={{ height: '340px', background: 'transparent', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}>
        <img
          src={p.images[currentImg] || 'https://via.placeholder.com/400?text=No+Image'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          alt={p.name}
          onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=Image+Load+Error' }}
        />

        {p.totalStock === 0 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <span style={{ background: '#000', color: 'white', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '2px' }}>SOLD OUT</span>
          </div>
        )}
      </div>

      <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: '#71717A', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '6px' }}>{p.category}</div>
        <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '4px', lineHeight: 1.3, color: '#09090B', fontFamily: "'Sora', sans-serif" }}>{p.name}</h4>
        <div style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <FaStore size={10} /> {p.seller?.businessName || 'MSME Merchant'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#09090B', letterSpacing: '-0.5px' }}>₹{p.price.toLocaleString()}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
              <FaStar color="#111111" size={10} />
              <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#09090B' }}>{p.rating || '4.8'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const ProductSkeleton = () => (
  <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', border: '1px solid #F3F4F6' }}>
    <div className="skeleton" style={{ height: '340px', width: '100%', borderRadius: 0 }}></div>
    <div style={{ padding: '28px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="skeleton" style={{ height: '10px', width: '30%' }}></div>
      <div className="skeleton" style={{ height: '24px', width: '80%' }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div className="skeleton" style={{ height: '32px', width: '40%' }}></div>
        <div className="skeleton" style={{ height: '48px', width: '48px', borderRadius: '16px' }}></div>
      </div>
    </div>
  </div>
)

export default function BuyerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  // Initialize from cache for "instant" feel
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_buyer_products')
      return cached ? JSON.parse(cached) : []
    } catch { return [] }
  })
  
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(products.length === 0)
  const [category, setCategory] = useState('All')
  const [wishlistIds, setWishlistIds] = useState([])

  useEffect(() => {
    fetchProducts()
    fetchWishlist()
    // Listen for global wishlist updates
    const handleWishlistUpdate = () => fetchWishlist()
    window.addEventListener('wishlistUpdated', handleWishlistUpdate)
    return () => window.removeEventListener('wishlistUpdated', handleWishlistUpdate)
  }, [search, category])

  const requestCounter = useRef(0)

  const fetchProducts = async () => {
    const requestId = ++requestCounter.current
    if (products.length === 0) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (category && category !== 'All') params.append('category', category)
      
      const { data } = await axios.get(`/api/products?${params.toString()}`)

      
      if (requestId === requestCounter.current) {
        const fetchedProducts = data.data || []
        setProducts(fetchedProducts)
        setLoading(false)
        
        if (!search && category === 'All' && fetchedProducts.length > 0) {
          localStorage.setItem('cached_buyer_products', JSON.stringify(fetchedProducts))
        }
      }
    } catch (err) { 
      console.error("[Dashboard] Fetch Error:", err)
      if (requestId === requestCounter.current) {
        setLoading(false)
      }
    }
  }

  const handleAddToCart = async (productId, size) => {
    try {
      await axios.post('/api/cart/add', { productId, quantity: 1, size }, { withCredentials: true })
      window.dispatchEvent(new Event('cartUpdated'))
    } catch (err) { alert('Sign in to start shopping') }
  }

  const fetchWishlist = async () => {
    try {
      if (!user) return
      const { data } = await axios.get('/api/user/wishlist', { withCredentials: true })
      setWishlistIds(data.data.map(i => i._id))
    } catch (err) { console.error(err) }
  }

  const toggleWishlist = async (productId) => {
    try {
      if (!user) return alert('Please sign in to add to wishlist')
      await axios.post('/api/user/wishlist/toggle', { productId }, { withCredentials: true })
      
      // Update local state immediately for snappy feel
      setWishlistIds(prev =>
        prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
      )
      
      // Dispatch event so other components (like navbar) can update if needed
      window.dispatchEvent(new Event('wishlistUpdated'))
    } catch (err) {
      console.error(err)
      alert('Could not update wishlist. Please try again.')
    }
  }

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh' }}>
      <BuyerNavbar
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        currentSearch={search}
        currentCategory={category}
        user={user}
      />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 40px 60px' }}>
        
        {/* Horizontal Scroll Banners / Featured Products */}
        {!search && category === 'All' && products.length > 0 && (
          <section style={{ padding: '40px 0 60px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
               <div>
                 <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.5px' }}>Featured Boutique Gems</h3>
                 <p style={{ color: '#71717A', fontSize: '0.85rem', fontWeight: 500, marginTop: '4px' }}>Handpicked treasures from local MSME hubs</p>
               </div>
               <div style={{ display: 'flex', gap: '8px' }}>
                 <button onClick={() => { document.getElementById('featured-scroll').scrollBy({ left: -400, behavior: 'smooth' }) }} 
                   style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid #E2E8F0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FaChevronLeft /></button>
                 <button onClick={() => { document.getElementById('featured-scroll').scrollBy({ left: 400, behavior: 'smooth' }) }}
                   style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid #E2E8F0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><FaChevronRight /></button>
               </div>
             </div>

             <div 
               id="featured-scroll"
               style={{ 
                 display: 'flex', 
                 gap: '24px', 
                 overflowX: 'auto', 
                 paddingBottom: '20px', 
                 scrollbarWidth: 'none',
                 msOverflowStyle: 'none',
                 scrollSnapType: 'x mandatory'
               }}
             >
               {products.slice(0, 8).map(p => (
                 <div 
                   key={`featured-${p._id}`}
                   onClick={() => navigate(`/product/${p._id}`, { state: { product: p } })}
                   style={{ 
                     minWidth: '600px', 
                     height: '360px', 
                     borderRadius: '40px', 
                     background: 'var(--premium-gradient)',
                     position: 'relative',
                     overflow: 'hidden',
                     cursor: 'pointer',
                     scrollSnapAlign: 'start',
                     transition: 'var(--transition)',
                     boxShadow: '0 20px 50px rgba(79, 70, 229, 0.25)'
                   }}
                   onMouseEnter={e => {
                     e.currentTarget.style.transform = 'scale(0.985)'
                     e.currentTarget.style.boxShadow = '0 30px 70px rgba(79, 70, 229, 0.35)'
                   }}
                   onMouseLeave={e => {
                     e.currentTarget.style.transform = 'scale(1)'
                     e.currentTarget.style.boxShadow = '0 20px 50px rgba(79, 70, 229, 0.25)'
                   }}
                 >
                    {/* Decorative Background */}
                    <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }}></div>
                    <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }}></div>

                    <div style={{ padding: '48px', height: '100%', display: 'flex', alignItems: 'center', gap: '32px', position: 'relative', zIndex: 2 }}>
                       <div style={{ flex: 1, minWidth: 0 }}>
                          <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.5px', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</h2>
                          <div style={{ color: '#EAB308', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <FaStore size={14} /> {p.seller?.businessName || 'Authentic MSME'}
                          </div>
                          <p style={{ color: '#A1A1AA', fontSize: '0.9rem', marginBottom: '24px', fontWeight: 500, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                             <div style={{ color: 'white', fontSize: '1.75rem', fontWeight: 900 }}>₹{p.price.toLocaleString()}</div>
                             <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3F3F46' }}></div>
                             <div style={{ color: '#A1A1AA', fontSize: '0.85rem', fontWeight: 700 }}>Exclusive Collection</div>
                          </div>
                       </div>
                       <div style={{ width: '220px', height: '220px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
                          <img src={p.images[0]} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt={p.name} />
                       </div>
                    </div>
                 </div>
               ))}
             </div>
          </section>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#09090B', letterSpacing: '-1.5px', fontFamily: "'Sora', sans-serif" }}>
              {category === 'All' ? (search ? `Results for "${search}"` : 'Today\'s Essentials') : category}
            </h2>
            {(!loading || products.length > 0) && (
              <p style={{ color: '#52525B', fontSize: '0.9rem', marginTop: '8px', fontWeight: 500 }}>
                Showing {products.length} exquisite pieces found for you
              </p>
            )}
          </div>
        </div>


        {loading && products.length === 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <ProductSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: 'white', borderRadius: '32px', border: '1px solid #F3F4F6' }}>
            <div style={{ background: '#F9FAFB', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <FaShoppingBag size={32} color="#D1D5DB" />
            </div>
            <h3 style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px', fontWeight: 800 }}>No treasures found</h3>
            <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '24px', fontWeight: 500 }}>Try adjusting your search or filters to find what you're looking for.</p>
            <button className="btn-primary" style={{ padding: '14px 36px', borderRadius: '12px', fontSize: '0.85rem' }} onClick={() => { setCategory('All'); setSearch(''); }}>Clear All Filters</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            {products.map(p => (
              <ProductCard 
                key={p._id} 
                p={p}
                handleAddToCart={handleAddToCart} 
                wishlistIds={wishlistIds} 
                toggleWishlist={toggleWishlist} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
