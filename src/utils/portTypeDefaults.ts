import { PortType, PortDirection, PortTypeDefinition } from '@/types'

/**
 * PortType enumから設定ストア用のポートタイプ定義を生成する
 */
export function createDefaultPortTypes(): PortTypeDefinition[] {
  return [
    // オーディオコネクタ
    {
      id: PortType.XLR_MALE,
      name: PortType.XLR_MALE,
      displayName: 'XLR オス',
      description: 'XLRオスコネクタ（マイク出力等）',
      color: '#3b82f6',
      category: 'audio',
      compatibleWith: [PortType.XLR_FEMALE],
      defaultDirection: PortDirection.OUTPUT,
      maxConnections: 1
    },
    {
      id: PortType.XLR_FEMALE,
      name: PortType.XLR_FEMALE,
      displayName: 'XLR メス',
      description: 'XLRメスコネクタ（マイク入力等）',
      color: '#3b82f6',
      category: 'audio',
      compatibleWith: [PortType.XLR_MALE],
      defaultDirection: PortDirection.INPUT,
      maxConnections: 1
    },
    {
      id: PortType.TRS_QUARTER,
      name: PortType.TRS_QUARTER,
      displayName: 'TRS 6.3mm',
      description: '6.3mm TRSコネクタ（楽器・ライン）',
      color: '#059669',
      category: 'audio',
      compatibleWith: [PortType.TRS_QUARTER, PortType.TS_QUARTER],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    {
      id: PortType.TS_QUARTER,
      name: PortType.TS_QUARTER,
      displayName: 'TS 6.3mm',
      description: '6.3mm TSコネクタ（楽器・モノ）',
      color: '#059669',
      category: 'audio',
      compatibleWith: [PortType.TS_QUARTER, PortType.TRS_QUARTER],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    {
      id: PortType.TRS_MINI,
      name: PortType.TRS_MINI,
      displayName: 'TRS 3.5mm',
      description: '3.5mm TRSコネクタ（ヘッドホン等）',
      color: '#059669',
      category: 'audio',
      compatibleWith: [PortType.TRS_MINI],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    // USB
    {
      id: PortType.USB_A,
      name: PortType.USB_A,
      displayName: 'USB-A',
      description: 'USB Type-A コネクタ',
      color: '#6366f1',
      category: 'data',
      compatibleWith: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    {
      id: PortType.USB_B,
      name: PortType.USB_B,
      displayName: 'USB-B',
      description: 'USB Type-B コネクタ',
      color: '#6366f1',
      category: 'data',
      compatibleWith: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    {
      id: PortType.USB_C,
      name: PortType.USB_C,
      displayName: 'USB-C',
      description: 'USB Type-C コネクタ',
      color: '#6366f1',
      category: 'data',
      compatibleWith: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    // ネットワーク
    {
      id: PortType.ETHERNET,
      name: PortType.ETHERNET,
      displayName: 'Ethernet',
      description: 'Ethernetポート（RJ45）',
      color: '#059669',
      category: 'network',
      compatibleWith: [PortType.ETHERNET, PortType.DANTE],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    {
      id: PortType.DANTE,
      name: PortType.DANTE,
      displayName: 'Dante',
      description: 'Danteネットワークポート',
      color: '#7c3aed',
      category: 'network',
      compatibleWith: [PortType.DANTE, PortType.ETHERNET],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    // 映像
    {
      id: PortType.HDMI,
      name: PortType.HDMI,
      displayName: 'HDMI',
      description: 'HDMIコネクタ',
      color: '#dc2626',
      category: 'video',
      compatibleWith: [PortType.HDMI],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    // 電源
    {
      id: PortType.POWER_AC,
      name: PortType.POWER_AC,
      displayName: 'AC電源',
      description: 'AC電源コネクタ',
      color: '#dc2626',
      category: 'power',
      compatibleWith: [PortType.POWER_AC],
      defaultDirection: PortDirection.INPUT,
      maxConnections: 1
    }
    // 必要に応じて他のポートタイプも追加
  ]
}