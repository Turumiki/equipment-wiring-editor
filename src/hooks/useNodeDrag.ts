import { useState, useCallback } from 'react'
import { Node } from 'reactflow'
import { useProjectStore } from '@/store/useProjectStore'

/**
 * ノードのドラッグ操作を管理するカスタムフック
 * Shiftキーによる軸固定機能を含む
 */
export function useNodeDrag(nodes: Node[], onCloseMenus?: () => void) {
  // ドラッグ開始位置を記録
  const [dragStartPositions, setDragStartPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  // 方向固定の状態（'x' | 'y' | null）
  const [lockedDirection, setLockedDirection] = useState<Map<string, 'x' | 'y' | null>>(new Map())

  // 選択されているノードを取得するヘルパー
  const getSelectedNodes = useCallback(() => {
    return nodes.filter((n: Node) => n.selected)
  }, [nodes])

  // ノードドラッグ開始時の処理
  const handleNodeDragStart = useCallback(
    (event: React.MouseEvent, node: Node) => {
      onCloseMenus?.()

      const selectedNodes = getSelectedNodes()
      const isMultiSelect = selectedNodes.length > 1

      if (isMultiSelect) {
        // 複数選択時は、すべての選択ノードの開始位置を記録
        setDragStartPositions((prev) => {
          const newMap = new Map(prev)
          selectedNodes.forEach((n: Node) => {
            newMap.set(n.id, { x: n.position.x, y: n.position.y })
          })
          return newMap
        })

        // 方向固定をリセット
        setLockedDirection((prev) => {
          const newMap = new Map(prev)
          selectedNodes.forEach((n: Node) => {
            newMap.delete(n.id)
          })
          return newMap
        })
      } else {
        // 単一選択時は、そのノードのみ記録
        setDragStartPositions((prev) => {
          const newMap = new Map(prev)
          newMap.set(node.id, { x: node.position.x, y: node.position.y })
          return newMap
        })

        // 方向固定をリセット
        setLockedDirection((prev) => {
          const newMap = new Map(prev)
          newMap.delete(node.id)
          return newMap
        })
      }
    },
    [getSelectedNodes, onCloseMenus]
  )

  // ノードドラッグ中の処理（Shiftキーによる方向固定）
  const handleNodeDrag = useCallback(
    (event: React.MouseEvent, node: Node) => {
      onCloseMenus?.()

      const selectedNodes = getSelectedNodes()
      const isMultiSelect = selectedNodes.length > 1

      // Shiftキーが押されている場合、方向を固定
      if (event.shiftKey) {
        const startPos = dragStartPositions.get(node.id)
        if (startPos) {
          const dx = Math.abs(node.position.x - startPos.x)
          const dy = Math.abs(node.position.y - startPos.y)

          // まだ方向が固定されていない場合、最初の移動方向を決定
          const currentLockedDir = lockedDirection.get(node.id)
          if (!currentLockedDir) {
            const direction = dx > dy ? 'x' : 'y'

            if (isMultiSelect) {
              // 複数選択時は、すべての選択ノードに対して同じ方向を固定
              setLockedDirection((prev) => {
                const newMap = new Map(prev)
                selectedNodes.forEach((n: Node) => {
                  newMap.set(n.id, direction)
                })
                return newMap
              })
            } else {
              // 単一選択時は、そのノードのみ固定
              setLockedDirection((prev) => {
                const newMap = new Map(prev)
                newMap.set(node.id, direction)
                return newMap
              })
            }
          }
        }
      } else {
        // Shiftキーが離された場合、方向固定を解除
        if (isMultiSelect) {
          // 複数選択時は、すべての選択ノードの方向固定を解除
          setLockedDirection((prev) => {
            const newMap = new Map(prev)
            selectedNodes.forEach((n: Node) => {
              newMap.delete(n.id)
            })
            return newMap
          })
        } else {
          // 単一選択時は、そのノードのみ解除
          setLockedDirection((prev) => {
            const newMap = new Map(prev)
            newMap.delete(node.id)
            return newMap
          })
        }
      }
    },
    [dragStartPositions, lockedDirection, getSelectedNodes, onCloseMenus]
  )

  // ノードドラッグ終了時の処理
  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const selectedNodes = getSelectedNodes()
      const isMultiSelect = selectedNodes.length > 1

      // ドラッグされたノードの最終位置を履歴に保存
      if (isMultiSelect) {
        // 複数選択時は、すべての選択ノードの位置を一度に更新して履歴に保存
        const { updateMultipleEquipmentObjects } = useProjectStore.getState()
        const updates: { [id: string]: { position: { x: number; y: number } } } = {}

        selectedNodes.forEach((n: Node) => {
          const startPos = dragStartPositions.get(n.id)
          if (startPos && (startPos.x !== n.position.x || startPos.y !== n.position.y)) {
            // 位置が変更されていた場合のみ更新
            updates[n.id] = { position: n.position }
          }
        })

        if (Object.keys(updates).length > 0) {
          // すべてのノードの位置を一度に更新（履歴は一度だけ保存）
          updateMultipleEquipmentObjects(updates, false)
        }
      } else {
        // 単一選択時は、位置が変更されていた場合のみ履歴に保存
        const startPos = dragStartPositions.get(node.id)
        if (startPos && (startPos.x !== node.position.x || startPos.y !== node.position.y)) {
          const { updateEquipmentObject } = useProjectStore.getState()
          updateEquipmentObject(node.id, { position: node.position }, false) // 履歴に保存
        }
      }

      // 状態をクリア
      if (isMultiSelect) {
        // 複数選択時は、すべての選択ノードの状態をクリア
        setDragStartPositions((prev) => {
          const newMap = new Map(prev)
          selectedNodes.forEach((n: Node) => {
            newMap.delete(n.id)
          })
          return newMap
        })
        setLockedDirection((prev) => {
          const newMap = new Map(prev)
          selectedNodes.forEach((n: Node) => {
            newMap.delete(n.id)
          })
          return newMap
        })
      } else {
        // 単一選択時は、そのノードのみクリア
        setDragStartPositions((prev) => {
          const newMap = new Map(prev)
          newMap.delete(node.id)
          return newMap
        })
        setLockedDirection((prev) => {
          const newMap = new Map(prev)
          newMap.delete(node.id)
          return newMap
        })
      }
    },
    [dragStartPositions, getSelectedNodes]
  )

  // 複数選択時のドラッグ開始処理（onSelectionDragStart用）
  const handleSelectionDragStart = useCallback(() => {
    onCloseMenus?.()

    // 複数選択時のドラッグ開始位置を記録
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length > 1) {
      setDragStartPositions((prev) => {
        const newMap = new Map(prev)
        selectedNodes.forEach((node: Node) => {
          newMap.set(node.id, { x: node.position.x, y: node.position.y })
        })
        return newMap
      })

      // 方向固定をリセット
      setLockedDirection((prev) => {
        const newMap = new Map(prev)
        selectedNodes.forEach((node: Node) => {
          newMap.delete(node.id)
        })
        return newMap
      })
    }
  }, [getSelectedNodes, onCloseMenus])

  return {
    dragStartPositions,
    lockedDirection,
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragStop,
    handleSelectionDragStart
  }
}

