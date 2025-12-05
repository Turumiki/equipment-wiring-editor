import React, { useState, useRef, useEffect, useCallback } from 'react'

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
  
  // 状態を保持するためのRef
  const widthRef = useRef(width)
  const animationFrameRef = useRef<number | null>(null)
  
  // マウス位置計算用
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  
  // PropsをRefで保持
  const propsRef = useRef({ onWidthChange, side, minWidth, maxWidth })
  
  useEffect(() => {
    propsRef.current = { onWidthChange, side, minWidth, maxWidth }
  }, [onWidthChange, side, minWidth, maxWidth])

  // widthステートが変更されたらRefも更新
  useEffect(() => {
    widthRef.current = width
  }, [width])

  // 初期幅が変更された場合に更新
  useEffect(() => {
    setWidth(initialWidth)
  }, [initialWidth])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = widthRef.current
    
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      const clientX = e.clientX
      
      animationFrameRef.current = requestAnimationFrame(() => {
        const { onWidthChange, side, minWidth, maxWidth } = propsRef.current
        
        const deltaX = side === 'right' 
          ? startXRef.current - clientX // 右側パネルの場合、左方向が正の値
          : clientX - startXRef.current // 左側パネルの場合、右方向が正の値
        
        let newWidth = startWidthRef.current + deltaX
        
        // NaNチェック
        if (Number.isNaN(newWidth)) return
        
        // 範囲制限
        newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth))
        
        setWidth(newWidth)
        if (onWidthChange) {
          onWidthChange(newWidth)
        }
        
        animationFrameRef.current = null
      })
    }

    const handleMouseUp = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    // windowに対してイベントリスナーを設定
    window.addEventListener('mousemove', handleMouseMove, { passive: false })
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  return (
    <div
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
