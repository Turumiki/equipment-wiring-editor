import { useCallback } from 'react'
import { NodeChange, EdgeChange } from 'reactflow'
import { useProjectStore } from '@/store/useProjectStore'

export function useNodeEdgeChanges(
  dragStartPositions: Map<string, { x: number; y: number }>,
  lockedDirection: Map<string, 'x' | 'y' | null>
) {
  const { updateEquipmentObject, removeEquipmentObject, removeWire } = useProjectStore()

  const handleNodesChange = useCallback(
    (changes: NodeChange[], onNodesChange: (changes: NodeChange[]) => void) => {
      // Shiftキーで方向固定の処理
      const processedChanges = changes.map((change) => {
        if (change.type === 'position' && change.position) {
          const startPos = dragStartPositions.get(change.id)
          const lockedDir = lockedDirection.get(change.id)

          if (startPos && lockedDir) {
            // 方向が固定されている場合、固定された方向のみ移動を許可
            if (lockedDir === 'x') {
              return {
                ...change,
                position: {
                  x: change.position.x,
                  y: startPos.y
                }
              }
            } else if (lockedDir === 'y') {
              return {
                ...change,
                position: {
                  x: startPos.x,
                  y: change.position.y
                }
              }
            }
          }
        }
        return change
      })

      onNodesChange(processedChanges)

      processedChanges.forEach((change) => {
        if (change.type === 'position' && change.position) {
          // 位置変更をプロジェクトに反映
          updateEquipmentObject(change.id, { position: change.position }, true) // ドラッグ中は履歴保存をスキップ
        } else if (change.type === 'remove') {
          // ノード削除をプロジェクトに反映
          removeEquipmentObject(change.id)
        }
      })
    },
    [updateEquipmentObject, removeEquipmentObject, dragStartPositions, lockedDirection]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[], onEdgesChange: (changes: EdgeChange[]) => void) => {
      onEdgesChange(changes)

      // エッジ削除をプロジェクトに反映
      changes.forEach(change => {
        if (change.type === 'remove') {
          removeWire(change.id)
        }
      })
    },
    [removeWire]
  )

  return {
    handleNodesChange,
    handleEdgesChange
  }
}

