'use client'

import React, { useCallback, useState, useEffect, useImperativeHandle, useRef } from 'react'
import {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  NodeChange,
  EdgeChange,
  ReactFlowProvider
} from 'reactflow'

import { useProjectStore } from '@/store/useProjectStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { EquipmentObject, ShapeType } from '@/types'
import ReactFlowCanvas from '@/components/ReactFlowCanvas'
import { useNodeDrag } from '@/hooks/useNodeDrag'
import { useConnectionHandlers } from '@/hooks/useConnectionHandlers'
import { useContextMenu } from '@/hooks/useContextMenu'
import { usePortEdit } from '@/hooks/usePortEdit'
import { useNodeEdgeChanges } from '@/hooks/useNodeEdgeChanges'
import { useConnectionValidation } from '@/hooks/useConnectionValidation'
import { useAutoLayout } from '@/hooks/useAutoLayout'

import TemplateLibrary from '@/components/TemplateLibrary'
import TableEditor from '@/components/TableEditor'
import InspectorPanel from '@/components/InspectorPanel'
import ResizablePanel from '@/components/ResizablePanel'
import ResizableWidthPanel from '@/components/ResizableWidthPanel'
import { getRenderComponent } from '@/utils/componentSystem'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import ContextMenu from '@/components/ContextMenu'

import SaveTemplateDialog from '@/components/SaveTemplateDialog'
import PortEditDialog from '@/components/PortEditDialog'
import TemplateSelectionDialog from '@/components/TemplateSelectionDialog'
import { LayoutOptions } from '@/utils/autoLayout'
import { PortType, PortDirection } from '@/types'

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
  applyAutoLayout: (options: LayoutOptions) => void
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
  
  const {
    project,
    setSelectedObjects,
    setSelectedWires,
    selectedObjectIds,
    selectedWireIds,
    removeEquipmentObject,
    removeWire,
    updateEquipmentObject,
    copySelected,
    pasteSelected,
    duplicateSelected,
    alignSelected,
    distributeSelected,
    addEquipmentObject
  } = useProjectStore()
  const { hydrate } = useSettingsStore()

  // ノードドラッグ操作の管理
  const { dragStartPositions, lockedDirection } = useNodeDrag(nodes, onCloseMenus)

  // テンプレートに応じた図形を取得
  const getShapeForTemplate = (templateId: string): ShapeType => {
    return ShapeType.RECTANGLE
  }

  // 接続関連のハンドラー
  const {
    connectionStartData,
    showTemplateSelectionDialog,
    onConnectStart,
    onConnectEnd,
    onConnect,
    handleTemplateSelect,
    handleExistingPortSelect,
    setConnectionStartData,
    setShowTemplateSelectionDialog
  } = useConnectionHandlers(getShapeForTemplate)

  // コンテキストメニュー
  const {
    contextMenu,
    setContextMenu,
    handleContextMenu,
    handleNodeContextMenu,
    handleEdgeContextMenu,
    getContextMenuItems
  } = useContextMenu(selectedObjectIds, selectedWireIds, project, setShowSaveTemplateDialog)

  // ポート編集
  const {
    editingPortData,
    showPortEditDialog,
    setShowPortEditDialog,
    setEditingPortData,
    handlePortEdit,
    handlePortSave,
    getEditingPortInfo
  } = usePortEdit()

  // ノード/エッジ変更処理
  const { handleNodesChange: handleNodesChangeInternal, handleEdgesChange: handleEdgesChangeInternal } = useNodeEdgeChanges(
    dragStartPositions,
    lockedDirection
  )

  // 接続バリデーション
  const { isValidConnection, handleReconnect } = useConnectionValidation()

  // クライアントサイドでの設定初期化
  useEffect(() => {
    hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // キーボードショートカットを有効化
  useKeyboardShortcuts()

  // 自動レイアウト
  const { handleAutoLayout } = useAutoLayout()

  // refの実装
  useImperativeHandle(ref, () => ({
    selectAll: () => {
      // 全選択の実装
      setSelectedObjects(project.objects.map(obj => obj.id))
      setSelectedWires(project.wires.map(wire => wire.id))
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
    applyAutoLayout: async (options: LayoutOptions, onProgress?: (progress: any) => void, cancelToken?: any) => {
      await handleAutoLayout(options, onProgress, cancelToken)
    }
  }), [handleAutoLayout, setSelectedObjects, setSelectedWires, project.objects, project.wires, selectedObjectIds, selectedWireIds, removeEquipmentObject, removeWire, copySelected, pasteSelected, duplicateSelected, alignSelected, distributeSelected])

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
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      handleNodesChangeInternal(changes, onNodesChange)
    },
    [handleNodesChangeInternal, onNodesChange]
  )

  // エッジ変更の処理
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      handleEdgesChangeInternal(changes, onEdgesChange)
    },
    [handleEdgesChangeInternal, onEdgesChange]
  )

  // 座標変換用のref（ReactFlowCanvasからアクセス可能にする）
  const flowPositionRef = useRef<{ x: number; y: number } | null>(null)

  // ノード・エッジ選択の処理
  const handleSelectionChange = useCallback((params: { nodes: Node[], edges: Edge[] }) => {
    // 選択範囲で選択されたノードとエッジのみを選択状態にする
    const selectedNodeIds = params.nodes.map(node => node.id)
    const selectedEdgeIds = params.edges.map(edge => edge.id)
    
    setSelectedObjects(selectedNodeIds)
    setSelectedWires(selectedEdgeIds)
  }, [setSelectedObjects, setSelectedWires])

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