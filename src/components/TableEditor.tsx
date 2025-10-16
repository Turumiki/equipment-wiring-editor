import React, { useState, useMemo } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { ConnectionTableRow, WireType } from '@/types'
import { getConnectionPortComponents, getPropertyComponent } from '@/utils/componentSystem'

interface TableEditorProps {
  onClose: () => void
}

export default function TableEditor({ onClose }: TableEditorProps) {
  const { project, removeWire, addWire, updateEquipmentObject } = useProjectStore()
  const [activeTab, setActiveTab] = useState<'connections' | 'equipment'>('connections')
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null)

  // 接続テーブルデータの生成
  const connectionRows: ConnectionTableRow[] = useMemo(() => {
    return project.wires.map(wire => {
      const sourceObject = project.objects.find(obj => obj.id === wire.sourceObjectId)
      const targetObject = project.objects.find(obj => obj.id === wire.targetObjectId)
      
      const sourceObjectName = getPropertyComponent(sourceObject!)?.data.properties.name?.value || sourceObject?.name || 'Unknown'
      const targetObjectName = getPropertyComponent(targetObject!)?.data.properties.name?.value || targetObject?.name || 'Unknown'
      
      const sourcePort = getConnectionPortComponents(sourceObject!).find(port => port.id === wire.sourcePortId)
      const targetPort = getConnectionPortComponents(targetObject!).find(port => port.id === wire.targetPortId)

      return {
        id: wire.id,
        sourceObject: sourceObjectName,
        sourcePort: sourcePort?.data.label || sourcePort?.data.portType || 'Unknown',
        targetObject: targetObjectName,
        targetPort: targetPort?.data.label || targetPort?.data.portType || 'Unknown',
        wireType: wire.wireType,
        label: wire.label,
        notes: ''
      }
    })
  }, [project.wires, project.objects])

  // 機材テーブルデータの生成
  const equipmentRows = useMemo(() => {
    return project.objects.map(obj => {
      const propertyComponent = getPropertyComponent(obj)
      const portComponents = getConnectionPortComponents(obj)
      const connectionCount = project.wires.filter(wire => 
        wire.sourceObjectId === obj.id || wire.targetObjectId === obj.id
      ).length

      return {
        id: obj.id,
        name: propertyComponent?.data.properties.name?.value || obj.name,
        type: obj.templateId || 'カスタム',
        position: `${Math.round(obj.position.x)}, ${Math.round(obj.position.y)}`,
        properties: propertyComponent?.data.properties || {},
        portCount: portComponents.length,
        connectionCount
      }
    })
  }, [project.objects, project.wires])

  const handleDeleteConnection = (wireId: string) => {
    if (confirm('この接続を削除しますか？')) {
      removeWire(wireId)
    }
  }

  const handleUpdateWireType = (wireId: string, newWireType: WireType) => {
    const wire = project.wires.find(w => w.id === wireId)
    if (wire) {
      const updatedWire = { ...wire, wireType: newWireType }
      // ワイヤーの更新（現在のストアには更新メソッドがないため、削除→追加で対応）
      removeWire(wireId)
      addWire(updatedWire)
    }
  }

  const handleUpdateWireLabel = (wireId: string, newLabel: string) => {
    const wire = project.wires.find(w => w.id === wireId)
    if (wire) {
      const updatedWire = { ...wire, label: newLabel }
      removeWire(wireId)
      addWire(updatedWire)
    }
  }

  const handleUpdateEquipmentName = (objectId: string, newName: string) => {
    const obj = project.objects.find(o => o.id === objectId)
    if (obj) {
      const propertyComponent = getPropertyComponent(obj)
      if (propertyComponent) {
        const updatedProperty = {
          ...propertyComponent,
          data: {
            ...propertyComponent.data,
            properties: {
              ...propertyComponent.data.properties,
              name: {
                ...propertyComponent.data.properties.name,
                value: newName
              }
            }
          }
        }
        
        const updatedComponents = obj.components.map(comp =>
          comp.id === propertyComponent.id ? updatedProperty : comp
        )
        
        updateEquipmentObject(objectId, { 
          components: updatedComponents,
          name: newName
        })
      }
    }
  }

  const exportToCSV = () => {
    if (activeTab === 'connections') {
      const headers = ['接続元機材', '接続元ポート', '接続先機材', '接続先ポート', 'ワイヤータイプ', 'ラベル']
      const csvContent = [
        headers.join(','),
        ...connectionRows.map(row => [
          row.sourceObject,
          row.sourcePort,
          row.targetObject,
          row.targetPort,
          row.wireType,
          row.label || ''
        ].join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = '接続情報.csv'
      link.click()
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-black">テーブルエディタ</h2>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
            >
              CSV出力
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
          onClick={() => setActiveTab('connections')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'connections'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-black hover:text-gray-700'
          }`}
        >
          接続情報 ({connectionRows.length})
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'equipment'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-black hover:text-gray-700'
          }`}
        >
          機材一覧 ({equipmentRows.length})
        </button>
      </div>

      {/* テーブルコンテンツ */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'connections' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-black">接続元機材</th>
                <th className="px-4 py-2 text-left font-medium text-black">接続元ポート</th>
                <th className="px-4 py-2 text-left font-medium text-black">接続先機材</th>
                <th className="px-4 py-2 text-left font-medium text-black">接続先ポート</th>
                <th className="px-4 py-2 text-left font-medium text-black">タイプ</th>
                <th className="px-4 py-2 text-left font-medium text-black">ラベル</th>
                <th className="px-4 py-2 text-left font-medium text-black">操作</th>
              </tr>
            </thead>
            <tbody>
              {connectionRows.map(row => (
                <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-2 text-black">{row.sourceObject}</td>
                  <td className="px-4 py-2 text-black">{row.sourcePort}</td>
                  <td className="px-4 py-2 text-black">{row.targetObject}</td>
                  <td className="px-4 py-2 text-black">{row.targetPort}</td>
                  <td className="px-4 py-2">
                    <select
                      value={row.wireType}
                      onChange={(e) => handleUpdateWireType(row.id, e.target.value as WireType)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 text-black"
                    >
                      <option value="power">power</option>
                      <option value="signal">signal</option>
                      <option value="data">data</option>
                      <option value="ground">ground</option>
                      <option value="custom">custom</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row.label || ''}
                      onChange={(e) => handleUpdateWireLabel(row.id, e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-black"
                      placeholder="ラベル"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDeleteConnection(row.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'equipment' && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-black">名前</th>
                <th className="px-4 py-2 text-left font-medium text-black">タイプ</th>
                <th className="px-4 py-2 text-left font-medium text-black">位置</th>
                <th className="px-4 py-2 text-left font-medium text-black">ポート数</th>
                <th className="px-4 py-2 text-left font-medium text-black">接続数</th>
              </tr>
            </thead>
            <tbody>
              {equipmentRows.map(row => (
                <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => handleUpdateEquipmentName(row.id, e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1 font-medium text-black"
                    />
                  </td>
                  <td className="px-4 py-2 text-black">{row.type}</td>
                  <td className="px-4 py-2 text-black">{row.position}</td>
                  <td className="px-4 py-2 text-black">{row.portCount}</td>
                  <td className="px-4 py-2 text-black">{row.connectionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}