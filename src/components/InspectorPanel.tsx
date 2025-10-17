import React, { useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useDebounce } from '@/hooks/useDebounce'
import {
  getRenderComponent,
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
  const { project, selectedObjectIds, selectedWireIds, updateEquipmentObject, updateWire } = useProjectStore()
  const { pushState } = useHistoryStore()

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

  const selectedObject = selectedObjectIds.length === 1
    ? project.objects.find(obj => obj.id === selectedObjectIds[0])
    : null

  const selectedWire = selectedWireIds.length === 1
    ? project.wires.find(wire => wire.id === selectedWireIds[0])
    : null

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
                <option value="xlr-cable">XLRケーブル</option>
                <option value="trs-cable">TRS/TSケーブル</option>
                <option value="usb-cable">USBケーブル</option>
                <option value="ethernet-cable">Ethernetケーブル</option>
                <option value="hdmi-cable">HDMIケーブル</option>
                <option value="displayport-cable">DisplayPortケーブル</option>
                <option value="power-cable">電源ケーブル</option>
                <option value="midi-cable">MIDIケーブル</option>
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



      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
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

          {/* 位置情報 */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => toggleSectionCollapse('position')}
              className="flex items-center justify-between w-full text-left mb-2 hover:bg-gray-50 p-1 rounded"
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
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => toggleSectionCollapse('size')}
                className="flex items-center justify-between w-full text-left mb-2 hover:bg-gray-50 p-1 rounded"
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

          {/* コンポーネント管理 */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => toggleSectionCollapse('components')}
              className="flex items-center justify-between w-full text-left mb-3 hover:bg-gray-50 p-1 rounded"
            >
              <h3 className="text-sm font-medium text-black">コンポーネント</h3>
              <span className="text-xs text-gray-500">
                {collapsedSections.has('components') ? '▶' : '▼'}
              </span>
            </button>

            {!collapsedSections.has('components') && (
              <>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={handleAddPort}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    ポート追加
                  </button>
                  {/* 将来的に他のコンポーネント追加ボタンをここに */}
                </div>

                {/* 全コンポーネント表示 */}
                <div className="space-y-3">
                  {selectedObject.components.map(component => {
                    if (component.type === ComponentType.CONNECTION_PORT) {
                      // ポートコンポーネントの詳細表示
                      const port = component as any
                      const isCollapsed = collapsedComponents.has(component.id)
                      return (
                        <div key={component.id} className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="flex justify-between items-start mb-2">
                            <button
                              onClick={() => toggleComponentCollapse(component.id)}
                              className="flex items-center gap-2 flex-1 text-left hover:bg-blue-100 p-1 rounded"
                            >
                              <span className="text-xs text-gray-500">
                                {isCollapsed ? '▶' : '▼'}
                              </span>
                              <span className="text-xs font-medium text-blue-800">CONNECTION PORT</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${component.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {component.enabled ? '有効' : '無効'}
                              </span>
                              {port.data.label && (
                                <span className="text-xs text-blue-600">({port.data.label})</span>
                              )}
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
                                  {Object.values(PortType).map(type => (
                                    <option key={type} value={type}>
                                      {getPortTypeDisplayName(type)}
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
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-black mb-1">配置</label>
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
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-black"
                                  >
                                    <option value={Side.TOP}>上</option>
                                    <option value={Side.RIGHT}>右</option>
                                    <option value={Side.BOTTOM}>下</option>
                                    <option value={Side.LEFT}>左</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-black mb-1">位置 (%)</label>
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
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-black"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    } else {
                      // その他のコンポーネント（RENDER、PROPERTY等）
                      const isCollapsed = collapsedComponents.has(component.id)
                      return (
                        <div key={component.id} className="p-3 bg-gray-50 border border-gray-200 rounded">
                          <button
                            onClick={() => toggleComponentCollapse(component.id)}
                            className="flex items-center justify-between w-full text-left hover:bg-gray-100 p-1 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {isCollapsed ? '▶' : '▼'}
                              </span>
                              <span className="text-xs font-medium text-gray-800 uppercase">{component.type}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${component.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {component.enabled ? '有効' : '無効'}
                              </span>
                            </div>
                            {/* 将来的にコンポーネント固有の操作ボタンを追加 */}
                          </button>

                          {!isCollapsed && (
                            <div className="mt-2 text-xs text-gray-600">
                              {component.type === ComponentType.RENDER && '見た目・形状を制御'}
                              {component.type === ComponentType.PROPERTY && '名前・属性を管理'}
                              {/* 将来のGPUコンポーネント等の説明 */}
                            </div>
                          )}
                        </div>
                      )
                    }
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}