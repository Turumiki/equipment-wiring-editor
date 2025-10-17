import React, { useState, useCallback } from 'react'
import { NodeResizer } from 'reactflow'

interface ResizableNodeSelectedProps {
  isSelected: boolean
  onResize?: (width: number, height: number) => void
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  keepAspectRatio?: boolean
  children: React.ReactNode
}

export default function ResizableNodeSelected({
  isSelected,
  onResize,
  minWidth = 50,
  minHeight = 30,
  maxWidth = 500,
  maxHeight = 300,
  keepAspectRatio = false,
  children
}: ResizableNodeSelectedProps) {
  const [isResizing, setIsResizing] = useState(false)

  const handleResizeStart = useCallback(() => {
    setIsResizing(true)
  }, [])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
  }, [])

  const handleResize = useCallback((event: any, data: any) => {
    if (onResize) {
      onResize(data.width, data.height)
    }
  }, [onResize])

  return (
    <div className={`relative ${isResizing ? 'cursor-nw-resize' : ''}`}>
      {children}
      
      {/* リサイズハンドルは選択時のみ表示 */}
      {isSelected && (
        <NodeResizer
          minWidth={minWidth}
          minHeight={minHeight}
          maxWidth={maxWidth}
          maxHeight={maxHeight}
          keepAspectRatio={keepAspectRatio}
          onResizeStart={handleResizeStart}
          onResizeEnd={handleResizeEnd}
          onResize={handleResize}
          handleClassName="resize-handle"
          handleStyle={{
            backgroundColor: '#3b82f6',
            border: '2px solid white',
            borderRadius: '3px',
            width: '8px',
            height: '8px'
          }}
          lineClassName="resize-line"
          lineStyle={{
            borderColor: '#3b82f6',
            borderWidth: '1px',
            borderStyle: 'dashed'
          }}
        />
      )}
      
      <style jsx>{`
        .resize-handle {
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .resize-handle:hover {
          opacity: 1;
          transform: scale(1.2);
        }
        .resize-line {
          opacity: 0.6;
        }
      `}</style>
    </div>
  )
}