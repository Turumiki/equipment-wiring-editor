import React, { useState, useEffect } from 'react'
import { PortType, PortDirection } from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'

interface PortEditDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (label: string, portType: PortType, direction: PortDirection) => void
  initialLabel: string
  initialPortType: PortType
  initialDirection: PortDirection
}

// ポートタイプの表示名を設定ストアから取得
function getPortTypeDisplayName(portType: PortType): string {
  const { settings } = useSettingsStore.getState()
  const portTypeDefinition = settings.portTypes.find(pt => pt.name === portType || pt.id === portType)
  return portTypeDefinition?.displayName || portType
}

export default function PortEditDialog({
  isOpen,
  onClose,
  onSave,
  initialLabel,
  initialPortType,
  initialDirection
}: PortEditDialogProps) {
  const [label, setLabel] = useState(initialLabel)
  const [portType, setPortType] = useState(initialPortType)
  const [direction, setDirection] = useState(initialDirection)
  const { settings } = useSettingsStore()

  useEffect(() => {
    if (isOpen) {
      setLabel(initialLabel)
      setPortType(initialPortType)
      setDirection(initialDirection)
    }
  }, [isOpen, initialLabel, initialPortType, initialDirection])

  const handleSave = () => {
    onSave(label, portType, direction)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 w-80 max-w-full mx-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">ポート設定</h2>
        
        <div className="space-y-3">
          {/* ポート名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ポート名
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input-field"
              placeholder="ポート名を入力"
              autoFocus
            />
          </div>

          {/* ポートタイプ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ポートタイプ
            </label>
            <select
              value={portType}
              onChange={(e) => setPortType(e.target.value as PortType)}
              className="select-field"
            >
              {settings.portTypes.map(portTypeDef => (
                <option key={portTypeDef.id} value={portTypeDef.name}>
                  {portTypeDef.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* 方向 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              方向
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as PortDirection)}
              className="select-field"
            >
              <option value={PortDirection.INPUT}>入力</option>
              <option value={PortDirection.OUTPUT}>出力</option>
              <option value={PortDirection.BIDIRECTIONAL}>双方向</option>
            </select>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}