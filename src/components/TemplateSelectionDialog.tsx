import React, { useState, useMemo } from 'react'
import { EquipmentTemplate, PortType, PortDirection } from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useProjectStore } from '@/store/useProjectStore'

interface TemplateSelectionDialogProps {
  sourcePortType: PortType
  sourcePortDirection: PortDirection
  dropPosition: { x: number; y: number }
  onSelect: (template: EquipmentTemplate) => void
  onClose: () => void
}

export default function TemplateSelectionDialog({
  sourcePortType,
  sourcePortDirection,
  dropPosition,
  onSelect,
  onClose
}: TemplateSelectionDialogProps) {
  const { equipmentTemplates } = useSettingsStore()
  const { project } = useProjectStore()
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
  const modalRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(dropPosition)

  React.useLayoutEffect(() => {
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
  }, [dropPosition])

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
              機材を選択
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {sourcePortType}ポートと互換性のある機材 ({filteredTemplates.length}件)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* 検索バー */}
        <div className="p-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="機材名、カテゴリ、説明で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            autoFocus
          />
        </div>

        {/* テンプレート一覧 */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? '検索結果が見つかりませんでした' : '互換性のある機材が見つかりませんでした'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    onSelect(template)
                    onClose()
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
          )}
        </div>
      </div>
    </div>
  )
}

