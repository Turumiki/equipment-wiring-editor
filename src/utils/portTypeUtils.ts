import { PortType, PortDirection, WireType } from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'

// 方向から表示名を生成するマッピング
const DIRECTION_DISPLAY_NAMES: Record<string, string> = {
    'input': '入力',
    'output': '出力',
    'bidirectional': '' // 双方向の場合は表示しない
}

/**
 * ポートタイプと方向から表示名を生成する（設定ストアを使用）
 */
export function getPortTypeDisplayName(portType: string, direction: string): string {
    // 設定ストアからポートタイプ定義を取得
    const { settings } = useSettingsStore.getState()
    const portTypeDefinition = settings.portTypes.find(pt => pt.name === portType || pt.id === portType)

    // 設定から表示名を取得、なければフォールバック
    const typeDisplayName = portTypeDefinition?.displayName || portType.toUpperCase()
    const directionDisplayName = DIRECTION_DISPLAY_NAMES[direction] || ''

    // 双方向の場合は方向を表示しない
    if (direction === 'bidirectional') {
        return typeDisplayName
    }

    // その他の場合は方向を追加
    return directionDisplayName ? `${typeDisplayName} ${directionDisplayName}` : typeDisplayName
}

/**
 * ポートタイプの基本表示名を取得する（方向なし、設定ストアを使用）
 */
export function getPortTypeBaseName(portType: string): string {
    const { settings } = useSettingsStore.getState()
    const portTypeDefinition = settings.portTypes.find(pt => pt.name === portType || pt.id === portType)
    return portTypeDefinition?.displayName || portType.toUpperCase()
}

/**
 * 方向の表示名を取得する
 */
export function getDirectionDisplayName(direction: string): string {
    return DIRECTION_DISPLAY_NAMES[direction] || direction
}

/**
 * ポートタイプの互換性を設定ストアから取得
 */
export function getCompatiblePorts(type: PortType): PortType[] {
    const { settings } = useSettingsStore.getState()
    const portTypeDefinition = settings.portTypes.find(pt => pt.name === type || pt.id === type)
    return (portTypeDefinition?.compatibleWith as PortType[]) || [type]
}

/**
 * ワイヤータイプの表示名を取得する（設定ストアを使用）
 */
export function getWireTypeDisplayName(wireType: string): string {
    const { settings } = useSettingsStore.getState()
    const wireTypeDefinition = settings.wireTypes.find(wt => wt.name === wireType || wt.id === wireType)
    return wireTypeDefinition?.displayName || wireType.toUpperCase()
}

/**
 * ポートタイプに応じて適切なワイヤータイプを決定する（設定ストアを使用）
 */
export function getWireTypeForPortType(portType: string): WireType {
  // 設定ストアからポートタイプ定義を取得
  const { settings } = useSettingsStore.getState()
  const portTypeDefinition = settings.portTypes.find(pt => pt.name === portType || pt.id === portType)
  
  // ポートタイプに基づいてワイヤータイプを決定（フォールバック付き）
  switch (portType) {
    case 'xlr-male':
    case 'xlr-female':
      return WireType.XLR_CABLE
    case 'trs-quarter':
    case 'ts-quarter':
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
    case 'sdi':
    case 'bnc':
      return WireType.SDI_CABLE
    case 'composite':
      return WireType.COMPOSITE_CABLE
    case 'rca':
      return WireType.RCA_CABLE
    case 'displayport':
      return WireType.DISPLAYPORT_CABLE
    case 'power-ac':
    case 'power-dc':
      return WireType.POWER_CABLE
    case 'midi':
      return WireType.MIDI_CABLE
    default:
      // デフォルトはXLRケーブル
      return WireType.XLR_CABLE
  }
}

/**
 * 2つのポートタイプから適切なワイヤータイプを決定する
 * TRS to XLRケーブルなどの異なるポートタイプ間の接続に対応
 */
export function getWireTypeForConnection(sourcePortType: string, targetPortType: string): WireType {
  // TRSとXLRの接続の場合、TRSケーブルとして扱う（TRS to XLRケーブル）
  const isTRS = ['trs-quarter', 'ts-quarter', 'trs-mini'].includes(sourcePortType) || 
                ['trs-quarter', 'ts-quarter', 'trs-mini'].includes(targetPortType)
  const isXLR = ['xlr-male', 'xlr-female'].includes(sourcePortType) || 
                ['xlr-male', 'xlr-female'].includes(targetPortType)
  
  if (isTRS && isXLR) {
    // TRS to XLRケーブル - TRSケーブルとして扱う
    return WireType.TRS_CABLE
  }
  
  // その他の場合は、ソースポートタイプに基づいて決定
  return getWireTypeForPortType(sourcePortType)
}