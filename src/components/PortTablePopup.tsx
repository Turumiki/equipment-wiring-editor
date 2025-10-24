import React, { useEffect } from 'react'
import PortTableEditor from './PortTableEditor'

interface PortTablePopupProps {
  selectedObject: any
  updateEquipmentObject: (id: string, updates: any, skipHistory?: boolean) => void
  onClose: () => void
}

export default function PortTablePopup({ selectedObject, updateEquipmentObject, onClose }: PortTablePopupProps) {
  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[80vh] max-w-6xl flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            ポート編集 - {selectedObject.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 p-4 overflow-y-auto">
          <PortTableEditor 
            selectedObject={selectedObject}
            updateEquipmentObject={updateEquipmentObject}
            maxHeight="max-h-[60vh]"
          />
        </div>
      </div>
    </div>
  )
}