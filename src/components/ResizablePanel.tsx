import React, { useState, useRef, useEffect } from 'react'

interface ResizablePanelProps {
  children: React.ReactNode
  initialHeight?: number
  minHeight?: number
  maxHeight?: number
  className?: string
  onHeightChange?: (height: number) => void
}

export default function ResizablePanel({
  children,
  initialHeight = 320,
  minHeight = 200,
  maxHeight = 600,
  className = '',
  onHeightChange
}: ResizablePanelProps) {
  const [height, setHeight] = useState(initialHeight)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    startY.current = e.clientY
    startHeight.current = height
    
    // カーソルを変更
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const deltaY = startY.current - e.clientY // 上方向が正の値
      const newHeight = Math.min(
        Math.max(startHeight.current + deltaY, minHeight),
        maxHeight
      )
      
      setHeight(newHeight)
      onHeightChange?.(newHeight)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minHeight, maxHeight, onHeightChange])

  return (
    <div
      ref={panelRef}
      className={`relative ${className}`}
      style={{ height: `${height}px` }}
    >
      {/* リサイズハンドル */}
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize bg-gray-300 hover:bg-gray-400 transition-colors z-10 group"
        onMouseDown={handleMouseDown}
      >
        {/* リサイズインジケーター */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-0.5 bg-gray-500 group-hover:bg-gray-600 rounded-full" />
      </div>
      
      {/* パネルコンテンツ */}
      <div className="h-full pt-2 overflow-hidden">
        {children}
      </div>
    </div>
  )
}