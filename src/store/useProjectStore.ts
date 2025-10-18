import { create } from 'zustand'
import {
  EquipmentObject,
  Wire,
  Project,
  EquipmentTemplate
} from '@/types'
import { useHistoryStore } from './useHistoryStore'

interface ProjectState {
  project: Project
  selectedObjectIds: string[]
  selectedWireIds: string[]

  // Actions
  addEquipmentObject: (object: EquipmentObject) => void
  updateEquipmentObject: (id: string, updates: Partial<EquipmentObject>, skipHistory?: boolean) => void
  removeEquipmentObject: (id: string) => void
  addWire: (wire: Wire) => void
  updateWire: (id: string, updates: Partial<Wire>) => void
  removeWire: (id: string) => void
  setSelectedObjects: (ids: string[]) => void
  setSelectedWires: (ids: string[]) => void
  saveProject: () => void
  loadProject: (project: Project) => void
  createNewProject: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  duplicateSelected: () => void
  selectAll: () => void
  deleteSelected: () => void
  clearSelection: () => void
  alignSelected: (direction: 'left' | 'right' | 'top' | 'bottom' | 'center-horizontal' | 'center-vertical') => void
  distributeSelected: (direction: 'horizontal' | 'vertical') => void
  
  // テンプレート管理
  addTemplateToProject: (template: EquipmentTemplate) => void
  removeTemplateFromProject: (templateId: string) => void
  updateTemplateInProject: (templateId: string, updates: Partial<EquipmentTemplate>) => void
  exportProjectTemplates: () => void
  importProjectTemplates: (templates: EquipmentTemplate[]) => void
  exportSingleTemplate: (templateId: string) => void
}

const createDefaultProject = (): Project => ({
  id: 'default-project',
  name: '新規プロジェクト',
  description: '',
  objects: [],
  wires: [],
  customTemplates: [],
  canvasSettings: {
    backgroundColor: '#f8f9fa',
    gridEnabled: true,
    gridSize: 20,
    snapToGrid: false,
    zoom: 1,
    panPosition: { x: 0, y: 0 }
  },
  metadata: {
    author: '',
    tags: [],
    customFields: {}
  },
  version: '1.0.0',
  createdAt: new Date(),
  updatedAt: new Date()
})

const pushToHistory = (project: Project) => {
  useHistoryStore.getState().pushState(project)
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createDefaultProject(),
  selectedObjectIds: [],
  selectedWireIds: [],

  addEquipmentObject: (object) => set((state) => {
    const newProject = {
      ...state.project,
      objects: [...state.project.objects, object],
      updatedAt: new Date()
    }
    pushToHistory(newProject)
    return { project: newProject }
  }),

  updateEquipmentObject: (id, updates, skipHistory = false) => set((state) => {
    const newProject = {
      ...state.project,
      objects: state.project.objects.map(obj =>
        obj.id === id ? { ...obj, ...updates } : obj
      ),
      updatedAt: new Date()
    }
    if (!skipHistory) {
      pushToHistory(newProject)
    }
    return { project: newProject }
  }),

  removeEquipmentObject: (id) => set((state) => {
    const newProject = {
      ...state.project,
      objects: state.project.objects.filter(obj => obj.id !== id),
      wires: state.project.wires.filter(wire =>
        wire.sourceObjectId !== id && wire.targetObjectId !== id
      ),
      updatedAt: new Date()
    }
    pushToHistory(newProject)
    return {
      project: newProject,
      selectedObjectIds: state.selectedObjectIds.filter(objId => objId !== id)
    }
  }),

  addWire: (wire) => set((state) => {
    const newProject = {
      ...state.project,
      wires: [...state.project.wires, wire],
      updatedAt: new Date()
    }
    pushToHistory(newProject)
    return { project: newProject }
  }),

  updateWire: (id, updates) => set((state) => {
    const newProject = {
      ...state.project,
      wires: state.project.wires.map(wire =>
        wire.id === id ? { ...wire, ...updates } : wire
      ),
      updatedAt: new Date()
    }
    pushToHistory(newProject)
    return { project: newProject }
  }),

  removeWire: (id) => set((state) => {
    const newProject = {
      ...state.project,
      wires: state.project.wires.filter(wire => wire.id !== id),
      updatedAt: new Date()
    }
    pushToHistory(newProject)
    return {
      project: newProject,
      selectedWireIds: state.selectedWireIds.filter(wireId => wireId !== id)
    }
  }),

  setSelectedObjects: (ids) => set({ selectedObjectIds: ids }),

  setSelectedWires: (ids) => set({ selectedWireIds: ids }),

  saveProject: () => {
    const { project } = get()
    const projectData = JSON.stringify(project, null, 2)
    const blob = new Blob([projectData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  loadProject: (project) => set({ project }),

  createNewProject: () => set({
    project: createDefaultProject(),
    selectedObjectIds: [],
    selectedWireIds: []
  }),

  undo: () => {
    const previousProject = useHistoryStore.getState().undo()
    if (previousProject) {
      set({ project: previousProject })
    }
  },

  redo: () => {
    const nextProject = useHistoryStore.getState().redo()
    if (nextProject) {
      set({ project: nextProject })
    }
  },

  canUndo: () => useHistoryStore.getState().canUndo(),

  canRedo: () => useHistoryStore.getState().canRedo(),

  duplicateSelected: () => {
    const state = get()
    const selectedObjects = state.project.objects.filter(obj =>
      state.selectedObjectIds.includes(obj.id)
    )

    if (selectedObjects.length === 0) return

    // オブジェクトIDのマッピングを作成（元のID -> 新しいID）
    const objectIdMap = new Map<string, string>()
    const portIdMap = new Map<string, string>()

    const duplicatedObjects = selectedObjects.map(obj => {
      const newObjectId = `${obj.id}-copy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
      objectIdMap.set(obj.id, newObjectId)

      const duplicatedComponents = obj.components.map(comp => {
        const newCompId = `${comp.id}-copy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

        // ポートコンポーネントの場合、ポートIDマッピングも作成
        if (comp.type === 'connectionPort') {
          portIdMap.set(comp.id, newCompId)
        }

        return {
          ...comp,
          id: newCompId,
          data: {
            ...comp.data,
            // ポートコンポーネントの場合、connectedWiresをクリア
            ...(comp.type === 'connectionPort' ? { connectedWires: [] } : {})
          }
        }
      })

      return {
        ...obj,
        id: newObjectId,
        position: {
          x: obj.position.x + 50,
          y: obj.position.y + 50
        },
        components: duplicatedComponents
      }
    })

    // 選択されたオブジェクト間のワイヤーを複製
    const selectedObjectIds = new Set(state.selectedObjectIds)
    const wiresToDuplicate = state.project.wires.filter(wire =>
      selectedObjectIds.has(wire.sourceObjectId) && selectedObjectIds.has(wire.targetObjectId)
    )

    const duplicatedWires = wiresToDuplicate.map(wire => {
      const newSourceObjectId = objectIdMap.get(wire.sourceObjectId)
      const newTargetObjectId = objectIdMap.get(wire.targetObjectId)
      const newSourcePortId = portIdMap.get(wire.sourcePortId)
      const newTargetPortId = portIdMap.get(wire.targetPortId)

      if (!newSourceObjectId || !newTargetObjectId || !newSourcePortId || !newTargetPortId) {
        return null // スキップ
      }

      return {
        ...wire,
        id: `wire-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        sourceObjectId: newSourceObjectId,
        sourcePortId: newSourcePortId,
        targetObjectId: newTargetObjectId,
        targetPortId: newTargetPortId
      }
    }).filter(wire => wire !== null)

    const newProject = {
      ...state.project,
      objects: [...state.project.objects, ...duplicatedObjects],
      wires: [...state.project.wires, ...duplicatedWires],
      updatedAt: new Date()
    }

    pushToHistory(newProject)
    set({
      project: newProject,
      selectedObjectIds: duplicatedObjects.map(obj => obj.id)
    })
  },

  selectAll: () => {
    const state = get()
    set({
      selectedObjectIds: state.project.objects.map(obj => obj.id),
      selectedWireIds: state.project.wires.map(wire => wire.id)
    })
  },

  deleteSelected: () => {
    const state = get()
    
    // 選択されたワイヤーと、削除されるオブジェクトに接続されているワイヤーを削除
    const objectsToDelete = new Set(state.selectedObjectIds)
    const wiresToDelete = new Set([
      ...state.selectedWireIds,
      ...state.project.wires
        .filter(wire => objectsToDelete.has(wire.sourceObjectId) || objectsToDelete.has(wire.targetObjectId))
        .map(wire => wire.id)
    ])

    const newProject = {
      ...state.project,
      objects: state.project.objects.filter(obj => !objectsToDelete.has(obj.id)),
      wires: state.project.wires.filter(wire => !wiresToDelete.has(wire.id)),
      updatedAt: new Date()
    }

    pushToHistory(newProject)
    set({
      project: newProject,
      selectedObjectIds: [],
      selectedWireIds: []
    })
  },

  clearSelection: () => {
    set({
      selectedObjectIds: [],
      selectedWireIds: []
    })
  },

  alignSelected: (direction) => {
    const state = get()
    const selectedObjects = state.project.objects.filter(obj =>
      state.selectedObjectIds.includes(obj.id)
    )

    if (selectedObjects.length < 2) return

    let referenceValue: number
    const updates: { [id: string]: { position: { x: number; y: number } } } = {}

    switch (direction) {
      case 'left':
        referenceValue = Math.min(...selectedObjects.map(obj => obj.position.x))
        selectedObjects.forEach(obj => {
          updates[obj.id] = { position: { x: referenceValue, y: obj.position.y } }
        })
        break
      case 'right':
        referenceValue = Math.max(...selectedObjects.map(obj => obj.position.x))
        selectedObjects.forEach(obj => {
          updates[obj.id] = { position: { x: referenceValue, y: obj.position.y } }
        })
        break
      case 'top':
        referenceValue = Math.min(...selectedObjects.map(obj => obj.position.y))
        selectedObjects.forEach(obj => {
          updates[obj.id] = { position: { x: obj.position.x, y: referenceValue } }
        })
        break
      case 'bottom':
        referenceValue = Math.max(...selectedObjects.map(obj => obj.position.y))
        selectedObjects.forEach(obj => {
          updates[obj.id] = { position: { x: obj.position.x, y: referenceValue } }
        })
        break
      case 'center-horizontal':
        const avgX = selectedObjects.reduce((sum, obj) => sum + obj.position.x, 0) / selectedObjects.length
        selectedObjects.forEach(obj => {
          updates[obj.id] = { position: { x: avgX, y: obj.position.y } }
        })
        break
      case 'center-vertical':
        const avgY = selectedObjects.reduce((sum, obj) => sum + obj.position.y, 0) / selectedObjects.length
        selectedObjects.forEach(obj => {
          updates[obj.id] = { position: { x: obj.position.x, y: avgY } }
        })
        break
    }

    // 一括更新
    const newProject = {
      ...state.project,
      objects: state.project.objects.map(obj =>
        updates[obj.id] ? { ...obj, ...updates[obj.id] } : obj
      ),
      updatedAt: new Date()
    }

    pushToHistory(newProject)
    set({ project: newProject })
  },

  distributeSelected: (direction) => {
    const state = get()
    const selectedObjects = state.project.objects.filter(obj =>
      state.selectedObjectIds.includes(obj.id)
    )

    if (selectedObjects.length < 3) return

    const updates: { [id: string]: { position: { x: number; y: number } } } = {}

    if (direction === 'horizontal') {
      // X座標でソート
      const sortedObjects = [...selectedObjects].sort((a, b) => a.position.x - b.position.x)
      const minX = sortedObjects[0].position.x
      const maxX = sortedObjects[sortedObjects.length - 1].position.x
      const spacing = (maxX - minX) / (sortedObjects.length - 1)

      sortedObjects.forEach((obj, index) => {
        updates[obj.id] = { 
          position: { 
            x: minX + spacing * index, 
            y: obj.position.y 
          } 
        }
      })
    } else {
      // Y座標でソート
      const sortedObjects = [...selectedObjects].sort((a, b) => a.position.y - b.position.y)
      const minY = sortedObjects[0].position.y
      const maxY = sortedObjects[sortedObjects.length - 1].position.y
      const spacing = (maxY - minY) / (sortedObjects.length - 1)

      sortedObjects.forEach((obj, index) => {
        updates[obj.id] = { 
          position: { 
            x: obj.position.x, 
            y: minY + spacing * index 
          } 
        }
      })
    }

    // 一括更新
    const newProject = {
      ...state.project,
      objects: state.project.objects.map(obj =>
        updates[obj.id] ? { ...obj, ...updates[obj.id] } : obj
      ),
      updatedAt: new Date()
    }

    pushToHistory(newProject)
    set({ project: newProject })
  },

  // テンプレート管理機能
  addTemplateToProject: (template) => set((state) => {
    // 既存のテンプレートIDと重複しないようにチェック
    const existingTemplate = state.project.customTemplates.find(t => t.id === template.id)
    if (existingTemplate) {
      // 既存の場合は更新
      const newProject = {
        ...state.project,
        customTemplates: state.project.customTemplates.map(t =>
          t.id === template.id ? { ...template, updatedAt: new Date() } : t
        ),
        updatedAt: new Date()
      }
      pushToHistory(newProject)
      return { project: newProject }
    } else {
      // 新規追加
      const newProject = {
        ...state.project,
        customTemplates: [...state.project.customTemplates, { ...template, createdAt: new Date(), updatedAt: new Date() }],
        updatedAt: new Date()
      }
      pushToHistory(newProject)
      return { project: newProject }
    }
  }),

  removeTemplateFromProject: (templateId) => set((state) => {
    const newProject = {
      ...state.project,
      customTemplates: state.project.customTemplates.filter(t => t.id !== templateId),
      updatedAt: new Date()
    }
    pushToHistory(newProject)
    return { project: newProject }
  }),

  updateTemplateInProject: (templateId, updates) => set((state) => {
    const newProject = {
      ...state.project,
      customTemplates: state.project.customTemplates.map(t =>
        t.id === templateId ? { ...t, ...updates, updatedAt: new Date() } : t
      ),
      updatedAt: new Date()
    }
    pushToHistory(newProject)
    return { project: newProject }
  }),

  exportProjectTemplates: () => {
    const { project } = get()
    if (project.customTemplates.length === 0) {
      alert('エクスポートするテンプレートがありません')
      return
    }

    const templateData = JSON.stringify(project.customTemplates, null, 2)
    const blob = new Blob([templateData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}_templates.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  importProjectTemplates: (templates) => set((state) => {
    // 重複チェックと統合
    const existingIds = new Set(state.project.customTemplates.map(t => t.id))
    const newTemplates = templates.filter(t => !existingIds.has(t.id))
    const updatedTemplates = templates.filter(t => existingIds.has(t.id))

    let customTemplates = [...state.project.customTemplates]
    
    // 新規テンプレートを追加
    customTemplates.push(...newTemplates.map(t => ({ ...t, createdAt: new Date(), updatedAt: new Date() })))
    
    // 既存テンプレートを更新（ユーザーに確認）
    if (updatedTemplates.length > 0) {
      const shouldUpdate = confirm(`${updatedTemplates.length}個の既存テンプレートを更新しますか？`)
      if (shouldUpdate) {
        customTemplates = customTemplates.map(existing => {
          const updated = updatedTemplates.find(t => t.id === existing.id)
          return updated ? { ...updated, updatedAt: new Date() } : existing
        })
      }
    }

    const newProject = {
      ...state.project,
      customTemplates,
      updatedAt: new Date()
    }
    pushToHistory(newProject)
    return { project: newProject }
  }),

  exportSingleTemplate: (templateId) => {
    const { project } = get()
    const template = project.customTemplates.find(t => t.id === templateId)
    if (!template) {
      alert('テンプレートが見つかりません')
      return
    }

    const templateData = JSON.stringify(template, null, 2)
    const blob = new Blob([templateData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.name}_template.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}))