import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FaStar,
  FaArrowLeft,
  FaShieldAlt,
  FaTruck,
  FaUndo,
  FaHeart,
  FaRegHeart,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa'
import BuyerNavbar from '../../components/BuyerNavbar'
import RecommendationRow from '../../components/RecommendationRow'
import { useProduct } from '../../hooks/useCatalogue'
import { useWishlistIds, useToggleWishlist } from '../../hooks/useWishlist'
import { useAddToCart } from '../../hooks/useCart'
import { useToast } from '../../components/Toast'

// The page-local Toast component that used to live here has been promoted into
// the shared ToastProvider, so every page raises notifications the same way.

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [selectedImg, setSelectedImg] = useState(0)
  const [selectedSize, setSelectedSize] = useState(null)
  const [quantity, setQuantity] = useState(1)

  const { data: product, isPending: loading } = useProduct(id)

  const wishlistIds = useWishlistIds()
  const isWished = wishlistIds.includes(id)
  const toggleWishlistMutation = useToggleWishlist()
  const addToCartMutation = useAddToCart()
  const addingToCart = addToCartMutation.isPending

  // Default to the first size that is actually in stock, once the product
  // arrives (or changes, when navigating between products).
  useEffect(() => {
    if (!product) return
    const firstInStock = product.sizes?.find((s) => s.stock > 0)
    setSelectedSize(firstInStock ? firstInStock.size : null)
    setSelectedImg(0)
    setQuantity(1)
  }, [product])

  const toggleWishlist = () => toggleWishlistMutation.mutate(product || { _id: id })

  // Both buttons share the same guard: no size chosen, or the chosen size is
  // sold out.
  const cartGuard = () => {
    if (!selectedSize) {
      toast.error('Please select a size first')
      return false
    }
    const sizeStock = product.sizes.find((s) => s.size === selectedSize)?.stock || 0
    if (sizeStock === 0) {
      toast.error(`Size ${selectedSize} is out of stock`)
      return false
    }
    return true
  }

  const handleAddToCart = () => {
    if (!cartGuard()) return
    addToCartMutation.mutate({ productId: id, quantity, size: selectedSize })
  }

  const handleBuyNow = () => {
    if (!cartGuard()) return
    addToCartMutation.mutate(
      { productId: id, quantity, size: selectedSize },
      { onSuccess: () => navigate('/checkout') }
    )
  }

  // Cap quantity at selected size stock
  const selectedSizeStock = selectedSize
    ? product?.sizes?.find((s) => s.size === selectedSize)?.stock || 0
    : 0

  if (loading)
    return (
      <div style={{ background: 'var(--background)', minHeight: '100vh' }}>
        <BuyerNavbar />
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '48px 40px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '48px',
          }}
        >
          <div className="skeleton" style={{ height: 520, borderRadius: 24 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="skeleton" style={{ height: 14, width: '25%' }} />
            <div className="skeleton" style={{ height: 40, width: '80%' }} />
            <div className="skeleton" style={{ height: 30, width: '40%' }} />
            <div className="skeleton" style={{ height: 90, width: '100%' }} />
            <div className="skeleton" style={{ height: 54, width: '100%', borderRadius: 14 }} />
          </div>
        </div>
      </div>
    )

  if (!product)
    return <div style={{ textAlign: 'center', padding: '80px' }}>Product not found.</div>

  const totalStock = product.sizes.reduce((acc, s) => acc + s.stock, 0)

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', paddingBottom: '80px' }}>
      <BuyerNavbar />

      {/* Breadcrumb Nav */}
      <div
        style={{
          padding: '30px 40px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.75rem',
        }}
      >
        <button
          onClick={() => navigate('/buyer')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-grey)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
          }}
        >
          <FaArrowLeft size={9} /> STORE
        </button>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span
          style={{
            color: 'var(--text-grey)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            fontSize: '0.7rem',
            fontWeight: 800,
          }}
        >
          {product.category}
        </span>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span
          style={{
            fontWeight: 800,
            color: 'var(--text-main)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            fontSize: '0.75rem',
          }}
        >
          {product.name}
        </span>
      </div>

      <div
        style={{
          maxWidth: '1300px',
          margin: '20px auto',
          padding: '0 40px',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '40px',
        }}
      >
        {/* Left: Image Gallery */}
        <div>
          <div
            style={{
              position: 'relative',
              marginBottom: '20px',
              borderRadius: '24px',
              overflow: 'hidden',
              background: 'transparent',
              height: '400px',
              border: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                zIndex: 10,
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '44px',
                height: '44px',
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              onClick={toggleWishlist}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isWished ? (
                <FaHeart color="#000" size={18} />
              ) : (
                <FaRegHeart color="#111827" size={18} />
              )}
            </div>

            {product.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImg((prev) => (prev === 0 ? product.images.length - 1 : prev - 1))
                  }}
                  style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    background: 'rgba(255,255,255,0.8)',
                    border: 'none',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                >
                  <FaChevronLeft />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImg((prev) => (prev === product.images.length - 1 ? 0 : prev + 1))
                  }}
                  style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                    background: 'rgba(255,255,255,0.8)',
                    border: 'none',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                >
                  <FaChevronRight />
                </button>
              </>
            )}

            {totalStock === 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    background: '#000',
                    color: 'white',
                    padding: '12px 32px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  }}
                >
                  Sold Out
                </span>
              </div>
            )}

            <img
              src={product.images[selectedImg] || 'https://via.placeholder.com/1000?text=No+Image'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              alt={product.name}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/1000?text=Error'
              }}
            />
          </div>

          {product.images.length > 1 && (
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '12px' }}>
              {product.images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedImg(i)}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: i === selectedImg ? '2.5px solid #000' : '2.5px solid transparent',
                    transition: 'all 0.3s',
                    flexShrink: 0,
                  }}
                >
                  <img src={img} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div style={{ paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-grey)',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
              }}
            >
              {product.category}
            </span>
            <span style={{ color: 'var(--border)' }}>•</span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#FEF3C7',
                padding: '5px 10px',
                borderRadius: '8px',
              }}
            >
              <FaStar color="#D97706" size={10} />
              <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#92400E' }}>
                {product.rating || '4.5'}
              </span>
              <span style={{ color: '#B45309', fontSize: '0.75rem', fontWeight: 600 }}>
                (248 Reviews)
              </span>
            </div>
          </div>

          <h1
            style={{
              fontSize: '1.7rem',
              fontWeight: 800,
              fontFamily: "'Sora', sans-serif",
              letterSpacing: '-0.8px',
              lineHeight: 1.1,
              marginBottom: '10px',
              color: 'var(--text-main)',
            }}
          >
            {product.name}
          </h1>

          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              marginBottom: '32px',
              fontWeight: 600,
            }}
          >
            Sold by{' '}
            <strong style={{ color: 'var(--text-main)', fontWeight: 800 }}>
              {product.seller?.businessName || 'Elite Merchant'}
            </strong>
          </div>

          <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                fontSize: '1.8rem',
                fontWeight: 900,
                color: 'var(--text-main)',
                letterSpacing: '-1px',
                fontFamily: "'Sora', sans-serif",
              }}
            >
              ₹{product.price.toLocaleString()}
            </div>
            <div
              style={{
                background: '#ECFDF5',
                color: '#059669',
                padding: '6px 12px',
                borderRadius: '10px',
                fontSize: '0.7rem',
                fontWeight: 800,
                border: '1px solid #D1FAE5',
              }}
            >
              FREE DELIVERY
            </div>
          </div>

          {/* Size Selector */}
          <div style={{ marginBottom: '32px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1.2px',
                  color: 'var(--text-main)',
                }}
              >
                Available Sizes
              </span>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-grey)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  borderBottom: '1.5px solid var(--border-soft)',
                }}
              >
                SIZING DETAILS
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                gap: '10px',
              }}
            >
              {product.sizes.map((s) => (
                <button
                  key={s.size}
                  onClick={() => s.stock > 0 && setSelectedSize(s.size)}
                  disabled={s.stock === 0}
                  style={{
                    height: '48px',
                    borderRadius: '12px',
                    border: '1.5px solid',
                    borderColor: selectedSize === s.size ? 'var(--primary)' : 'var(--border-soft)',
                    background: selectedSize === s.size ? 'var(--primary)' : 'white',
                    color:
                      selectedSize === s.size
                        ? 'white'
                        : s.stock === 0
                          ? '#D1D5DB'
                          : 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: s.stock === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                >
                  {s.size}
                  {s.stock > 0 && s.stock <= 5 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#EF4444',
                        color: 'white',
                        fontSize: '8px',
                        padding: '3px 6px',
                        borderRadius: '20px',
                        fontWeight: 900,
                        border: '1.5px solid white',
                      }}
                    >
                      LOW
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || totalStock === 0}
                className="btn-outline"
                style={{
                  padding: '18px',
                  borderRadius: '16px',
                  fontSize: '0.95rem',
                  width: '100%',
                  borderWidth: '1.5px',
                  background: 'white',
                }}
              >
                {addingToCart ? 'ADDING...' : 'ADD TO BAG'}
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1.5px solid var(--border-soft)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: 'white',
                }}
              >
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    flex: 1,
                    height: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '1rem',
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    width: '40px',
                    textAlign: 'center',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                  }}
                >
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(selectedSizeStock || 1, quantity + 1))}
                  style={{
                    flex: 1,
                    height: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '1rem',
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleBuyNow}
              disabled={totalStock === 0}
              className="btn-primary"
              style={{
                padding: '18px',
                borderRadius: '16px',
                fontSize: '0.95rem',
                width: '100%',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              }}
            >
              PURCHASE NOW
            </button>
          </div>

          {/* Value Props */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '32px',
              padding: '40px 0',
              borderTop: '1px solid var(--border-soft)',
              marginBottom: '40px',
            }}
          >
            {[
              { icon: <FaShieldAlt size={22} />, title: 'Genuine Product', sub: 'Verified' },
              { icon: <FaTruck size={22} />, title: 'Fast Delivery', sub: 'Express' },
              { icon: <FaUndo size={22} />, title: 'Returns', sub: '30-Day' },
            ].map((b, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    color: 'var(--text-main)',
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  {b.icon}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {b.title}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-grey)',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}
                >
                  {b.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '32px' }}>
            <h3
              style={{
                fontSize: '0.75rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: '16px',
                color: 'var(--text-main)',
              }}
            >
              Description & Maintenance
            </h3>
            <p
              style={{
                color: 'var(--text-muted)',
                lineHeight: 1.8,
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {product.description}
            </p>
          </div>
        </div>
      </div>

      <RecommendationRow
        title="You may also like"
        endpoint={`/api/products/${id}/similar`}
        k={10}
      />
    </div>
  )
}
