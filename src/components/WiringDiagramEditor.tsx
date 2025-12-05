'use client'

import React, { useCallback, useState, useEffect, useImperativeHandle, memo, useMemo, useRef } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  NodeChange,
  EdgeChange,
  ConnectionLineType,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useProjectStore } from '@/store/useProjectStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { WireType, EquipmentObject, ShapeType, ComponentType } from '@/types'
import CustomConnectionLine from '@/components/edges/CustomConnectionLine'
import { nodeTypes, edgeTypes } from '@/components/flowTypes'

import TemplateLibrary from '@/components/TemplateLibrary'
import TableEditor from '@/components/TableEditor'
import InspectorPanel from '@/components/InspectorPanel'
import ResizablePanel from '@/components/ResizablePanel'
import ResizableWidthPanel from '@/components/ResizableWidthPanel'
import { getRenderComponent, getConnectionPortComponents, createEquipmentFromTemplate, createBasicEquipmentObject } from '@/utils/componentSystem'
import { getWireTypeForPortType, getWireTypeForConnection } from '@/utils/portTypeUtils'
import { validateConnection } from '@/utils/connectionValidation'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import ContextMenu from '@/components/ContextMenu'

import SaveTemplateDialog from '@/components/SaveTemplateDialog'
import PortEditDialog from '@/components/PortEditDialog'
import TemplateSelectionDialog from '@/components/TemplateSelectionDialog'
import { autoLayout, LayoutOptions } from '@/utils/autoLayout'
import { PortType, PortDirection, EquipmentTemplate } from '@/types'

interface WiringDiagramEditorProps {
  showTemplateLibrary?: boolean
  showTableEditor?: boolean
  showAutoLayout?: boolean
  onCloseTemplateLibrary?: () => void
  onCloseTableEditor?: () => void
  onCloseAutoLayout?: () => void
  onCloseMenus?: () => void
}

interface WiringDiagramEditorRef {
  selectAll: () => void
  deselectAll: () => void
  copy: () => void
  paste: () => void
  deleteSelected: () => void
  duplicateSelected: () => void
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: () => void
  zoomToActual: () => void
  alignLeft: () => void
  alignCenter: () => void
  alignRight: () => void
  alignTop: () => void
  alignCenterVertical: () => void
  alignBottom: () => void
  distributeHorizontal: () => void
  distributeVertical: () => void
  validateConnections: () => void
  applyAutoLayout: (options: any) => void
}

// ReactFlowキャンバスコンポーネント
// エディタ系ツールでは参照関係が複雑になるため、memoを削除して直接レンダリング
function ReactFlowCanvas({
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
  dragStartPositions,
  setDragStartPositions,
  lockedDirection,
  setLockedDirection,
  connectionStartData,
  flowPositionRef,
}: any) {
  const { screenToFlowPosition, getViewport } = useReactFlow()

  // onConnectEndをラップして座標変換を行う
  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    if (connectionStartData) {
      // マウス位置を取得
      const clientX = 'clientX' in event ? event.clientX : event.touches?.[0]?.clientX || 0
      const clientY = 'clientY' in event ? event.clientY : event.touches?.[0]?.clientY || 0

      // ReactFlowの座標系に変換
      const flowPosition = screenToFlowPosition({
        x: clientX,
        y: clientY,
      })

      // 座標変換済みの位置をrefに保存（親コンポーネントで使用）
      flowPositionRef.current = flowPosition
    }
    
    // 元のonConnectEndを呼び出し
    onConnectEnd?.(event)
  }, [connectionStartData, screenToFlowPosition, onConnectEnd])

  // Fast Refresh対策として、外部ファイルからインポートした場合でもuseMemoでラップすることで
  // 再レンダリング時のオブジェクト再生成を防ぐ
  const memoizedNodeTypes = useMemo(() => ({
    equipment: nodeTypes.equipment
  }), [])
  const memoizedEdgeTypes = useMemo(() => ({
    wire: edgeTypes.wire
  }), [])

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
            y: event.clientY,
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
            equipmentObject = createBasicEquipmentObject(
              template.name,
              mousePosition,
              shape,
              template.id
            )
          }

          // 機材のサイズを取得
          const renderComponent = equipmentObject.components.find(comp => comp.type === ComponentType.RENDER)
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
        console.error('Failed to parse drop data:', error)
      }
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

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
      nodeTypes={memoizedNodeTypes}
      edgeTypes={memoizedEdgeTypes}
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
      onPaneClick={() => {
        setContextMenu(null)
        onCloseMenus?.()
      }}
      onNodeDrag={(event, node) => {
        onCloseMenus?.()
        
        // 選択されているノードを取得
        const selectedNodes = nodes.filter((n: Node) => n.selected)
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
                setLockedDirection((prev: Map<string, 'x' | 'y' | null>) => {
                  const newMap = new Map(prev)
                  selectedNodes.forEach((n: Node) => {
                    newMap.set(n.id, direction)
                  })
                  return newMap
                })
              } else {
                // 単一選択時は、そのノードのみ固定
                setLockedDirection((prev: Map<string, 'x' | 'y' | null>) => {
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
            setLockedDirection((prev: Map<string, 'x' | 'y' | null>) => {
              const newMap = new Map(prev)
              selectedNodes.forEach((n: Node) => {
                newMap.delete(n.id)
              })
              return newMap
            })
          } else {
            // 単一選択時は、そのノードのみ解除
            setLockedDirection((prev: Map<string, 'x' | 'y' | null>) => {
              const newMap = new Map(prev)
              newMap.delete(node.id)
              return newMap
            })
          }
        }
      }}
      onNodeDragStart={(event, node) => {
        onCloseMenus?.()
        
        // 選択されているノードを取得
        const selectedNodes = nodes.filter((n: Node) => n.selected)
        const isMultiSelect = selectedNodes.length > 1
        
        if (isMultiSelect) {
          // 複数選択時は、すべての選択ノードの開始位置を記録
          setDragStartPositions((prev: Map<string, { x: number; y: number }>) => {
            const newMap = new Map(prev)
            selectedNodes.forEach((n: Node) => {
              newMap.set(n.id, { x: n.position.x, y: n.position.y })
            })
            return newMap
          })
          
          // 方向固定をリセット
          setLockedDirection((prev: Map<string, 'x' | 'y' | null>) => {
            const newMap = new Map(prev)
            selectedNodes.forEach((n: Node) => {
              newMap.delete(n.id)
            })
            return newMap
          })
        } else {
          // 単一選択時は、そのノードのみ記録
          setDragStartPositions((prev: Map<string, { x: number; y: number }>) => {
            const newMap = new Map(prev)
            newMap.set(node.id, { x: node.position.x, y: node.position.y })
            return newMap
          })
          
          // 方向固定をリセット
          setLockedDirection((prev: Map<string, 'x' | 'y' | null>) => {
            const newMap = new Map(prev)
            newMap.delete(node.id)
            return newMap
          })
        }
      }}
      onNodeDragStop={(event, node) => {
        // 選択されているノードを取得
        const selectedNodes = nodes.filter((n: Node) => n.selected)
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
        
        if (isMultiSelect) {
          // 複数選択時は、すべての選択ノードの状態をクリア
          setDragStartPositions((prev: Map<string, { x: number; y: number }>) => {
            const newMap = new Map(prev)
            selectedNodes.forEach((n: Node) => {
              newMap.delete(n.id)
            })
            return newMap
          })
          setLockedDirection((prev: Map<string, 'x' | 'y' | null>) => {
            const newMap = new Map(prev)
            selectedNodes.forEach((n: Node) => {
              newMap.delete(n.id)
            })
            return newMap
          })
        } else {
          // 単一選択時は、そのノードのみクリア
          setDragStartPositions((prev: Map<string, { x: number; y: number }>) => {
            const newMap = new Map(prev)
            newMap.delete(node.id)
            return newMap
          })
          setLockedDirection((prev: Map<string, 'x' | 'y' | null>) => {
            const newMap = new Map(prev)
            newMap.delete(node.id)
            return newMap
          })
        }
      }}
      onSelectionDragStart={() => {
        onCloseMenus?.()
        
        // 複数選択時のドラッグ開始位置を記録
        const selectedNodes = nodes.filter((node: Node) => node.selected)
        if (selectedNodes.length > 1) {
          setDragStartPositions((prev: Map<string, { x: number; y: number }>) => {
            const newMap = new Map(prev)
            selectedNodes.forEach((node: Node) => {
              newMap.set(node.id, { x: node.position.x, y: node.position.y })
            })
            return newMap
          })
          
          // 方向固定をリセット
          setLockedDirection((prev: Map<string, 'x' | 'y' | null>) => {
            const newMap = new Map(prev)
            selectedNodes.forEach((node: Node) => {
              newMap.delete(node.id)
            })
            return newMap
          })
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}

    >
      <Controls />
      <MiniMap />
      <Background variant={BackgroundVariant.Lines} gap={20} size={0.5} color="#e5e7eb" />
    </ReactFlow>
  )
}

const WiringDiagramEditor = React.forwardRef<WiringDiagramEditorRef, WiringDiagramEditorProps>(({
  showTemplateLibrary = false,
  showTableEditor = false,
  showAutoLayout = false,
  onCloseTemplateLibrary,
  onCloseTableEditor,
  onCloseAutoLayout,
  onCloseMenus
}, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState<EquipmentObject | null>(null)
  
  // ドラッグ中の方向固定用の状態
  const [dragStartPositions, setDragStartPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  const [lockedDirection, setLockedDirection] = useState<Map<string, 'x' | 'y' | null>>(new Map())
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'canvas' | 'node' | 'edge'
    targetId?: string
  } | null>(null)
  const [showPortEditDialog, setShowPortEditDialog] = useState(false)
  const [editingPortData, setEditingPortData] = useState<{
    portId: string
    equipmentId: string
  } | null>(null)
  const [showTemplateSelectionDialog, setShowTemplateSelectionDialog] = useState(false)
  const [connectionStartData, setConnectionStartData] = useState<{
    sourceObjectId: string
    sourcePortId: string
    sourcePortType: PortType
    sourcePortDirection: PortDirection
    dropPosition: { x: number; y: number }
  } | null>(null)

  const { project, addWire, updateWire, updateEquipmentObject, updateMultipleEquipmentObjects, setSelectedObjects, setSelectedWires, selectedObjectIds, selectedWireIds, removeEquipmentObject, removeWire, duplicateSelected, copySelected, pasteSelected, alignSelected, distributeSelected, addEquipmentObject } = useProjectStore()
  const { hydrate, settings } = useSettingsStore()

  // クライアントサイドでの設定初期化
  useEffect(() => {
    hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // hydrateはZustandストアから取得した関数で安定しているため、依存配列は空でOK

  // テンプレートに応じた図形を取得
  const getShapeForTemplate = (templateId: string): ShapeType => {
    // 全て四角形で統一
    return ShapeType.RECTANGLE
  }

  // キーボードショートカットを有効化
  useKeyboardShortcuts()


  // refの実装
  useImperativeHandle(ref, () => ({
    selectAll: () => {
      // 全選択の実装
      setSelectedObjects(project.objects.map(obj => obj.id))
    },
    deselectAll: () => {
      // 選択解除の実装
      setSelectedObjects([])
      setSelectedWires([])
    },
    copy: () => {
      copySelected()
    },
    paste: () => {
      pasteSelected()
    },
    deleteSelected: () => {
      // 選択削除の実装
      selectedObjectIds.forEach(id => removeEquipmentObject(id))
      selectedWireIds.forEach(id => removeWire(id))
    },
    duplicateSelected: () => {
      duplicateSelected()
    },
    zoomIn: () => {
      // ズームインの実装（今後実装）
      console.log('Zoom in not implemented yet')
    },
    zoomOut: () => {
      // ズームアウトの実装（今後実装）
      console.log('Zoom out not implemented yet')
    },
    zoomToFit: () => {
      // 全体表示の実装（今後実装）
      console.log('Zoom to fit not implemented yet')
    },
    zoomToActual: () => {
      // 実際のサイズの実装（今後実装）
      console.log('Zoom to actual not implemented yet')
    },
    alignLeft: () => {
      alignSelected('left')
    },
    alignCenter: () => {
      alignSelected('center-horizontal')
    },
    alignRight: () => {
      alignSelected('right')
    },
    alignTop: () => {
      alignSelected('top')
    },
    alignCenterVertical: () => {
      alignSelected('center-vertical')
    },
    alignBottom: () => {
      alignSelected('bottom')
    },
    distributeHorizontal: () => {
      distributeSelected('horizontal')
    },
    distributeVertical: () => {
      distributeSelected('vertical')
    },
    validateConnections: () => {
      // 接続検証の実装（今後実装）
      console.log('Validate connections not implemented yet')
    },
    applyAutoLayout: (options: any) => {
      // 自動レイアウトの実装（今後実装）
      console.log('Apply auto layout not implemented yet', options)
    }
  }))

  // プロジェクトデータからReactFlowノード/エッジを生成
  useEffect(() => {
    // ノードの同期
    const reactFlowNodes: Node[] = project.objects.map(obj => {
      const renderComponent = getRenderComponent(obj)
      const isSelected = selectedObjectIds.includes(obj.id)
      return {
        id: obj.id,
        type: 'equipment',
        position: obj.position,
        selected: isSelected, // ReactFlowの選択状態を設定
        data: {
          equipmentObject: obj,
          isSelected: isSelected,
          onPortEdit: handlePortEdit
        },
        style: {
          width: renderComponent?.data.size.width || 100,
          height: renderComponent?.data.size.height || 60
        }
      }
    })

    // エッジの同期
    const reactFlowEdges: Edge[] = project.wires.map(wire => {
      const isSelected = selectedWireIds.includes(wire.id)
      return {
        id: wire.id,
        source: wire.sourceObjectId,
        target: wire.targetObjectId,
        sourceHandle: wire.sourcePortId,
        targetHandle: wire.targetPortId,
        type: 'wire',
        selected: isSelected, // ReactFlowの選択状態を設定
        data: { wire, isSelected }
      }
    })

    setNodes(reactFlowNodes)
    setEdges(reactFlowEdges)
  }, [project.objects, project.wires, selectedObjectIds, selectedWireIds, setNodes, setEdges])

  // ノード変更の処理
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Shiftキーで方向固定の処理
    const processedChanges = changes.map(change => {
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

    processedChanges.forEach(change => {
      if (change.type === 'position' && change.position) {
        // 位置変更をプロジェクトに反映
        updateEquipmentObject(change.id, { position: change.position }, true) // ドラッグ中は履歴保存をスキップ
      } else if (change.type === 'remove') {
        // ノード削除をプロジェクトに反映
        const { removeEquipmentObject } = useProjectStore.getState()
        removeEquipmentObject(change.id)
      }
    })
  }, [onNodesChange, updateEquipmentObject, dragStartPositions, lockedDirection])

  // エッジ変更の処理
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes)

    // エッジ削除をプロジェクトに反映
    changes.forEach(change => {
      if (change.type === 'remove') {
        const { removeWire } = useProjectStore.getState()
        removeWire(change.id)
      }
    })
  }, [onEdgesChange])

  // 接続開始時の処理
  const onConnectStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
      console.log('=== onConnectStart called ===', params)
      
      if (!params.nodeId || !params.handleId) return

      const sourceObject = project.objects.find(obj => obj.id === params.nodeId)
      if (!sourceObject) {
        console.log('Source object not found:', params.nodeId)
        return
      }

      const sourcePortComponents = getConnectionPortComponents(sourceObject)
      const sourcePort = sourcePortComponents.find(port => port.id === params.handleId)
      if (!sourcePort) {
        console.log('Source port not found:', params.handleId)
        return
      }

      console.log('Connection started from:', {
        object: sourceObject.name,
        port: sourcePort.data.label,
        type: sourcePort.data.portType
      })

      // 接続開始情報を記録（onConnectEndで使用）
      setConnectionStartData({
        sourceObjectId: params.nodeId,
        sourcePortId: params.handleId,
        sourcePortType: sourcePort.data.portType,
        sourcePortDirection: sourcePort.data.direction,
        dropPosition: { x: 0, y: 0 } // 後で更新
      })
    },
    [project.objects]
  )

  // 座標変換用のref（ReactFlowCanvasからアクセス可能にする）
  const flowPositionRef = useRef<{ x: number; y: number } | null>(null)
  
  // 接続開始データをrefで保持（コールバック内で最新の値を参照するため）
  const connectionStartDataRef = useRef<typeof connectionStartData>(null)
  useEffect(() => {
    connectionStartDataRef.current = connectionStartData
  }, [connectionStartData])
  
  // 接続が確立されたかどうかを追跡
  const connectionEstablishedRef = useRef(false)

  // 接続終了時の処理
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      console.log('=== onConnectEnd called ===', {
        connectionEstablished: connectionEstablishedRef.current,
        connectionStartData: connectionStartDataRef.current
      })

      // 接続が確立された場合は何もしない
      if (connectionEstablishedRef.current) {
        console.log('Connection established, skipping dialog')
        connectionEstablishedRef.current = false
        return
      }

      // 接続が確立されなかった場合（キャンバス上でドロップ）のみ処理
      const currentConnectionData = connectionStartDataRef.current
      if (!currentConnectionData) {
        console.log('No connection start data')
        return
      }

      // マウス位置を取得
      const clientX = 'clientX' in event ? event.clientX : event.touches?.[0]?.clientX || 0
      const clientY = 'clientY' in event ? event.clientY : event.touches?.[0]?.clientY || 0

      console.log('Showing template selection dialog at:', { clientX, clientY })

      // 接続開始情報を更新してダイアログを表示
      setConnectionStartData({
        ...currentConnectionData,
        dropPosition: { x: clientX, y: clientY }
      })
      setShowTemplateSelectionDialog(true)
    },
    []
  )

  const onConnect = useCallback(
    (params: Connection) => {
      console.log('=== onConnect called ===')
      // 接続が確立されたことを記録
      connectionEstablishedRef.current = true
      
      // 接続が確立された場合は、接続開始情報をクリア
      setConnectionStartData(null)
      setShowTemplateSelectionDialog(false)

      // デバッグログは開発時のみ有効
      const DEBUG = process.env.NODE_ENV === 'development' && false // falseに設定してログを無効化

      if (DEBUG) {
        console.log('=== ReactFlow onConnect called ===')
        console.log('Connection params:', params)
      }

      if (params.source && params.target && params.sourceHandle && params.targetHandle) {
        // 接続バリデーション
        const sourceObject = project.objects.find(obj => obj.id === params.source)
        const targetObject = project.objects.find(obj => obj.id === params.target)

        if (DEBUG) console.log('Found objects:', { sourceObject: sourceObject?.name, targetObject: targetObject?.name })

        if (!sourceObject || !targetObject) {
          if (DEBUG) console.log('Objects not found!')
          alert('接続対象のオブジェクトが見つかりません')
          return
        }

        // onConnect時のみデバッグログを有効にしてバリデーション実行
        const validationResult = (() => {
          // 一時的にDEBUGを有効化
          const originalConsoleLog = console.log
          let shouldLog = DEBUG

          if (shouldLog) {
            console.log('=== onConnect VALIDATION ===')
          }

          return validateConnection(
            sourceObject,
            params.sourceHandle,
            targetObject,
            params.targetHandle
          )
        })()

        if (DEBUG) console.log('Validation result:', validationResult)

        if (!validationResult.isValid) {
          if (DEBUG) console.log('Validation failed:', validationResult.errorMessage)
          alert(validationResult.errorMessage || '接続できません')
          return
        }

        if (DEBUG) console.log('Creating wire...')

        // ポート情報を取得してラベルを生成
        const sourcePortComponents = getConnectionPortComponents(sourceObject)
        const targetPortComponents = getConnectionPortComponents(targetObject)
        const sourcePort = sourcePortComponents.find(port => port.id === params.sourceHandle)
        const targetPort = targetPortComponents.find(port => port.id === params.targetHandle)

        // ポートタイプに基づいてラベルを生成
        const getPortTypeLabel = (portType: string) => {
          // 設定ストアからポートタイプ定義を取得
          const portTypeDefinition = settings.portTypes.find((pt: any) => pt.id === portType)
          if (portTypeDefinition) {
            // 短縮形を最優先、なければフォールバックの短縮形を使用
            if ((portTypeDefinition as any).shortName) {
              return (portTypeDefinition as any).shortName
            }
          }

          // フォールバック：標準的なポートタイプの短縮形
          switch (portType) {
            case 'xlr-male':
            case 'xlr-female':
              return 'XLR'
            case 'usb-a':
            case 'usb-b':
            case 'usb-c':
              return 'USB'
            case 'ethernet':
              return 'LAN'
            case 'dante':
              return 'DANTE'
            case 'hdmi':
              return 'HDMI'
            case 'trs-quarter':
            case 'ts-quarter':
              return 'TRS'
            case 'trs-mini':
              return '3.5mm'
            default:
              return portType.toUpperCase()
          }
        }

        // 両方のポートタイプを考慮してワイヤータイプを決定（TRS to XLRケーブルなどに対応）
        const wireType = (sourcePort && targetPort) 
          ? getWireTypeForConnection(sourcePort.data.portType, targetPort.data.portType)
          : (sourcePort ? getWireTypeForPortType(sourcePort.data.portType) : WireType.XLR_CABLE)

        // 設定ストアからワイヤータイプに応じたスタイルを取得
        // settingsは既にuseSettingsStore()から取得済み
        const wireTypeSettings = settings.wireTypes.find(wt =>
          wt.name === wireType || wt.id === wireType
        )

        // ワイヤータイプからラベルを生成
        const wireLabel = wireTypeSettings ? 
          ((wireTypeSettings as any).shortName || wireTypeSettings.displayName || wireTypeSettings.name) : 
          wireType

        const newWire = {
          id: `wire-${Date.now()}`,
          sourceObjectId: params.source,
          sourcePortId: params.sourceHandle,
          targetObjectId: params.target,
          targetPortId: params.targetHandle,
          wireType: wireType,
          style: {
            color: wireTypeSettings?.color || '#059669',
            strokeWidth: wireTypeSettings?.strokeWidth || 2,
            strokeDashArray: wireTypeSettings?.strokeDashArray
          },
          label: wireLabel,
          metadata: {}
        }

        addWire(newWire)
        if (DEBUG) console.log('Wire created successfully!')
      } else {
        if (DEBUG) console.log('Missing connection parameters:', params)
      }
    },
    [addWire, project.objects]
  )

  // テンプレート選択時の処理
  const handleTemplateSelect = useCallback(
    (template: EquipmentTemplate, flowPosition?: { x: number; y: number }) => {
      if (!connectionStartData) return

      const sourceObject = project.objects.find(obj => obj.id === connectionStartData.sourceObjectId)
      if (!sourceObject) return

      // 座標が渡されていない場合は、dropPositionを使用（後で変換される）
      const mousePosition = flowPosition || { x: connectionStartData.dropPosition.x, y: connectionStartData.dropPosition.y }

      // テンプレートから機材を作成
      let newEquipmentObject
      if (template.ports && Array.isArray(template.ports) && template.ports.length > 0) {
        newEquipmentObject = createEquipmentFromTemplate(template)
      } else if (template.defaultComponents && template.defaultComponents.length > 0) {
        newEquipmentObject = createEquipmentFromTemplate(template)
      } else {
        const shape = getShapeForTemplate(template.id)
        newEquipmentObject = createBasicEquipmentObject(
          template.name,
          mousePosition,
          shape,
          template.id
        )
      }

      // 機材のサイズを取得
      const renderComponent = newEquipmentObject.components.find(comp => comp.type === ComponentType.RENDER)
      const equipmentSize = renderComponent?.data?.size || { width: 100, height: 60 }

      // 機材の中心がマウス位置に来るように調整
      const centeredPosition = {
        x: mousePosition.x - equipmentSize.width / 2,
        y: mousePosition.y - equipmentSize.height / 2
      }

      newEquipmentObject.position = centeredPosition
      newEquipmentObject.templateId = template.id

      // 機材を追加
      addEquipmentObject(newEquipmentObject)

      // 互換性のあるポートを見つけて接続
      const targetPortComponents = getConnectionPortComponents(newEquipmentObject)
      const compatiblePort = targetPortComponents.find(port => {
        const portType = port.data.portType
        const portDirection = port.data.direction

        // ポートタイプの互換性チェック
        const { settings } = useSettingsStore.getState()
        const sourcePortTypeDef = settings.portTypes.find(pt => pt.id === connectionStartData.sourcePortType || pt.name === connectionStartData.sourcePortType)
        const compatiblePortTypes = sourcePortTypeDef?.compatibleWith || [connectionStartData.sourcePortType]
        const isTypeCompatible = compatiblePortTypes.includes(portType) || portType === connectionStartData.sourcePortType

        // 方向の互換性チェック
        let isDirectionCompatible = false
        if (connectionStartData.sourcePortDirection === PortDirection.BIDIRECTIONAL || portDirection === PortDirection.BIDIRECTIONAL) {
          isDirectionCompatible = true
        } else if (connectionStartData.sourcePortDirection === PortDirection.OUTPUT && portDirection === PortDirection.INPUT) {
          isDirectionCompatible = true
        } else if (connectionStartData.sourcePortDirection === PortDirection.INPUT && portDirection === PortDirection.OUTPUT) {
          isDirectionCompatible = true
        }

        return isTypeCompatible && isDirectionCompatible
      })

      if (compatiblePort) {
        // 接続を作成
        const sourcePortComponents = getConnectionPortComponents(sourceObject)
        const sourcePort = sourcePortComponents.find(port => port.id === connectionStartData.sourcePortId)
        
        if (sourcePort) {
          const wireType = getWireTypeForConnection(sourcePort.data.portType, compatiblePort.data.portType)
          const wireTypeSettings = settings.wireTypes.find(wt =>
            wt.name === wireType || wt.id === wireType
          )

          const wireLabel = wireTypeSettings ? 
            ((wireTypeSettings as any).shortName || wireTypeSettings.displayName || wireTypeSettings.name) : 
            wireType

          const newWire = {
            id: `wire-${Date.now()}`,
            sourceObjectId: connectionStartData.sourceObjectId,
            sourcePortId: connectionStartData.sourcePortId,
            targetObjectId: newEquipmentObject.id,
            targetPortId: compatiblePort.id,
            wireType: wireType,
            style: {
              color: wireTypeSettings?.color || '#059669',
              strokeWidth: wireTypeSettings?.strokeWidth || 2,
              strokeDashArray: wireTypeSettings?.strokeDashArray
            },
            label: wireLabel,
            metadata: {}
          }

          addWire(newWire)
        }
      }

      // 接続開始情報をクリア
      setConnectionStartData(null)
      setShowTemplateSelectionDialog(false)
    },
    [connectionStartData, project.objects, addEquipmentObject, addWire, settings.wireTypes, getShapeForTemplate]
  )

  // 既存ポート選択時の処理
  const handleExistingPortSelect = useCallback(
    (targetObjectId: string, targetPortId: string) => {
      if (!connectionStartData) return

      const sourceObject = project.objects.find(obj => obj.id === connectionStartData.sourceObjectId)
      const targetObject = project.objects.find(obj => obj.id === targetObjectId)
      
      if (!sourceObject || !targetObject) return

      const sourcePortComponents = getConnectionPortComponents(sourceObject)
      const sourcePort = sourcePortComponents.find(port => port.id === connectionStartData.sourcePortId)
      
      const targetPortComponents = getConnectionPortComponents(targetObject)
      const targetPort = targetPortComponents.find(port => port.id === targetPortId)

      if (sourcePort && targetPort) {
        const wireType = getWireTypeForConnection(sourcePort.data.portType, targetPort.data.portType)
        const wireTypeSettings = settings.wireTypes.find(wt =>
          wt.name === wireType || wt.id === wireType
        )

        const wireLabel = wireTypeSettings ? 
          ((wireTypeSettings as any).shortName || wireTypeSettings.displayName || wireTypeSettings.name) : 
          wireType

        const newWire = {
          id: `wire-${Date.now()}`,
          sourceObjectId: connectionStartData.sourceObjectId,
          sourcePortId: connectionStartData.sourcePortId,
          targetObjectId: targetObjectId,
          targetPortId: targetPortId,
          wireType: wireType,
          style: {
            color: wireTypeSettings?.color || '#059669',
            strokeWidth: wireTypeSettings?.strokeWidth || 2,
            strokeDashArray: wireTypeSettings?.strokeDashArray
          },
          label: wireLabel,
          metadata: {}
        }

        addWire(newWire)
      }

      // 接続開始情報をクリア
      setConnectionStartData(null)
      setShowTemplateSelectionDialog(false)
    },
    [connectionStartData, project.objects, addWire, settings.wireTypes]
  )

  // ノード・エッジ選択の処理
  const handleSelectionChange = useCallback((params: { nodes: Node[], edges: Edge[] }) => {
    setSelectedObjects(params.nodes.map(node => node.id))
    setSelectedWires(params.edges.map(edge => edge.id))
  }, [setSelectedObjects, setSelectedWires])

  // 右クリックメニューの処理
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

  // ポート編集の処理
  const handlePortEdit = useCallback((portId: string, equipmentId: string) => {
    setEditingPortData({ portId, equipmentId })
    setShowPortEditDialog(true)
  }, [])

  // ポート編集保存
  const handlePortSave = useCallback((label: string, portType: PortType, direction: PortDirection) => {
    if (!editingPortData) return

    const equipment = project.objects.find(obj => obj.id === editingPortData.equipmentId)
    if (!equipment) return

    const updatedComponents = equipment.components.map(comp => {
      if (comp.id === editingPortData.portId) {
        return {
          ...comp,
          data: {
            ...comp.data,
            label,
            portType,
            direction
          }
        }
      }
      return comp
    })

    updateEquipmentObject(editingPortData.equipmentId, { components: updatedComponents })
    setShowPortEditDialog(false)
    setEditingPortData(null)
  }, [editingPortData, project.objects, updateEquipmentObject])

  // 編集中のポート情報を取得
  const getEditingPortInfo = useCallback(() => {
    if (!editingPortData) return null

    const equipment = project.objects.find(obj => obj.id === editingPortData.equipmentId)
    if (!equipment) return null

    const port = equipment.components.find(comp => comp.id === editingPortData.portId)
    if (!port) return null

    return {
      label: port.data.label || '',
      portType: port.data.portType,
      direction: port.data.direction
    }
  }, [editingPortData, project.objects])

  // コンテキストメニューアイテムの生成
  const getContextMenuItems = useCallback(() => {
    if (!contextMenu) return []

    switch (contextMenu.type) {
      case 'canvas':
        const hasSelection = selectedObjectIds.length > 0 || selectedWireIds.length > 0
        const hasBothTypes = selectedObjectIds.length > 0 && selectedWireIds.length > 0
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
              }
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
              duplicateSelected()
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
  }, [contextMenu, selectedObjectIds, selectedWireIds, setSelectedObjects, setSelectedWires, duplicateSelected, removeEquipmentObject, removeWire])

  // 自動レイアウトの適用
  const handleAutoLayout = useCallback((options: LayoutOptions) => {
    const layoutResult = autoLayout(project.objects, project.wires, options)

    // 各オブジェクトの位置を更新
    Object.entries(layoutResult.positions).forEach(([objectId, position]) => {
      updateEquipmentObject(objectId, { position })
    })
  }, [project.objects, project.wires, updateEquipmentObject])

  // エッジの再接続処理
  const handleReconnect = useCallback((oldEdge: Edge, connection: Connection) => {
    const DEBUG = process.env.NODE_ENV === 'development' && false

    if (DEBUG) {
      console.log('=== Edge Reconnect ===')
      console.log('Old edge:', oldEdge)
      console.log('New connection:', connection)
    }

    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      if (DEBUG) console.log('Missing connection parameters')
      return false
    }

    // 接続バリデーション
    const sourceObject = project.objects.find(obj => obj.id === connection.source)
    const targetObject = project.objects.find(obj => obj.id === connection.target)

    if (!sourceObject || !targetObject) {
      if (DEBUG) console.log('Objects not found for reconnection')
      alert('接続対象のオブジェクトが見つかりません')
      return false
    }

    const validationResult = validateConnection(
      sourceObject,
      connection.sourceHandle,
      targetObject,
      connection.targetHandle
    )

    if (!validationResult.isValid) {
      if (DEBUG) console.log('Reconnection validation failed:', validationResult.errorMessage)
      alert(validationResult.errorMessage || '再接続できません')
      return false
    }

    // ワイヤーを更新
    updateWire(oldEdge.id, {
      sourceObjectId: connection.source,
      sourcePortId: connection.sourceHandle,
      targetObjectId: connection.target,
      targetPortId: connection.targetHandle
    })

    if (DEBUG) console.log('Edge reconnected successfully!')
    return true
  }, [project.objects, updateWire])

  // 接続の事前バリデーション
  const isValidConnection = useCallback((connection: Connection) => {
    const DEBUG = false // ドラッグ中のログを無効化

    if (DEBUG) {
      console.log('=== ReactFlow isValidConnection called ===')
      console.log('Connection:', connection)
    }

    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      if (DEBUG) console.log('Missing connection data')
      return false
    }

    // 同じオブジェクト内での接続は禁止
    if (connection.source === connection.target) {
      if (DEBUG) console.log('Same object connection not allowed')
      return false
    }

    const sourceObject = project.objects.find(obj => obj.id === connection.source)
    const targetObject = project.objects.find(obj => obj.id === connection.target)

    if (!sourceObject || !targetObject) {
      if (DEBUG) console.log('Objects not found for validation')
      return false
    }

    // 双方向ポート同士の接続は常に許可（ReactFlowが自動的にsource/targetを決定）
    const sourcePortComponents = getConnectionPortComponents(sourceObject)
    const targetPortComponents = getConnectionPortComponents(targetObject)

    const sourcePort = sourcePortComponents.find(port => port.id === connection.sourceHandle)
    const targetPort = targetPortComponents.find(port => port.id === connection.targetHandle)

    if (sourcePort?.data.direction === 'bidirectional' && targetPort?.data.direction === 'bidirectional') {
      // 双方向ポート同士は基本的な互換性チェックのみ
      const sourceType = sourcePort.data.portType
      const targetType = targetPort.data.portType

      // 同じタイプまたは互換性のあるタイプ
      const isCompatible = sourceType === targetType ||
        // Ethernet/Dante互換性
        (sourceType === 'ethernet' && targetType === 'dante') ||
        (sourceType === 'dante' && targetType === 'ethernet') ||
        // USB互換性
        (['usb-a', 'usb-b', 'usb-c'].includes(sourceType) && ['usb-a', 'usb-b', 'usb-c'].includes(targetType))

      if (DEBUG) console.log('Bidirectional ports compatibility:', isCompatible)
      return isCompatible
    }

    // その他の接続は通常のバリデーション
    const validationResult = validateConnection(
      sourceObject,
      connection.sourceHandle,
      targetObject,
      connection.targetHandle
    )

    if (DEBUG) console.log('Pre-validation result:', validationResult.isValid)
    return validationResult.isValid
  }, [project.objects])

  return (
    <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden">
      {/* メインキャンバス */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <div
          data-id="react-flow-canvas"
          className="w-full h-full select-none"
          onContextMenu={handleContextMenu}
          style={{ userSelect: 'none' }}
        >
          <ReactFlowProvider>
            <ReactFlowCanvas
              nodes={nodes}
              edges={edges}
              handleNodesChange={handleNodesChange}
              handleEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              handleReconnect={handleReconnect}
              handleSelectionChange={handleSelectionChange}
              isValidConnection={isValidConnection}
              handleNodeContextMenu={handleNodeContextMenu}
              handleEdgeContextMenu={handleEdgeContextMenu}
              setContextMenu={setContextMenu}
              onCloseMenus={onCloseMenus}
              addEquipmentObject={addEquipmentObject}
              getShapeForTemplate={getShapeForTemplate}
              dragStartPositions={dragStartPositions}
              setDragStartPositions={setDragStartPositions}
              lockedDirection={lockedDirection}
              setLockedDirection={setLockedDirection}
              connectionStartData={connectionStartData}
              flowPositionRef={flowPositionRef}
            />
          </ReactFlowProvider>
        </div>
      </div>

      {/* サイドパネル（モバイル） */}
      <div className="w-full lg:hidden h-64 bg-white border-t border-gray-300 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <InspectorPanel />
        </div>
      </div>

      {/* サイドパネル（デスクトップ - リサイズ可能） */}
      <ResizableWidthPanel
        initialWidth={320}
        minWidth={200}
        maxWidth={800}
        className="hidden lg:flex h-full bg-white border-l border-gray-300 flex-col overflow-hidden"
        side="right"
      >
        {/* インスペクターパネル */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <InspectorPanel />
        </div>
      </ResizableWidthPanel>

      {/* テンプレートライブラリ */}
      {showTemplateLibrary && (
        <div className="absolute top-6 left-0 w-full lg:w-80 h-[calc(100%-24px)] bg-white border-r border-gray-300 z-10">
          <TemplateLibrary
            onClose={onCloseTemplateLibrary || (() => { })}
            onAddEquipment={(_template) => {
              // テンプレート追加後もライブラリを開いたままにする
              // onCloseTemplateLibrary?.() を削除
            }}
          />
        </div>
      )}

      {/* テーブルエディタ */}
      {showTableEditor && (
        <div className="absolute bottom-0 left-0 right-0 lg:right-80 z-10">
          <ResizablePanel
            initialHeight={320}
            minHeight={200}
            maxHeight={600}
            className="bg-white border-t border-gray-300"
          >
            <TableEditor onClose={onCloseTableEditor || (() => { })} />
          </ResizablePanel>
        </div>
      )}

      {/* 自動レイアウトダイアログ */}


      {/* テンプレート保存ダイアログ */}
      <SaveTemplateDialog
        isOpen={!!showSaveTemplateDialog}
        equipmentObject={showSaveTemplateDialog}
        onClose={() => setShowSaveTemplateDialog(null)}
      />

      {/* ポート編集ダイアログ */}
      <PortEditDialog
        isOpen={showPortEditDialog}
        onClose={() => {
          setShowPortEditDialog(false)
          setEditingPortData(null)
        }}
        onSave={handlePortSave}
        initialLabel={getEditingPortInfo()?.label || ''}
        initialPortType={getEditingPortInfo()?.portType || PortType.XLR_FEMALE}
        initialDirection={getEditingPortInfo()?.direction || PortDirection.INPUT}
      />

      {/* テンプレート選択ダイアログ */}
      {showTemplateSelectionDialog && connectionStartData && (
        <TemplateSelectionDialog
          sourcePortType={connectionStartData.sourcePortType}
          sourcePortDirection={connectionStartData.sourcePortDirection}
          sourceObjectId={connectionStartData.sourceObjectId}
          dropPosition={connectionStartData.dropPosition}
          flowPosition={flowPositionRef.current || { x: 0, y: 0 }}
          onSelectTemplate={(template) => {
            // 座標変換はReactFlowCanvas内で行うため、ここではundefinedを渡す
            handleTemplateSelect(template)
          }}
          onSelectExistingPort={handleExistingPortSelect}
          onClose={() => {
            setShowTemplateSelectionDialog(false)
            setConnectionStartData(null)
          }}
        />
      )}

      {/* コンテキストメニュー */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
})

WiringDiagramEditor.displayName = 'WiringDiagramEditor'

export default WiringDiagramEditor