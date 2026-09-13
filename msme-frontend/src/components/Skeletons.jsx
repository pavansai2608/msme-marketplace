/**
 * Route-level loading placeholders.
 *
 * These are shaped like the page that is coming, not like a spinner: the
 * layout does not jump when the real content replaces them, and the user can
 * see what is about to arrive.
 */

const Bar = ({ w = '100%', h = 14, r = 8, style }) => (
  <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />
)

export function ProductCardSkeleton() {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid #F3F4F6',
      }}
    >
      <Bar w="100%" h={340} r={0} />
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Bar w="30%" h={10} />
        <Bar w="80%" h={20} />
        <Bar w="45%" h={12} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Bar w="40%" h={26} />
          <Bar w={44} h={44} r={14} />
        </div>
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** The fallback for a lazily-loaded buyer page. */
export function BuyerPageSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <div
        style={{
          height: '72px',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          padding: '0 40px',
          background: '#fff',
        }}
      >
        <Bar w={130} h={22} />
        <Bar w="34%" h={38} r={12} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px' }}>
          <Bar w={88} h={26} />
          <Bar w={52} h={26} />
        </div>
      </div>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px' }}>
        <Bar w="26%" h={34} style={{ marginBottom: '12px' }} />
        <Bar w="38%" h={14} style={{ marginBottom: '40px' }} />
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  )
}

/** The fallback for the seller workspace: sidebar, stat cards, chart. */
export function SellerPageSkeleton() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <div
        style={{
          width: '260px',
          borderRight: '1px solid #F3F4F6',
          padding: '32px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: '#fff',
        }}
      >
        <Bar w="70%" h={26} style={{ marginBottom: '24px' }} />
        {Array.from({ length: 5 }, (_, i) => (
          <Bar key={i} w="100%" h={40} r={12} />
        ))}
      </div>
      <div style={{ flex: 1, padding: '40px' }}>
        <Bar w="30%" h={32} style={{ marginBottom: '32px' }} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '18px',
            marginBottom: '32px',
          }}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <Bar key={i} w="100%" h={128} r={18} />
          ))}
        </div>
        <Bar w="100%" h={320} r={20} />
      </div>
    </div>
  )
}

/** The fallback for the admin dashboard: stat cards over a table. */
export function AdminPageSkeleton() {
  return (
    <div style={{ padding: '40px', maxWidth: '1280px', margin: '0 auto' }}>
      <Bar w="34%" h={38} style={{ marginBottom: '10px' }} />
      <Bar w="24%" h={14} style={{ marginBottom: '36px' }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '18px',
          marginBottom: '36px',
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <Bar key={i} w="100%" h={126} r={18} />
        ))}
      </div>
      <Bar w={260} h={42} r={12} style={{ marginBottom: '18px' }} />
      <div style={{ background: '#fff', borderRadius: '20px', padding: '28px' }}>
        {Array.from({ length: 8 }, (_, i) => (
          <Bar key={i} w="100%" h={44} r={10} style={{ marginBottom: '12px' }} />
        ))}
      </div>
    </div>
  )
}

/** Generic centred fallback for the small auth pages. */
export function AuthPageSkeleton() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1060px',
          minHeight: '620px',
          borderRadius: '28px',
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          overflow: 'hidden',
          border: '1px solid #EEF1F5',
        }}
      >
        <Bar w="100%" h="100%" r={0} />
        <div
          style={{ padding: '56px 44px', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <Bar w="60%" h={30} />
          <Bar w="45%" h={14} style={{ marginBottom: '18px' }} />
          <Bar w="100%" h={48} r={12} />
          <Bar w="100%" h={48} r={12} />
          <Bar w="100%" h={50} r={12} style={{ marginTop: '12px' }} />
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton({ rows = 5, height = 92 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {Array.from({ length: rows }, (_, i) => (
        <Bar key={i} w="100%" h={height} r={16} />
      ))}
    </div>
  )
}

export default Bar
