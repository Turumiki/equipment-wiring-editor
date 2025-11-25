import { create } from 'zustand'
import { Project } from '@/types'

interface HistoryState {
  history: Project[]
  currentIndex: number
  maxHistorySize: number
  debounceTimer: NodeJS.Timeout | null
  
  // Actions
  pushState: (project: Project) => void
  pushStateImmediate: (project: Project) => void
  undo: () => Project | null
  redo: () => Project | null
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void
}

// デバウンス時間（ミリ秒）
const DEBOUNCE_DELAY = 300

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  currentIndex: -1,
  maxHistorySize: 50,
  debounceTimer: null,

  pushState: (project) => {
    const state = get()
    
    // 既存のタイマーをクリア
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer)
    }
    
    // 新しいタイマーを設定
    const timer = setTimeout(() => {
      get().pushStateImmediate(project)
      set({ debounceTimer: null })
    }, DEBOUNCE_DELAY)
    
    set({ debounceTimer: timer })
  },

  pushStateImmediate: (project) => set((state) => {
    // 現在の位置より後の履歴を削除（新しい操作が行われた場合）
    const newHistory = state.history.slice(0, state.currentIndex + 1)
    
    // 新しい状態を追加
    newHistory.push(JSON.parse(JSON.stringify(project))) // ディープコピー
    
    // 履歴サイズの制限
    if (newHistory.length > state.maxHistorySize) {
      newHistory.shift()
      return {
        history: newHistory,
        currentIndex: newHistory.length - 1
      }
    }
    
    return {
      history: newHistory,
      currentIndex: newHistory.length - 1
    }
  }),

  undo: () => {
    const state = get()
    if (state.currentIndex > 0) {
      const newIndex = state.currentIndex - 1
      set({ currentIndex: newIndex })
      return state.history[newIndex]
    }
    return null
  },

  redo: () => {
    const state = get()
    if (state.currentIndex < state.history.length - 1) {
      const newIndex = state.currentIndex + 1
      set({ currentIndex: newIndex })
      return state.history[newIndex]
    }
    return null
  },

  canUndo: () => {
    const state = get()
    return state.currentIndex > 0
  },

  canRedo: () => {
    const state = get()
    return state.currentIndex < state.history.length - 1
  },

  clearHistory: () => set({
    history: [],
    currentIndex: -1
  })
}))