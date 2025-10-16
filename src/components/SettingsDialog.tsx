import React, { useState } from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { PortTypeDefinition, WireTypeDefinition, PortDirection } from '@/types'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { 
    settings, 
    addPortType, 
    updatePortType, 
    removePortType,
    addWireType,
    updateWireType,
    removeWireType,
    updateCompatibility,
    resetToDefaults
  } = useSettingsStore()
  
  const [activeTab, setActiveTab] = useState<'portTypes' | 'wireTypes' | 'compatibility'>('portTypes')
  const [editingPortType, setEditingPortType] = useState<PortTypeDefinition | null>(null)
  const [editingWireType, setEditingWireType] = useState<WireTypeDefinition | null>(null)

  if (!isOpen) return null

  const handleAddPortType = () => {
    const newPortType: PortTypeDefinition = {
      id: `custom-port-${Date.now()}`,
      name: `custom-port-${Date.now()}`,
      displayName: '新しいポートタイプ',
      description: '',
      color: '#6b7280',
      category: 'custom',
      compatibleWith: [],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    }
    addPortType(newPortType)
    setEditingPortType(newPortType)
  }

  const handleAddWireType = () => {
    const newWireType: WireTypeDefinition = {
      id: `custom-wire-${Date.now()}`,
      name: `custom-wire-${Date.now()}`,
      displayName: '新しいワイヤータイプ',
      description: '',
      color: '#6b7280',
      strokeWidth: 2,
      supportedPortTypes: []
    }
    addWireType(newWireType)
    setEditingWireType(newWireType)
  }

  const handleCompatibilityChange = (sourceId: string, targetId: string, compatible: boolean) => {
    const currentCompatible = settings.compatibilityMatrix[sourceId] || []
    const newCompatible = compatible
      ? [...currentCompatible.filter(id => id !== targetId), targetId]
      : currentCompatible.filter(id => id !== targetId)
    
    updateCompatibility(sourceId, newCompatible)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-black">接続設定</h2>
            <div className="flex gap-2">
              <button
                onClick={resetToDefaults}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                デフォルトに戻す
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* タブ */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('portTypes')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'portTypes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-black hover:text-gray-700'
            }`}
          >
            ポートタイプ ({settings.portTypes.length})
          </button>
          <button
            onClick={() => setActiveTab('wireTypes')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'wireTypes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-black hover:text-gray-700'
            }`}
          >
            ワイヤータイプ ({settings.wireTypes.length})
          </button>
          <button
            onClick={() => setActiveTab('compatibility')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'compatibility'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-black hover:text-gray-700'
            }`}
          >
            互換性マトリックス
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'portTypes' && (
            <div className="h-full flex">
              {/* ポートタイプ一覧 */}
              <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-black">ポートタイプ</h3>
                    <button
                      onClick={handleAddPortType}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      追加
                    </button>
                  </div>
                  <div className="space-y-2">
                    {settings.portTypes.map(portType => (
                      <div
                        key={portType.id}
                        className={`p-3 border rounded cursor-pointer ${
                          editingPortType?.id === portType.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setEditingPortType(portType)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: portType.color }}
                          />
                          <div>
                            <div className="font-medium text-black">{portType.displayName}</div>
                            <div className="text-xs text-gray-600">{portType.category}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ポートタイプ編集 */}
              <div className="w-1/2 overflow-y-auto">
                {editingPortType ? (
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-black">ポートタイプ編集</h3>
                      <button
                        onClick={() => {
                          removePortType(editingPortType.id)
                          setEditingPortType(null)
                        }}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        削除
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">表示名</label>
                        <input
                          type="text"
                          value={editingPortType.displayName}
                          onChange={(e) => {
                            const updated = { ...editingPortType, displayName: e.target.value }
                            setEditingPortType(updated)
                            updatePortType(editingPortType.id, { displayName: e.target.value })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">説明</label>
                        <textarea
                          value={editingPortType.description || ''}
                          onChange={(e) => {
                            const updated = { ...editingPortType, description: e.target.value }
                            setEditingPortType(updated)
                            updatePortType(editingPortType.id, { description: e.target.value })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">色</label>
                        <input
                          type="color"
                          value={editingPortType.color}
                          onChange={(e) => {
                            const updated = { ...editingPortType, color: e.target.value }
                            setEditingPortType(updated)
                            updatePortType(editingPortType.id, { color: e.target.value })
                          }}
                          className="w-full h-10 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">カテゴリ</label>
                        <select
                          value={editingPortType.category}
                          onChange={(e) => {
                            const updated = { ...editingPortType, category: e.target.value as any }
                            setEditingPortType(updated)
                            updatePortType(editingPortType.id, { category: e.target.value as any })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                        >
                          <option value="audio">オーディオ</option>
                          <option value="video">映像</option>
                          <option value="data">データ</option>
                          <option value="power">電源</option>
                          <option value="network">ネットワーク</option>
                          <option value="custom">カスタム</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    ポートタイプを選択してください
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'compatibility' && (
            <div className="p-4 overflow-auto">
              <h3 className="text-lg font-medium text-black mb-4">互換性マトリックス</h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left text-black">接続元</th>
                      {settings.portTypes.map(targetPort => (
                        <th key={targetPort.id} className="border border-gray-300 px-2 py-2 text-center text-black text-xs">
                          {targetPort.displayName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {settings.portTypes.map(sourcePort => (
                      <tr key={sourcePort.id}>
                        <td className="border border-gray-300 px-3 py-2 font-medium text-black">
                          {sourcePort.displayName}
                        </td>
                        {settings.portTypes.map(targetPort => {
                          const isCompatible = settings.compatibilityMatrix[sourcePort.id]?.includes(targetPort.id) || false
                          return (
                            <td key={targetPort.id} className="border border-gray-300 px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={isCompatible}
                                onChange={(e) => handleCompatibilityChange(sourcePort.id, targetPort.id, e.target.checked)}
                                className="w-4 h-4"
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}