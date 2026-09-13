import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaChevronLeft, FaChevronRight, FaShoppingBag, FaStore } from 'react-icons/fa'
import BuyerNavbar from '../../components/BuyerNavbar'
import RecommendationRow from '../../components/RecommendationRow'
import ProductGrid, { VIRTUALISE_ABOVE } from '../../components/ProductGrid'
import { ProductGridSkeleton } from '../../components/Skeletons'
import { useProducts } from '../../hooks/useCatalogue'
import { useWishlistIds, useToggleWishlist } from '../../hooks/useWishlist'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'

export default function BuyerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  // The catalogue is cached by React Query, keyed on the filters. The old
  // localStorage copy is gone: it went stale silently, could not be
  // invalidated, and showed a signed-out visitor whatever the last signed-in
  // user had browsed.
  const {
    data: products = [],
    isPending,
    isError,
    error,
    refetch,
  } = useProducts({
    search,
    category,
  })

  const wishlistIds = useWishlistIds()
  const toggleWishlist = useToggleWishlist()

  const handleToggleWishlist = (product) => {
    if (!user) {
      toast.info('Sign in to save items to your wishlist')
      return
    }
    toggleWishlist.mutate(product)
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    fontFamily: "'Sora', sans-serif",
                    letterSpacing: '-0.5px',
                  }}
                >
                  Featured Boutique Gems
                </h3>
                <p
                  style={{
                    color: '#71717A',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    marginTop: '4px',
                  }}
                >
                  Handpicked treasures from local MSME hubs
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    document
                      .getElementById('featured-scroll')
                      .scrollBy({ left: -400, behavior: 'smooth' })
                  }}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '1px solid #E2E8F0',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <FaChevronLeft />
                </button>
                <button
                  onClick={() => {
                    document
                      .getElementById('featured-scroll')
                      .scrollBy({ left: 400, behavior: 'smooth' })
                  }}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '1px solid #E2E8F0',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <FaChevronRight />
                </button>
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
                scrollSnapType: 'x mandatory',
              }}
            >
              {products.slice(0, 8).map((p) => (
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
                    boxShadow: '0 20px 50px rgba(79, 70, 229, 0.25)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(0.985)'
                    e.currentTarget.style.boxShadow = '0 30px 70px rgba(79, 70, 229, 0.35)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 20px 50px rgba(79, 70, 229, 0.25)'
                  }}
                >
                  {/* Decorative Background */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-100px',
                      right: '-100px',
                      width: '300px',
                      height: '300px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '50%',
                    }}
                  ></div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-50px',
                      left: '-50px',
                      width: '200px',
                      height: '200px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '50%',
                    }}
                  ></div>

                  <div
                    style={{
                      padding: '48px',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '32px',
                      position: 'relative',
                      zIndex: 2,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2
                        style={{
                          color: 'white',
                          fontSize: '1.8rem',
                          fontWeight: 900,
                          margin: '0 0 12px',
                          letterSpacing: '-0.5px',
                          lineHeight: 1.2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {p.name}
                      </h2>
                      <div
                        style={{
                          color: '#EAB308',
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <FaStore size={14} /> {p.seller?.businessName || 'Authentic MSME'}
                      </div>
                      <p
                        style={{
                          color: '#A1A1AA',
                          fontSize: '0.9rem',
                          marginBottom: '24px',
                          fontWeight: 500,
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {p.description}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ color: 'white', fontSize: '1.75rem', fontWeight: 900 }}>
                          ₹{p.price.toLocaleString()}
                        </div>
                        <div
                          style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            background: '#3F3F46',
                          }}
                        ></div>
                        <div style={{ color: '#A1A1AA', fontSize: '0.85rem', fontWeight: 700 }}>
                          Exclusive Collection
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        width: '220px',
                        height: '220px',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px',
                      }}
                    >
                      <img
                        src={p.images[0]}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        alt={p.name}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '40px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: '#09090B',
                letterSpacing: '-1.5px',
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {category === 'All'
                ? search
                  ? `Results for "${search}"`
                  : "Today's Essentials"
                : category}
            </h2>
            {!isPending && !isError && (
              <p
                style={{ color: '#52525B', fontSize: '0.9rem', marginTop: '8px', fontWeight: 500 }}
              >
                Showing {products.length} exquisite pieces found for you
                {products.length > VIRTUALISE_ABOVE && ' · scroll the grid for more'}
              </p>
            )}
          </div>
        </div>

        {isPending ? (
          <ProductGridSkeleton count={8} />
        ) : isError ? (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 40px',
              background: 'white',
              borderRadius: '32px',
              border: '1px solid #FECACA',
            }}
          >
            <h3
              style={{
                fontSize: '1.25rem',
                color: '#111827',
                marginBottom: '8px',
                fontWeight: 800,
              }}
            >
              The catalogue could not be loaded
            </h3>
            <p
              style={{
                color: '#6B7280',
                fontSize: '0.85rem',
                marginBottom: '24px',
                fontWeight: 500,
              }}
            >
              {error?.response?.data?.message || error?.message || 'Please try again.'}
            </p>
            <button
              className="btn-primary"
              style={{ padding: '14px 36px', borderRadius: '12px', fontSize: '0.85rem' }}
              onClick={() => refetch()}
            >
              Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 40px',
              background: 'white',
              borderRadius: '32px',
              border: '1px solid #F3F4F6',
            }}
          >
            <div
              style={{
                background: '#F9FAFB',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <FaShoppingBag size={32} color="#D1D5DB" />
            </div>
            <h3
              style={{ fontSize: '1.5rem', color: '#111827', marginBottom: '8px', fontWeight: 800 }}
            >
              No treasures found
            </h3>
            <p
              style={{
                color: '#6B7280',
                fontSize: '0.85rem',
                marginBottom: '24px',
                fontWeight: 500,
              }}
            >
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <button
              className="btn-primary"
              style={{ padding: '14px 36px', borderRadius: '12px', fontSize: '0.85rem' }}
              onClick={() => {
                setCategory('All')
                setSearch('')
              }}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <ProductGrid
            products={products}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        <RecommendationRow
          title="Recommended for you"
          endpoint="/api/products/recommended"
          k={10}
        />
      </main>
    </div>
  )
}
