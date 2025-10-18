import React, { useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useDebounce } from '@/hooks/useDebounce'
import {
  getRenderComponent,
  getPropertyComponent,
  createConnectionPortComponent
} from '@/utils/componentSystem'
import {
  arrangePortsOnSide,
  getPortStatsBySide,
  getRecommendedArrangement,
  ARRANGEMENT_PRESETS,
  PortArrangementOptions
} from '@/utils/portArrangement'
import { ComponentType, Side, PortType, PortDirection, RenderComponent } from '@/types'

// ポートタイプの互換性を設定ストアから取得
function getCompatiblePorts(type: PortType): PortType[] {
  const { settings } = useSettingsStore.getState()
  const portTypeDefinition = settings.portTypes.find(pt => pt.name === type || pt.id === type)
  return (portTypeDefinition?.compatibleWith as PortType[]) || [type]

}

// ポートタイプの表示名を設定ストアから取得
function getPortTypeDisplayName(portType: PortType): string {
  const { settings } = useSettingsStore.getState()
  const portTypeDefinition = settings.portTypes.find(pt => pt.name === portType || pt.id === portType)
  return portTypeDefinition?.displayName || portType
}

// タブの定義
type TabType = 'overview' | 'components'

interface Tab {
  id: TabType
  name: string
  icon: string
}

const TABS: Tab[] = [
  { id: 'overview', name: '概要', icon: '📝' },
  { id: 'components', name: 'コンポーネント', icon: '⚙️' }
]

export default function InspectorPanel() {
  const { project, selectedObjectIds, selectedWireIds, updateEquipmentObject, updateWire } = useProjectStore()
  const { pushState } = useHistoryStore()
  const { settings } = useSettingsStore()

  // タブ状態を管理
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // 折り畳み状態を管理
  const [collapsedComponents, setCollapsedComponents] = useState<Set<string>>(new Set())
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // 編集完了時に履歴を保存（1秒後）
  useDebounce(() => {
    pushState(project)
  }, 1000, [project])

  const toggleComponentCollapse = (componentId: string) => {
    const newCollapsed = new Set(collapsedComponents)
    if (newCollapsed.has(componentId)) {
      newCollapsed.delete(componentId)
    } else {
      newCollapsed.add(componentId)
    }
    setCollapsedComponents(newCollapsed)
  }

  const toggleSectionCollapse = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId)
    } else {
      newCollapsed.add(sectionId)
    }
    setCollapsedSections(newCollapsed)
  }

  // 複数選択時の共通プロパティを分析
  const analyzeCommonProperties = (objects: any[]) => {
    if (objects.length === 0) return {}

    const commonProps: Record<string, any> = {}
    const firstObject = objects[0]
    const firstPropertyComponent = getPropertyComponent(firstObject)

    if (firstPropertyComponent?.data.properties) {
      Object.entries(firstPropertyComponent.data.properties).forEach(([key, prop]) => {
        // 全てのオブジェクトで同じプロパティキーが存在するかチェック
        const hasCommonProperty = objects.every(obj => {
          const propComp = getPropertyComponent(obj)
          return propComp?.data.properties?.[key]
        })

        if (hasCommonProperty) {
          // 全てのオブジェクトで同じ値かチェック
          const values = objects.map(obj => {
            const propComp = getPropertyComponent(obj)
            return propComp?.data.properties?.[key]?.value
          })

          const allSame = values.every(val => val === values[0])

          commonProps[key] = {
            ...prop,
            value: allSame ? values[0] : '', // 異なる値の場合は空文字
            hasMultipleValues: !allSame,
            displayName: prop.displayName
          }
        }
      })
    }

    return commonProps
  }

  // 複数選択時の一括プロパティ更新
  const handleBulkPropertyChange = (key: string, value: any) => {
    selectedObjects.forEach(obj => {
      const propertyComponent = getPropertyComponent(obj)
      if (propertyComponent?.data.properties?.[key]) {
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

        const updatedComponents = obj.components.map(comp =>
          comp.id === propertyComponent.id ? updatedProperty : comp
        )

        updateEquipmentObject(obj.id, {
          components: updatedComponents,
          name: key === 'name' ? value : obj.name
        }, true)
      }
    })
  }

  const selectedObject = selectedObjectIds.length === 1
    ? project.objects.find(obj => obj.id === selectedObjectIds[0])
    : null

  const selectedObjects = selectedObjectIds.length > 1
    ? project.objects.filter(obj => selectedObjectIds.includes(obj.id))
    : []

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="ワイヤーのラベル"
              />
            </div>

            {/* ワイヤータイプ */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">ワイヤータイプ</label>
              <select
                value={selectedWire.wireType}
                onChange={(e) => updateWire(selectedWire.id, { wireType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-black"
              >
                {settings.wireTypes.map(wireType => (
                  <option key={wireType.id} value={wireType.id}>
                    {wireType.name}
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
                        value={prop.value}
                        onChange={(e) => handleBulkPropertyChange(key, e.target.value)}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black ${prop.hasMultipleValues ? 'bg-orange-50 border-orange-200' : ''
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

            {/* 注意事項 */}
            <div className="border-t border-gray-200 pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <h4 className="text-xs font-medium text-blue-800 mb-1">一括編集について</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 共通プロパティのみ編集可能です</li>
                  <li>• 異なる値を持つプロパティは背景がオレンジ色で表示されます</li>
                  <li>• 位置調整は選択した全てのオブジェクトに適用されます</li>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded text-black"
                    defaultValue=""
                  >
                    <option value="">選択してください</option>
                    {settings.wireTypes.map(wireType => (
                      <option key={wireType.id} value={wireType.id}>
                        {wireType.name}
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

  const renderComponent = getRenderComponent(selectedObject)
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

  const handleAddPort = () => {
    const newPort = createConnectionPortComponent(
      Side.RIGHT,
      50,
      PortType.XLR_FEMALE,
      PortDirection.OUTPUT
    )

    const updatedComponents = [...selectedObject.components, newPort]
    updateEquipmentObject(selectedObject.id, { components: updatedComponents }) // ポート追加は履歴に保存
  }

  const handleRemovePort = (portId: string) => {
    const updatedComponents = selectedObject.components.filter(comp => comp.id !== portId)
    updateEquipmentObject(selectedObject.id, { components: updatedComponents }) // ポート削除は履歴に保存
  }

  return (
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
          <div className="space-y-2">
            {/* プロパティ */}
            {propertyComponent?.data.properties && Object.entries(propertyComponent.data.properties).map(([key, prop]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-black mb-1">
                  {prop.displayName}
                </label>
                <input
                  type="text"
                  value={prop.value}
                  onChange={(e) => handlePropertyChange(key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
            ))}

            {/* 機材タイプ変更 */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-black mb-1">機材タイプ</label>
              <select
                value={selectedObject.metadata?.equipmentType || ''}
                onChange={(e) => {
                  const newEquipmentType = e.target.value
                  updateEquipmentObject(selectedObject.id, {
                    metadata: {
                      ...selectedObject.metadata,
                      equipmentType: newEquipmentType
                    }
                  })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              >
                <option value="">カスタム</option>
                <option value="mixer">ミキサー</option>
                <option value="microphone">マイクロフォン</option>
                <option value="speaker">スピーカー</option>
                <option value="audio-interface">オーディオインターフェース</option>
                <option value="computer">コンピューター</option>
                <option value="display">ディスプレイ</option>
                <option value="camera">カメラ</option>
                <option value="switcher">スイッチャー</option>
                <option value="amplifier">アンプ</option>
                <option value="recorder">レコーダー</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                機材の抽象的なカテゴリを設定します
              </p>
            </div>

            {/* 位置情報 */}
            <div className={`border-t border-gray-200 ${collapsedSections.has('position') ? 'pt-2' : 'pt-4'}`}>
              <button
                onClick={() => toggleSectionCollapse('position')}
                className={`flex items-center justify-between w-full text-left hover:bg-gray-50 px-1 py-0.5 rounded ${collapsedSections.has('position') ? 'mb-1' : 'mb-2'}`}
              >
                <h3 className="text-sm font-medium text-black">位置</h3>
                <span className="text-xs text-gray-500">
                  {collapsedSections.has('position') ? '▶' : '▼'}
                </span>
              </button>
              {!collapsedSections.has('position') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-black font-medium">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedObject.position.x)}
                      onChange={(e) => updateEquipmentObject(selectedObject.id, {
                        position: { ...selectedObject.position, x: Number(e.target.value) }
                      }, true)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-black font-medium">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedObject.position.y)}
                      onChange={(e) => updateEquipmentObject(selectedObject.id, {
                        position: { ...selectedObject.position, y: Number(e.target.value) }
                      }, true)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* サイズ情報 */}
            {renderComponent && (
              <div className={`border-t border-gray-200 ${collapsedSections.has('size') ? 'pt-2' : 'pt-4'}`}>
                <button
                  onClick={() => toggleSectionCollapse('size')}
                  className={`flex items-center justify-between w-full text-left hover:bg-gray-50 px-1 py-0.5 rounded ${collapsedSections.has('size') ? 'mb-1' : 'mb-2'}`}
                >
                  <h3 className="text-sm font-medium text-black">サイズ</h3>
                  <span className="text-xs text-gray-500">
                    {collapsedSections.has('size') ? '▶' : '▼'}
                  </span>
                </button>
                {!collapsedSections.has('size') && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-black font-medium">幅</label>
                        <input
                          type="number"
                          min="50"
                          max="400"
                          value={renderComponent.data.size.width}
                          onChange={(e) => {
                            const newWidth = Number(e.target.value)
                            const updatedRenderComponent = {
                              ...renderComponent,
                              data: {
                                ...renderComponent.data,
                                size: {
                                  ...renderComponent.data.size,
                                  width: newWidth
                                }
                              }
                            }
                            const updatedComponents = selectedObject.components.map(comp =>
                              comp.id === renderComponent.id ? updatedRenderComponent : comp
                            )
                            updateEquipmentObject(selectedObject.id, { components: updatedComponents }, true)
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-black font-medium">高さ</label>
                        <input
                          type="number"
                          min="30"
                          max="300"
                          value={renderComponent.data.size.height}
                          onChange={(e) => {
                            const newHeight = Number(e.target.value)
                            const updatedRenderComponent = {
                              ...renderComponent,
                              data: {
                                ...renderComponent.data,
                                size: {
                                  ...renderComponent.data.size,
                                  height: newHeight
                                }
                              }
                            }
                            const updatedComponents = selectedObject.components.map(comp =>
                              comp.id === renderComponent.id ? updatedRenderComponent : comp
                            )
                            updateEquipmentObject(selectedObject.id, { components: updatedComponents }, true)
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          const updatedRenderComponent = {
                            ...renderComponent,
                            data: {
                              ...renderComponent.data,
                              size: { width: 100, height: 60 }
                            }
                          }
                          const updatedComponents = selectedObject.components.map(comp =>
                            comp.id === renderComponent.id ? updatedRenderComponent : comp
                          )
                          updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                        }}
                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        デフォルト
                      </button>
                      <button
                        onClick={() => {
                          const currentSize = renderComponent.data.size
                          const aspectRatio = currentSize.width / currentSize.height
                          const newHeight = Math.round(currentSize.width / aspectRatio)
                          const updatedRenderComponent = {
                            ...renderComponent,
                            data: {
                              ...renderComponent.data,
                              size: { ...currentSize, height: newHeight }
                            }
                          }
                          const updatedComponents = selectedObject.components.map(comp =>
                            comp.id === renderComponent.id ? updatedRenderComponent : comp
                          )
                          updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                        }}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        比率維持
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ポート整列 */}
            <div className={`border-t border-gray-200 ${collapsedSections.has('portArrangement') ? 'pt-2' : 'pt-4'}`}>
              <button
                onClick={() => toggleSectionCollapse('portArrangement')}
                className={`flex items-center justify-between w-full text-left hover:bg-gray-50 px-1 py-0.5 rounded ${collapsedSections.has('portArrangement') ? 'mb-1' : 'mb-3'}`}
              >
                <h3 className="text-sm font-medium text-black">ポート整列</h3>
                <span className="text-xs text-gray-500">
                  {collapsedSections.has('portArrangement') ? '▶' : '▼'}
                </span>
              </button>

              {!collapsedSections.has('portArrangement') && (
                <>
                  {(() => {
                    const portStats = getPortStatsBySide(selectedObject)
                    const sides = [
                      { key: Side.LEFT, name: '左', count: portStats[Side.LEFT].count },
                      { key: Side.RIGHT, name: '右', count: portStats[Side.RIGHT].count },
                      { key: Side.TOP, name: '上', count: portStats[Side.TOP].count },
                      { key: Side.BOTTOM, name: '下', count: portStats[Side.BOTTOM].count }
                    ].filter(side => side.count > 0)

                    return (
                      <div className="space-y-3">
                        {sides.map(side => (
                          <div key={side.key} className="bg-gray-50 p-2 rounded border">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-medium text-black">
                                {side.name}辺 ({side.count}ポート)
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1 mb-2">
                              {Object.entries(ARRANGEMENT_PRESETS).map(([key, preset]) => (
                                <button
                                  key={key}
                                  onClick={() => {
                                    const recommended = getRecommendedArrangement(selectedObject, side.key)
                                    const options: PortArrangementOptions = {
                                      ...recommended,
                                      sortBy: preset.sortBy,
                                      sortOrder: preset.sortOrder
                                    }
                                    const updatedObject = arrangePortsOnSide(selectedObject, options)
                                    updateEquipmentObject(selectedObject.id, updatedObject)
                                  }}
                                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                  title={preset.description}
                                >
                                  {preset.name}
                                </button>
                              ))}
                            </div>

                            <button
                              onClick={() => {
                                const recommended = getRecommendedArrangement(selectedObject, side.key)
                                const updatedObject = arrangePortsOnSide(selectedObject, recommended)
                                updateEquipmentObject(selectedObject.id, updatedObject)
                              }}
                              className="w-full px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              自動整列
                            </button>
                          </div>
                        ))}

                        {sides.length === 0 && (
                          <p className="text-xs text-gray-500 text-center py-2">
                            ポートがありません
                          </p>
                        )}
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          </div>
        )}





        {activeTab === 'components' && (
          <div className="space-y-4">
            {/* ポート追加 */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleAddPort}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                ポート追加
              </button>
            </div>

            {/* 全コンポーネント表示 */}
            <div className="space-y-2">
              {selectedObject.components.map(component => {
                const isCollapsed = collapsedComponents.has(component.id)

                if (component.type === ComponentType.CONNECTION_PORT) {
                  // ポートコンポーネントの詳細表示
                  const port = component as any
                  return (
                    <div key={component.id} className={`bg-blue-50 border border-blue-200 rounded ${isCollapsed ? 'p-2' : 'p-3'}`}>
                      <div className={`flex justify-between items-start ${isCollapsed ? 'mb-0' : 'mb-2'}`}>
                        <button
                          onClick={() => toggleComponentCollapse(component.id)}
                          className="flex items-center gap-2 flex-1 text-left hover:bg-blue-100 px-1 py-0.5 rounded"
                        >
                          <span className="text-xs text-gray-500">
                            {isCollapsed ? '▶' : '▼'}
                          </span>
                          <span className="text-xs font-medium text-blue-800">
                            {port.data.label || getPortTypeDisplayName(port.data.portType)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${component.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {component.enabled ? '有効' : '無効'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleRemovePort(component.id)}
                          className="text-red-500 hover:text-red-700 px-2 py-1 text-xs font-medium"
                        >
                          削除
                        </button>
                      </div>

                      {!isCollapsed && (
                        <div className="space-y-2 text-xs">
                          {/* ラベル */}
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">ラベル</label>
                            <input
                              type="text"
                              value={port.data.label || ''}
                              onChange={(e) => {
                                const updatedPort = {
                                  ...port,
                                  data: {
                                    ...port.data,
                                    label: e.target.value
                                  }
                                }
                                const updatedComponents = selectedObject.components.map(comp =>
                                  comp.id === port.id ? updatedPort : comp
                                )
                                updateEquipmentObject(selectedObject.id, { components: updatedComponents }, true)
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-black"
                              placeholder="ポート名"
                            />
                          </div>

                          {/* ポートタイプ */}
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">タイプ</label>
                            <select
                              value={port.data.portType}
                              onChange={(e) => {
                                const newPortType = e.target.value as PortType
                                const updatedPort = {
                                  ...port,
                                  data: {
                                    ...port.data,
                                    portType: newPortType,
                                    constraints: {
                                      ...port.data.constraints,
                                      allowedPortTypes: getCompatiblePorts(newPortType)
                                    }
                                  }
                                }
                                const updatedComponents = selectedObject.components.map(comp =>
                                  comp.id === port.id ? updatedPort : comp
                                )
                                updateEquipmentObject(selectedObject.id, { components: updatedComponents }, true)
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-black"
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
                              value={port.data.direction}
                              onChange={(e) => {
                                const updatedPort = {
                                  ...port,
                                  data: {
                                    ...port.data,
                                    direction: e.target.value as PortDirection
                                  }
                                }
                                const updatedComponents = selectedObject.components.map(comp =>
                                  comp.id === port.id ? updatedPort : comp
                                )
                                updateEquipmentObject(selectedObject.id, { components: updatedComponents }, true)
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-black"
                            >
                              <option value={PortDirection.INPUT}>入力</option>
                              <option value={PortDirection.OUTPUT}>出力</option>
                              <option value={PortDirection.BIDIRECTIONAL}>双方向</option>
                            </select>
                          </div>

                          {/* 位置 */}
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">配置辺</label>
                            <select
                              value={port.data.side}
                              onChange={(e) => {
                                const updatedPort = {
                                  ...port,
                                  data: {
                                    ...port.data,
                                    side: e.target.value as Side
                                  }
                                }
                                const updatedComponents = selectedObject.components.map(comp =>
                                  comp.id === port.id ? updatedPort : comp
                                )
                                updateEquipmentObject(selectedObject.id, { components: updatedComponents }, true)
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-black"
                            >
                              <option value={Side.LEFT}>左</option>
                              <option value={Side.RIGHT}>右</option>
                              <option value={Side.TOP}>上</option>
                              <option value={Side.BOTTOM}>下</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                if (component.type === ComponentType.RENDER) {
                  const renderComp = component as RenderComponent
                  return (
                    <div key={component.id} className={`bg-green-50 border border-green-200 rounded ${isCollapsed ? 'p-2' : 'p-3'}`}>
                      <div className={`flex justify-between items-start ${isCollapsed ? 'mb-0' : 'mb-2'}`}>
                        <button
                          onClick={() => toggleComponentCollapse(component.id)}
                          className="flex items-center gap-2 flex-1 text-left hover:bg-green-100 px-1 py-0.5 rounded"
                        >
                          <span className="text-xs text-gray-500">
                            {isCollapsed ? '▶' : '▼'}
                          </span>
                          <span className="text-xs font-medium text-green-800">RENDER</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${component.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {component.enabled ? '有効' : '無効'}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            const updatedComponent = {
                              ...component,
                              enabled: !component.enabled
                            }
                            const updatedComponents = selectedObject.components.map(comp =>
                              comp.id === component.id ? updatedComponent : comp
                            )
                            updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                          }}
                          className={`px-2 py-1 text-xs rounded ${component.enabled ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
                        >
                          {component.enabled ? '無効化' : '有効化'}
                        </button>
                      </div>

                      {!isCollapsed && (
                        <div className="space-y-3 text-xs">
                          {/* ラベル設定 */}
                          {renderComp.data.label && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-800 mb-2">ラベル設定</h4>

                              {/* ラベルテキスト */}
                              <div className="mb-2">
                                <label className="block text-xs font-medium text-black mb-1">テキスト</label>
                                <input
                                  type="text"
                                  value={renderComp.data.label.text}
                                  onChange={(e) => {
                                    const updatedComponent = {
                                      ...renderComp,
                                      data: {
                                        ...renderComp.data,
                                        label: {
                                          ...renderComp.data.label,
                                          text: e.target.value
                                        }
                                      }
                                    }
                                    const updatedComponents = selectedObject.components.map(comp =>
                                      comp.id === component.id ? updatedComponent : comp
                                    )
                                    updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-black"
                                />
                              </div>

                              {/* ラベルフォントサイズ */}
                              <div className="mb-2">
                                <label className="block text-xs font-medium text-black mb-1">
                                  フォントサイズ: {renderComp.data.label.fontSize || 12}px
                                </label>
                                <input
                                  type="range"
                                  min="4"
                                  max="24"
                                  value={renderComp.data.label.fontSize || 12}
                                  onChange={(e) => {
                                    const updatedComponent = {
                                      ...renderComp,
                                      data: {
                                        ...renderComp.data,
                                        label: {
                                          ...renderComp.data.label,
                                          fontSize: Number(e.target.value)
                                        }
                                      }
                                    }
                                    const updatedComponents = selectedObject.components.map(comp =>
                                      comp.id === component.id ? updatedComponent : comp
                                    )
                                    updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                  }}
                                  className="w-full"
                                />
                              </div>

                              {/* ラベル色 */}
                              <div className="mb-2">
                                <label className="block text-xs font-medium text-black mb-1">文字色</label>
                                <input
                                  type="color"
                                  value={renderComp.data.label.color || '#ffffff'}
                                  onChange={(e) => {
                                    const updatedComponent = {
                                      ...renderComp,
                                      data: {
                                        ...renderComp.data,
                                        label: {
                                          ...renderComp.data.label,
                                          color: e.target.value
                                        }
                                      }
                                    }
                                    const updatedComponents = selectedObject.components.map(comp =>
                                      comp.id === component.id ? updatedComponent : comp
                                    )
                                    updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                  }}
                                  className="w-full h-8 border border-gray-300 rounded"
                                />
                              </div>
                            </div>
                          )}

                          {/* 図形設定 */}
                          <div>
                            <h4 className="text-xs font-medium text-gray-800 mb-2">図形設定</h4>

                            {/* 背景色 */}
                            <div className="mb-2">
                              <label className="block text-xs font-medium text-black mb-1">背景色</label>
                              <input
                                type="color"
                                value={renderComp.data.color}
                                onChange={(e) => {
                                  const updatedComponent = {
                                    ...renderComp,
                                    data: {
                                      ...renderComp.data,
                                      color: e.target.value
                                    }
                                  }
                                  const updatedComponents = selectedObject.components.map(comp =>
                                    comp.id === component.id ? updatedComponent : comp
                                  )
                                  updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                }}
                                className="w-full h-8 border border-gray-300 rounded"
                              />
                            </div>

                            {/* 枠線色 */}
                            <div className="mb-2">
                              <label className="block text-xs font-medium text-black mb-1">枠線色</label>
                              <input
                                type="color"
                                value={renderComp.data.strokeColor}
                                onChange={(e) => {
                                  const updatedComponent = {
                                    ...renderComp,
                                    data: {
                                      ...renderComp.data,
                                      strokeColor: e.target.value
                                    }
                                  }
                                  const updatedComponents = selectedObject.components.map(comp =>
                                    comp.id === component.id ? updatedComponent : comp
                                  )
                                  updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                }}
                                className="w-full h-8 border border-gray-300 rounded"
                              />
                            </div>

                            {/* 枠線の太さ */}
                            <div className="mb-2">
                              <label className="block text-xs font-medium text-black mb-1">
                                枠線の太さ: {renderComp.data.strokeWidth}px
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="8"
                                value={renderComp.data.strokeWidth}
                                onChange={(e) => {
                                  const updatedComponent = {
                                    ...renderComp,
                                    data: {
                                      ...renderComp.data,
                                      strokeWidth: Number(e.target.value)
                                    }
                                  }
                                  const updatedComponents = selectedObject.components.map(comp =>
                                    comp.id === component.id ? updatedComponent : comp
                                  )
                                  updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                }}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                if (component.type === ComponentType.PROPERTY) {
                  return (
                    <div key={component.id} className={`bg-yellow-50 border border-yellow-200 rounded ${isCollapsed ? 'p-2' : 'p-3'}`}>
                      <div className={`flex justify-between items-start ${isCollapsed ? 'mb-0' : 'mb-2'}`}>
                        <button
                          onClick={() => toggleComponentCollapse(component.id)}
                          className="flex items-center gap-2 flex-1 text-left hover:bg-yellow-100 px-1 py-0.5 rounded"
                        >
                          <span className="text-xs text-gray-500">
                            {isCollapsed ? '▶' : '▼'}
                          </span>
                          <span className="text-xs font-medium text-yellow-800">PROPERTY</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${component.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {component.enabled ? '有効' : '無効'}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            const updatedComponent = {
                              ...component,
                              enabled: !component.enabled
                            }
                            const updatedComponents = selectedObject.components.map(comp =>
                              comp.id === component.id ? updatedComponent : comp
                            )
                            updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                          }}
                          className={`px-2 py-1 text-xs rounded ${component.enabled ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
                        >
                          {component.enabled ? '無効化' : '有効化'}
                        </button>
                      </div>

                      {!isCollapsed && (
                        <div className="text-xs text-gray-600">
                          名前・属性を管理するコンポーネントです
                        </div>
                      )}
                    </div>
                  )
                }

                return null
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}