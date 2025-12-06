import { useCallback, useState } from 'react'
import { PortType, PortDirection } from '@/types'
import { useProjectStore } from '@/store/useProjectStore'

interface EditingPortData {
  portId: string
  equipmentId: string
}

export function usePortEdit() {
  const [editingPortData, setEditingPortData] = useState<EditingPortData | null>(null)
  const [showPortEditDialog, setShowPortEditDialog] = useState(false)
  const { project, updateEquipmentObject } = useProjectStore()

  const handlePortEdit = useCallback((portId: string, equipmentId: string) => {
    setEditingPortData({ portId, equipmentId })
    setShowPortEditDialog(true)
  }, [])

  const handlePortSave = useCallback((label: string, portType: PortType, direction: PortDirection) => {
    if (!editingPortData) return

    const equipment = project.objects.find(obj => obj.id === editingPortData.equipmentId)
    if (!equipment) return

    const updatedComponents = equipment.components.map(comp => {
      if (comp.id === editingPortData.portId) {
        return {
          ...comp,
          data: {
            ...comp.data,
            label,
            portType,
            direction
          }
        }
      }
      return comp
    })

    updateEquipmentObject(editingPortData.equipmentId, { components: updatedComponents })
    setShowPortEditDialog(false)
    setEditingPortData(null)
  }, [editingPortData, project.objects, updateEquipmentObject])

  const getEditingPortInfo = useCallback(() => {
    if (!editingPortData) return null

    const equipment = project.objects.find(obj => obj.id === editingPortData.equipmentId)
    if (!equipment) return null

    const port = equipment.components.find(comp => comp.id === editingPortData.portId)
    if (!port) return null

    return {
      label: port.data.label || '',
      portType: port.data.portType,
      direction: port.data.direction
    }
  }, [editingPortData, project.objects])

  return {
    editingPortData,
    showPortEditDialog,
    setShowPortEditDialog,
    setEditingPortData,
    handlePortEdit,
    handlePortSave,
    getEditingPortInfo
  }
}

