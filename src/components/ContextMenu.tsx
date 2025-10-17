import React, { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  items: Array<{
    label?: string
    onClick?: () => void
    disabled?: boolean
    separator?: boolean
  }>
}

export default function ContextMenu({ x, y, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-300 rounded-md shadow-lg py-1 z-50 min-w-32"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <div key={index}>
          {item.separator ? (
            <div className="border-t border-gray-200 my-1" />
          ) : (
            <button
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
              }`}
              onClick={() => {
                if (!item.disabled && item.onClick) {
                  item.onClick()
                  onClose()
                }
              }}
              disabled={item.disabled}
            >
              {item.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}