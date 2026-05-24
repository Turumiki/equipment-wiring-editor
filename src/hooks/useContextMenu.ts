import { useCallback, useState } from 'react'
import { Node, Edge } from 'reactflow'
import { useProjectStore } from '@/store/useProjectStore'
import { EquipmentObject } from '@/types'

interface ContextMenu {
  x: number
  y: number
  type: 'canvas' | 'node' | 'edge'
  targetId?: string
}

export function useContextMenu(
  selectedObjectIds: string[],
  selectedWireIds: string[],
  project: { objects: EquipmentObject[] },
  setShowSaveTemplateDialog: (obj: EquipmentObject | null) => void
) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const {
    setSelectedObjects,
    setSelectedWires,
    copySelected,
    pasteSelected,
    duplicateSelected,
    alignSelected,
    distributeSelected,
    removeEquipmentObject,
    removeWire
  } = useProjectStore()

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'canvas'
    })
  }, [])

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      targetId: node.id
    })
  }, [])

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'edge',
      targetId: edge.id
    })
  }, [])

  const getContextMenuItems = useCallback(() => {
    if (!contextMenu) return []

    switch (contextMenu.type) {
      case 'canvas':
        const hasSelection = selectedObjectIds.length > 0 || selectedWireIds.length > 0
        const hasBothTypes = selectedObjectIds.length > 0 && selectedWireIds.length > 0
        const hasMultipleObjects = selectedObjectIds.length > 1
        const { canPaste: canPasteFromStore } = useProjectStore.getState()
        
        return [
          {
            label: '貼り付け',
            onClick: () => {
              pasteSelected()
            },
            disabled: !canPasteFromStore()
          },
          ...(hasSelection ? [
            { separator: true } as const,
            ...(hasBothTypes ? [
              {
                label: '機材のみ選択',
                onClick: () => {
                  setSelectedWires([])
                }
              },
              {
                label: 'エッジのみ選択',
                onClick: () => {
                  setSelectedObjects([])
                }
              },
              { separator: true } as const
            ] : []),
            ...(hasMultipleObjects ? [
              {
                label: '左揃え',
                onClick: () => alignSelected('left')
              },
              {
                label: '右揃え',
                onClick: () => alignSelected('right')
              },
              {
                label: '上揃え',
                onClick: () => alignSelected('top')
              },
              {
                label: '下揃え',
                onClick: () => alignSelected('bottom')
              },
              ...(selectedObjectIds.length > 2 ? [
                { separator: true } as const,
                {
                  label: '水平分散',
                  onClick: () => distributeSelected('horizontal')
                },
                {
                  label: '垂直分散',
                  onClick: () => distributeSelected('vertical')
                }
              ] : []),
              { separator: true } as const
            ] : [])
          ] : [])
        ]

      case 'node':
        const isSelected = selectedObjectIds.includes(contextMenu.targetId!)
        return [
          {
            label: 'コピー',
            onClick: () => {
              if (!isSelected) {
                setSelectedObjects([contextMenu.targetId!])
              }
              copySelected()
            }
          },
          {
            label: '複製',
            onClick: () => {
              if (!isSelected) {
                setSelectedObjects([contextMenu.targetId!])
              }
              duplicateSelected()
            }
          },
          { separator: true } as const,
          ...(selectedObjectIds.length > 1 ? [
            {
              label: '左揃え',
              onClick: () => alignSelected('left')
            },
            {
              label: '右揃え',
              onClick: () => alignSelected('right')
            },
            {
              label: '上揃え',
              onClick: () => alignSelected('top')
            },
            {
              label: '下揃え',
              onClick: () => alignSelected('bottom')
            },
            ...(selectedObjectIds.length > 2 ? [
              { separator: true } as const,
              {
                label: '水平分散',
                onClick: () => distributeSelected('horizontal')
              },
              {
                label: '垂直分散',
                onClick: () => distributeSelected('vertical')
              }
            ] : []),
            { separator: true } as const
          ] : []),
          {
            label: 'テンプレートとして保存',
            onClick: () => {
              const targetId = contextMenu.targetId!
              const targetObject = project.objects.find(obj => obj.id === targetId)
              if (targetObject) {
                setShowSaveTemplateDialog(targetObject)
              }
            }
          },
          { separator: true } as const,
          {
            label: '削除',
            onClick: () => {
              if (isSelected) {
                selectedObjectIds.forEach(id => removeEquipmentObject(id))
              } else {
                removeEquipmentObject(contextMenu.targetId!)
              }
            }
          }
        ]

      case 'edge':
        return [
          {
            label: '再接続モード',
            onClick: () => {
              // エッジを選択状態にして再接続を促す
              setSelectedWires([contextMenu.targetId!])
              alert('エッジの端点（青い丸）をドラッグして別のポートに接続してください')
            }
          },
          { separator: true } as const,
          {
            label: '削除',
            onClick: () => {
              removeWire(contextMenu.targetId!)
            }
          }
        ]

      default:
        return []
    }
  }, [
    contextMenu,
    selectedObjectIds,
    selectedWireIds,
    setSelectedObjects,
    setSelectedWires,
    copySelected,
    pasteSelected,
    duplicateSelected,
    alignSelected,
    distributeSelected,
    removeEquipmentObject,
    removeWire,
    project.objects,
    setShowSaveTemplateDialog
  ])

  return {
    contextMenu,
    setContextMenu,
    handleContextMenu,
    handleNodeContextMenu,
    handleEdgeContextMenu,
    getContextMenuItems
  }
}

