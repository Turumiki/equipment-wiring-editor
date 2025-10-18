import { create } from 'zustand'
import {
  PortTypeDefinition,
  WireTypeDefinition,
  ConnectionSettings,
  PortDirection,
  EquipmentTemplate
} from '@/types'

interface SettingsState {
  settings: ConnectionSettings
  equipmentTemplates: EquipmentTemplate[]

  // UI設定
  showPortLabels: 'always' | 'hover' | 'selected' | 'connected' | 'connectedHover'
  showWireLabels: boolean
  canvasBackgroundColor: string
  gridColor: string
  gridEnabled: boolean

  // Actions
  addPortType: (portType: PortTypeDefinition) => void
  updatePortType: (id: string, updates: Partial<PortTypeDefinition>) => void
  removePortType: (id: string) => void
  addWireType: (wireType: WireTypeDefinition) => void
  updateWireType: (id: string, updates: Partial<WireTypeDefinition>) => void
  removeWireType: (id: string) => void
  addEquipmentTemplate: (template: EquipmentTemplate) => void
  updateEquipmentTemplate: (id: string, updates: Partial<EquipmentTemplate>) => void
  removeEquipmentTemplate: (id: string) => void
  getEquipmentTemplateById: (id: string) => EquipmentTemplate | undefined
  exportEquipmentTemplates: () => void
  importEquipmentTemplates: (templates: EquipmentTemplate[]) => void
  exportEquipmentTemplatesToCSV: () => void
  updateCompatibility: (sourcePortId: string, targetPortIds: string[]) => void
  getPortTypeById: (id: string) => PortTypeDefinition | undefined
  getWireTypeById: (id: string) => WireTypeDefinition | undefined
  arePortTypesCompatible: (sourceId: string, targetId: string) => boolean
  setShowPortLabels: (mode: 'always' | 'hover' | 'selected' | 'connected' | 'connectedHover') => void
  setShowWireLabels: (show: boolean) => void
  setCanvasBackgroundColor: (color: string) => void
  setGridColor: (color: string) => void
  setGridEnabled: (enabled: boolean) => void
  resetToDefaults: () => void
}

// シンプルなテンプレート形式の例
const createDefaultEquipmentTemplates = (): EquipmentTemplate[] => [
  // 従来の基本テンプレート（createEquipmentPorts関数を使用）
  {
    id: 'audio-interface',
    name: 'オーディオインターフェース',
    category: 'オーディオ',
    description: 'USB/Thunderbolt オーディオインターフェース',
    defaultComponents: [],
    tags: ['オーディオ', 'USB', 'レコーディング'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'microphone',
    name: 'マイクロフォン',
    category: 'オーディオ',
    description: 'コンデンサー・ダイナミックマイク',
    defaultComponents: [],
    tags: ['マイク', '入力', 'XLR'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // 新しいシンプル形式のテンプレート例
  {
    id: 'yamaha-ql1-simple',
    name: 'YAMAHA QL1 (シンプル)',
    category: 'オーディオ',
    description: 'YAMAHA QL1 デジタルミキサー - シンプル形式',
    // シンプルなポート配列形式
    ports: [
      // 左側：入力ポート
      { side: 'left', offset: 10, type: 'xlr-female', direction: 'input', label: 'Ch 1' },
      { side: 'left', offset: 20, type: 'xlr-female', direction: 'input', label: 'Ch 2' },
      { side: 'left', offset: 30, type: 'xlr-female', direction: 'input', label: 'Ch 3' },
      { side: 'left', offset: 40, type: 'xlr-female', direction: 'input', label: 'Ch 4' },
      { side: 'left', offset: 50, type: 'xlr-female', direction: 'input', label: 'Ch 5' },
      { side: 'left', offset: 60, type: 'xlr-female', direction: 'input', label: 'Ch 6' },
      { side: 'left', offset: 70, type: 'xlr-female', direction: 'input', label: 'Ch 7' },
      { side: 'left', offset: 80, type: 'xlr-female', direction: 'input', label: 'Ch 8' },

      // 右側：出力ポート
      { side: 'right', offset: 25, type: 'xlr-male', direction: 'output', label: 'Main L' },
      { side: 'right', offset: 75, type: 'xlr-male', direction: 'output', label: 'Main R' },

      // 上側：ネットワーク
      { side: 'top', offset: 30, type: 'dante', direction: 'bidirectional', label: 'Dante 1' },
      { side: 'top', offset: 70, type: 'dante', direction: 'bidirectional', label: 'Dante 2' },

      // 下側：USB
      { side: 'bottom', offset: 50, type: 'usb-b', direction: 'bidirectional', label: 'USB' }
    ],
    shape: 'rectangle',
    color: '#7c3aed',
    size: { width: 150, height: 80 },
    tags: ['ミキサー', 'Dante', 'YAMAHA'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },

  {
    id: 'simple-computer',
    name: 'パソコン (シンプル)',
    category: 'コンピューター',
    description: 'デスクトップPC - シンプル形式',
    ports: [
      { side: 'left', offset: 20, type: 'usb-a', direction: 'bidirectional', label: 'USB 1' },
      { side: 'left', offset: 40, type: 'usb-a', direction: 'bidirectional', label: 'USB 2' },
      { side: 'left', offset: 60, type: 'usb-c', direction: 'bidirectional', label: 'USB-C' },
      { side: 'left', offset: 80, type: 'ethernet', direction: 'bidirectional', label: 'LAN' },
      { side: 'right', offset: 30, type: 'hdmi', direction: 'output', label: 'HDMI' },
      { side: 'right', offset: 70, type: 'trs-mini', direction: 'output', label: 'Audio' }
    ],
    shape: 'rectangle',
    color: '#6b7280',
    size: { width: 120, height: 70 },
    tags: ['PC', 'コンピューター'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },

  {
    id: 'simple-hub',
    name: 'スイッチングハブ (シンプル)',
    category: 'ネットワーク',
    description: '5ポート スイッチングハブ - シンプル形式',
    ports: [
      { side: 'bottom', offset: 10, type: 'ethernet', direction: 'bidirectional', label: 'Port 1' },
      { side: 'bottom', offset: 30, type: 'ethernet', direction: 'bidirectional', label: 'Port 2' },
      { side: 'bottom', offset: 50, type: 'ethernet', direction: 'bidirectional', label: 'Port 3' },
      { side: 'bottom', offset: 70, type: 'ethernet', direction: 'bidirectional', label: 'Port 4' },
      { side: 'bottom', offset: 90, type: 'ethernet', direction: 'bidirectional', label: 'Port 5' }
    ],
    shape: 'rectangle',
    color: '#059669',
    size: { width: 140, height: 50 },
    tags: ['ネットワーク', 'Ethernet', 'ハブ'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

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
      color: '#059669',
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

// LocalStorageから設定を読み込み
const loadSettingsFromStorage = () => {
  try {
    const stored = localStorage.getItem('wiring-diagram-settings')
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        settings: parsed.settings || createDefaultSettings(),
        equipmentTemplates: parsed.equipmentTemplates || createDefaultEquipmentTemplates(),
        showPortLabels: parsed.showPortLabels || 'hover',
        showWireLabels: parsed.showWireLabels ?? true,
        canvasBackgroundColor: parsed.canvasBackgroundColor || '#f3f4f6',
        gridColor: parsed.gridColor || '#d1d5db',
        gridEnabled: parsed.gridEnabled ?? true
      }
    }
  } catch (error) {
    console.warn('設定の読み込みに失敗しました:', error)
  }

  return {
    settings: createDefaultSettings(),
    equipmentTemplates: createDefaultEquipmentTemplates(),
    showPortLabels: 'hover' as const,
    showWireLabels: true,
    canvasBackgroundColor: '#f3f4f6',
    gridColor: '#d1d5db',
    gridEnabled: true
  }
}

// LocalStorageに設定を保存
const saveSettingsToStorage = (state: Partial<SettingsState>) => {
  try {
    const toSave = {
      settings: state.settings,
      equipmentTemplates: state.equipmentTemplates,
      showPortLabels: state.showPortLabels,
      showWireLabels: state.showWireLabels,
      canvasBackgroundColor: state.canvasBackgroundColor,
      gridColor: state.gridColor,
      gridEnabled: state.gridEnabled
    }
    localStorage.setItem('wiring-diagram-settings', JSON.stringify(toSave))
  } catch (error) {
    console.warn('設定の保存に失敗しました:', error)
  }
}

const initialState = loadSettingsFromStorage()

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initialState,

  addPortType: (portType) => set((state) => {
    const newState = {
      settings: {
        ...state.settings,
        portTypes: [...state.settings.portTypes, portType]
      }
    }
    saveSettingsToStorage({ ...state, ...newState })
    return newState
  }),

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

  addEquipmentTemplate: (template) => set((state) => {
    const newState = {
      equipmentTemplates: [...state.equipmentTemplates, template]
    }
    saveSettingsToStorage({ ...state, ...newState })
    return newState
  }),

  updateEquipmentTemplate: (id, updates) => set((state) => ({
    equipmentTemplates: state.equipmentTemplates.map(template =>
      template.id === id ? { ...template, ...updates } : template
    )
  })),

  removeEquipmentTemplate: (id) => set((state) => ({
    equipmentTemplates: state.equipmentTemplates.filter(template => template.id !== id)
  })),

  getEquipmentTemplateById: (id) => {
    const { equipmentTemplates } = get()
    return equipmentTemplates.find(template => template.id === id)
  },

  exportEquipmentTemplates: () => {
    const { equipmentTemplates } = get()
    const dataStr = JSON.stringify(equipmentTemplates, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'equipment-templates.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  importEquipmentTemplates: (templates: EquipmentTemplate[]) => set((state) => {
    // 既存のテンプレートと重複しないようにマージ
    const existingIds = new Set(state.equipmentTemplates.map(t => t.id))
    const newTemplates = templates.filter(t => !existingIds.has(t.id))

    const newState = {
      equipmentTemplates: [...state.equipmentTemplates, ...newTemplates]
    }
    saveSettingsToStorage({ ...state, ...newState })
    return newState
  }),

  exportEquipmentTemplatesToCSV: () => {
    const { equipmentTemplates } = get()
    const headers = ['id', 'name', 'category', 'description', 'tags']
    const csvContent = [
      headers.join(','),
      ...equipmentTemplates.map(template => [
        template.id,
        `"${template.name}"`,
        `"${template.category}"`,
        `"${template.description}"`,
        `"${template.tags.join(';')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'equipment-templates.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

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
  setShowWireLabels: (show) => set({ showWireLabels: show }),
  setCanvasBackgroundColor: (color) => set({ canvasBackgroundColor: color }),
  setGridColor: (color) => set({ gridColor: color }),
  setGridEnabled: (enabled) => set({ gridEnabled: enabled }),

  resetToDefaults: () => set({
    settings: createDefaultSettings(),
    equipmentTemplates: createDefaultEquipmentTemplates(),
    showPortLabels: 'hover',
    showWireLabels: true,
    canvasBackgroundColor: '#f3f4f6',
    gridColor: '#d1d5db',
    gridEnabled: true
  })
}))