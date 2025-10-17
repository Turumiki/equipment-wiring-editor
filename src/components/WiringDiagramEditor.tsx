'use client'

import React, { useCallback, useState, useEffect } from 'react'
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
  EdgeChange
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useProjectStore } from '@/store/useProjectStore'
import { WireType } from '@/types'
import EquipmentNode from '@/components/nodes/EquipmentNode'
import WireEdge from '@/components/edges/WireEdge'
import Toolbar from '@/components/Toolbar'
import TemplateLibrary from '@/components/TemplateLibrary'
import TableEditor from '@/components/TableEditor'
import InspectorPanel from '@/components/InspectorPanel'
import { getRenderComponent, getConnectionPortComponents } from '@/utils/componentSystem'
import { validateConnection } from '@/utils/connectionValidation'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

const nodeTypes = {
  equipment: EquipmentNode,
}

const edgeTypes = {
  wire: WireEdge,
}

export default function WiringDiagramEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showTableEditor, setShowTableEditor] = useState(false)
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false)

  const { project, addWire, updateEquipmentObject, setSelectedObjects, setSelectedWires, selectedObjectIds, selectedWireIds } = useProjectStore()

  // キーボードショートカットを有効化
  useKeyboardShortcuts()

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
          isEditMode: false
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
        
        const newWire = {
          id: `wire-${Date.now()}`,
          sourceObjectId: params.source,
          sourcePortId: params.sourceHandle,
          targetObjectId: params.target,
          targetPortId: params.targetHandle,
          wireType: WireType.XLR_CABLE,
          style: {
            color: '#059669',
            strokeWidth: 2,
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
    <div className="h-full w-full flex flex-col lg:flex-row">
      {/* メインキャンバス */}
      <div className="flex-1 relative min-h-0">
        <div data-id="react-flow-canvas" className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onSelectionChange={handleSelectionChange}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-gray-200"
            multiSelectionKeyCode="Shift"
            deleteKeyCode="Delete"
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#999" />

            {/* ツールバー */}
            <Panel position="top-left">
              <Toolbar
                onToggleTemplateLibrary={() => setShowTemplateLibrary(!showTemplateLibrary)}
                onToggleTableEditor={() => setShowTableEditor(!showTableEditor)}
              />
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* サイドパネル */}
      <div className="w-full lg:w-80 h-64 lg:h-full bg-gray-100 border-t lg:border-t-0 lg:border-l border-gray-400 flex flex-col">
        {/* インスペクターパネル */}
        <div className="flex-1 min-h-0">
          <InspectorPanel />
        </div>
      </div>

      {/* テンプレートライブラリ */}
      {showTemplateLibrary && (
        <div className="absolute top-0 left-0 w-full lg:w-80 h-full bg-gray-100 border-r border-gray-400 z-10">
          <TemplateLibrary
            onClose={() => setShowTemplateLibrary(false)}
            onAddEquipment={(_template) => {
              setShowTemplateLibrary(false)
            }}
          />
        </div>
      )}

      {/* テーブルエディタ */}
      {showTableEditor && (
        <div className="absolute bottom-0 left-0 right-0 lg:right-80 h-80 bg-gray-100 border-t border-gray-400 z-10">
          <TableEditor onClose={() => setShowTableEditor(false)} />
        </div>
      )}
    </div>
  )
}