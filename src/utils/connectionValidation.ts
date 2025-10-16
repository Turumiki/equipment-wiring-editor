import {
  EquipmentObject,
  PortDirection,
  PortType
} from '@/types'
import { getConnectionPortComponents } from './componentSystem'
import { useSettingsStore } from '@/store/useSettingsStore'

export interface ValidationResult {
  isValid: boolean
  errorMessage?: string
}

export function validateConnection(
  sourceObject: EquipmentObject,
  sourcePortId: string,
  targetObject: EquipmentObject,
  targetPortId: string
): ValidationResult {
  // デバッグログは開発時のみ有効
  const DEBUG = process.env.NODE_ENV === 'development' && false // falseに設定してログを無効化
  // 同じオブジェクト内での接続は禁止
  if (sourceObject.id === targetObject.id) {
    return {
      isValid: false,
      errorMessage: '同じ機材内での接続はできません'
    }
  }

  const sourcePortComponents = getConnectionPortComponents(sourceObject)
  const targetPortComponents = getConnectionPortComponents(targetObject)

  const sourcePort = sourcePortComponents.find(port => port.id === sourcePortId)
  const targetPort = targetPortComponents.find(port => port.id === targetPortId)

  if (DEBUG) {
    console.log('Source Port:', sourcePort?.data)
    console.log('Target Port:', targetPort?.data)
  }

  if (!sourcePort || !targetPort) {
    if (DEBUG) console.log('Port not found!')
    return {
      isValid: false,
      errorMessage: '接続ポートが見つかりません'
    }
  }

  // 方向の検証（双方向ポートは除外）
  const sourceBidirectional = sourcePort.data.direction === PortDirection.BIDIRECTIONAL
  const targetBidirectional = targetPort.data.direction === PortDirection.BIDIRECTIONAL

  // 双方向ポートが含まれる場合は方向チェックをスキップ
  if (!sourceBidirectional && !targetBidirectional) {
    if (sourcePort.data.direction === PortDirection.INPUT && targetPort.data.direction === PortDirection.INPUT) {
      return {
        isValid: false,
        errorMessage: '入力ポート同士は接続できません'
      }
    }

    if (sourcePort.data.direction === PortDirection.OUTPUT && targetPort.data.direction === PortDirection.OUTPUT) {
      return {
        isValid: false,
        errorMessage: '出力ポート同士は接続できません'
      }
    }
  }

  // ポートタイプの互換性検証（簡易版）
  if (DEBUG) {
    console.log('Source port type:', sourcePort.data.portType)
    console.log('Target port type:', targetPort.data.portType)
  }
  
  // 基本的な互換性チェック
  const basicCompatibility: Partial<Record<PortType, PortType[]>> = {
    [PortType.XLR_MALE]: [PortType.XLR_FEMALE],
    [PortType.XLR_FEMALE]: [PortType.XLR_MALE],
    [PortType.TRS_QUARTER]: [PortType.TRS_QUARTER, PortType.TS_QUARTER],
    [PortType.TS_QUARTER]: [PortType.TS_QUARTER, PortType.TRS_QUARTER],
    [PortType.USB_A]: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
    [PortType.USB_B]: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
    [PortType.USB_C]: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
    [PortType.ETHERNET]: [PortType.ETHERNET, PortType.DANTE],
    [PortType.DANTE]: [PortType.DANTE, PortType.ETHERNET],
    [PortType.HDMI]: [PortType.HDMI],
    [PortType.TRS_MINI]: [PortType.TRS_MINI],
    [PortType.POWER_AC]: [PortType.POWER_AC]
  }
  
  const sourceType = sourcePort.data.portType
  const targetType = targetPort.data.portType
  
  // 同じタイプは常に互換性あり
  const typesCompatible = sourceType === targetType || 
                          basicCompatibility[sourceType]?.includes(targetType) ||
                          false
  
  if (DEBUG) console.log('Types compatible:', typesCompatible)

  if (!typesCompatible) {
    if (DEBUG) console.log('Type compatibility failed!')
    return {
      isValid: false,
      errorMessage: `${sourceType}と${targetType}は互換性がありません`
    }
  }

  // 接続数制限の検証
  const sourceConnectionCount = sourcePort.data.connectedWires.length
  const targetConnectionCount = targetPort.data.connectedWires.length

  if (sourcePort.data.constraints.maxConnections > 0 &&
    sourceConnectionCount >= sourcePort.data.constraints.maxConnections) {
    return {
      isValid: false,
      errorMessage: 'ソースポートの最大接続数に達しています'
    }
  }

  if (targetPort.data.constraints.maxConnections > 0 &&
    targetConnectionCount >= targetPort.data.constraints.maxConnections) {
    return {
      isValid: false,
      errorMessage: 'ターゲットポートの最大接続数に達しています'
    }
  }

  // 許可されたポートタイプの検証
  if (DEBUG) {
    console.log('Source allowed types:', sourcePort.data.constraints.allowedPortTypes)
    console.log('Target allowed types:', targetPort.data.constraints.allowedPortTypes)
  }

  if (!sourcePort.data.constraints.allowedPortTypes.includes(targetPort.data.portType)) {
    if (DEBUG) console.log('Source port type constraint failed!')
    return {
      isValid: false,
      errorMessage: 'このポートタイプとの接続は許可されていません'
    }
  }

  if (!targetPort.data.constraints.allowedPortTypes.includes(sourcePort.data.portType)) {
    if (DEBUG) console.log('Target port type constraint failed!')
    return {
      isValid: false,
      errorMessage: 'このポートタイプとの接続は許可されていません'
    }
  }

  // 許可された方向の検証は、基本的な方向チェックで十分
  // ここでは追加の制約チェックは行わない
  if (DEBUG) {
    console.log('Source allowed directions:', sourcePort.data.constraints.allowedDirections)
    console.log('Target allowed directions:', targetPort.data.constraints.allowedDirections)
    console.log('Target direction:', targetPort.data.direction)
    console.log('Source direction:', sourcePort.data.direction)
    console.log('Direction validation passed - using basic direction check only')
  }

  if (DEBUG) console.log('Connection validation passed!')
  return { isValid: true }
}

// 互換性チェックは設定ストアで管理されるようになりました

export function getConnectionErrorMessage(
  sourceObject: EquipmentObject,
  sourcePortId: string,
  targetObject: EquipmentObject,
  targetPortId: string
): string | null {
  const result = validateConnection(sourceObject, sourcePortId, targetObject, targetPortId)
  return result.isValid ? null : result.errorMessage || '接続できません'
}