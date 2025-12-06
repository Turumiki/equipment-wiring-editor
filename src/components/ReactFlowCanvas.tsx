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

// グローバルに参照を保存（HMR時の追跡用）
if (typeof window !== 'undefined') {
  const globalKey = '__ReactFlowCanvas_types__'
  const previousTypes = (window as any)[globalKey]
  
  if (previousTypes) {
    console.warn('[ReactFlowCanvas] ⚠️ モジュールが再ロードされました（HMR）', {
      previousNodeTypes: previousTypes.nodeTypes,
      previousEdgeTypes: previousTypes.edgeTypes,
      newNodeTypes: nodeTypes,
      newEdgeTypes: edgeTypes,
      nodeTypesSame: previousTypes.nodeTypes === nodeTypes,
      edgeTypesSame: previousTypes.edgeTypes === edgeTypes,
      nodeTypesEquipSame: previousTypes.nodeTypes?.equipment === nodeTypes.equipment,
      edgeTypesWireSame: previousTypes.edgeTypes?.wire === edgeTypes.wire,
      previousTimestamp: previousTypes.timestamp,
      currentTimestamp: Date.now(),
    })
  } else {
    console.log('[ReactFlowCanvas] 初回モジュールロード（flowTypes.tsからインポート）', {
      nodeTypesKeys: Object.keys(nodeTypes),
      edgeTypesKeys: Object.keys(edgeTypes),
      nodeTypesRef: nodeTypes,
      edgeTypesRef: edgeTypes,
      nodeTypesEquip: nodeTypes.equipment,
      edgeTypesWire: edgeTypes.wire,
      timestamp: Date.now(),
    })
  }
  
  (window as any)[globalKey] = { nodeTypes, edgeTypes, timestamp: Date.now() }
}

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

  // デバッグ用: コンポーネントマウント時の状態を記録
  useEffect(() => {
    console.log('[ReactFlowCanvas] コンポーネントがマウントされました（flowTypes.tsからインポート）', {
      nodeTypesKeys: Object.keys(nodeTypes),
      edgeTypesKeys: Object.keys(edgeTypes),
      nodeTypesRef: nodeTypes,
      edgeTypesRef: edgeTypes,
      nodeTypesEquipRef: nodeTypes.equipment,
      edgeTypesWireRef: edgeTypes.wire,
      nodeTypesEquipName: nodeTypes.equipment?.name || nodeTypes.equipment?.displayName || 'unknown',
      edgeTypesWireName: edgeTypes.wire?.name || edgeTypes.wire?.displayName || 'unknown',
    })
    
    // グローバル参照と比較
    if (typeof window !== 'undefined') {
      const globalKey = '__ReactFlowCanvas_types__'
      const globalTypes = (window as any)[globalKey]
      if (globalTypes) {
        console.log('[ReactFlowCanvas] グローバル参照との比較', {
          nodeTypesMatch: globalTypes.nodeTypes === nodeTypes,
          edgeTypesMatch: globalTypes.edgeTypes === edgeTypes,
          nodeTypesEquipMatch: globalTypes.nodeTypes?.equipment === nodeTypes.equipment,
          edgeTypesWireMatch: globalTypes.edgeTypes?.wire === edgeTypes.wire,
          globalTimestamp: globalTypes.timestamp,
          currentTime: Date.now(),
          timeDiff: Date.now() - globalTypes.timestamp,
        })
      }
    }
    
    return () => {
      console.log('[ReactFlowCanvas] コンポーネントがアンマウントされました')
    }
  }, [])

  // デバッグ用: レンダリング時の状態を記録
  useEffect(() => {
    console.log('[ReactFlowCanvas] レンダリング完了（useEffect）', {
      nodeTypesKeys: Object.keys(nodeTypes),
      edgeTypesKeys: Object.keys(edgeTypes),
      nodesCount: nodes.length,
      edgesCount: edges.length,
      nodeTypesRef: nodeTypes,
      edgeTypesRef: edgeTypes,
      nodeTypesStringified: JSON.stringify(Object.keys(nodeTypes)),
      edgeTypesStringified: JSON.stringify(Object.keys(edgeTypes)),
    })
  }, [nodes.length, edges.length])

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
      console.log('[ReactFlowCanvas] handleConnectEnd が呼び出されました', {
        hasConnectionStartData: !!connectionStartData,
        eventType: event.type,
      })

      if (connectionStartData) {
        // マウス位置を取得
        const clientX = 'clientX' in event ? event.clientX : event.touches?.[0]?.clientX || 0
        const clientY = 'clientY' in event ? event.clientY : event.touches?.[0]?.clientY || 0

        // ReactFlowの座標系に変換
        const flowPosition = screenToFlowPosition({
          x: clientX,
          y: clientY
        })
        console.log('[ReactFlowCanvas] 接続終了位置を変換しました', {
          screen: { x: clientX, y: clientY },
          flow: flowPosition,
          sourceObjectId: connectionStartData.sourceObjectId,
          sourcePortId: connectionStartData.sourcePortId,
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
    console.log('[ReactFlowCanvas] handleDrop が呼び出されました', {
      hasData: !!event.dataTransfer.getData('application/reactflow'),
    })
    event.preventDefault()

    const data = event.dataTransfer.getData('application/reactflow')

    if (data) {
      try {
        const dropData = JSON.parse(data)
        console.log('[ReactFlowCanvas] ドロップデータを解析しました', {
          type: dropData.type,
          hasTemplate: !!dropData.template,
          templateId: dropData.template?.id,
        })

        if (dropData.type === 'template') {
          // ReactFlowの座標系に変換
          const mousePosition = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY
          })
          console.log('[ReactFlowCanvas] マウス位置を変換しました', {
            screen: { x: event.clientX, y: event.clientY },
            flow: mousePosition,
          })

          // テンプレートから機材を作成
          const template = dropData.template
          let equipmentObject

          if (template.ports && Array.isArray(template.ports) && template.ports.length > 0) {
            console.log('[ReactFlowCanvas] テンプレートから機材を作成（ports使用）', {
              templateId: template.id,
              portsCount: template.ports.length,
            })
            equipmentObject = createEquipmentFromTemplate(template)
          } else if (template.defaultComponents && template.defaultComponents.length > 0) {
            console.log('[ReactFlowCanvas] テンプレートから機材を作成（defaultComponents使用）', {
              templateId: template.id,
              componentsCount: template.defaultComponents.length,
            })
            equipmentObject = createEquipmentFromTemplate(template)
          } else {
            const shape = getShapeForTemplate(template.id)
            console.log('[ReactFlowCanvas] 基本機材オブジェクトを作成', {
              templateId: template.id,
              templateName: template.name,
              shape,
            })
            equipmentObject = createBasicEquipmentObject(template.name, mousePosition, shape, template.id)
          }

          // 機材のサイズを取得
          const renderComponent = equipmentObject.components.find((comp) => comp.type === ComponentType.RENDER)
          const equipmentSize = renderComponent?.data?.size || { width: 100, height: 60 }
          console.log('[ReactFlowCanvas] 機材サイズを取得しました', {
            size: equipmentSize,
            hasRenderComponent: !!renderComponent,
          })

          // 機材の中心がマウス位置に来るように調整
          const centeredPosition = {
            x: mousePosition.x - equipmentSize.width / 2,
            y: mousePosition.y - equipmentSize.height / 2
          }
          console.log('[ReactFlowCanvas] 機材位置を調整しました', {
            original: mousePosition,
            centered: centeredPosition,
            size: equipmentSize,
          })

          equipmentObject.position = centeredPosition
          equipmentObject.templateId = template.id
          console.log('[ReactFlowCanvas] 機材オブジェクトを追加します', {
            id: equipmentObject.id,
            templateId: equipmentObject.templateId,
            position: equipmentObject.position,
          })
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
    console.log('[ReactFlowCanvas] ペインがクリックされました')
    setContextMenu(null)
    onCloseMenus?.()
  }, [setContextMenu, onCloseMenus])

  // デバッグ用: レンダリング時の詳細な状態を記録
  const renderId = React.useRef(0)
  renderId.current += 1
  
  console.log(`[ReactFlowCanvas] レンダリング中 #${renderId.current}`, {
    nodeTypesRef: nodeTypes,
    edgeTypesRef: edgeTypes,
    nodeTypesKeys: Object.keys(nodeTypes),
    edgeTypesKeys: Object.keys(edgeTypes),
    nodeTypesEquip: nodeTypes.equipment,
    edgeTypesWire: edgeTypes.wire,
    nodesCount: nodes.length,
    edgesCount: edges.length,
    nodeTypesObjectId: Object.getOwnPropertyNames(nodeTypes).join(','),
    edgeTypesObjectId: Object.getOwnPropertyNames(edgeTypes).join(','),
    stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n'),
  })

  // ReactFlowに渡す直前のデバッグログ
  const nodeTypesId = Object.getOwnPropertyNames(nodeTypes).join(',')
  const edgeTypesId = Object.getOwnPropertyNames(edgeTypes).join(',')
  const nodeTypesEquipId = nodeTypes.equipment ? Object.getOwnPropertyNames(nodeTypes.equipment).slice(0, 3).join(',') : 'null'
  const edgeTypesWireId = edgeTypes.wire ? Object.getOwnPropertyNames(edgeTypes.wire).slice(0, 3).join(',') : 'null'
  
  console.log('[ReactFlowCanvas] ReactFlowにpropsを渡します（コンポーネント外定義、推奨実装）', {
    renderId: renderId.current,
    nodeTypesRef: nodeTypes,
    edgeTypesRef: edgeTypes,
    nodeTypesEquip: nodeTypes.equipment,
    edgeTypesWire: edgeTypes.wire,
    nodeTypesKeys: Object.keys(nodeTypes),
    edgeTypesKeys: Object.keys(edgeTypes),
    nodeTypesId,
    edgeTypesId,
    nodeTypesEquipId,
    edgeTypesWireId,
    timestamp: Date.now(),
    // グローバル参照との比較
    globalNodeTypesMatch: typeof window !== 'undefined' && (window as any)['__ReactFlowCanvas_types__']?.nodeTypes === nodeTypes,
    globalEdgeTypesMatch: typeof window !== 'undefined' && (window as any)['__ReactFlowCanvas_types__']?.edgeTypes === edgeTypes,
  })

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

