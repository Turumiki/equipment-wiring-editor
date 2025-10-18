'use client'

import React, { useCallback, useState, useEffect, useImperativeHandle } from 'react'
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
import EquipmentNode from '@/components/nodes/EquipmentNode'
import WireEdge from '@/components/edges/WireEdge'

import TemplateLibrary from '@/components/TemplateLibrary'
import TableEditor from '@/components/TableEditor'
import InspectorPanel from '@/components/InspectorPanel'
import { getRenderComponent, getConnectionPortComponents, createEquipmentFromTemplate, createBasicEquipmentObject } from '@/utils/componentSystem'
import { validateConnection } from '@/utils/connectionValidation'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import ContextMenu from '@/components/ContextMenu'

import SaveTemplateDialog from '@/components/SaveTemplateDialog'
import { autoLayout, LayoutOptions } from '@/utils/autoLayout'

const nodeTypes = {
  equipment: EquipmentNode,
}

const edgeTypes = {
  wire: WireEdge,
}

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
  distributeHorizontal: () => void
  distributeVertical: () => void
  validateConnections: () => void
  applyAutoLayout: (options: any) => void
}

// ReactFlowキャンバスコンポーネント
function ReactFlowCanvas({
  nodes,
  edges,
  handleNodesChange,
  handleEdgesChange,
  onConnect,
  handleReconnect,
  handleSelectionChange,
  isValidConnection,
  nodeTypes,
  edgeTypes,
  handleNodeContextMenu,
  handleEdgeContextMenu,
  setContextMenu,
  onCloseMenus,
  addEquipmentObject,
  getShapeForTemplate
}: any) {
  const { screenToFlowPosition } = useReactFlow()

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
      onReconnect={handleReconnect}
      onSelectionChange={handleSelectionChange}
      isValidConnection={isValidConnection}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      connectionLineType={ConnectionLineType.SmoothStep}
      connectionLineStyle={{
        stroke: '#059669',
        strokeWidth: 2,
        strokeDasharray: '5,5'
      }}
      fitView
      className="bg-gray-200"
      multiSelectionKeyCode="Shift"
      deleteKeyCode="Delete"
      onNodeContextMenu={handleNodeContextMenu}
      onEdgeContextMenu={handleEdgeContextMenu}
      onPaneClick={() => {
        setContextMenu(null)
        onCloseMenus?.()
      }}
      onNodeDrag={() => onCloseMenus?.()}
      onNodeDragStart={() => onCloseMenus?.()}
      onSelectionDragStart={() => onCloseMenus?.()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Controls />
      <MiniMap />
      <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#999" />
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
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'canvas' | 'node' | 'edge'
    targetId?: string
  } | null>(null)

  const { project, addWire, updateWire, updateEquipmentObject, setSelectedObjects, setSelectedWires, selectedObjectIds, selectedWireIds, removeEquipmentObject, removeWire, duplicateSelected, alignSelected, distributeSelected, addEquipmentObject } = useProjectStore()

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
      // コピーの実装（今後実装）
      console.log('Copy not implemented yet')
    },
    paste: () => {
      // 貼り付けの実装（今後実装）
      console.log('Paste not implemented yet')
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
          isSelected: isSelected
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
    onNodesChange(changes)

    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        // 位置変更をプロジェクトに反映
        updateEquipmentObject(change.id, { position: change.position }, true) // ドラッグ中は履歴保存をスキップ
      } else if (change.type === 'remove') {
        // ノード削除をプロジェクトに反映
        const { removeEquipmentObject } = useProjectStore.getState()
        removeEquipmentObject(change.id)
      }
    })
  }, [onNodesChange, updateEquipmentObject])

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

  const onConnect = useCallback(
    (params: Connection) => {
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

        const validationResult = validateConnection(
          sourceObject,
          params.sourceHandle,
          targetObject,
          params.targetHandle
        )

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

        const wireLabel = sourcePort ? getPortTypeLabel(sourcePort.data.portType) : ''

        // ポートタイプに応じて適切なワイヤータイプを決定
        const getWireTypeForPort = (portType: string): WireType => {
          switch (portType) {
            case 'xlr-male':
            case 'xlr-female':
              return WireType.XLR_CABLE
            case 'trs-quarter':
            case 'ts-quarter':
              return WireType.TRS_CABLE
            case 'trs-mini':
              return WireType.TRS_CABLE
            case 'usb-a':
            case 'usb-b':
            case 'usb-c':
              return WireType.USB_CABLE
            case 'ethernet':
            case 'dante':
              return WireType.ETHERNET_CABLE
            case 'hdmi':
              return WireType.HDMI_CABLE
            case 'displayport':
              return WireType.DISPLAYPORT_CABLE
            case 'power-ac':
            case 'power-dc':
              return WireType.POWER_CABLE
            case 'midi':
              return WireType.MIDI_CABLE
            default:
              return WireType.XLR_CABLE
          }
        }

        const wireType = sourcePort ? getWireTypeForPort(sourcePort.data.portType) : WireType.XLR_CABLE

        // 設定ストアからワイヤータイプに応じたスタイルを取得
        const { settings } = useSettingsStore.getState()
        const wireTypeSettings = settings.wireTypes.find(wt =>
          wt.name === wireType || wt.id === wireType
        )

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

  // コンテキストメニューアイテムの生成
  const getContextMenuItems = useCallback(() => {
    if (!contextMenu) return []

    switch (contextMenu.type) {
      case 'canvas':
        return [
          {
            label: '貼り付け',
            onClick: () => {
              // TODO: 貼り付け機能の実装
            },
            disabled: true
          }
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
  }, [contextMenu, selectedObjectIds, setSelectedObjects, duplicateSelected, removeEquipmentObject, removeWire])

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
    const DEBUG = process.env.NODE_ENV === 'development' && false // falseに設定してログを無効化

    if (DEBUG) {
      console.log('=== ReactFlow isValidConnection called ===')
      console.log('Connection:', connection)
    }

    if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      if (DEBUG) console.log('Missing connection data')
      return false
    }

    const sourceObject = project.objects.find(obj => obj.id === connection.source)
    const targetObject = project.objects.find(obj => obj.id === connection.target)

    if (!sourceObject || !targetObject) {
      if (DEBUG) console.log('Objects not found for validation')
      return false
    }

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
              handleReconnect={handleReconnect}
              handleSelectionChange={handleSelectionChange}
              isValidConnection={isValidConnection}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              handleNodeContextMenu={handleNodeContextMenu}
              handleEdgeContextMenu={handleEdgeContextMenu}
              setContextMenu={setContextMenu}
              onCloseMenus={onCloseMenus}
              addEquipmentObject={addEquipmentObject}
              getShapeForTemplate={getShapeForTemplate}
            />
          </ReactFlowProvider>
        </div>
      </div>

      {/* サイドパネル */}
      <div className="w-full lg:w-80 h-64 lg:h-full bg-gray-100 border-t lg:border-t-0 lg:border-l border-gray-400 flex flex-col overflow-hidden">
        {/* インスペクターパネル */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <InspectorPanel />
        </div>
      </div>

      {/* テンプレートライブラリ */}
      {showTemplateLibrary && (
        <div className="absolute top-6 left-0 w-full lg:w-80 h-[calc(100%-24px)] bg-gray-100 border-r border-gray-400 z-10">
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
        <div className="absolute bottom-0 left-0 right-0 lg:right-80 h-80 bg-gray-100 border-t border-gray-400 z-10">
          <TableEditor onClose={onCloseTableEditor || (() => { })} />
        </div>
      )}

      {/* 自動レイアウトダイアログ */}


      {/* テンプレート保存ダイアログ */}
      <SaveTemplateDialog
        isOpen={!!showSaveTemplateDialog}
        equipmentObject={showSaveTemplateDialog}
        onClose={() => setShowSaveTemplateDialog(null)}
      />

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