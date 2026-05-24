import { useEffect } from 'react'
import { useProjectStore } from '@/store/useProjectStore'

export function useKeyboardShortcuts() {
  const { 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    duplicateSelected,
    copySelected,
    pasteSelected,
    canPaste,
    removeEquipmentObject,
    removeWire,
    selectedObjectIds,
    selectedWireIds,
    saveProject,
    createNewProject,
    selectAll,
    deleteSelected,
    clearSelection,
    alignSelected,
    distributeSelected,
    moveSelected
  } = useProjectStore()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd キーの判定
      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      
      // 入力フィールドにフォーカスがある場合はショートカットを無効化
      const activeElement = document.activeElement
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      )) {
        return
      }

      switch (event.key) {
        case 'z':
        case 'Z':
          if (isCtrlOrCmd) {
            if (event.shiftKey && canRedo()) {
              // Ctrl+Shift+Z: Redo
              event.preventDefault()
              redo()
            } else if (!event.shiftKey && canUndo()) {
              // Ctrl+Z: Undo
              event.preventDefault()
              undo()
            }
          }
          break

        case 'y':
        case 'Y':
          if (isCtrlOrCmd && canRedo()) {
            event.preventDefault()
            redo()
          }
          break

        case 'c':
        case 'C':
          if (isCtrlOrCmd) {
            event.preventDefault()
            copySelected()
          }
          break

        case 'v':
        case 'V':
          if (isCtrlOrCmd && canPaste()) {
            event.preventDefault()
            pasteSelected()
          }
          break

        case 'd':
        case 'D':
          if (isCtrlOrCmd) {
            event.preventDefault()
            duplicateSelected()
          }
          break

        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          deleteSelected()
          break

        case 's':
        case 'S':
          if (isCtrlOrCmd) {
            event.preventDefault()
            saveProject()
          }
          break

        case 'n':
        case 'N':
          if (isCtrlOrCmd) {
            event.preventDefault()
            if (confirm('新しいプロジェクトを作成しますか？現在の作業は失われます。')) {
              createNewProject()
            }
          }
          break

        case 'a':
        case 'A':
          if (isCtrlOrCmd) {
            event.preventDefault()
            selectAll()
          }
          break

        case 'Escape':
          // 選択解除
          clearSelection()
          break

        // 整列 (Ctrl+Shift+矢印), 分散配置 (Ctrl+Alt+矢印), 移動 (矢印/Shift+矢印)
        case 'ArrowLeft':
          if (isCtrlOrCmd && event.shiftKey) {
            event.preventDefault()
            alignSelected('left')
          } else if (isCtrlOrCmd && event.altKey) {
            event.preventDefault()
            distributeSelected('horizontal')
          } else if (!isCtrlOrCmd && !event.altKey) {
            event.preventDefault()
            const delta = event.shiftKey ? 10 : 1
            moveSelected(-delta, 0)
          }
          break
        case 'ArrowRight':
          if (isCtrlOrCmd && event.shiftKey) {
            event.preventDefault()
            alignSelected('right')
          } else if (isCtrlOrCmd && event.altKey) {
            event.preventDefault()
            distributeSelected('horizontal')
          } else if (!isCtrlOrCmd && !event.altKey) {
            event.preventDefault()
            const delta = event.shiftKey ? 10 : 1
            moveSelected(delta, 0)
          }
          break
        case 'ArrowUp':
          if (isCtrlOrCmd && event.shiftKey) {
            event.preventDefault()
            alignSelected('top')
          } else if (isCtrlOrCmd && event.altKey) {
            event.preventDefault()
            distributeSelected('vertical')
          } else if (!isCtrlOrCmd && !event.altKey) {
            event.preventDefault()
            const delta = event.shiftKey ? 10 : 1
            moveSelected(0, -delta)
          }
          break
        case 'ArrowDown':
          if (isCtrlOrCmd && event.shiftKey) {
            event.preventDefault()
            alignSelected('bottom')
          } else if (isCtrlOrCmd && event.altKey) {
            event.preventDefault()
            distributeSelected('vertical')
          } else if (!isCtrlOrCmd && !event.altKey) {
            event.preventDefault()
            const delta = event.shiftKey ? 10 : 1
            moveSelected(0, delta)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    duplicateSelected,
    copySelected,
    pasteSelected,
    canPaste,
    removeEquipmentObject,
    removeWire,
    selectedObjectIds,
    selectedWireIds,
    saveProject,
    createNewProject,
    selectAll,
    deleteSelected,
    clearSelection,
    alignSelected,
    distributeSelected,
    moveSelected
  ])
}

export default useKeyboardShortcuts