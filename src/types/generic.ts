// 汎用的な接続図システムの型定義

// ドメイン（用途）の定義
export enum Domain {
  AUDIO_VISUAL = 'audio-visual',      // 音響・映像機器
  PLUMBING = 'plumbing',              // 配管・水道
  ELECTRICAL = 'electrical',          // 電気配線
  NETWORK = 'network',                // ネットワーク
  ORGANIZATIONAL = 'organizational',   // 組織図・人脈
  PROCESS_FLOW = 'process-flow',      // プロセスフロー
  DATA_FLOW = 'data-flow',            // データフロー
  CUSTOM = 'custom'                   // カスタム
}

// 汎用的なコネクタタイプ
export interface ConnectorType {
  id: string
  name: string
  displayName: string
  description: string
  domain: Domain
  category: string
  color: string
  icon?: string
  compatibleWith: string[]
  defaultDirection: ConnectionDirection
  maxConnections: number
  properties?: Record<string, any>
}

// 汎用的な接続方向
export enum ConnectionDirection {
  INPUT = 'input',
  OUTPUT = 'output',
  BIDIRECTIONAL = 'bidirectional'
}

// 汎用的な接続タイプ
export interface ConnectionType {
  id: string
  name: string
  displayName: string
  description: string
  domain: Domain
  category: string
  color: string
  strokeWidth: number
  strokeDashArray?: string
  supportedConnectorTypes: string[]
  properties?: Record<string, any>
}

// ドメイン固有の設定
export interface DomainConfig {
  domain: Domain
  displayName: string
  description: string
  connectorTypes: ConnectorType[]
  connectionTypes: ConnectionType[]
  defaultNodeTemplates: NodeTemplate[]
  terminology: {
    node: string        // "機材", "設備", "人", "プロセス" など
    connector: string   // "ポート", "接続口", "関係" など
    connection: string  // "ケーブル", "配管", "関係線" など
  }
}

// 汎用的なノードテンプレート
export interface NodeTemplate {
  id: string
  name: string
  displayName: string
  description: string
  domain: Domain
  category: string
  connectors: ConnectorDefinition[]
  shape?: 'rectangle' | 'circle' | 'triangle' | 'diamond'
  color?: string
  size?: { width: number; height: number }
  icon?: string
  properties?: Record<string, any>
}

// コネクタ定義
export interface ConnectorDefinition {
  side: 'top' | 'right' | 'bottom' | 'left'
  offset: number // 0-100の％
  type: string
  direction: ConnectionDirection
  label: string
  required?: boolean
}

// 使用例のドメイン設定
export const AUDIO_VISUAL_DOMAIN: DomainConfig = {
  domain: Domain.AUDIO_VISUAL,
  displayName: '音響・映像機器',
  description: '音響機器、映像機器、放送機器の接続図',
  connectorTypes: [], // 既存のPortTypeから移行
  connectionTypes: [], // 既存のWireTypeから移行
  defaultNodeTemplates: [],
  terminology: {
    node: '機材',
    connector: 'ポート',
    connection: 'ケーブル'
  }
}

export const PLUMBING_DOMAIN: DomainConfig = {
  domain: Domain.PLUMBING,
  displayName: '配管・水道',
  description: '配管、水道設備の接続図',
  connectorTypes: [
    {
      id: 'pipe-15mm',
      name: 'pipe-15mm',
      displayName: '15mm配管',
      description: '15mm径の配管接続',
      domain: Domain.PLUMBING,
      category: 'pipe',
      color: '#0ea5e9',
      compatibleWith: ['pipe-15mm', 'valve-15mm'],
      defaultDirection: ConnectionDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    {
      id: 'valve-15mm',
      name: 'valve-15mm',
      displayName: '15mmバルブ',
      description: '15mm径のバルブ接続',
      domain: Domain.PLUMBING,
      category: 'valve',
      color: '#dc2626',
      compatibleWith: ['pipe-15mm'],
      defaultDirection: ConnectionDirection.BIDIRECTIONAL,
      maxConnections: 2
    }
  ],
  connectionTypes: [
    {
      id: 'water-pipe',
      name: 'water-pipe',
      displayName: '給水管',
      description: '給水用配管',
      domain: Domain.PLUMBING,
      category: 'water',
      color: '#0ea5e9',
      strokeWidth: 3,
      supportedConnectorTypes: ['pipe-15mm', 'pipe-20mm']
    }
  ],
  defaultNodeTemplates: [],
  terminology: {
    node: '設備',
    connector: '接続口',
    connection: '配管'
  }
}

export const ORGANIZATIONAL_DOMAIN: DomainConfig = {
  domain: Domain.ORGANIZATIONAL,
  displayName: '組織図・人脈',
  description: '組織構造、人間関係の図',
  connectorTypes: [
    {
      id: 'reports-to',
      name: 'reports-to',
      displayName: '報告関係',
      description: '上司への報告関係',
      domain: Domain.ORGANIZATIONAL,
      category: 'hierarchy',
      color: '#7c3aed',
      compatibleWith: ['manages'],
      defaultDirection: ConnectionDirection.OUTPUT,
      maxConnections: 1
    },
    {
      id: 'manages',
      name: 'manages',
      displayName: '管理関係',
      description: '部下の管理関係',
      domain: Domain.ORGANIZATIONAL,
      category: 'hierarchy',
      color: '#7c3aed',
      compatibleWith: ['reports-to'],
      defaultDirection: ConnectionDirection.INPUT,
      maxConnections: -1 // 無制限
    }
  ],
  connectionTypes: [
    {
      id: 'hierarchy-line',
      name: 'hierarchy-line',
      displayName: '階層関係',
      description: '組織の階層関係',
      domain: Domain.ORGANIZATIONAL,
      category: 'hierarchy',
      color: '#374151',
      strokeWidth: 2,
      supportedConnectorTypes: ['reports-to', 'manages']
    }
  ],
  defaultNodeTemplates: [],
  terminology: {
    node: '人・部署',
    connector: '関係',
    connection: '関係線'
  }
}