import React from 'react'
import { ConnectionLineComponentProps, getSmoothStepPath, Position, useReactFlow } from 'reactflow'

export default function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  connectionStatus,
  fromNode,
  fromHandle
}: ConnectionLineComponentProps) {
  // スナップしているかどうかを判定
  const isSnapping = connectionStatus === 'valid'
  const { getNodes } = useReactFlow()

  if (isSnapping) {
    // スナップ中はSmoothStepパス（WireEdgeと完全に同じ方法）
    
    // 実際のノード情報からハンドル位置を取得
    const getHandlePosition = (nodeId: string | undefined, handleId: string | undefined): Position => {
      if (!nodeId || !handleId) return Position.Right

      const nodes = getNodes()
      const node = nodes.find(n => n.id === nodeId)
      if (!node?.data?.equipmentObject) return Position.Right

      const equipmentObject = node.data.equipmentObject
      const portComponent = equipmentObject.components.find((comp: any) => comp.id === handleId)

      if (!portComponent?.data?.position?.side) return Position.Right

      const side = portComponent.data.position.side
      switch (side) {
        case 'top': return Position.Top
        case 'right': return Position.Right
        case 'bottom': return Position.Bottom
        case 'left': return Position.Left
        default: return Position.Right
      }
    }

    // ソース側の位置（ドラッグ開始点）
    const sourcePosition = getHandlePosition(fromNode?.id, fromHandle?.id || undefined)

    // ターゲット側の位置（スナップ先）
    // 座標からスナップ先のノードとハンドルを特定
    const findTargetNodeAndHandle = (x: number, y: number) => {
      const nodes = getNodes()

      for (const node of nodes) {
        if (!node.data?.equipmentObject) continue
        if (node.id === fromNode?.id) continue // ドラッグ開始ノードは除外

        const equipmentObject = node.data.equipmentObject
        const portComponents = equipmentObject.components.filter((comp: any) =>
          comp.type === 'connectionPort'
        )

        for (const portComponent of portComponents) {
          const position = portComponent.data?.position
          if (!position) continue

          // ノードの位置とポートのオフセットから実際のハンドル位置を計算
          const nodeX = node.position.x
          const nodeY = node.position.y
          const nodeWidth = typeof node.style?.width === 'number' ? node.style.width : 100
          const nodeHeight = typeof node.style?.height === 'number' ? node.style.height : 60

          let handleX, handleY
          const offset = position.offset || 50

          switch (position.side) {
            case 'top':
              handleX = nodeX + (nodeWidth * offset / 100)
              handleY = nodeY
              break
            case 'right':
              handleX = nodeX + nodeWidth
              handleY = nodeY + (nodeHeight * offset / 100)
              break
            case 'bottom':
              handleX = nodeX + (nodeWidth * offset / 100)
              handleY = nodeY + nodeHeight
              break
            case 'left':
              handleX = nodeX
              handleY = nodeY + (nodeHeight * offset / 100)
              break
            default:
              continue
          }

          // 座標が近い場合（50px以内）、そのハンドルを返す
          const distance = Math.sqrt((x - handleX) ** 2 + (y - handleY) ** 2)
          if (distance < 50) {
            return {
              nodeId: node.id,
              handleId: portComponent.id,
              side: position.side
            }
          }
        }
      }

      return null
    }

    const targetInfo = findTargetNodeAndHandle(toX, toY)
    const targetPosition = targetInfo ?
      (targetInfo.side === 'top' ? Position.Top :
        targetInfo.side === 'right' ? Position.Right :
          targetInfo.side === 'bottom' ? Position.Bottom :
            Position.Left) : Position.Right

    const [edgePath] = getSmoothStepPath({
      sourceX: fromX,
      sourceY: fromY,
      sourcePosition,
      targetX: toX,
      targetY: toY,
      targetPosition,
    })

    return (
      <g>
        <path
          fill="none"
          stroke="#4b5563"
          strokeWidth={1.5}
          strokeDasharray="4,4"
          d={edgePath}
          className="react-flow__connection-path"
        />
      </g>
    )
  } else {
    // 通常のドラッグ中は直線
    return (
      <g>
        <path
          fill="none"
          stroke="#4b5563"
          strokeWidth={1.5}
          strokeDasharray="4,4"
          d={`M${fromX},${fromY} L${toX},${toY}`}
          className="react-flow__connection-path"
        />
      </g>
    )
  }
}