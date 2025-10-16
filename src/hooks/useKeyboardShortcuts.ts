import { useEffect } from 'react'
import { useProjectStore } from '@/store/useProjectStore'

export function useKeyboardShortcuts() {
  const { 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    duplicateSelected,
    removeEquipmentObject,
    removeWire,
    selectedObjectIds,
    selectedWireIds,
    saveProject,
    createNewProject
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
        activeElement.contentEditable === 'true'
      )) {
        return
      }

      switch (event.key) {
        case 'z':
        case 'Z':
          if (isCtrlOrCmd && !event.shiftKey && canUndo()) {
            event.preventDefault()
            undo()
          }
          break

        case 'y':
        case 'Y':
          if (isCtrlOrCmd && canRedo()) {
            event.preventDefault()
            redo()
          }
          break

        case 'Z':
          if (isCtrlOrCmd && event.shiftKey && canRedo()) {
            event.preventDefault()
            redo()
          }
          break

        case 'c':
        case 'C':
          if (isCtrlOrCmd) {
            event.preventDefault()
            // コピー機能（現在は複製として実装）
            duplicateSelected()
          }
          break

        case 'v':
        case 'V':
          if (isCtrlOrCmd) {
            event.preventDefault()
            // ペースト機能（現在は複製として実装）
            duplicateSelected()
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
          // 選択されたオブジェクトを削除
          selectedObjectIds.forEach(id => removeEquipmentObject(id))
          selectedWireIds.forEach(id => removeWire(id))
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
            // 全選択機能（今後実装予定）
            // console.log('Select all (not implemented)')
          }
          break

        case 'Escape':
          // 選択解除
          useProjectStore.getState().setSelectedObjects([])
          useProjectStore.getState().setSelectedWires([])
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
    removeEquipmentObject,
    removeWire,
    selectedObjectIds,
    selectedWireIds,
    saveProject,
    createNewProject
  ])
}

export default useKeyboardShortcuts