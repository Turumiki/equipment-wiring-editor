import { create } from 'zustand'
import {
  PortTypeDefinition,
  WireTypeDefinition,
  ConnectionSettings,
  EquipmentTemplate
} from '@/types'
import { createDefaultPortTypes } from '@/utils/portTypeDefaults'
import { loadAllTemplates, getDefaultTemplates } from '@/utils/templateLoader'

interface SettingsState {
  settings: ConnectionSettings
  equipmentTemplates: EquipmentTemplate[]
  templatesLoaded: boolean

  // UI設定
  showPortLabels: 'always' | 'hover' | 'selected' | 'connected' | 'connectedHover' | 'alwaysWithType' | 'hoverWithType' | 'selectedWithType' | 'connectedWithType' | 'connectedHoverWithType'
  showWireLabels: boolean
  canvasBackgroundColor: string
  gridColor: string
  gridEnabled: boolean
  showScoreCalculation: boolean

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
  setShowPortLabels: (mode: 'always' | 'hover' | 'selected' | 'connected' | 'connectedHover' | 'alwaysWithType' | 'hoverWithType' | 'selectedWithType' | 'connectedWithType' | 'connectedHoverWithType') => void
  setShowWireLabels: (show: boolean) => void
  setCanvasBackgroundColor: (color: string) => void
  setGridColor: (color: string) => void
  setGridEnabled: (enabled: boolean) => void
  setShowScoreCalculation: (enabled: boolean) => void
  resetToDefaults: () => void
  hydrate: () => void
  loadTemplatesFromFiles: () => Promise<void>
}

// フォールバック用のデフォルトテンプレート（JSONファイル読み込み失敗時）
const createDefaultEquipmentTemplates = (): EquipmentTemplate[] => getDefaultTemplates()

// デフォルト設定
const createDefaultSettings = (): ConnectionSettings => ({
  portTypes: createDefaultPortTypes(),
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
    },
    {
      id: 'sdi-cable',
      name: 'sdi-cable',
      displayName: 'SDIケーブル',
      description: 'SDI映像ケーブル',
      color: '#dc2626',
      strokeWidth: 2,
      supportedPortTypes: ['sdi']
    },
    {
      id: 'composite-cable',
      name: 'composite-cable',
      displayName: 'コンポジットケーブル',
      description: 'コンポジットビデオケーブル',
      color: '#f59e0b',
      strokeWidth: 2,
      supportedPortTypes: ['composite']
    },
    {
      id: 'rca-cable',
      name: 'rca-cable',
      displayName: 'RCAケーブル',
      description: 'RCAオーディオ/ビデオケーブル',
      color: '#3b82f6',
      strokeWidth: 2,
      supportedPortTypes: ['rca']
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
    'hdmi': ['hdmi'],
    'sdi': ['sdi'],
    'composite': ['composite'],
    'rca': ['rca']
  }
})

// 常にデフォルト設定を使用（ローカルストレージ無効）
const loadSettingsFromStorage = () => {
  // 開発モードでローカルストレージから読み込むように変更
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('tee-app-settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        // 既存の保存データとデフォルト値をマージ
        const defaultSettings = createDefaultSettings()
        return {
          settings: { ...defaultSettings, ...parsed.settings },
          equipmentTemplates: parsed.equipmentTemplates || createDefaultEquipmentTemplates(),
          templatesLoaded: parsed.templatesLoaded || false,
          showPortLabels: parsed.showPortLabels || 'connectedHover',
          showWireLabels: parsed.showWireLabels !== undefined ? parsed.showWireLabels : true,
          canvasBackgroundColor: parsed.canvasBackgroundColor || '#f3f4f6',
          gridColor: parsed.gridColor || '#d1d5db',
          gridEnabled: parsed.gridEnabled !== undefined ? parsed.gridEnabled : true,
          showScoreCalculation: parsed.showScoreCalculation !== undefined ? parsed.showScoreCalculation : false
        }
      }
    } catch (e) {
      console.warn('Failed to load settings from storage:', e)
    }
  }

  return {
    settings: createDefaultSettings(),
    equipmentTemplates: createDefaultEquipmentTemplates(),
    templatesLoaded: false,
    showPortLabels: 'connectedHover' as const,
    showWireLabels: true,
    canvasBackgroundColor: '#f3f4f6',
    gridColor: '#d1d5db',
    gridEnabled: true,
    showScoreCalculation: false
  }
}

// ローカルストレージ保存を有効化
const saveSettingsToStorage = (state: Partial<SettingsState>) => {
  if (typeof window !== 'undefined') {
    try {
      // 保存するプロパティを選択（アクション関数は除外）
      const stateToSave = {
        settings: state.settings,
        equipmentTemplates: state.equipmentTemplates,
        templatesLoaded: state.templatesLoaded,
        showPortLabels: state.showPortLabels,
        showWireLabels: state.showWireLabels,
        canvasBackgroundColor: state.canvasBackgroundColor,
        gridColor: state.gridColor,
        gridEnabled: state.gridEnabled,
        showScoreCalculation: state.showScoreCalculation
      }
      localStorage.setItem('tee-app-settings', JSON.stringify(stateToSave))
    } catch (e) {
      console.error('Failed to save settings to storage:', e)
    }
  }
}

const initialState = loadSettingsFromStorage()

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initialState,

  // クライアントサイドでの初期化（ローカルストレージ有効）
  hydrate: () => {
    // ローカルストレージから設定を読み込み
    const storedState = loadSettingsFromStorage()
    set(storedState)

    // JSONファイルからテンプレートを非同期で読み込み
    get().loadTemplatesFromFiles()
  },

  // JSONファイルからテンプレートを読み込み
  loadTemplatesFromFiles: async () => {
    try {
      const templates = await loadAllTemplates()
      if (templates.length > 0) {
        set({
          equipmentTemplates: templates,
          templatesLoaded: true
        })
        console.log(`Loaded ${templates.length} templates from JSON files`)
      } else {
        console.warn('No templates loaded from JSON files, using defaults')
        set({ templatesLoaded: true })
      }
    } catch (error) {
      console.error('Failed to load templates from JSON files:', error)
      set({ templatesLoaded: true })
    }
  },

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

  updateEquipmentTemplate: (id, updates) => set((state) => {
    const newState = {
      equipmentTemplates: state.equipmentTemplates.map(template =>
        template.id === id ? { ...template, ...updates } : template
      )
    }
    saveSettingsToStorage({ ...state, ...newState })
    return newState
  }),

  removeEquipmentTemplate: (id) => set((state) => {
    const newState = {
      equipmentTemplates: state.equipmentTemplates.filter(template => template.id !== id)
    }
    saveSettingsToStorage({ ...state, ...newState })
    return newState
  }),

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

  setShowPortLabels: (mode) => set((state) => {
    const newState = { showPortLabels: mode }
    saveSettingsToStorage({ ...state, ...newState })
    return newState
  }),
  setShowWireLabels: (show) => set((state) => {
    const newState = { showWireLabels: show }
    saveSettingsToStorage({ ...state, ...newState })
    return newState
  }),
  setCanvasBackgroundColor: (color) => set((state) => {
    const newState = { canvasBackgroundColor: color }
    saveSettingsToStorage({ ...state, ...newState })
    return newState
  }),
  setGridColor: (color) => set((state) => {
    const newState = { gridColor: color }
    saveSettingsToStorage({ ...state, ...newState })
    return newState
  }),
  setGridEnabled: (enabled) => set((state) => {
    const newState = { gridEnabled: enabled }
    saveSettingsToStorage({ ...state, ...newState })
    return newState
  }),
  setShowScoreCalculation: (enabled) => set((state) => {
    const newState = { showScoreCalculation: enabled }
    saveSettingsToStorage({ ...state, ...newState })
    return newState
  }),

  resetToDefaults: () => {
    const defaultState = {
      settings: createDefaultSettings(),
      equipmentTemplates: createDefaultEquipmentTemplates(),
      templatesLoaded: false,
      showPortLabels: 'connectedHover' as const,
      showWireLabels: true,
      canvasBackgroundColor: '#f3f4f6',
      gridColor: '#d1d5db',
      gridEnabled: true,
      showScoreCalculation: false
    }
    set(defaultState)
    saveSettingsToStorage({ ...get(), ...defaultState })
    
    // リセット後にJSONファイルから再読み込み
    get().loadTemplatesFromFiles()
  }
}))