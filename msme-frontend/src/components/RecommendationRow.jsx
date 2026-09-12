import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FaStore } from 'react-icons/fa'

const CardSkeleton = () => (
  <div
    style={{
      minWidth: '220px',
      borderRadius: '20px',
      overflow: 'hidden',
      border: '1px solid #F3F4F6',
      background: '#fff',
    }}
  >
    <div className="skeleton" style={{ height: '200px', width: '100%', borderRadius: 0 }} />
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div className="skeleton" style={{ height: '10px', width: '40%' }} />
      <div className="skeleton" style={{ height: '16px', width: '85%' }} />
      <div className="skeleton" style={{ height: '18px', width: '50%' }} />
    </div>
  </div>
)

/**
 * A horizontal strip of recommended products.
 *
 * Recommendations are an enhancement, never load-bearing: if the request
 * fails or comes back empty the row renders nothing at all rather than
 * showing an error the shopper cannot act on.
 */
export default function RecommendationRow({ title, endpoint, k = 10 }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setFailed(false)
      try {
        const { data } = await axios.get(endpoint, {
          params: { k },
          withCredentials: true,
        })
        if (cancelled) return
        setProducts(Array.isArray(data?.data) ? data.data : [])
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [endpoint, k])

  // Hide the row entirely on failure or when there is nothing to show.
  if (failed) return null
  if (!loading && products.length === 0) return null

  return (
    <section style={{ padding: '48px 40px 0' }}>
      <h2
        style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          fontFamily: "'Sora', sans-serif",
          color: '#09090B',
          marginBottom: '24px',
          letterSpacing: '-0.5px',
        }}
      >
        {title}
      </h2>

      <div
        style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          paddingBottom: '12px',
          scrollbarWidth: 'thin',
        }}
      >
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
          : products.map((p) => (
              <div
                key={p._id}
                onClick={() => navigate(`/product/${p._id}`)}
                style={{
                  minWidth: '220px',
                  maxWidth: '220px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: '1px solid #F3F4F6',
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)'
                  e.currentTarget.style.boxShadow = '0 16px 32px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ height: '200px', overflow: 'hidden' }}>
                  <img
                    src={p.images?.[0] || 'https://via.placeholder.com/400?text=No+Image'}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400?text=No+Image'
                    }}
                  />
                </div>
                <div style={{ padding: '16px' }}>
                  <div
                    style={{
                      color: '#71717A',
                      fontSize: '0.6rem',
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
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      margin: '0 0 6px',
                      lineHeight: 1.3,
                      color: '#09090B',
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {p.name}
                  </h4>
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: 'var(--secondary)',
                      fontWeight: 700,
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <FaStore size={9} /> {p.seller?.businessName || 'MSME Merchant'}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#09090B' }}>
                    ₹{Number(p.price || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
      </div>
    </section>
  )
}
