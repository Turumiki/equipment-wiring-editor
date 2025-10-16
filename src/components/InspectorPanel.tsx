import React, { useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useDebounce } from '@/hooks/useDebounce'
import { 
  getRenderComponent, 
  getConnectionPortComponents, 
  getPropertyComponent,
  createConnectionPortComponent
} from '@/utils/componentSystem'
import { ComponentType, Side, PortType, PortDirection } from '@/types'

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
    <div className="h-full flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-black">インスペクター</h2>
        <p className="text-sm text-black">{selectedObject.name}</p>
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'properties'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-black hover:text-gray-700'
          }`}
        >
          プロパティ
        </button>
        <button
          onClick={() => setActiveTab('components')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'components'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-black hover:text-gray-700'
          }`}
        >
          コンポーネント
        </button>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-4">
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
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-black">接続ポート</h3>
                <button
                  onClick={handleAddPort}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  ポート追加
                </button>
              </div>
              <div className="space-y-2">
                {portComponents.map(port => (
                  <div key={port.id} className="p-3 bg-gray-50 rounded text-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="text-black flex-1">
                        <div className="mb-2">
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
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-black"
                            placeholder="ポート名を入力"
                          />
                        </div>
                        <div><strong className="text-black">タイプ:</strong> {getPortTypeDisplayName(port.data.portType)}</div>
                        <div><strong className="text-black">方向:</strong> {port.data.direction === 'input' ? '入力' : port.data.direction === 'output' ? '出力' : '双方向'}</div>
                        <div><strong className="text-black">位置:</strong> {port.data.position.side} ({port.data.position.offset}%)</div>
                      </div>
                      <button
                        onClick={() => handleRemovePort(port.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
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