import React, { useState } from 'react'
import { EquipmentObject, ComponentType, Side, PortType, PortDirection, RenderComponent } from '@/types'
import { getRenderComponent, getPropertyComponent } from '@/utils/componentSystem'
import {
  arrangePortsOnSide,
  getPortStatsBySide,
  getRecommendedArrangement,
  ARRANGEMENT_PRESETS,
  PortArrangementOptions
} from '@/utils/portArrangement'
import { getCompatiblePorts } from '@/utils/portTypeUtils'
import { useSettingsStore } from '@/store/useSettingsStore'

interface InspectorOverviewTabProps {
  selectedObject: EquipmentObject
  updateEquipmentObject: (id: string, updates: any, skipHistory?: boolean) => void
  handlePropertyChange: (key: string, value: any) => void
}

export default function InspectorOverviewTab({
  selectedObject,
  updateEquipmentObject,
  handlePropertyChange
}: InspectorOverviewTabProps) {
  const { settings } = useSettingsStore()
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  
  const renderComponent = getRenderComponent(selectedObject)
  const propertyComponent = getPropertyComponent(selectedObject)

  const toggleSectionCollapse = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId)
    } else {
      newCollapsed.add(sectionId)
    }
    setCollapsedSections(newCollapsed)
  }

  return (
    <div className="space-y-2">
      {/* プロパティ */}
      {propertyComponent?.data.properties && Object.entries(propertyComponent.data.properties).map(([key, prop]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-black mb-1">
            {prop.displayName}
          </label>
          <input
            type="text"
            value={prop.value || ''}
            onChange={(e) => handlePropertyChange(key, e.target.value)}
            className="input-field"
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
          className="select-field"
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
                className="input-field-sm"
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
                className="input-field-sm"
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
                    max="1000"
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
                    className="input-field-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-black font-medium">高さ</label>
                  <input
                    type="number"
                    min="30"
                    max="2000"
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
                    className="input-field-sm"
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

      {/* 一括ポート編集 */}
      <div className={`border-t border-gray-200 ${collapsedSections.has('bulkPortEdit') ? 'pt-2' : 'pt-4'}`}>
        <button
          onClick={() => toggleSectionCollapse('bulkPortEdit')}
          className={`flex items-center justify-between w-full text-left hover:bg-gray-50 px-1 py-0.5 rounded ${collapsedSections.has('bulkPortEdit') ? 'mb-1' : 'mb-3'}`}
        >
          <h3 className="text-sm font-medium text-black">一括ポート編集</h3>
          <span className="text-xs text-gray-500">
            {collapsedSections.has('bulkPortEdit') ? '▶' : '▼'}
          </span>
        </button>

        {!collapsedSections.has('bulkPortEdit') && (
          <>
            {(() => {
              const ports = selectedObject.components.filter(comp => comp.type === ComponentType.CONNECTION_PORT)
              const portsBySide = {
                [Side.LEFT]: ports.filter(p => (p as any).data.position?.side === Side.LEFT),
                [Side.RIGHT]: ports.filter(p => (p as any).data.position?.side === Side.RIGHT),
                [Side.TOP]: ports.filter(p => (p as any).data.position?.side === Side.TOP),
                [Side.BOTTOM]: ports.filter(p => (p as any).data.position?.side === Side.BOTTOM)
              }

              return (
                <div className="space-y-3">
                  {/* 辺別一括編集 */}
                  {Object.entries(portsBySide).map(([side, sidePorts]) => {
                    if (sidePorts.length === 0) return null
                    
                    const sideName = {
                      [Side.LEFT]: '左',
                      [Side.RIGHT]: '右', 
                      [Side.TOP]: '上',
                      [Side.BOTTOM]: '下'
                    }[side as Side]

                    return (
                      <div key={side} className="bg-blue-50 p-3 rounded border border-blue-200">
                        <h4 className="text-xs font-medium text-blue-800 mb-2">
                          {sideName}辺 ({sidePorts.length}ポート)
                        </h4>
                        
                        <div className="space-y-2">
                          {/* 一括ポートタイプ変更 */}
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">ポートタイプ一括変更</label>
                            <select
                              onChange={(e) => {
                                const newPortType = e.target.value as PortType
                                if (newPortType) {
                                  const updatedComponents = selectedObject.components.map(comp => {
                                    if (sidePorts.some(p => p.id === comp.id)) {
                                      return {
                                        ...comp,
                                        data: {
                                          ...(comp as any).data,
                                          portType: newPortType,
                                          constraints: {
                                            ...(comp as any).data.constraints,
                                            allowedPortTypes: getCompatiblePorts(newPortType)
                                          }
                                        }
                                      }
                                    }
                                    return comp
                                  })
                                  updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                }
                              }}
                              className="select-field-xs"
                              defaultValue=""
                            >
                              <option value="">選択してください</option>
                              {settings.portTypes.map(portTypeDef => (
                                <option key={portTypeDef.id} value={portTypeDef.name}>
                                  {portTypeDef.displayName}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 一括方向変更 */}
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">方向一括変更</label>
                            <select
                              onChange={(e) => {
                                const newDirection = e.target.value as PortDirection
                                if (newDirection) {
                                  const updatedComponents = selectedObject.components.map(comp => {
                                    if (sidePorts.some(p => p.id === comp.id)) {
                                      return {
                                        ...comp,
                                        data: {
                                          ...(comp as any).data,
                                          direction: newDirection
                                        }
                                      }
                                    }
                                    return comp
                                  })
                                  updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                }
                              }}
                              className="select-field-xs"
                              defaultValue=""
                            >
                              <option value="">選択してください</option>
                              <option value={PortDirection.INPUT}>入力</option>
                              <option value={PortDirection.OUTPUT}>出力</option>
                              <option value={PortDirection.BIDIRECTIONAL}>双方向</option>
                            </select>
                          </div>

                          {/* 一括ラベル設定 */}
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">ラベル一括設定</label>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  const updatedComponents = selectedObject.components.map(comp => {
                                    if (sidePorts.some(p => p.id === comp.id)) {
                                      const index = sidePorts.findIndex(p => p.id === comp.id) + 1
                                      return {
                                        ...comp,
                                        data: {
                                          ...(comp as any).data,
                                          label: `${sideName}${index}`
                                        }
                                      }
                                    }
                                    return comp
                                  })
                                  updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                }}
                                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                              >
                                連番
                              </button>
                              <button
                                onClick={() => {
                                  const updatedComponents = selectedObject.components.map(comp => {
                                    if (sidePorts.some(p => p.id === comp.id)) {
                                      return {
                                        ...comp,
                                        data: {
                                          ...(comp as any).data,
                                          label: ''
                                        }
                                      }
                                    }
                                    return comp
                                  })
                                  updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                }}
                                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                              >
                                クリア
                              </button>
                            </div>
                          </div>

                          {/* 等間隔配置 */}
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">等間隔配置</label>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  const spacing = 100 / (sidePorts.length + 1)
                                  const updatedComponents = selectedObject.components.map(comp => {
                                    const portIndex = sidePorts.findIndex(p => p.id === comp.id)
                                    if (portIndex !== -1) {
                                      return {
                                        ...comp,
                                        data: {
                                          ...(comp as any).data,
                                          position: {
                                            ...(comp as any).data.position,
                                            offset: Math.round(spacing * (portIndex + 1))
                                          }
                                        }
                                      }
                                    }
                                    return comp
                                  })
                                  updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                }}
                                className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                              >
                                等間隔
                              </button>
                              <button
                                onClick={() => {
                                  const updatedComponents = selectedObject.components.map(comp => {
                                    const portIndex = sidePorts.findIndex(p => p.id === comp.id)
                                    if (portIndex !== -1) {
                                      return {
                                        ...comp,
                                        data: {
                                          ...(comp as any).data,
                                          position: {
                                            ...(comp as any).data.position,
                                            offset: 10 + (portIndex * 15)
                                          }
                                        }
                                      }
                                    }
                                    return comp
                                  })
                                  updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                }}
                                className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                              >
                                密集
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* 全ポート一括操作 */}
                  {ports.length > 0 && (
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <h4 className="text-xs font-medium text-yellow-800 mb-2">
                        全ポート一括操作 ({ports.length}ポート)
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            const updatedComponents = selectedObject.components.map(comp => {
                              if (comp.type === ComponentType.CONNECTION_PORT) {
                                return {
                                  ...comp,
                                  data: {
                                    ...(comp as any).data,
                                    portType: PortType.XLR_FEMALE
                                  }
                                }
                              }
                              return comp
                            })
                            updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                          }}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          全てXLR♀
                        </button>
                        <button
                          onClick={() => {
                            const updatedComponents = selectedObject.components.map(comp => {
                              if (comp.type === ComponentType.CONNECTION_PORT) {
                                return {
                                  ...comp,
                                  data: {
                                    ...(comp as any).data,
                                    portType: PortType.XLR_MALE
                                  }
                                }
                              }
                              return comp
                            })
                            updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                          }}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          全てXLR♂
                        </button>
                        <button
                          onClick={() => {
                            const updatedComponents = selectedObject.components.map(comp => {
                              if (comp.type === ComponentType.CONNECTION_PORT) {
                                return {
                                  ...comp,
                                  data: {
                                    ...(comp as any).data,
                                    direction: PortDirection.INPUT
                                  }
                                }
                              }
                              return comp
                            })
                            updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                          }}
                          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          全て入力
                        </button>
                        <button
                          onClick={() => {
                            const updatedComponents = selectedObject.components.map(comp => {
                              if (comp.type === ComponentType.CONNECTION_PORT) {
                                return {
                                  ...comp,
                                  data: {
                                    ...(comp as any).data,
                                    direction: PortDirection.OUTPUT
                                  }
                                }
                              }
                              return comp
                            })
                            updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                          }}
                          className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
                        >
                          全て出力
                        </button>
                      </div>
                    </div>
                  )}

                  {ports.length === 0 && (
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
  )
}

