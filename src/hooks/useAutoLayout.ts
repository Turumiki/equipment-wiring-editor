import { useCallback, useRef } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { autoLayout, LayoutOptions, LayoutProgress, LayoutCancelToken } from '@/utils/autoLayout'

export function useAutoLayout() {
  const { project, updateEquipmentObject } = useProjectStore()
  const abortControllerRef = useRef<AbortController | null>(null)
  const originalPositionsRef = useRef<Record<string, { x: number; y: number }> | null>(null)

  const handleAutoLayout = useCallback(async (
    options: LayoutOptions,
    onProgress?: (progress: LayoutProgress) => void,
    cancelToken?: LayoutCancelToken
  ) => {
    // 元の位置を保存（キャンセル時に復元するため）
    originalPositionsRef.current = {}
    project.objects.forEach(obj => {
      originalPositionsRef.current![obj.id] = { ...obj.position }
    })

    // 進捗コールバックをラップして、位置情報があればリアルタイム更新
    const wrappedOnProgress = (progress: LayoutProgress) => {
      // 位置情報があればリアルタイムに更新（遺伝的アルゴリズムなど）
      if (progress.positions) {
        Object.entries(progress.positions).forEach(([objectId, position]) => {
          // オブジェクトが存在することを確認
          const obj = project.objects.find(o => o.id === objectId)
          if (obj && position) {
            updateEquipmentObject(objectId, { position })
          }
        })
      }
      // 元のコールバックも呼び出す
      if (onProgress) {
        onProgress(progress)
      }
    }

    try {
      const layoutResult = await autoLayout(project.objects, project.wires, options, wrappedOnProgress, cancelToken)

      // 最終的な位置を更新
      Object.entries(layoutResult.positions).forEach(([objectId, position]) => {
        updateEquipmentObject(objectId, { position })
      })
      originalPositionsRef.current = null
    } catch (error: any) {
      // エラー時（キャンセル含む）は元の位置に復元
      if (originalPositionsRef.current) {
        Object.entries(originalPositionsRef.current).forEach(([objectId, position]) => {
          updateEquipmentObject(objectId, { position })
        })
        originalPositionsRef.current = null
      }
      throw error
    }
  }, [project.objects, project.wires, updateEquipmentObject])

  const cancelLayout = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const createCancelToken = useCallback((): LayoutCancelToken => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    return { signal: abortControllerRef.current.signal }
  }, [])

  return {
    handleAutoLayout,
    cancelLayout,
    createCancelToken
  }
}

