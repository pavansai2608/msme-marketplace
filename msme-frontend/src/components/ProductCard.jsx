import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaStar, FaHeart, FaRegHeart, FaStore } from 'react-icons/fa'

const PLACEHOLDER = 'https://via.placeholder.com/400?text=No+Image'

export default function ProductCard({ p, wishlistIds = [], onToggleWishlist }) {
  const navigate = useNavigate()
  const [currentImg, setCurrentImg] = useState(0)
  const [hovered, setHovered] = useState(false)
  const timerRef = useRef(null)

  const images = Array.isArray(p.images) && p.images.length ? p.images : [PLACEHOLDER]
  const hasCarousel = images.length > 1

  // The carousel advances while the card is hovered. Cycling every card on the
  // page unprompted would be noise (and 200 simultaneous timers); tying it to
  // hover means exactly one runs at a time.
  useEffect(() => {
    if (!hovered || !hasCarousel) return undefined

    timerRef.current = setInterval(() => {
      setCurrentImg((i) => (i + 1) % images.length)
    }, 1100)

    return () => clearInterval(timerRef.current)
  }, [hovered, hasCarousel, images.length])

  // Back to the hero shot once the pointer leaves, so the grid looks settled.
  useEffect(() => {
    if (!hovered) setCurrentImg(0)
  }, [hovered])

  const wishlisted = wishlistIds.includes(p._id)

  return (
    <div
      className="product-card-premium"
      data-testid="product-card"
      data-product-id={p._id}
      onClick={() => navigate(`/product/${p._id}`)}
      style={{
        padding: 0,
        background: '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        borderRadius: '24px',
        border: '1px solid #F3F4F6',
        height: '100%',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={(e) => {
        setHovered(true)
        e.currentTarget.style.transform = 'translateY(-8px)'
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.08)'
        e.currentTarget.style.borderColor = '#000'
      }}
      onMouseLeave={(e) => {
        setHovered(false)
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = '#F3F4F6'
      }}
    >
      <button
        type="button"
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        onClick={(e) => {
          e.stopPropagation()
          onToggleWishlist?.(p)
        }}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 10,
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.85)',
          border: 'none',
          borderRadius: '50%',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {wishlisted ? <FaHeart color="#000" size={16} /> : <FaRegHeart color="#9CA3AF" size={16} />}
      </button>

      <div
        style={{
          height: '340px',
          background: 'transparent',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={images[currentImg] || PLACEHOLDER}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.35s ease',
          }}
          alt={`${p.name}${hasCarousel ? ` (${currentImg + 1} of ${images.length})` : ''}`}
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/400?text=Image+Load+Error'
          }}
        />

        {hasCarousel && (
          <div
            style={{
              position: 'absolute',
              bottom: '14px',
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: '6px',
              zIndex: 3,
            }}
          >
            {images.map((src, i) => (
              <span
                key={`${src}-${i}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentImg(i)
                }}
                style={{
                  width: i === currentImg ? '18px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: i === currentImg ? '#111' : 'rgba(17,17,17,0.3)',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>
        )}

        {p.totalStock === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(4px)',
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
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.65rem',
                letterSpacing: '2px',
              }}
            >
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            color: '#71717A',
            fontSize: '0.65rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            marginBottom: '6px',
          }}
        >
          {p.category}
        </div>
        <h4
          style={{
            fontSize: '1rem',
            fontWeight: 800,
            marginBottom: '4px',
            lineHeight: 1.3,
            color: '#09090B',
            fontFamily: "'Sora', sans-serif",
          }}
        >
          {p.name}
        </h4>
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--secondary)',
            fontWeight: 700,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <FaStore size={10} /> {p.seller?.businessName || 'MSME Merchant'}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'auto',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 900,
                color: '#09090B',
                letterSpacing: '-0.5px',
              }}
            >
              ₹{p.price?.toLocaleString() ?? '—'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
              <FaStar color="#111111" size={10} />
              <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#09090B' }}>
                {p.rating || '4.8'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
