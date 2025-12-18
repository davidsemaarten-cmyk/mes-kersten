/**
 * ScrollableTable Component
 * Phase 9: Horizontal scroll container with shadow indicators
 */

import { useRef, useEffect, useState, type ReactNode } from 'react'

interface ScrollableTableProps {
  children: ReactNode
}

export function ScrollableTable({ children }: ScrollableTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return

      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current

      setShowLeftShadow(scrollLeft > 0)
      setShowRightShadow(scrollLeft + clientWidth < scrollWidth - 1)
    }

    const container = scrollRef.current
    if (!container) return

    // Initial check
    handleScroll()

    // Add scroll listener
    container.addEventListener('scroll', handleScroll)

    // Also check on window resize
    const handleResize = () => handleScroll()
    window.addEventListener('resize', handleResize)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="relative">
      {/* Left shadow */}
      {showLeftShadow && (
        <div
          className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-visible scroll-smooth"
        style={{
          WebkitOverflowScrolling: 'touch', // Smooth scroll on iOS
        }}
      >
        {children}
      </div>

      {/* Right shadow */}
      {showRightShadow && (
        <div
          className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
