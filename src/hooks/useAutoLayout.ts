import { useCallback } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { autoLayout, LayoutOptions } from '@/utils/autoLayout'

export function useAutoLayout() {
  const { project, updateEquipmentObject } = useProjectStore()

  const handleAutoLayout = useCallback((options: LayoutOptions) => {
    const layoutResult = autoLayout(project.objects, project.wires, options)

    // 各オブジェクトの位置を更新
    Object.entries(layoutResult.positions).forEach(([objectId, position]) => {
      updateEquipmentObject(objectId, { position })
    })
  }, [project.objects, project.wires, updateEquipmentObject])

  return {
    handleAutoLayout
  }
}

