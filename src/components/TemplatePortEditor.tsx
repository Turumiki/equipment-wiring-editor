import React, { useState, useCallback, useRef } from 'react'
import { SimpleTemplatePort, PortType, PortDirection, Side } from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'
import { getPortTypeBaseName } from '@/utils/portTypeUtils'

interface PortWithId extends SimpleTemplatePort {
  id: string
}

interface TemplatePortEditorProps {
  ports: (SimpleTemplatePort & { id?: string })[]
  onPortsChange: (ports: (SimpleTemplatePort & { id?: string })[]) => void
  size?: { width: number; height: number }
}

export default function TemplatePortEditor({ 
  ports, 
  onPortsChange,
  size = { width: 200, height: 120 }
}: TemplatePortEditorProps) {
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

  // ポートの追加
  const handleAddPort = () => {
    const newPort: SimpleTemplatePort & { id: string } = {
      id: `port-${Date.now()}`,
      side: 'left',
      offset: 50,
      type: PortType.XLR_FEMALE,
      direction: 'input',
      label: `Port ${ports.length + 1}`
    }
    onPortsChange([...ports, newPort])
  }

  // ポートの削除
  const handleDeletePort = (portId: string) => {
    onPortsChange(ports.filter(p => p.id !== portId))
    if (selectedPortId === portId) {
      setSelectedPortId(null)
    }
  }

  // ポートの更新
  const handleUpdatePort = (portId: string, updates: Partial<SimpleTemplatePort & { id?: string }>) => {
    onPortsChange(ports.map(p => {
      const pid = (p as any).id || `port-${ports.indexOf(p)}`
      return pid === portId ? { ...p, ...updates } : p
    }))
  }

  // ポート位置の計算
  const getPortPosition = (port: SimpleTemplatePort) => {
    const { side, offset } = port
    const offsetRatio = offset / 100

    switch (side) {
      case 'top':
        return { x: size.width * offsetRatio, y: 0 }
      case 'right':
        return { x: size.width, y: size.height * offsetRatio }
      case 'bottom':
        return { x: size.width * offsetRatio, y: size.height }
      case 'left':
        return { x: 0, y: size.height * offsetRatio }
      default:
        return { x: 0, y: 0 }
    }
  }

  // ポートタイプの色を取得
  const getPortColor = (portType: string) => {
    const portTypeDef = settings.portTypes.find(pt => pt.id === portType || pt.name === portType)
    return portTypeDef?.color || '#3b82f6'
  }

  // マウス位置からサイドとオフセットを計算
  const getPortPositionFromMouse = (e: React.MouseEvent, side: Side): { side: Side; offset: number } => {
    if (!containerRef.current) return { side, offset: 50 }
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    let offset = 50
    switch (side) {
      case Side.TOP:
      case Side.BOTTOM:
        offset = Math.max(0, Math.min(100, (x / size.width) * 100))
        break
      case Side.LEFT:
      case Side.RIGHT:
        offset = Math.max(0, Math.min(100, (y / size.height) * 100))
        break
    }

    return { side, offset }
  }

  // ドラッグ開始
  const handleDragStart = (e: React.MouseEvent, portId: string) => {
    e.stopPropagation()
    setDraggingPortId(portId)
    setSelectedPortId(portId)
  }

  // ドラッグ中
  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (!draggingPortId) return

    const port = ports.find(p => p.id === draggingPortId)
    if (!port) return

    // 最も近いサイドを決定
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const centerX = size.width / 2
    const centerY = size.height / 2
    const relX = x - centerX
    const relY = y - centerY

    let newSide: Side = port.side as Side
    let offset = port.offset

    if (Math.abs(relX) > Math.abs(relY)) {
      // 左右
      newSide = relX > 0 ? Side.RIGHT : Side.LEFT
      offset = relX > 0 
        ? Math.max(0, Math.min(100, (y / size.height) * 100))
        : Math.max(0, Math.min(100, (y / size.height) * 100))
    } else {
      // 上下
      newSide = relY > 0 ? Side.BOTTOM : Side.TOP
      offset = relY > 0
        ? Math.max(0, Math.min(100, (x / size.width) * 100))
        : Math.max(0, Math.min(100, (x / size.width) * 100))
    }

    handleUpdatePort(draggingPortId, { side: newSide, offset })
  }, [draggingPortId, ports, size])

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggingPortId(null)
  }

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

  // マウスイベントの設定
  React.useEffect(() => {
    if (draggingPortId) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const port = ports.find(p => p.id === draggingPortId)
        if (!port) return

        const centerX = size.width / 2
        const centerY = size.height / 2
        const relX = x - centerX
        const relY = y - centerY

        let newSide: Side = port.side as Side
        let offset = port.offset

        if (Math.abs(relX) > Math.abs(relY)) {
          newSide = relX > 0 ? Side.RIGHT : Side.LEFT
          offset = Math.max(0, Math.min(100, (y / size.height) * 100))
        } else {
          newSide = relY > 0 ? Side.BOTTOM : Side.TOP
          offset = Math.max(0, Math.min(100, (x / size.width) * 100))
        }

        handleUpdatePort(draggingPortId, { side: newSide, offset })
      }

      const handleMouseUp = () => {
        setDraggingPortId(null)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggingPortId, ports, size])

  const selectedPort = ports.find(p => p.id === selectedPortId)

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
          style={{ width: '100%', height: '400px', cursor: isPanning ? 'grabbing' : 'grab' }}
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
            onMouseMove={handleDrag}
            onMouseUp={handleDragEnd}
          >
          {/* ポート表示 */}
          {ports.map((port, index) => {
            const portId = (port as any).id || `port-${index}`
            const pos = getPortPosition(port)
            const isSelected = selectedPortId === portId
            const color = getPortColor(port.type)

            return (
              <div
                key={portId}
                className={`absolute cursor-move transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 z-10' : ''
                }`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedPortId(port.id || null)
                }}
                onMouseDown={(e) => handleDragStart(e, portId)}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: color }}
                  title={`${port.label} (${getPortTypeBaseName(port.type)})`}
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
        {ports.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">ポートがありません</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {ports.map((port, index) => {
              const portId = (port as any).id || `port-${index}`
              const isSelected = selectedPortId === portId
              const color = getPortColor(port.type)

              return (
                <div
                  key={portId}
                  className={`p-3 border rounded-lg ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                  }`}
                  onClick={() => setSelectedPortId(portId)}
                >
                  <div className="flex items-center gap-3">
                    {/* カラーインジケーター */}
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow"
                      style={{ backgroundColor: color }}
                    />

                    {/* ポート情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={port.label}
                          onChange={(e) => handleUpdatePort(portId, { label: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded text-black bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex gap-2 mt-1">
                        <select
                          value={port.type}
                          onChange={(e) => handleUpdatePort(portId, { type: e.target.value as PortType })}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-black bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {settings.portTypes.map(pt => (
                            <option key={pt.id} value={pt.id}>{pt.displayName}</option>
                          ))}
                        </select>
                        <select
                          value={port.direction}
                          onChange={(e) => handleUpdatePort(portId, { direction: e.target.value as PortDirection })}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-black bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="input">入力</option>
                          <option value="output">出力</option>
                          <option value="bidirectional">双方向</option>
                        </select>
                        <select
                          value={port.side}
                          onChange={(e) => handleUpdatePort(portId, { side: e.target.value as Side })}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-black bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="top">上</option>
                          <option value="right">右</option>
                          <option value="bottom">下</option>
                          <option value="left">左</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={port.offset}
                          onChange={(e) => handleUpdatePort(portId, { offset: Number(e.target.value) })}
                          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-black bg-gray-50"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* 削除ボタン */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePort(portId)
                      }}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      削除
                    </button>
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

