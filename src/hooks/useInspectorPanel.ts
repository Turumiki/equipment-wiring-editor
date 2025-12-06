import { useCallback } from 'react'
import { EquipmentObject } from '@/types'
import { getPropertyComponent } from '@/utils/componentSystem'

export function useInspectorPanel(
  selectedObjects: EquipmentObject[],
  updateEquipmentObject: (id: string, updates: any, skipHistory?: boolean) => void
) {
  // 複数選択時の共通プロパティを分析
  const analyzeCommonProperties = useCallback((objects: EquipmentObject[]) => {
    if (objects.length === 0) return {}

    const commonProps: Record<string, any> = {}
    const firstObject = objects[0]
    const firstPropertyComponent = getPropertyComponent(firstObject)

    if (firstPropertyComponent?.data.properties) {
      Object.entries(firstPropertyComponent.data.properties).forEach(([key, prop]) => {
        // 全てのオブジェクトで同じプロパティキーが存在するかチェック
        const hasCommonProperty = objects.every(obj => {
          const propComp = getPropertyComponent(obj)
          return propComp?.data.properties?.[key]
        })

        if (hasCommonProperty) {
          // 全てのオブジェクトで同じ値かチェック
          const values = objects.map(obj => {
            const propComp = getPropertyComponent(obj)
            return propComp?.data.properties?.[key]?.value
          })

          const allSame = values.every(val => val === values[0])

          commonProps[key] = {
            ...prop,
            value: allSame ? values[0] : '', // 異なる値の場合は空文字
            hasMultipleValues: !allSame,
            displayName: prop.displayName
          }
        }
      })
    }

    return commonProps
  }, [])

  // 複数選択時の一括プロパティ更新
  const handleBulkPropertyChange = useCallback((key: string, value: any) => {
    selectedObjects.forEach(obj => {
      const propertyComponent = getPropertyComponent(obj)
      if (propertyComponent?.data.properties?.[key]) {
        const updatedProperty = {
          ...propertyComponent,
          data: {
            ...propertyComponent.data,
            properties: {
              ...propertyComponent.data.properties,
              [key]: {
                ...propertyComponent.data.properties[key],
                value
              }
            }
          }
        }

        const updatedComponents = obj.components.map(comp =>
          comp.id === propertyComponent.id ? updatedProperty : comp
        )

        updateEquipmentObject(obj.id, {
          components: updatedComponents,
          name: key === 'name' ? value : obj.name
        }, true)
      }
    })
  }, [selectedObjects, updateEquipmentObject])

  return {
    analyzeCommonProperties,
    handleBulkPropertyChange
  }
}

