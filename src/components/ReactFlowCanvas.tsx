'use client'

import React, { useCallback, useEffect, useRef } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  useReactFlow,
  BackgroundVariant,
  Controls,
  MiniMap,
  Background
} from 'reactflow'
import 'reactflow/dist/style.css'

import CustomConnectionLine from '@/components/edges/CustomConnectionLine'
import { nodeTypes, edgeTypes } from '@/components/flowTypes'
import { ComponentType } from '@/types'
import { createEquipmentFromTemplate, createBasicEquipmentObject } from '@/utils/componentSystem'
import { useNodeDrag } from '@/hooks/useNodeDrag'

// flowTypes.tsから直接インポートしたnodeTypesとedgeTypesを使用
// これにより、モジュールレベルの定義を確実に共有し、React Flowの警告を回避

// グローバルに参照を保存（HMR時の追跡用、デバッグ時のみ有効化）
// if (typeof window !== 'undefined') {
//   const globalKey = '__ReactFlowCanvas_types__'
//   (window as any)[globalKey] = { nodeTypes, edgeTypes, timestamp: Date.now() }
// }

interface ReactFlowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  handleNodesChange: (changes: NodeChange[]) => void
  handleEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  onConnectStart: (event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => void
  onConnectEnd: (event: MouseEvent | TouchEvent) => void
  handleReconnect: (oldEdge: Edge, connection: Connection) => boolean
  handleSelectionChange: (params: { nodes: Node[]; edges: Edge[] }) => void
  isValidConnection: (connection: Connection) => boolean
  handleNodeContextMenu: (event: React.MouseEvent, node: Node) => void
  handleEdgeContextMenu: (event: React.MouseEvent, edge: Edge) => void
  setContextMenu: (menu: { x: number; y: number; type: 'canvas' | 'node' | 'edge'; targetId?: string } | null) => void
  onCloseMenus?: () => void
  addEquipmentObject: (equipment: any) => void
  getShapeForTemplate: (templateId: string) => any
  connectionStartData: {
    sourceObjectId: string
    sourcePortId: string
    sourcePortType: any
    sourcePortDirection: any
    dropPosition: { x: number; y: number }
  } | null
  flowPositionRef: React.MutableRefObject<{ x: number; y: number } | null>
}

/**
 * ReactFlowキャンバスコンポーネント
 * エディタ系ツールでは参照関係が複雑になるため、memoを削除して直接レンダリング
 */
export default function ReactFlowCanvas({
  nodes,
  edges,
  handleNodesChange,
  handleEdgesChange,
  onConnect,
  onConnectStart,
  onConnectEnd,
  handleReconnect,
  handleSelectionChange,
  isValidConnection,
  handleNodeContextMenu,
  handleEdgeContextMenu,
  setContextMenu,
  onCloseMenus,
  addEquipmentObject,
  getShapeForTemplate,
  connectionStartData,
  flowPositionRef
}: ReactFlowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow()

  // flowTypes.tsからインポートしたnodeTypesとedgeTypesを直接使用
  // これらはコンポーネント外で定義されているため、React Flowの推奨実装に従っている
  // ドキュメント: https://reactflow.dev/learn/troubleshooting/common-errors#it-looks-like-you-have-created-a-new-nodetypes-or-edgetypes-object

  // デバッグ用: コンポーネントマウント時の状態を記録（必要に応じて有効化）
  // useEffect(() => {
  //   console.log('[ReactFlowCanvas] コンポーネントがマウントされました')
  //   return () => {
  //     console.log('[ReactFlowCanvas] コンポーネントがアンマウントされました')
  //   }
  // }, [])

  // デバッグ用: レンダリング時の状態を記録（必要に応じて有効化）
  // useEffect(() => {
  //   console.log('[ReactFlowCanvas] レンダリング完了', {
  //     nodesCount: nodes.length,
  //     edgesCount: edges.length,
  //   })
  // }, [nodes.length, edges.length])

  // ノードドラッグ操作の管理
  const {
    dragStartPositions,
    lockedDirection,
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragStop,
    handleSelectionDragStart
  } = useNodeDrag(nodes, onCloseMenus)

  // onConnectEndをラップして座標変換を行う
  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (connectionStartData) {
        // マウス位置を取得
        const clientX = 'clientX' in event ? event.clientX : event.touches?.[0]?.clientX || 0
        const clientY = 'clientY' in event ? event.clientY : event.touches?.[0]?.clientY || 0

        // ReactFlowの座標系に変換
        const flowPosition = screenToFlowPosition({
          x: clientX,
          y: clientY
        })

        // 座標変換済みの位置をrefに保存（親コンポーネントで使用）
        flowPositionRef.current = flowPosition
      }

      // 元のonConnectEndを呼び出し
      onConnectEnd?.(event)
    },
    [connectionStartData, screenToFlowPosition, onConnectEnd, flowPositionRef]
  )

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()

    const data = event.dataTransfer.getData('application/reactflow')

    if (data) {
      try {
        const dropData = JSON.parse(data)

        if (dropData.type === 'template') {
          // ReactFlowの座標系に変換
          const mousePosition = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY
          })

          // テンプレートから機材を作成
          const template = dropData.template
          let equipmentObject

          if (template.ports && Array.isArray(template.ports) && template.ports.length > 0) {
            equipmentObject = createEquipmentFromTemplate(template)
          } else if (template.defaultComponents && template.defaultComponents.length > 0) {
            equipmentObject = createEquipmentFromTemplate(template)
          } else {
            const shape = getShapeForTemplate(template.id)
            equipmentObject = createBasicEquipmentObject(template.name, mousePosition, shape, template.id)
          }

          // 機材のサイズを取得
          const renderComponent = equipmentObject.components.find((comp) => comp.type === ComponentType.RENDER)
          const equipmentSize = renderComponent?.data?.size || { width: 100, height: 60 }

          // 機材の中心がマウス位置に来るように調整
          const centeredPosition = {
            x: mousePosition.x - equipmentSize.width / 2,
            y: mousePosition.y - equipmentSize.height / 2
          }

          equipmentObject.position = centeredPosition
          equipmentObject.templateId = template.id
          addEquipmentObject(equipmentObject)
        }
      } catch (error) {
        console.error('[ReactFlowCanvas] ドロップデータの解析に失敗しました', error)
      }
    }
  }

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // onPaneClickをメモ化
  const handlePaneClick = useCallback(() => {
    setContextMenu(null)
    onCloseMenus?.()
  }, [setContextMenu, onCloseMenus])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={onConnect}
      onConnectStart={onConnectStart}
      onConnectEnd={handleConnectEnd}
      onReconnect={handleReconnect}
      onSelectionChange={handleSelectionChange}
      isValidConnection={isValidConnection}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionLineComponent={CustomConnectionLine}
      connectionRadius={20}
      snapToGrid={false}
      snapGrid={[15, 15]}
      fitView
      className="bg-white"
      multiSelectionKeyCode="Shift"
      deleteKeyCode="Delete"
      onNodeContextMenu={handleNodeContextMenu}
      onEdgeContextMenu={handleEdgeContextMenu}
      onPaneClick={handlePaneClick}
      onNodeDrag={handleNodeDrag}
      onNodeDragStart={handleNodeDragStart}
      onNodeDragStop={handleNodeDragStop}
      onSelectionDragStart={handleSelectionDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Controls />
      <MiniMap />
      <Background variant={BackgroundVariant.Lines} gap={20} size={0.5} color="#e5e7eb" />
    </ReactFlow>
  )
}

