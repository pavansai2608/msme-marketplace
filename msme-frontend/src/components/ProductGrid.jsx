import { useMemo } from 'react'
import { FixedSizeGrid } from 'react-window'
import ProductCard from './ProductCard'
import useElementWidth from '../hooks/useElementWidth'

// Below this, a plain CSS grid is cheaper and simpler than a virtualiser -
// and it keeps normal page scrolling, which is what a short list wants.
export const VIRTUALISE_ABOVE = 50

const GAP = 24
const ROW_HEIGHT = 548 // 340px image + ~184px of card body + the gap
const MIN_COLUMN = 260

const columnsFor = (width) => {
  if (!width) return 4
  return Math.max(1, Math.min(4, Math.floor((width + GAP) / (MIN_COLUMN + GAP))))
}

/**
 * The product grid.
 *
 * Under VIRTUALISE_ABOVE items it is an ordinary CSS grid. Above it, the rows
 * are windowed with react-window so a 200-product catalogue mounts ~12 cards
 * instead of 200 - each of which carries an image, hover handlers and a
 * carousel timer.
 */
export default function ProductGrid({ products, wishlistIds, onToggleWishlist }) {
  const [containerRef, width] = useElementWidth()
  const shouldVirtualise = products.length > VIRTUALISE_ABOVE

  const columnCount = columnsFor(width)
  const rowCount = Math.ceil(products.length / columnCount)

  // The window is capped so the grid never grows taller than the viewport,
  // and never adds an inner scrollbar for content that already fits.
  const height = useMemo(() => {
    const viewport = typeof window === 'undefined' ? 900 : window.innerHeight
    return Math.min(rowCount * ROW_HEIGHT, Math.max(600, viewport - 220))
  }, [rowCount])

  if (!shouldVirtualise) {
    return (
      <div
        ref={containerRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          gap: `${GAP}px`,
        }}
      >
        {products.map((p) => (
          <ProductCard
            key={p._id}
            p={p}
            wishlistIds={wishlistIds}
            onToggleWishlist={onToggleWishlist}
          />
        ))}
      </div>
    )
  }

  const columnWidth = width ? width / columnCount : MIN_COLUMN

  const Cell = ({ columnIndex, rowIndex, style }) => {
    const product = products[rowIndex * columnCount + columnIndex]
    // The final row is usually short; those cells render empty.
    if (!product) return null

    return (
      <div
        style={{
          ...style,
          // Inset rather than shrinking the cell, so the gap does not
          // accumulate into a drift across columns.
          left: Number(style.left) + GAP / 2,
          top: Number(style.top) + GAP / 2,
          width: Number(style.width) - GAP,
          height: Number(style.height) - GAP,
        }}
      >
        <ProductCard p={product} wishlistIds={wishlistIds} onToggleWishlist={onToggleWishlist} />
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ margin: `0 -${GAP / 2}px` }}>
      {width > 0 && (
        <FixedSizeGrid
          columnCount={columnCount}
          columnWidth={columnWidth}
          rowCount={rowCount}
          rowHeight={ROW_HEIGHT}
          height={height}
          width={width}
          // A little overscan keeps a fast scroll from showing blank rows.
          overscanRowCount={1}
          style={{ overflowX: 'hidden' }}
        >
          {Cell}
        </FixedSizeGrid>
      )}
    </div>
  )
}
