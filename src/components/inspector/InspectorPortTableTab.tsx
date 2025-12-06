import React, { useState } from 'react'
import { EquipmentObject } from '@/types'
import EquipmentPortEditor from '@/components/EquipmentPortEditor'
import PortTableEditor from '@/components/PortTableEditor'
import PortTablePopup from '@/components/PortTablePopup'

interface InspectorPortTableTabProps {
  selectedObject: EquipmentObject
  updateEquipmentObject: (id: string, updates: any, skipHistory?: boolean) => void
}

export default function InspectorPortTableTab({
  selectedObject,
  updateEquipmentObject
}: InspectorPortTableTabProps) {
  const [portEditMode, setPortEditMode] = useState<'table' | 'graphical'>('graphical')
  const [showPortTablePopup, setShowPortTablePopup] = useState(false)

  return (
    <>
      <div className="space-y-4">
        {/* 編集モード切り替え */}
        <div className="flex gap-2 border-b border-gray-300 pb-2">
          <button
            onClick={() => setPortEditMode('graphical')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              portEditMode === 'graphical'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🎨 グラフィカル編集
          </button>
          <button
            onClick={() => setPortEditMode('table')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              portEditMode === 'table'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 表形式編集
          </button>
        </div>

        {/* グラフィカル編集 */}
        {portEditMode === 'graphical' && (
          <EquipmentPortEditor
            equipmentObject={selectedObject}
            onPortsChange={(components) => {
              updateEquipmentObject(selectedObject.id, { components }, true)
            }}
          />
        )}

        {/* 表形式編集 */}
        {portEditMode === 'table' && (
          <div className="space-y-4">
            {/* ポップアップで開くボタン */}
            <div className="text-center">
              <button
                onClick={() => setShowPortTablePopup(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
              >
                📊 ポート表を大きな画面で編集
              </button>
              <p className="text-xs text-gray-500 mt-2">
                より広いスペースでポートを効率的に編集できます
              </p>
            </div>

            {/* インライン表示（簡易版） */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">簡易表示</h4>
              <PortTableEditor 
                selectedObject={selectedObject}
                updateEquipmentObject={updateEquipmentObject}
                compact={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* ポートテーブルポップアップ */}
      {showPortTablePopup && (
        <PortTablePopup
          selectedObject={selectedObject}
          updateEquipmentObject={updateEquipmentObject}
          onClose={() => setShowPortTablePopup(false)}
        />
      )}
    </>
  )
}

