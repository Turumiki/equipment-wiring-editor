import { useCallback } from 'react'
import { Connection, Edge } from 'reactflow'
import { useProjectStore } from '@/store/useProjectStore'
import { getConnectionPortComponents } from '@/utils/componentSystem'
import { validateConnection } from '@/utils/connectionValidation'

export function useConnectionValidation() {
  const { project, updateWire } = useProjectStore()

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

  return {
    isValidConnection,
    handleReconnect
  }
}

