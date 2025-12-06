import React, { useState } from 'react'
import { EquipmentObject, ComponentType, Side, PortType, PortDirection, RenderComponent } from '@/types'
import { createConnectionPortComponent } from '@/utils/componentSystem'
import { getPortTypeBaseName, getCompatiblePorts } from '@/utils/portTypeUtils'
import { useSettingsStore } from '@/store/useSettingsStore'

interface InspectorComponentsTabProps {
  selectedObject: EquipmentObject
  updateEquipmentObject: (id: string, updates: any, skipHistory?: boolean) => void
}

export default function InspectorComponentsTab({
  selectedObject,
  updateEquipmentObject
}: InspectorComponentsTabProps) {
  const { settings } = useSettingsStore()
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set())

  const toggleComponentCollapse = (componentId: string) => {
    const newExpanded = new Set(expandedComponents)
    if (newExpanded.has(componentId)) {
      newExpanded.delete(componentId)
    } else {
      newExpanded.add(componentId)
    }
    setExpandedComponents(newExpanded)
  }

  const handleAddPort = () => {
    const newPort = createConnectionPortComponent(
      Side.RIGHT,
      50,
      PortType.XLR_FEMALE,
      PortDirection.OUTPUT
    )

    const updatedComponents = [...selectedObject.components, newPort]
    updateEquipmentObject(selectedObject.id, { components: updatedComponents })
  }

  const handleRemovePort = (portId: string) => {
    const updatedComponents = selectedObject.components.filter(comp => comp.id !== portId)
    updateEquipmentObject(selectedObject.id, { components: updatedComponents })
  }

  return (
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
          const isCollapsed = !expandedComponents.has(component.id)

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
                      {port.data.label || getPortTypeBaseName(port.data.portType)}
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
                        className="input-field-xs"
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
                        className="select-field-xs"
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
                        className="select-field-xs"
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
                        value={port.data.position?.side || Side.LEFT}
                        onChange={(e) => {
                          const updatedPort = {
                            ...port,
                            data: {
                              ...port.data,
                              position: {
                                ...port.data.position,
                                side: e.target.value as Side
                              }
                            }
                          }
                          const updatedComponents = selectedObject.components.map(comp =>
                            comp.id === port.id ? updatedPort : comp
                          )
                          updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                        }}
                        className="select-field-xs"
                      >
                        <option value={Side.LEFT}>左</option>
                        <option value={Side.RIGHT}>右</option>
                        <option value={Side.TOP}>上</option>
                        <option value={Side.BOTTOM}>下</option>
                      </select>
                    </div>

                    {/* 位置（％） */}
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">
                        位置: {port.data.position?.offset || 50}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={port.data.position?.offset || 50}
                        onChange={(e) => {
                          const updatedPort = {
                            ...port,
                            data: {
                              ...port.data,
                              position: {
                                ...port.data.position,
                                offset: Number(e.target.value)
                              }
                            }
                          }
                          const updatedComponents = selectedObject.components.map(comp =>
                            comp.id === port.id ? updatedPort : comp
                          )
                          updateEquipmentObject(selectedObject.id, { components: updatedComponents }, true)
                        }}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
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
                            className="input-field-xs"
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
  )
}

