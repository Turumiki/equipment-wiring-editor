import React, { useState, useMemo, useRef, useLayoutEffect } from 'react'
import { EquipmentTemplate, PortType, PortDirection, EquipmentObject, ConnectionPortComponent, Side } from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useProjectStore } from '@/store/useProjectStore'
import { getConnectionPortComponents, getPropertyComponent, getRenderComponent, calculatePortPosition } from '@/utils/componentSystem'

interface TemplateSelectionDialogProps {
  sourcePortType: PortType
  sourcePortDirection: PortDirection
  sourceObjectId: string
  dropPosition: { x: number; y: number } // 画面上の絶対座標
  flowPosition: { x: number; y: number } // ReactFlow上の座標
  onSelectTemplate: (template: EquipmentTemplate) => void
  onSelectExistingPort: (targetObjectId: string, targetPortId: string) => void
  onClose: () => void
}

type TabType = 'new' | 'existing'

export default function TemplateSelectionDialog({
  sourcePortType,
  sourcePortDirection,
  sourceObjectId,
  dropPosition,
  flowPosition,
  onSelectTemplate,
  onSelectExistingPort,
  onClose
}: TemplateSelectionDialogProps) {
  const { equipmentTemplates } = useSettingsStore()
  const { project } = useProjectStore()
  const [activeTab, setActiveTab] = useState<TabType>('new')
  const [searchQuery, setSearchQuery] = useState('')

  // 互換性のあるテンプレートをフィルタリング
  const compatibleTemplates = useMemo(() => {
    const { settings } = useSettingsStore.getState()
    const sourcePortTypeDef = settings.portTypes.find(pt => pt.id === sourcePortType || pt.name === sourcePortType)
    const compatiblePortTypes = sourcePortTypeDef?.compatibleWith || [sourcePortType]

    // すべてのテンプレート（グローバル + プロジェクト）を取得
    const allTemplates = [...equipmentTemplates, ...project.customTemplates]

    return allTemplates.filter(template => {
      // テンプレートにポート定義がない場合は除外
      if (!template.ports || !Array.isArray(template.ports) || template.ports.length === 0) {
        return false
      }

      // テンプレート内に互換性のあるポートがあるかチェック
      return template.ports.some(port => {
        const portType = port.type as PortType
        const portDirection = port.direction as PortDirection

        // ポートタイプの互換性チェック
        const isTypeCompatible = compatiblePortTypes.includes(portType) || portType === sourcePortType

        // 方向の互換性チェック
        let isDirectionCompatible = false
        if (sourcePortDirection === PortDirection.BIDIRECTIONAL || portDirection === PortDirection.BIDIRECTIONAL) {
          isDirectionCompatible = true
        } else if (sourcePortDirection === PortDirection.OUTPUT && portDirection === PortDirection.INPUT) {
          isDirectionCompatible = true
        } else if (sourcePortDirection === PortDirection.INPUT && portDirection === PortDirection.OUTPUT) {
          isDirectionCompatible = true
        }

        return isTypeCompatible && isDirectionCompatible
      })
    })
  }, [equipmentTemplates, project.customTemplates, sourcePortType, sourcePortDirection])

  // 既存の接続可能な機材とポートを検索・ソート
  const compatibleExistingPorts = useMemo(() => {
    const { settings } = useSettingsStore.getState()
    const sourcePortTypeDef = settings.portTypes.find(pt => pt.id === sourcePortType || pt.name === sourcePortType)
    const compatiblePortTypes = sourcePortTypeDef?.compatibleWith || [sourcePortType]

    const compatiblePorts: {
      equipment: EquipmentObject
      port: ConnectionPortComponent
      distance: number
    }[] = []

    if (!project.objects) return []

    project.objects.forEach(obj => {
      // 自分自身は除外
      if (obj.id === sourceObjectId) return
      if (!obj.position) return // 位置情報がない場合は除外

      const portComponents = getConnectionPortComponents(obj)
      if (!portComponents) return
      
      // 互換性のあるポートを探す
      portComponents.forEach(port => {
        if (!port || !port.data) return

        const portType = port.data.portType
        const portDirection = port.data.direction

        // 接続数のチェック
        // 現在のワイヤー数を確認
        const connectedWiresCount = project.wires.filter(wire => 
          wire.targetPortId === port.id || wire.sourcePortId === port.id
        ).length

        // 最大接続数（-1は無制限）
        const maxConnections = port.data.constraints?.maxConnections ?? -1
        
        // 最大接続数に達している場合は除外
        if (maxConnections !== -1 && connectedWiresCount >= maxConnections) {
          return
        }

        // ポートタイプの互換性チェック
        const isTypeCompatible = compatiblePortTypes.includes(portType) || portType === sourcePortType

        // 方向の互換性チェック
        let isDirectionCompatible = false
        if (sourcePortDirection === PortDirection.BIDIRECTIONAL || portDirection === PortDirection.BIDIRECTIONAL) {
          isDirectionCompatible = true
        } else if (sourcePortDirection === PortDirection.OUTPUT && portDirection === PortDirection.INPUT) {
          isDirectionCompatible = true
        } else if (sourcePortDirection === PortDirection.INPUT && portDirection === PortDirection.OUTPUT) {
          isDirectionCompatible = true
        }

        if (isTypeCompatible && isDirectionCompatible) {
          // 距離計算（ポートの位置とドロップ位置の距離）
          const renderComponent = getRenderComponent(obj)
          const width = renderComponent?.data?.size?.width || 100
          const height = renderComponent?.data?.size?.height || 60
          
          const portPos = calculatePortPosition(
            obj.position || { x: 0, y: 0 },
            { width, height },
            port.data.position || { side: Side.LEFT, offset: 50 }
          )
          
          const distance = Math.sqrt(
            Math.pow(portPos.x - (flowPosition?.x || 0), 2) + 
            Math.pow(portPos.y - (flowPosition?.y || 0), 2)
          )

          compatiblePorts.push({
            equipment: obj,
            port,
            distance
          })
        }
      })
    })

    // 距離が近い順にソート
    return compatiblePorts.sort((a, b) => a.distance - b.distance)
  }, [project.objects, sourceObjectId, sourcePortType, sourcePortDirection, flowPosition])

  // 検索フィルタリング
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return compatibleTemplates
    }

    const query = searchQuery.toLowerCase()
    return compatibleTemplates.filter(template => {
      return (
        template.name.toLowerCase().includes(query) ||
        template.category?.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    })
  }, [compatibleTemplates, searchQuery])

  // 既存ポートのフィルタリング
  const filteredExistingPorts = useMemo(() => {
    if (!searchQuery.trim()) {
      return compatibleExistingPorts
    }

    const query = searchQuery.toLowerCase()
    return compatibleExistingPorts.filter(item => {
      const equipName = getPropertyComponent(item.equipment)?.data.properties.name?.value || item.equipment.name
      const portLabel = item.port.data.label || ''
      return (
        equipName.toLowerCase().includes(query) ||
        portLabel.toLowerCase().includes(query)
      )
    })
  }, [compatibleExistingPorts, searchQuery])

  // ESCキーで閉じる
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // モーダルの位置調整
  const modalRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(dropPosition)

  useLayoutEffect(() => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let x = dropPosition.x
      let y = dropPosition.y

      // 右端の調整
      if (x + rect.width / 2 > viewportWidth - 20) {
        x = viewportWidth - rect.width / 2 - 20
      }
      // 左端の調整
      if (x - rect.width / 2 < 20) {
        x = rect.width / 2 + 20
      }
      // 下端の調整
      if (y + rect.height / 2 > viewportHeight - 20) {
        y = viewportHeight - rect.height / 2 - 20
      }
      // 上端の調整
      if (y - rect.height / 2 < 20) {
        y = rect.height / 2 + 20
      }

      setPosition({ x, y })
    }
  }, [dropPosition, activeTab]) // activeTabが変わると高さが変わる可能性があるため依存配列に追加

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-[90vw] max-w-2xl h-[80vh] flex flex-col"
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              接続先を選択
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'new' 
                ? `${sourcePortType}ポートと互換性のある機材 (${filteredTemplates.length}件)`
                : `接続可能な既存ポート (${filteredExistingPorts.length}件)`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* タブ切り替え */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              activeTab === 'new'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('new')}
          >
            新規機材を追加
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              activeTab === 'existing'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('existing')}
          >
            既存の機材に接続
          </button>
        </div>

        {/* 検索バー */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder={activeTab === 'new' ? "機材名、カテゴリ、説明で検索..." : "機材名、ポート名で検索..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            autoFocus
          />
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'new' ? (
            // 新規機材リスト
            filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? '検索結果が見つかりませんでした' : '互換性のある機材が見つかりませんでした'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      onSelectTemplate(template)
                    }}
                    className="text-left p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-black">{template.name}</div>
                    {template.category && (
                      <div className="text-xs text-gray-500 mt-1">{template.category}</div>
                    )}
                    {template.description && (
                      <div className="text-sm text-gray-600 mt-1 line-clamp-2">{template.description}</div>
                    )}
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )
          ) : (
            // 既存機材リスト
            filteredExistingPorts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? '検索結果が見つかりませんでした' : '接続可能な既存ポートが見つかりませんでした'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {filteredExistingPorts.map((item, index) => {
                  const equipName = getPropertyComponent(item.equipment)?.data.properties.name?.value || item.equipment.name
                  const portLabel = item.port.data.label || item.port.data.portType
                  const portType = item.port.data.portType
                  
                  return (
                    <button
                      key={`${item.equipment.id}-${item.port.id}`}
                      onClick={() => {
                        onSelectExistingPort(item.equipment.id, item.port.id)
                      }}
                      className="text-left p-3 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium text-black">{equipName}</div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          距離: {Math.round(item.distance)}px
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${
                          portType.includes('input') ? 'bg-green-500' : 
                          portType.includes('output') ? 'bg-red-500' : 'bg-blue-500'
                        }`} />
                        <span className="text-sm text-gray-700 font-medium">{portLabel}</span>
                        <span className="text-xs text-gray-500">({portType})</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
