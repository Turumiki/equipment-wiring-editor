import React, { useState, useRef, useEffect } from 'react'

interface ResizableWidthPanelProps {
  children: React.ReactNode
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
  className?: string
  onWidthChange?: (width: number) => void
  side?: 'left' | 'right'
}

export default function ResizableWidthPanel({
  children,
  initialWidth = 320,
  minWidth = 200,
  maxWidth = 800,
  className = '',
  onWidthChange,
  side = 'right'
}: ResizableWidthPanelProps) {
  const [width, setWidth] = useState(initialWidth)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startWidth = useRef(0)

  // 初期幅が変更された場合に更新
  useEffect(() => {
    setWidth(initialWidth)
  }, [initialWidth])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startX.current = e.clientX
    startWidth.current = width
    
    // カーソルを変更
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const deltaX = side === 'right' 
        ? startX.current - e.clientX // 右側パネルの場合、左方向が正の値
        : e.clientX - startX.current // 左側パネルの場合、右方向が正の値
      
      const newWidth = Math.min(
        Math.max(startWidth.current + deltaX, minWidth),
        maxWidth
      )
      
      setWidth(newWidth)
      onWidthChange?.(newWidth)
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
  }, [isResizing, minWidth, maxWidth, onWidthChange, side])

  return (
    <div
      ref={panelRef}
      className={`relative flex flex-shrink-0 ${className}`}
      style={{ width: `${width}px`, minWidth: `${minWidth}px`, maxWidth: `${maxWidth}px` }}
    >
      {/* リサイズハンドル */}
      {side === 'right' && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize bg-gray-300 hover:bg-gray-400 transition-colors z-10 group"
          onMouseDown={handleMouseDown}
        >
          {/* リサイズインジケーター */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-0.5 bg-gray-500 group-hover:bg-gray-600 rounded-full" />
        </div>
      )}
      
      {/* パネルコンテンツ */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* リサイズハンドル（左側の場合） */}
      {side === 'left' && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize bg-gray-300 hover:bg-gray-400 transition-colors z-10 group"
          onMouseDown={handleMouseDown}
        >
          {/* リサイズインジケーター */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-0.5 bg-gray-500 group-hover:bg-gray-600 rounded-full" />
        </div>
      )}
    </div>
  )
}

