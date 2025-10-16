import { create } from 'zustand'
import { 
  PortTypeDefinition, 
  WireTypeDefinition, 
  ConnectionSettings,
  PortDirection 
} from '@/types'

interface SettingsState {
  settings: ConnectionSettings
  
  // UI設定
  showPortLabels: 'always' | 'hover' | 'selected'
  
  // Actions
  addPortType: (portType: PortTypeDefinition) => void
  updatePortType: (id: string, updates: Partial<PortTypeDefinition>) => void
  removePortType: (id: string) => void
  addWireType: (wireType: WireTypeDefinition) => void
  updateWireType: (id: string, updates: Partial<WireTypeDefinition>) => void
  removeWireType: (id: string) => void
  updateCompatibility: (sourcePortId: string, targetPortIds: string[]) => void
  getPortTypeById: (id: string) => PortTypeDefinition | undefined
  getWireTypeById: (id: string) => WireTypeDefinition | undefined
  arePortTypesCompatible: (sourceId: string, targetId: string) => boolean
  setShowPortLabels: (mode: 'always' | 'hover' | 'selected') => void
  resetToDefaults: () => void
}

// デフォルト設定
const createDefaultSettings = (): ConnectionSettings => ({
  portTypes: [
    // オーディオコネクタ
    {
      id: 'xlr-male',
      name: 'xlr-male',
      displayName: 'XLR オス',
      description: 'XLRオスコネクタ（マイク出力等）',
      color: '#3b82f6',
      category: 'audio',
      compatibleWith: ['xlr-female'],
      defaultDirection: PortDirection.OUTPUT,
      maxConnections: 1
    },
    {
      id: 'xlr-female',
      name: 'xlr-female',
      displayName: 'XLR メス',
      description: 'XLRメスコネクタ（マイク入力等）',
      color: '#3b82f6',
      category: 'audio',
      compatibleWith: ['xlr-male'],
      defaultDirection: PortDirection.INPUT,
      maxConnections: 1
    },
    {
      id: 'trs-quarter',
      name: 'trs-quarter',
      displayName: 'TRS 6.3mm',
      description: '6.3mm TRSコネクタ（楽器・ライン）',
      color: '#059669',
      category: 'audio',
      compatibleWith: ['trs-quarter', 'ts-quarter'],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    {
      id: 'ts-quarter',
      name: 'ts-quarter',
      displayName: 'TS 6.3mm',
      description: '6.3mm TSコネクタ（楽器・モノ）',
      color: '#059669',
      category: 'audio',
      compatibleWith: ['ts-quarter', 'trs-quarter'],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    
    // USB・データ
    {
      id: 'usb-a',
      name: 'usb-a',
      displayName: 'USB-A',
      description: 'USB Type-A コネクタ',
      color: '#f59e0b',
      category: 'data',
      compatibleWith: ['usb-a', 'usb-b', 'usb-c'],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    {
      id: 'usb-b',
      name: 'usb-b',
      displayName: 'USB-B',
      description: 'USB Type-B コネクタ',
      color: '#f59e0b',
      category: 'data',
      compatibleWith: ['usb-a', 'usb-b', 'usb-c'],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    {
      id: 'usb-c',
      name: 'usb-c',
      displayName: 'USB-C',
      description: 'USB Type-C コネクタ',
      color: '#f59e0b',
      category: 'data',
      compatibleWith: ['usb-a', 'usb-b', 'usb-c', 'thunderbolt'],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    
    // ネットワーク
    {
      id: 'ethernet',
      name: 'ethernet',
      displayName: 'Ethernet',
      description: 'RJ45 Ethernetコネクタ',
      color: '#ea580c',
      category: 'network',
      compatibleWith: ['ethernet', 'dante'],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    },
    {
      id: 'dante',
      name: 'dante',
      displayName: 'Dante',
      description: 'Danteネットワークオーディオ',
      color: '#7c3aed',
      category: 'network',
      compatibleWith: ['dante', 'ethernet'],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: -1
    },
    
    // 映像
    {
      id: 'hdmi',
      name: 'hdmi',
      displayName: 'HDMI',
      description: 'HDMIコネクタ',
      color: '#8b5cf6',
      category: 'video',
      compatibleWith: ['hdmi'],
      defaultDirection: PortDirection.BIDIRECTIONAL,
      maxConnections: 1
    }
  ],
  
  wireTypes: [
    {
      id: 'xlr-cable',
      name: 'xlr-cable',
      displayName: 'XLRケーブル',
      description: 'XLRオーディオケーブル',
      color: '#3b82f6',
      strokeWidth: 2,
      supportedPortTypes: ['xlr-male', 'xlr-female']
    },
    {
      id: 'trs-cable',
      name: 'trs-cable',
      displayName: 'TRS/TSケーブル',
      description: 'TRS/TSオーディオケーブル',
      color: '#059669',
      strokeWidth: 2,
      supportedPortTypes: ['trs-quarter', 'ts-quarter']
    },
    {
      id: 'usb-cable',
      name: 'usb-cable',
      displayName: 'USBケーブル',
      description: 'USBデータケーブル',
      color: '#f59e0b',
      strokeWidth: 2,
      supportedPortTypes: ['usb-a', 'usb-b', 'usb-c']
    },
    {
      id: 'ethernet-cable',
      name: 'ethernet-cable',
      displayName: 'Ethernetケーブル',
      description: 'LANケーブル',
      color: '#ea580c',
      strokeWidth: 2,
      supportedPortTypes: ['ethernet', 'dante']
    },
    {
      id: 'hdmi-cable',
      name: 'hdmi-cable',
      displayName: 'HDMIケーブル',
      description: 'HDMI映像ケーブル',
      color: '#8b5cf6',
      strokeWidth: 2,
      supportedPortTypes: ['hdmi']
    }
  ],
  
  compatibilityMatrix: {
    'xlr-male': ['xlr-female'],
    'xlr-female': ['xlr-male'],
    'trs-quarter': ['trs-quarter', 'ts-quarter'],
    'ts-quarter': ['ts-quarter', 'trs-quarter'],
    'usb-a': ['usb-a', 'usb-b', 'usb-c'],
    'usb-b': ['usb-a', 'usb-b', 'usb-c'],
    'usb-c': ['usb-a', 'usb-b', 'usb-c', 'thunderbolt'],
    'ethernet': ['ethernet', 'dante'],
    'dante': ['dante', 'ethernet'],
    'hdmi': ['hdmi']
  }
})

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: createDefaultSettings(),
  showPortLabels: 'hover',

  addPortType: (portType) => set((state) => ({
    settings: {
      ...state.settings,
      portTypes: [...state.settings.portTypes, portType]
    }
  })),

  updatePortType: (id, updates) => set((state) => ({
    settings: {
      ...state.settings,
      portTypes: state.settings.portTypes.map(pt =>
        pt.id === id ? { ...pt, ...updates } : pt
      )
    }
  })),

  removePortType: (id) => set((state) => ({
    settings: {
      ...state.settings,
      portTypes: state.settings.portTypes.filter(pt => pt.id !== id)
    }
  })),

  addWireType: (wireType) => set((state) => ({
    settings: {
      ...state.settings,
      wireTypes: [...state.settings.wireTypes, wireType]
    }
  })),

  updateWireType: (id, updates) => set((state) => ({
    settings: {
      ...state.settings,
      wireTypes: state.settings.wireTypes.map(wt =>
        wt.id === id ? { ...wt, ...updates } : wt
      )
    }
  })),

  removeWireType: (id) => set((state) => ({
    settings: {
      ...state.settings,
      wireTypes: state.settings.wireTypes.filter(wt => wt.id !== id)
    }
  })),

  updateCompatibility: (sourcePortId, targetPortIds) => set((state) => ({
    settings: {
      ...state.settings,
      compatibilityMatrix: {
        ...state.settings.compatibilityMatrix,
        [sourcePortId]: targetPortIds
      }
    }
  })),

  getPortTypeById: (id) => {
    const { settings } = get()
    return settings.portTypes.find(pt => pt.id === id)
  },

  getWireTypeById: (id) => {
    const { settings } = get()
    return settings.wireTypes.find(wt => wt.id === id)
  },

  arePortTypesCompatible: (sourceId, targetId) => {
    const { settings } = get()
    // 同じタイプは常に互換性あり
    if (sourceId === targetId) {
      return true
    }
    // 互換性マトリックスをチェック
    return settings.compatibilityMatrix[sourceId]?.includes(targetId) || false
  },

  setShowPortLabels: (mode) => set({ showPortLabels: mode }),

  resetToDefaults: () => set({
    settings: createDefaultSettings(),
    showPortLabels: 'hover'
  })
}))