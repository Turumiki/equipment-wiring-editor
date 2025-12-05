import React, { useState, useCallback, useRef, useMemo } from 'react'
import { ComponentType, Side, PortType, PortDirection, EquipmentObject, ConnectionPortComponent } from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'
import { getRenderComponent, getConnectionPortComponents, createConnectionPortComponent } from '@/utils/componentSystem'

interface EquipmentPortEditorProps {
  equipmentObject: EquipmentObject
  onPortsChange: (components: any[]) => void
}

export default function EquipmentPortEditor({ 
  equipmentObject,
  onPortsChange
}: EquipmentPortEditorProps) {
  const { settings } = useSettingsStore()
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null)
  const [draggingPortId, setDraggingPortId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  
  // ズームとパンの状態
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })

  const renderComponent = getRenderComponent(equipmentObject)
  const portComponents = getConnectionPortComponents(equipmentObject)
  const size = renderComponent?.data.size || { width: 200, height: 120 }

  // ポートの追加
  const handleAddPort = () => {
    const newPort = createConnectionPortComponent(
      Side.LEFT,
      50,
      PortType.XLR_FEMALE,
      PortDirection.INPUT,
      `Port ${portComponents.length + 1}`
    )
    
    const updatedComponents = [...equipmentObject.components, newPort]
    onPortsChange(updatedComponents)
  }

  // ポートの削除
  const handleDeletePort = (portId: string) => {
    const updatedComponents = equipmentObject.components.filter(comp => comp.id !== portId)
    onPortsChange(updatedComponents)
    if (selectedPortId === portId) {
      setSelectedPortId(null)
    }
  }

  // ポートの更新
  const handleUpdatePort = (portId: string, updates: Partial<ConnectionPortComponent['data']>) => {
    const updatedComponents = equipmentObject.components.map(comp => {
      if (comp.id === portId && comp.type === ComponentType.CONNECTION_PORT) {
        return {
          ...comp,
          data: {
            ...comp.data,
            ...updates
          }
        }
      }
      return comp
    })
    onPortsChange(updatedComponents)
  }

  // ポート位置の計算
  const getPortPosition = (port: ConnectionPortComponent) => {
    const side = port.data.position?.side || Side.LEFT
    const offset = port.data.position?.offset || 50
    const offsetRatio = offset / 100

    switch (side) {
      case Side.TOP:
        return { x: size.width * offsetRatio, y: 0 }
      case Side.RIGHT:
        return { x: size.width, y: size.height * offsetRatio }
      case Side.BOTTOM:
        return { x: size.width * offsetRatio, y: size.height }
      case Side.LEFT:
        return { x: 0, y: size.height * offsetRatio }
      default:
        return { x: 0, y: 0 }
    }
  }

  // ポートタイプの色を取得
  const getPortColor = (portType: PortType) => {
    const portTypeDef = settings.portTypes.find(pt => pt.id === portType || pt.name === portType)
    return portTypeDef?.color || '#3b82f6'
  }

  // ポートタイプの表示名を取得
  const getPortTypeDisplayName = (portType: PortType) => {
    const portTypeDef = settings.portTypes.find(pt => pt.id === portType || pt.name === portType)
    return portTypeDef?.displayName || portType
  }

  // ドラッグ開始
  const handleDragStart = (e: React.MouseEvent, portId: string) => {
    e.stopPropagation()
    setDraggingPortId(portId)
    setSelectedPortId(portId)
  }

  // ドラッグ処理
  React.useEffect(() => {
    if (!draggingPortId) return

    let rafId: number | null = null

    const handleMouseMove = (e: MouseEvent) => {
      if (!previewContainerRef.current || !containerRef.current) return
      
      // コンテナの実際の位置を取得（transformが適用された後の位置）
      // パンとズームは既に反映されている
      const containerRect = containerRef.current.getBoundingClientRect()
      
      // マウス位置をコンテナ基準に変換（コンテナの左上角を原点とする）
      const mouseX = e.clientX - containerRect.left
      const mouseY = e.clientY - containerRect.top
      
      // ズームを考慮して実際のコンテナ内の座標に変換
      // getBoundingClientRect()で取得した位置は既にtransformが適用された後の実際の位置
      // ズームで割ることで、実際のコンテナサイズでの座標に変換
      const actualX = mouseX / zoom
      const actualY = mouseY / zoom

      const port = portComponents.find(p => p.id === draggingPortId)
      if (!port) return

      let newSide: Side = port.data.position?.side || Side.LEFT
      let offset = port.data.position?.offset || 50

      // コンテナの中心からの相対位置で判定
      const centerX = size.width / 2
      const centerY = size.height / 2
      const relX = actualX - centerX
      const relY = actualY - centerY

      if (Math.abs(relX) > Math.abs(relY)) {
        newSide = relX > 0 ? Side.RIGHT : Side.LEFT
        // コンテナの高さに対する相対位置（0-100%）
        offset = Math.max(0, Math.min(100, (actualY / size.height) * 100))
      } else {
        newSide = relY > 0 ? Side.BOTTOM : Side.TOP
        // コンテナの幅に対する相対位置（0-100%）
        offset = Math.max(0, Math.min(100, (actualX / size.width) * 100))
      }

      // requestAnimationFrameでスムーズに更新
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }

      rafId = requestAnimationFrame(() => {
        const updatedComponents = equipmentObject.components.map(comp => {
          if (comp.id === draggingPortId && comp.type === ComponentType.CONNECTION_PORT) {
            return {
              ...comp,
              data: {
                ...comp.data,
                position: {
                  side: newSide,
                  offset: offset
                }
              }
            }
          }
          return comp
        })
        onPortsChange(updatedComponents)
      })
    }

    const handleMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      setDraggingPortId(null)
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingPortId, portComponents, size, equipmentObject.components, onPortsChange, zoom, pan])

  // 中ボタンドラッグでパン開始
  const handleMiddleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // 中ボタン
      e.preventDefault()
      setIsPanning(true)
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    }
  }

  // パン中
  const handlePanMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y
    })
  }, [isPanning])

  // パン終了
  const handlePanEnd = () => {
    setIsPanning(false)
  }

  // ホイールでズーム
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta))
    setZoom(newZoom)
  }

  // パン用のイベントリスナー
  React.useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove)
      document.addEventListener('mouseup', handlePanEnd)
      return () => {
        document.removeEventListener('mousemove', handlePanMove)
        document.removeEventListener('mouseup', handlePanEnd)
      }
    }
  }, [isPanning, handlePanMove])

  const selectedPort = portComponents.find(p => p.id === selectedPortId)

  return (
    <div className="space-y-4">
      {/* プレビューエリア */}
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-black">ポート配置プレビュー</h4>
          <button
            onClick={handleAddPort}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + ポート追加
          </button>
        </div>
        
        <div 
          ref={previewContainerRef}
          className="relative overflow-hidden border-2 border-gray-400 bg-gray-50 mx-auto"
          style={{ width: '100%', height: '200px', cursor: isPanning ? 'grabbing' : 'grab' }}
          onMouseDown={handleMiddleMouseDown}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()} // 中ボタンのコンテキストメニューを無効化
        >
          <div
            ref={containerRef}
            className="relative mx-auto border-2 border-gray-400 bg-gray-50"
            style={{ 
              width: size.width, 
              height: size.height,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
          {/* ポート表示 */}
          {portComponents.map((port) => {
            const pos = getPortPosition(port)
            const isSelected = selectedPortId === port.id
            const color = getPortColor(port.data.portType)

            return (
              <div
                key={port.id}
                className={`absolute cursor-move ${
                  draggingPortId === port.id ? '' : 'transition-all'
                } ${
                  isSelected ? 'ring-2 ring-blue-500 z-10' : ''
                }`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedPortId(port.id)
                }}
                onMouseDown={(e) => handleDragStart(e, port.id)}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: color }}
                  title={`${port.data.label || ''} (${getPortTypeDisplayName(port.data.portType)})`}
                />
              </div>
            )
          })}
          </div>
        </div>
      </div>

      {/* ポート一覧と編集 */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h4 className="text-sm font-medium text-black mb-3">ポート一覧</h4>
        {portComponents.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">ポートがありません</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {portComponents.map((port) => {
              const isSelected = selectedPortId === port.id
              const color = getPortColor(port.data.portType)

              return (
                <div
                  key={port.id}
                  className={`p-3 border rounded-lg ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                  }`}
                  onClick={() => setSelectedPortId(port.id)}
                >
                  <div className="flex items-start gap-2">
                    {/* カラーインジケーター */}
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow flex-shrink-0 mt-1"
                      style={{ backgroundColor: color }}
                    />

                    {/* ポート情報 */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="mb-2">
                        <input
                          type="text"
                          value={port.data.label || ''}
                          onChange={(e) => handleUpdatePort(port.id, { label: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-black bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={port.data.portType}
                          onChange={(e) => handleUpdatePort(port.id, { portType: e.target.value as PortType })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-black bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {settings.portTypes.map(pt => (
                            <option key={pt.id} value={pt.id}>{pt.displayName}</option>
                          ))}
                        </select>
                        <select
                          value={port.data.direction}
                          onChange={(e) => handleUpdatePort(port.id, { direction: e.target.value as PortDirection })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-black bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value={PortDirection.INPUT}>入力</option>
                          <option value={PortDirection.OUTPUT}>出力</option>
                          <option value={PortDirection.BIDIRECTIONAL}>双方向</option>
                        </select>
                        <select
                          value={port.data.position?.side || Side.LEFT}
                          onChange={(e) => handleUpdatePort(port.id, { 
                            position: {
                              ...port.data.position,
                              side: e.target.value as Side
                            }
                          })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-black bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value={Side.TOP}>上</option>
                          <option value={Side.RIGHT}>右</option>
                          <option value={Side.BOTTOM}>下</option>
                          <option value={Side.LEFT}>左</option>
                        </select>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={port.data.position?.offset || 50}
                            onChange={(e) => handleUpdatePort(port.id, { 
                              position: {
                                ...port.data.position,
                                offset: Number(e.target.value)
                              }
                            })}
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-black bg-gray-50"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePort(port.id)
                            }}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 flex-shrink-0"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

