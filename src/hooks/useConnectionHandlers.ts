import { useCallback, useRef, useEffect, useState } from 'react'
import { Connection } from 'reactflow'
import { useProjectStore } from '@/store/useProjectStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { PortType, PortDirection, EquipmentTemplate, ComponentType, WireType } from '@/types'
import { getConnectionPortComponents, createEquipmentFromTemplate, createBasicEquipmentObject } from '@/utils/componentSystem'
import { getWireTypeForConnection, getWireTypeForPortType } from '@/utils/portTypeUtils'
import { validateConnection } from '@/utils/connectionValidation'
import { ShapeType } from '@/types'

interface ConnectionStartData {
  sourceObjectId: string
  sourcePortId: string
  sourcePortType: PortType
  sourcePortDirection: PortDirection
  dropPosition: { x: number; y: number }
}

export function useConnectionHandlers(
  getShapeForTemplate: (templateId: string) => ShapeType
) {
  const { project, addWire, addEquipmentObject } = useProjectStore()
  const { settings } = useSettingsStore()
  const [connectionStartData, setConnectionStartData] = useState<ConnectionStartData | null>(null)
  const [showTemplateSelectionDialog, setShowTemplateSelectionDialog] = useState(false)
  const connectionStartDataRef = useRef<ConnectionStartData | null>(null)
  const connectionEstablishedRef = useRef(false)

  useEffect(() => {
    connectionStartDataRef.current = connectionStartData
  }, [connectionStartData])

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

  // ポートタイプからラベルを生成
  const getPortTypeLabel = useCallback((portType: string) => {
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
  }, [settings.portTypes])

  // 接続が確立された時の処理
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

        // 両方のポートタイプを考慮してワイヤータイプを決定（TRS to XLRケーブルなどに対応）
        const wireType = (sourcePort && targetPort) 
          ? getWireTypeForConnection(sourcePort.data.portType, targetPort.data.portType)
          : (sourcePort ? getWireTypeForPortType(sourcePort.data.portType) : WireType.XLR_CABLE)

        // 設定ストアからワイヤータイプに応じたスタイルを取得
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
    [addWire, project.objects, settings.wireTypes, getPortTypeLabel]
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

          // 方向に基づいてsource/targetを決定
          // ドラッグ開始元がINPUTの場合、逆向きに接続する
          // Source(出力) -> Target(入力) の関係を守るため
          let wireSourceObjectId = connectionStartData.sourceObjectId
          let wireSourcePortId = connectionStartData.sourcePortId
          let wireTargetObjectId = newEquipmentObject.id
          let wireTargetPortId = compatiblePort.id

          if (connectionStartData.sourcePortDirection === PortDirection.INPUT) {
            wireSourceObjectId = newEquipmentObject.id
            wireSourcePortId = compatiblePort.id
            wireTargetObjectId = connectionStartData.sourceObjectId
            wireTargetPortId = connectionStartData.sourcePortId
          }

          const newWire = {
            id: `wire-${Date.now()}`,
            sourceObjectId: wireSourceObjectId,
            sourcePortId: wireSourcePortId,
            targetObjectId: wireTargetObjectId,
            targetPortId: wireTargetPortId,
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
      console.log('handleExistingPortSelect called', { targetObjectId, targetPortId, connectionStartData })
      if (!connectionStartData) {
        console.error('connectionStartData is missing')
        return
      }

      const sourceObject = project.objects.find(obj => obj.id === connectionStartData.sourceObjectId)
      const targetObject = project.objects.find(obj => obj.id === targetObjectId)
      
      if (!sourceObject || !targetObject) {
        console.error('Source or Target object not found', { sourceObject, targetObject })
        return
      }

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

        // 方向に基づいてsource/targetを決定
        // ドラッグ開始元がINPUTの場合、逆向きに接続する
        // Source(出力) -> Target(入力) の関係を守るため
        let wireSourceObjectId = connectionStartData.sourceObjectId
        let wireSourcePortId = connectionStartData.sourcePortId
        let wireTargetObjectId = targetObjectId
        let wireTargetPortId = targetPortId

        if (connectionStartData.sourcePortDirection === PortDirection.INPUT) {
          wireSourceObjectId = targetObjectId
          wireSourcePortId = targetPortId
          wireTargetObjectId = connectionStartData.sourceObjectId
          wireTargetPortId = connectionStartData.sourcePortId
        }

        const newWire = {
          id: `wire-${Date.now()}`,
          sourceObjectId: wireSourceObjectId,
          sourcePortId: wireSourcePortId,
          targetObjectId: wireTargetObjectId,
          targetPortId: wireTargetPortId,
          wireType: wireType,
          style: {
            color: wireTypeSettings?.color || '#059669',
            strokeWidth: wireTypeSettings?.strokeWidth || 2,
            strokeDashArray: wireTypeSettings?.strokeDashArray
          },
          label: wireLabel,
          metadata: {}
        }

        console.log('Adding new wire:', newWire)
        addWire(newWire)
      } else {
        console.error('Source or Target port not found', { sourcePort, targetPort })
      }

      // 接続開始情報をクリア
      setConnectionStartData(null)
      setShowTemplateSelectionDialog(false)
    },
    [connectionStartData, project.objects, addWire, settings.wireTypes]
  )

  return {
    connectionStartData,
    showTemplateSelectionDialog,
    onConnectStart,
    onConnectEnd,
    onConnect,
    handleTemplateSelect,
    handleExistingPortSelect,
    setConnectionStartData,
    setShowTemplateSelectionDialog
  }
}

