import { useState, useLayoutEffect, useRef } from 'react'

/**
 * Tracks an element's content width.
 *
 * react-window needs explicit pixel dimensions, but the product grid is fluid.
 * A ResizeObserver keeps the virtualised grid in step with the container
 * through window resizes and sidebar toggles alike.
 */
export default function useElementWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return undefined

    // Measure once up front: the observer's first callback is async, and
    // without this the grid renders at width 0 on the first paint.
    setWidth(node.getBoundingClientRect().width)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
