import React, { useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useDebounce } from '@/hooks/useDebounce'
import { getRenderComponent, getPropertyComponent } from '@/utils/componentSystem'
import { useInspectorPanel } from '@/hooks/useInspectorPanel'
import InspectorOverviewTab from '@/components/inspector/InspectorOverviewTab'
import InspectorComponentsTab from '@/components/inspector/InspectorComponentsTab'
import InspectorPortTableTab from '@/components/inspector/InspectorPortTableTab'
import { Side, PortType, PortDirection } from '@/types'
import { createConnectionPortComponent } from '@/utils/componentSystem'

// タブの定義
type TabType = 'overview' | 'components' | 'portTable'

interface Tab {
  id: TabType
  name: string
  icon: string
}

const TABS: Tab[] = [
  { id: 'overview', name: '概要', icon: '📝' },
  { id: 'components', name: 'コンポーネント', icon: '⚙️' },
  { id: 'portTable', name: 'ポート表', icon: '📊' }
]

export default function InspectorPanel() {
  const { project, selectedObjectIds, selectedWireIds, updateEquipmentObject, updateWire } = useProjectStore()
  const { pushState } = useHistoryStore()
  const { settings } = useSettingsStore()

  // タブ状態を管理
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // 編集完了時に履歴を保存（1秒後）
  useDebounce(() => {
    pushState(project)
  }, 1000, [project])

  // 複数選択時の共通ロジック
  const selectedObjects = selectedObjectIds.length > 1
    ? project.objects.filter(obj => selectedObjectIds.includes(obj.id))
    : []
  
  const { analyzeCommonProperties, handleBulkPropertyChange } = useInspectorPanel(
    selectedObjects,
    updateEquipmentObject
  )

  const selectedObject = selectedObjectIds.length === 1
    ? project.objects.find(obj => obj.id === selectedObjectIds[0])
    : null

  const selectedWire = selectedWireIds.length === 1
    ? project.wires.find(wire => wire.id === selectedWireIds[0])
    : null

  const selectedWires = selectedWireIds.length > 1
    ? project.wires.filter(wire => selectedWireIds.includes(wire.id))
    : []

  // エッジが選択されている場合
  if (selectedWire && !selectedObject) {
    return (
      <div className="h-full flex flex-col bg-gray-100">
        {/* ヘッダー */}
        <div className="px-2 py-1 border-b border-gray-400 bg-gray-200">
          <h2 className="text-sm font-bold text-black uppercase tracking-wide">Inspector</h2>
          <p className="text-xs text-black">ワイヤー: {selectedWire.label || selectedWire.wireType}</p>
        </div>

        {/* ワイヤー情報 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* ラベル */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">ラベル</label>
              <input
                type="text"
                value={selectedWire.label || ''}
                onChange={(e) => updateWire(selectedWire.id, { label: e.target.value })}
                className="input-field"
                placeholder="ワイヤーのラベル"
              />
            </div>

            {/* ワイヤータイプ */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">ワイヤータイプ</label>
              <select
                value={selectedWire.wireType}
                onChange={(e) => updateWire(selectedWire.id, { wireType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-black"
              >
                {settings.wireTypes.map(wireType => (
                  <option key={wireType.id} value={wireType.id}>
                    {wireType.displayName || wireType.name}
                  </option>
                ))}
              </select>
            </div>

            {/* スタイル設定 */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-black">スタイル</h3>
                <button
                  onClick={() => {
                    // 個別設定をクリアしてワイヤータイプのデフォルトに戻す
                    updateWire(selectedWire.id, {
                      style: {
                        color: '', // 空文字にしてデフォルトを使用
                        strokeWidth: 0, // 0にしてデフォルトを使用
                        strokeDashArray: selectedWire.style.strokeDashArray
                      }
                    })
                  }}
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  デフォルトに戻す
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-black font-medium mb-1">色</label>
                  <input
                    type="color"
                    value={selectedWire.style.color || '#059669'}
                    onChange={(e) => updateWire(selectedWire.id, {
                      style: { ...selectedWire.style, color: e.target.value }
                    })}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedWire.style.color ? '個別設定' : 'ワイヤータイプのデフォルト'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-black font-medium mb-1">
                    太さ: {selectedWire.style.strokeWidth || 2}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={selectedWire.style.strokeWidth || 2}
                    onChange={(e) => updateWire(selectedWire.id, {
                      style: { ...selectedWire.style, strokeWidth: Number(e.target.value) }
                    })}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedWire.style.strokeWidth ? '個別設定' : 'ワイヤータイプのデフォルト'}
                  </p>
                </div>
              </div>
            </div>

            {/* 接続情報 */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-black mb-2">接続情報</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">接続元:</span> {
                    project.objects.find(obj => obj.id === selectedWire.sourceObjectId)?.name || 'Unknown'
                  }
                </div>
                <div>
                  <span className="font-medium">接続先:</span> {
                    project.objects.find(obj => obj.id === selectedWire.targetObjectId)?.name || 'Unknown'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 複数オブジェクト選択時の処理
  if (selectedObjects.length > 1) {
    const commonProperties = analyzeCommonProperties(selectedObjects)

    return (
      <div className="h-full flex flex-col bg-gray-100">
        {/* ヘッダー */}
        <div className="px-2 py-1 border-b border-gray-400 bg-gray-200">
          <h2 className="text-sm font-bold text-black uppercase tracking-wide">Inspector</h2>
          <p className="text-xs text-black">{selectedObjects.length}個のオブジェクトを選択中</p>
        </div>

        {/* 一括編集コンテンツ */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-4">
            {/* 選択中のオブジェクト一覧 */}
            <div>
              <h3 className="text-sm font-medium text-black mb-2">選択中のオブジェクト</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedObjects.map(obj => (
                  <div key={obj.id} className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                    {obj.name}
                  </div>
                ))}
              </div>
            </div>

            {/* 共通プロパティの一括編集 */}
            {Object.keys(commonProperties).length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-black mb-3">共通プロパティ</h3>
                <div className="space-y-3">
                  {Object.entries(commonProperties).map(([key, prop]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-black mb-1">
                        {prop.displayName}
                        {prop.hasMultipleValues && (
                          <span className="text-xs text-orange-600 ml-1">(複数の値)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={prop.value || ''}
                        onChange={(e) => handleBulkPropertyChange(key, e.target.value)}
                        className={`input-field ${prop.hasMultipleValues ? 'bg-orange-50 border-orange-200' : ''
                          }`}
                        placeholder={prop.hasMultipleValues ? '複数の値があります' : ''}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 一括ラベル・図形設定 */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-black mb-3">一括ラベル・図形設定</h3>
              <div className="space-y-3">

                {/* ラベルフォントサイズ一括変更 */}
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    ラベルフォントサイズ
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="4"
                      max="24"
                      defaultValue="12"
                      onChange={(e) => {
                        const fontSize = Number(e.target.value)
                        selectedObjects.forEach(obj => {
                          const renderComponent = getRenderComponent(obj)
                          if (renderComponent && renderComponent.data.label) {
                            const updatedComponent = {
                              ...renderComponent,
                              data: {
                                ...renderComponent.data,
                                label: {
                                  ...renderComponent.data.label,
                                  fontSize
                                }
                              }
                            }
                            const updatedComponents = obj.components.map(comp =>
                              comp.id === renderComponent.id ? updatedComponent : comp
                            )
                            updateEquipmentObject(obj.id, { components: updatedComponents })
                          }
                        })
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-600 w-8">px</span>
                  </div>
                </div>

                {/* ラベル色一括変更 */}
                <div>
                  <label className="block text-xs font-medium text-black mb-1">ラベル色</label>
                  <input
                    type="color"
                    onChange={(e) => {
                      const color = e.target.value
                      selectedObjects.forEach(obj => {
                        const renderComponent = getRenderComponent(obj)
                        if (renderComponent && renderComponent.data.label) {
                          const updatedComponent = {
                            ...renderComponent,
                            data: {
                              ...renderComponent.data,
                              label: {
                                ...renderComponent.data.label,
                                color
                              }
                            }
                          }
                          const updatedComponents = obj.components.map(comp =>
                            comp.id === renderComponent.id ? updatedComponent : comp
                          )
                          updateEquipmentObject(obj.id, { components: updatedComponents })
                        }
                      })
                    }}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>

                {/* 背景色一括変更 */}
                <div>
                  <label className="block text-xs font-medium text-black mb-1">背景色</label>
                  <input
                    type="color"
                    onChange={(e) => {
                      const color = e.target.value
                      selectedObjects.forEach(obj => {
                        const renderComponent = getRenderComponent(obj)
                        if (renderComponent) {
                          const updatedComponent = {
                            ...renderComponent,
                            data: {
                              ...renderComponent.data,
                              color
                            }
                          }
                          const updatedComponents = obj.components.map(comp =>
                            comp.id === renderComponent.id ? updatedComponent : comp
                          )
                          updateEquipmentObject(obj.id, { components: updatedComponents })
                        }
                      })
                    }}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>

                {/* 枠線色一括変更 */}
                <div>
                  <label className="block text-xs font-medium text-black mb-1">枠線色</label>
                  <input
                    type="color"
                    onChange={(e) => {
                      const color = e.target.value
                      selectedObjects.forEach(obj => {
                        const renderComponent = getRenderComponent(obj)
                        if (renderComponent) {
                          const updatedComponent = {
                            ...renderComponent,
                            data: {
                              ...renderComponent.data,
                              strokeColor: color
                            }
                          }
                          const updatedComponents = obj.components.map(comp =>
                            comp.id === renderComponent.id ? updatedComponent : comp
                          )
                          updateEquipmentObject(obj.id, { components: updatedComponents })
                        }
                      })
                    }}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>

                {/* 枠線の太さ一括変更 */}
                <div>
                  <label className="block text-xs font-medium text-black mb-1">
                    枠線の太さ
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="8"
                      defaultValue="2"
                      onChange={(e) => {
                        const strokeWidth = Number(e.target.value)
                        selectedObjects.forEach(obj => {
                          const renderComponent = getRenderComponent(obj)
                          if (renderComponent) {
                            const updatedComponent = {
                              ...renderComponent,
                              data: {
                                ...renderComponent.data,
                                strokeWidth
                              }
                            }
                            const updatedComponents = obj.components.map(comp =>
                              comp.id === renderComponent.id ? updatedComponent : comp
                            )
                            updateEquipmentObject(obj.id, { components: updatedComponents })
                          }
                        })
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-600 w-8">px</span>
                  </div>
                </div>

                {/* 一括サイズ変更 */}
                <div>
                  <label className="block text-xs font-medium text-black mb-1">サイズ一括変更</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        selectedObjects.forEach(obj => {
                          const renderComponent = getRenderComponent(obj)
                          if (renderComponent) {
                            const updatedComponent = {
                              ...renderComponent,
                              data: {
                                ...renderComponent.data,
                                size: { width: 100, height: 60 }
                              }
                            }
                            const updatedComponents = obj.components.map(comp =>
                              comp.id === renderComponent.id ? updatedComponent : comp
                            )
                            updateEquipmentObject(obj.id, { components: updatedComponents })
                          }
                        })
                      }}
                      className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      標準サイズ
                    </button>
                    <button
                      onClick={() => {
                        selectedObjects.forEach(obj => {
                          const renderComponent = getRenderComponent(obj)
                          if (renderComponent) {
                            const updatedComponent = {
                              ...renderComponent,
                              data: {
                                ...renderComponent.data,
                                size: { width: 150, height: 90 }
                              }
                            }
                            const updatedComponents = obj.components.map(comp =>
                              comp.id === renderComponent.id ? updatedComponent : comp
                            )
                            updateEquipmentObject(obj.id, { components: updatedComponents })
                          }
                        })
                      }}
                      className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      大きいサイズ
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 一括位置調整 */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-black mb-3">一括位置調整</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    // 水平整列
                    const avgY = selectedObjects.reduce((sum, obj) => sum + obj.position.y, 0) / selectedObjects.length
                    selectedObjects.forEach(obj => {
                      updateEquipmentObject(obj.id, {
                        position: { ...obj.position, y: avgY }
                      })
                    })
                  }}
                  className="px-3 py-2 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 border border-gray-500"
                >
                  水平整列
                </button>
                <button
                  onClick={() => {
                    // 垂直整列
                    const avgX = selectedObjects.reduce((sum, obj) => sum + obj.position.x, 0) / selectedObjects.length
                    selectedObjects.forEach(obj => {
                      updateEquipmentObject(obj.id, {
                        position: { ...obj.position, x: avgX }
                      })
                    })
                  }}
                  className="px-3 py-2 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 border border-gray-500"
                >
                  垂直整列
                </button>
                <button
                  onClick={() => {
                    // 等間隔配置（水平）
                    const sortedObjects = [...selectedObjects].sort((a, b) => a.position.x - b.position.x)
                    const minX = sortedObjects[0].position.x
                    const maxX = sortedObjects[sortedObjects.length - 1].position.x
                    const spacing = (maxX - minX) / (sortedObjects.length - 1)

                    sortedObjects.forEach((obj, index) => {
                      updateEquipmentObject(obj.id, {
                        position: { ...obj.position, x: minX + spacing * index }
                      })
                    })
                  }}
                  className="px-3 py-2 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 border border-gray-500"
                >
                  等間隔（水平）
                </button>
                <button
                  onClick={() => {
                    // 等間隔配置（垂直）
                    const sortedObjects = [...selectedObjects].sort((a, b) => a.position.y - b.position.y)
                    const minY = sortedObjects[0].position.y
                    const maxY = sortedObjects[sortedObjects.length - 1].position.y
                    const spacing = (maxY - minY) / (sortedObjects.length - 1)

                    sortedObjects.forEach((obj, index) => {
                      updateEquipmentObject(obj.id, {
                        position: { ...obj.position, y: minY + spacing * index }
                      })
                    })
                  }}
                  className="px-3 py-2 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 border border-gray-500"
                >
                  等間隔（垂直）
                </button>
              </div>
            </div>

            {/* 一括ポート追加 */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-black mb-3">一括ポート追加</h3>
              <div className="space-y-3">
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <h4 className="text-xs font-medium text-green-800 mb-2">選択中の全機材にポートを追加</h4>
                  
                  <div className="space-y-2">
                    {/* 辺の選択 */}
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">辺</label>
                      <select
                        id="bulk-port-side"
                        className="select-field-xs"
                        defaultValue="left"
                      >
                        <option value="left">左</option>
                        <option value="right">右</option>
                        <option value="top">上</option>
                        <option value="bottom">下</option>
                      </select>
                    </div>

                    {/* ポートタイプ */}
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">ポートタイプ</label>
                      <select
                        id="bulk-port-type"
                        className="select-field-xs"
                        defaultValue={PortType.XLR_FEMALE}
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
                      <label className="block text-xs font-medium text-black mb-1">方向</label>
                      <select
                        id="bulk-port-direction"
                        className="select-field-xs"
                        defaultValue={PortDirection.INPUT}
                      >
                        <option value={PortDirection.INPUT}>入力</option>
                        <option value={PortDirection.OUTPUT}>出力</option>
                        <option value={PortDirection.BIDIRECTIONAL}>双方向</option>
                      </select>
                    </div>

                    {/* ラベル */}
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">ラベル（オプション）</label>
                      <input
                        type="text"
                        id="bulk-port-label"
                        className="input-field-xs"
                        placeholder="ポートラベル"
                      />
                    </div>

                    {/* オフセット */}
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        位置（オフセット）: <span id="bulk-port-offset-value">50</span>%
                      </label>
                      <input
                        type="range"
                        id="bulk-port-offset"
                        min="0"
                        max="100"
                        defaultValue="50"
                        className="w-full"
                        onChange={(e) => {
                          const valueDisplay = document.getElementById('bulk-port-offset-value')
                          if (valueDisplay) {
                            valueDisplay.textContent = e.target.value
                          }
                        }}
                      />
                    </div>

                    {/* 追加ボタン */}
                    <button
                      onClick={() => {
                        const sideSelect = document.getElementById('bulk-port-side') as HTMLSelectElement
                        const typeSelect = document.getElementById('bulk-port-type') as HTMLSelectElement
                        const directionSelect = document.getElementById('bulk-port-direction') as HTMLSelectElement
                        const labelInput = document.getElementById('bulk-port-label') as HTMLInputElement
                        const offsetInput = document.getElementById('bulk-port-offset') as HTMLInputElement

                        if (!sideSelect || !typeSelect || !directionSelect || !offsetInput) return

                        // Side enumの値を取得（文字列から変換）
                        const sideValue = sideSelect.value as Side
                        const side = sideValue
                        const portType = typeSelect.value as PortType
                        const direction = directionSelect.value as PortDirection
                        const label = labelInput.value || ''
                        const offset = parseInt(offsetInput.value)

                        // 選択中の全機材にポートを追加
                        selectedObjects.forEach((obj, index) => {
                          // ラベルが空の場合は自動生成
                          const portLabel = label || (index === 0 ? 'New Port' : `New Port ${index + 1}`)
                          
                          const newPort = createConnectionPortComponent(
                            side,
                            offset,
                            portType,
                            direction,
                            portLabel
                          )

                          const updatedComponents = [...obj.components, newPort]
                          updateEquipmentObject(obj.id, { components: updatedComponents })
                        })

                        // 入力フィールドをリセット
                        if (labelInput) labelInput.value = ''
                        if (offsetInput) {
                          offsetInput.value = '50'
                          const valueDisplay = document.getElementById('bulk-port-offset-value')
                          if (valueDisplay) valueDisplay.textContent = '50'
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                    >
                      全機材にポートを追加
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 注意事項 */}
            <div className="border-t border-gray-200 pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-medium text-blue-800 mb-1">一括編集について</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 共通プロパティのみ編集可能です</li>
                  <li>• 異なる値を持つプロパティは背景がオレンジ色で表示されます</li>
                  <li>• 位置調整は選択した全てのオブジェクトに適用されます</li>
                  <li>• 一括ポート追加は選択した全機材に同じポートを追加します</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 複数ワイヤー選択時の処理
  if (selectedWires.length > 1) {
    return (
      <div className="h-full flex flex-col bg-gray-100">
        {/* ヘッダー */}
        <div className="px-2 py-1 border-b border-gray-400 bg-gray-200">
          <h2 className="text-sm font-bold text-black uppercase tracking-wide">Inspector</h2>
          <p className="text-xs text-black">{selectedWires.length}本のワイヤーを選択中</p>
        </div>

        {/* 一括編集コンテンツ */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-4">
            {/* 選択中のワイヤー一覧 */}
            <div>
              <h3 className="text-sm font-medium text-black mb-2">選択中のワイヤー</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedWires.map(wire => (
                  <div key={wire.id} className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                    {wire.label || wire.wireType}
                  </div>
                ))}
              </div>
            </div>

            {/* 一括ワイヤータイプ変更 */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-black mb-3">一括設定</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">ワイヤータイプ</label>
                  <select
                    onChange={(e) => {
                      selectedWires.forEach(wire => {
                        updateWire(wire.id, { wireType: e.target.value as any })
                      })
                    }}
                    className="select-field"
                    defaultValue=""
                  >
                    <option value="">選択してください</option>
                    {settings.wireTypes.map(wireType => (
                      <option key={wireType.id} value={wireType.id}>
                        {wireType.displayName || wireType.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">色</label>
                  <input
                    type="color"
                    onChange={(e) => {
                      selectedWires.forEach(wire => {
                        updateWire(wire.id, {
                          style: { ...wire.style, color: e.target.value }
                        })
                      })
                    }}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">太さ</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    onChange={(e) => {
                      selectedWires.forEach(wire => {
                        updateWire(wire.id, {
                          style: { ...wire.style, strokeWidth: Number(e.target.value) }
                        })
                      })
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedObject) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>オブジェクトまたはワイヤーを選択してください</p>
      </div>
    )
  }

  const propertyComponent = getPropertyComponent(selectedObject)

  const handlePropertyChange = (key: string, value: any) => {
    if (propertyComponent) {
      const updatedProperty = {
        ...propertyComponent,
        data: {
          ...propertyComponent.data,
          properties: {
            ...propertyComponent.data.properties,
            [key]: {
              ...propertyComponent.data.properties[key],
              value
            }
          }
        }
      }

      const updatedComponents = selectedObject.components.map(comp =>
        comp.id === propertyComponent.id ? updatedProperty : comp
      )

      updateEquipmentObject(selectedObject.id, {
        components: updatedComponents,
        name: key === 'name' ? value : selectedObject.name
      }, true) // 履歴保存をスキップ
    }
  }

  return (
    <>
    <div className="h-full flex flex-col bg-gray-100">
      {/* ヘッダー */}
      <div className="px-2 py-1 border-b border-gray-400 bg-gray-200">
        <h2 className="text-sm font-bold text-black uppercase tracking-wide">Inspector</h2>
        <p className="text-xs text-black">{selectedObject.name}</p>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-300 bg-gray-150">
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium border-r border-gray-300 last:border-r-0 transition-colors ${activeTab === tab.id
                ? 'bg-white text-black border-b-2 border-gray-600'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-250 hover:text-black'
                }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="text-xs">{tab.icon}</span>
                <span>{tab.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'overview' && (
          <InspectorOverviewTab
            selectedObject={selectedObject}
            updateEquipmentObject={updateEquipmentObject}
            handlePropertyChange={handlePropertyChange}
          />
        )}

        {activeTab === 'components' && (
          <InspectorComponentsTab
            selectedObject={selectedObject}
            updateEquipmentObject={updateEquipmentObject}
          />
        )}

        {activeTab === 'portTable' && (
          <InspectorPortTableTab
            selectedObject={selectedObject}
            updateEquipmentObject={updateEquipmentObject}
          />
        )}
      </div>
    </div>
  </>
  )
}
