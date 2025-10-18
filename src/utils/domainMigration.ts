// 既存の音響機器システムから汎用システムへのマイグレーション

import { PortType, PortDirection, WireType } from '@/types'
import { Domain, ConnectorType, ConnectionType, ConnectionDirection } from '@/types/generic'

/**
 * 既存のPortTypeを汎用的なConnectorTypeに変換
 */
export function migratePortTypeToConnectorType(portType: PortType): ConnectorType {
  const portTypeMap: Partial<Record<PortType, Partial<ConnectorType>>> = {
    [PortType.XLR_MALE]: {
      displayName: 'XLR オス',
      category: 'audio-analog',
      compatibleWith: [PortType.XLR_FEMALE]
    },
    [PortType.XLR_FEMALE]: {
      displayName: 'XLR メス', 
      category: 'audio-analog',
      compatibleWith: [PortType.XLR_MALE]
    },
    [PortType.USB_A]: {
      displayName: 'USB-A',
      category: 'data-usb',
      compatibleWith: [PortType.USB_A, PortType.USB_B, PortType.USB_C]
    },
    [PortType.ETHERNET]: {
      displayName: 'Ethernet',
      category: 'network',
      compatibleWith: [PortType.ETHERNET, PortType.DANTE]
    }
    // 他のポートタイプも追加
  }

  const config = portTypeMap[portType] || {}
  
  return {
    id: portType,
    name: portType,
    displayName: config.displayName || portType.toUpperCase(),
    description: `${config.displayName || portType} コネクタ`,
    domain: Domain.AUDIO_VISUAL,
    category: config.category || 'general',
    color: '#6b7280',
    compatibleWith: config.compatibleWith || [portType],
    defaultDirection: ConnectionDirection.BIDIRECTIONAL,
    maxConnections: 1
  }
}

/**
 * 既存のWireTypeを汎用的なConnectionTypeに変換
 */
export function migrateWireTypeToConnectionType(wireType: WireType): ConnectionType {
  const wireTypeMap: Partial<Record<WireType, Partial<ConnectionType>>> = {
    [WireType.XLR_CABLE]: {
      displayName: 'XLRケーブル',
      category: 'audio-analog',
      color: '#3b82f6',
      supportedConnectorTypes: [PortType.XLR_MALE, PortType.XLR_FEMALE]
    },
    [WireType.USB_CABLE]: {
      displayName: 'USBケーブル',
      category: 'data-usb', 
      color: '#6366f1',
      supportedConnectorTypes: [PortType.USB_A, PortType.USB_B, PortType.USB_C]
    },
    [WireType.ETHERNET_CABLE]: {
      displayName: 'LANケーブル',
      category: 'network',
      color: '#059669',
      supportedConnectorTypes: [PortType.ETHERNET, PortType.DANTE]
    }
    // 他のワイヤータイプも追加
  }

  const config = wireTypeMap[wireType] || {}

  return {
    id: wireType,
    name: wireType,
    displayName: config.displayName || wireType.replace(/_/g, ' '),
    description: `${config.displayName || wireType} 接続`,
    domain: Domain.AUDIO_VISUAL,
    category: config.category || 'general',
    color: config.color || '#6b7280',
    strokeWidth: 2,
    supportedConnectorTypes: config.supportedConnectorTypes || [],
  }
}

/**
 * 方向の変換
 */
export function migratePortDirectionToConnectionDirection(direction: PortDirection): ConnectionDirection {
  switch (direction) {
    case PortDirection.INPUT:
      return ConnectionDirection.INPUT
    case PortDirection.OUTPUT:
      return ConnectionDirection.OUTPUT
    case PortDirection.BIDIRECTIONAL:
      return ConnectionDirection.BIDIRECTIONAL
    default:
      return ConnectionDirection.BIDIRECTIONAL
  }
}