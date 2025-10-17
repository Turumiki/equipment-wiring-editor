import React, { useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useDebounce } from '@/hooks/useDebounce'
import { 
  getRenderComponent, 
  getConnectionPortComponents, 
  getPropertyComponent,
  createConnectionPortComponent
} from '@/utils/componentSystem'
import { ComponentType, Side, PortType, PortDirection } from '@/types'

// ポートタイプの互換性を取得
function getCompatiblePorts(type: PortType): PortType[] {
  const basicCompatibility: Partial<Record<PortType, PortType[]>> = {
    [PortType.XLR_MALE]: [PortType.XLR_FEMALE],
    [PortType.XLR_FEMALE]: [PortType.XLR_MALE],
    [PortType.TRS_QUARTER]: [PortType.TRS_QUARTER, PortType.TS_QUARTER],
    [PortType.TS_QUARTER]: [PortType.TS_QUARTER, PortType.TRS_QUARTER],
    [PortType.USB_A]: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
    [PortType.USB_B]: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
    [PortType.USB_C]: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
    [PortType.ETHERNET]: [PortType.ETHERNET, PortType.DANTE],
    [PortType.DANTE]: [PortType.DANTE, PortType.ETHERNET],
    [PortType.HDMI]: [PortType.HDMI],
    [PortType.TRS_MINI]: [PortType.TRS_MINI],
    [PortType.POWER_AC]: [PortType.POWER_AC],
    [PortType.POWER_DC]: [PortType.POWER_DC],
    [PortType.RCA]: [PortType.RCA],
    [PortType.SPEAKON]: [PortType.SPEAKON],
    [PortType.AES_EBU]: [PortType.AES_EBU],
    [PortType.SPDIF]: [PortType.SPDIF],
    [PortType.ADAT]: [PortType.ADAT],
    [PortType.DISPLAYPORT]: [PortType.DISPLAYPORT],
    [PortType.DVI]: [PortType.DVI],
    [PortType.VGA]: [PortType.VGA],
    [PortType.SDI]: [PortType.SDI],
    [PortType.COMPOSITE]: [PortType.COMPOSITE],
    [PortType.THUNDERBOLT]: [PortType.THUNDERBOLT],
    [PortType.IEC]: [PortType.IEC],
    [PortType.MIDI]: [PortType.MIDI],
    [PortType.CUSTOM]: [PortType.CUSTOM]
  }
  
  return basicCompatibility[type] || [type]
}

// ポートタイプの表示名を取得
function getPortTypeDisplayName(portType: PortType): string {
  const displayNames: Record<PortType, string> = {
    [PortType.XLR_MALE]: 'XLR オス',
    [PortType.XLR_FEMALE]: 'XLR メス',
    [PortType.TRS_QUARTER]: 'TRS 6.3mm',
    [PortType.TS_QUARTER]: 'TS 6.3mm',
    [PortType.TRS_MINI]: 'TRS 3.5mm',
    [PortType.RCA]: 'RCA',
    [PortType.SPEAKON]: 'Speakon',
    [PortType.AES_EBU]: 'AES/EBU',
    [PortType.SPDIF]: 'S/PDIF',
    [PortType.ADAT]: 'ADAT',
    [PortType.DANTE]: 'Dante',
    [PortType.HDMI]: 'HDMI',
    [PortType.DISPLAYPORT]: 'DisplayPort',
    [PortType.DVI]: 'DVI',
    [PortType.VGA]: 'VGA',
    [PortType.SDI]: 'SDI',
    [PortType.COMPOSITE]: 'コンポジット',
    [PortType.USB_A]: 'USB-A',
    [PortType.USB_B]: 'USB-B',
    [PortType.USB_C]: 'USB-C',
    [PortType.THUNDERBOLT]: 'Thunderbolt',
    [PortType.ETHERNET]: 'Ethernet',
    [PortType.POWER_AC]: 'AC電源',
    [PortType.POWER_DC]: 'DC電源',
    [PortType.IEC]: 'IEC',
    [PortType.MIDI]: 'MIDI',
    [PortType.CUSTOM]: 'カスタム'
  }
  return displayNames[portType] || portType
}

export default function InspectorPanel() {
  const { project, selectedObjectIds, updateEquipmentObject } = useProjectStore()
  const { pushState } = useHistoryStore()
  const [activeTab, setActiveTab] = useState<'properties' | 'components'>('properties')
  
  // 編集完了時に履歴を保存（1秒後）
  useDebounce(() => {
    pushState(project)
  }, 1000, [project])
  
  const selectedObject = selectedObjectIds.length === 1 
    ? project.objects.find(obj => obj.id === selectedObjectIds[0])
    : null

  if (!selectedObject) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>オブジェクトを選択してください</p>
      </div>
    )
  }

  const renderComponent = getRenderComponent(selectedObject)
  const portComponents = getConnectionPortComponents(selectedObject)
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

      {/* タブ */}
      <div className="flex border-b border-gray-400">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 px-2 py-1 text-xs font-bold border-r border-gray-400 ${
            activeTab === 'properties'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 text-black hover:bg-gray-400'
          }`}
        >
          PROPERTIES
        </button>
        <button
          onClick={() => setActiveTab('components')}
          className={`flex-1 px-2 py-1 text-xs font-bold ${
            activeTab === 'components'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 text-black hover:bg-gray-400'
          }`}
        >
          COMPONENTS
        </button>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-1">
        {activeTab === 'properties' && (
          <div className="space-y-4">
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
            
            {/* 位置情報 */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-black mb-2">位置</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-black font-medium">X</label>
                  <input
                    type="number"
                    value={Math.round(selectedObject.position.x)}
                    onChange={(e) => updateEquipmentObject(selectedObject.id, {
                      position: { ...selectedObject.position, x: Number(e.target.value) }
                    }, true)} // 履歴保存をスキップ
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
                    }, true)} // 履歴保存をスキップ
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black"
                  />
                </div>
              </div>
            </div>

            {/* サイズ情報 */}
            {renderComponent && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-black mb-2">サイズ</h3>
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
              </div>
            )}
          </div>
        )}

        {activeTab === 'components' && (
          <div className="space-y-4">
            {/* コンポーネント一覧 */}
            <div>
              <h3 className="text-sm font-medium text-black mb-2">アタッチされたコンポーネント</h3>
              <div className="space-y-2">
                {selectedObject.components.map(component => (
                  <div key={component.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className="text-sm font-medium text-black">{component.type}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                        component.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {component.enabled ? '有効' : '無効'}
                      </span>
                    </div>
                    {component.type === ComponentType.CONNECTION_PORT && (
                      <button
                        onClick={() => handleRemovePort(component.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ポート管理 */}
            <div className="pt-2 border-t border-gray-400">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-xs font-bold text-black uppercase">CONNECTION PORTS</h3>
                <button
                  onClick={handleAddPort}
                  className="px-2 py-1 text-xs bg-blue-600 text-white border border-blue-800 hover:bg-blue-700 font-bold"
                >
                  ADD PORT
                </button>
              </div>
              <div className="space-y-2">
                {portComponents.map(port => (
                  <div key={port.id} className="p-2 bg-gray-200 border border-gray-400 text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="text-black flex-1 space-y-2">
                        {/* ラベル */}
                        <div>
                          <label className="block text-xs font-bold text-black mb-1">LABEL</label>
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
                            className="w-full px-1 py-1 text-xs border border-gray-400 bg-white text-black"
                            placeholder="Port name"
                          />
                        </div>

                        {/* ポートタイプ */}
                        <div>
                          <label className="block text-xs font-bold text-black mb-1">TYPE</label>
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
                            className="w-full px-1 py-1 text-xs border border-gray-400 bg-white text-black"
                          >
                            {Object.values(PortType).map(type => (
                              <option key={type} value={type}>
                                {getPortTypeDisplayName(type)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 方向 */}
                        <div>
                          <label className="block text-xs font-bold text-black mb-1">DIRECTION</label>
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
                            className="w-full px-1 py-1 text-xs border border-gray-400 bg-white text-black"
                          >
                            <option value={PortDirection.INPUT}>INPUT</option>
                            <option value={PortDirection.OUTPUT}>OUTPUT</option>
                            <option value={PortDirection.BIDIRECTIONAL}>BIDIRECTIONAL</option>
                          </select>
                        </div>

                        {/* 位置 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-black mb-1">SIDE</label>
                            <select
                              value={port.data.position.side}
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
                                updateEquipmentObject(selectedObject.id, { components: updatedComponents }, true)
                              }}
                              className="w-full px-1 py-1 text-xs border border-gray-400 bg-white text-black"
                            >
                              <option value={Side.TOP}>TOP</option>
                              <option value={Side.RIGHT}>RIGHT</option>
                              <option value={Side.BOTTOM}>BOTTOM</option>
                              <option value={Side.LEFT}>LEFT</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-black mb-1">OFFSET (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={port.data.position.offset}
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
                              className="w-full px-1 py-1 text-xs border border-gray-400 bg-white text-black"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemovePort(port.id)}
                        className="text-black hover:bg-gray-300 px-1 py-1 text-xs font-bold ml-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  )
}