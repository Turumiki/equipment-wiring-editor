import { create } from 'zustand'
import { 
  EquipmentObject, 
  Wire, 
  Project, 
  EquipmentTemplate,
  ComponentType,
  ShapeType,
  PortType,
  PortDirection,
  Side,
  WireType
} from '@/types'
import { useHistoryStore } from './useHistoryStore'

interface ProjectState {
  project: Project
  selectedObjectIds: string[]
  selectedWireIds: string[]
  isEditMode: boolean
  
  // Actions
  addEquipmentObject: (object: EquipmentObject) => void
  updateEquipmentObject: (id: string, updates: Partial<EquipmentObject>, skipHistory?: boolean) => void
  removeEquipmentObject: (id: string) => void
  addWire: (wire: Wire) => void
  removeWire: (id: string) => void
  setSelectedObjects: (ids: string[]) => void
  setSelectedWires: (ids: string[]) => void
  toggleEditMode: () => void
  saveProject: () => void
  loadProject: (project: Project) => void
  createNewProject: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  duplicateSelected: () => void
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
  isEditMode: false,

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
  
  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),

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
    selectedWireIds: [],
    isEditMode: false
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

    const duplicatedObjects = selectedObjects.map(obj => ({
      ...obj,
      id: `${obj.id}-copy-${Date.now()}`,
      position: {
        x: obj.position.x + 50,
        y: obj.position.y + 50
      },
      components: obj.components.map(comp => ({
        ...comp,
        id: `${comp.id}-copy-${Date.now()}`
      }))
    }))

    const newProject = {
      ...state.project,
      objects: [...state.project.objects, ...duplicatedObjects],
      updatedAt: new Date()
    }
    
    pushToHistory(newProject)
    set({ 
      project: newProject,
      selectedObjectIds: duplicatedObjects.map(obj => obj.id)
    })
  }
}))