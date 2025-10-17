import React, { useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { EquipmentObject, Side, ShapeType } from '@/types'
import {
  getRenderComponent,
  getConnectionPortComponents,
  getPropertyComponent,
  calculatePortPosition
} from '@/utils/componentSystem'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useProjectStore } from '@/store/useProjectStore'
import ResizableNodeSelected from './ResizableNodeSelected'

interface EquipmentNodeData {
  equipmentObject: EquipmentObject
  isSelected: boolean
  isEditMode: boolean
}

export default function EquipmentNode({ data, selected }: NodeProps<EquipmentNodeData>) {
  const { equipmentObject, isSelected } = data
  const renderComponent = getRenderComponent(equipmentObject)
  const portComponents = getConnectionPortComponents(equipmentObject)
  const propertyComponent = getPropertyComponent(equipmentObject)
  const { showPortLabels } = useSettingsStore()
  const { updateEquipmentObject, project } = useProjectStore()

  // ポートラベルを表示するかどうか（選択時またはホバー時）
  const [showLabels, setShowLabels] = useState(false)

  // ポートが接続されているかどうかをチェック
  const isPortConnected = (portId: string) => {
    return project.wires.some(wire => 
      wire.sourcePortId === portId || wire.targetPortId === portId
    )
  }

  // リサイズハンドラー
  const handleResize = (width: number, height: number) => {
    if (renderComponent) {
      const updatedComponents = equipmentObject.components.map(comp => {
        if (comp.id === renderComponent.id) {
          return {
            ...comp,
            data: {
              ...comp.data,
              size: { width, height }
            }
          }
        }
        return comp
      })
      
      updateEquipmentObject(equipmentObject.id, { components: updatedComponents })
    }
  }

  if (!renderComponent) {
    return <div className="w-20 h-12 bg-gray-300 rounded">No Render</div>
  }

  const { shape, color, strokeColor, strokeWidth, size, label } = renderComponent.data
  const name = propertyComponent?.data.properties.name?.value || equipmentObject.name

  // 図形の描画
  const renderShape = () => {
    const baseClasses = `border-${strokeWidth} transition-all duration-200`
    const selectedClasses = selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''

    const style = {
      backgroundColor: color,
      borderColor: strokeColor,
      width: size.width,
      height: size.height,
    }

    switch (shape) {
      case ShapeType.RECTANGLE:
        return (
          <div
            className={`${baseClasses} ${selectedClasses} border-solid rounded`}
            style={style}
          />
        )
      case ShapeType.CIRCLE:
        return (
          <div
            className={`${baseClasses} ${selectedClasses} border-solid rounded-full`}
            style={style}
          />
        )
      case ShapeType.TRIANGLE:
        return (
          <div
            className={`${selectedClasses}`}
            style={{ width: size.width, height: size.height }}
          >
            <svg width={size.width} height={size.height} className="overflow-visible">
              <polygon
                points={`${size.width / 2},0 ${size.width},${size.height} 0,${size.height}`}
                fill={color}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
              />
            </svg>
          </div>
        )
      default:
        return (
          <div
            className={`${baseClasses} ${selectedClasses} border-solid rounded`}
            style={style}
          />
        )
    }
  }

  // ポートハンドルとラベルの描画
  const renderPorts = () => {
    return portComponents.map((portComponent) => {
      const { position: portPos, direction, portType, label: portLabel } = portComponent.data

      let position: Position
      let handleStyle: React.CSSProperties = {}
      let labelStyle: React.CSSProperties = {}
      let labelClasses = 'absolute text-xs font-medium pointer-events-none select-none'

      switch (portPos.side) {
        case Side.TOP:
          position = Position.Top
          handleStyle = { left: `${portPos.offset}%` }
          labelStyle = {
            left: `${portPos.offset}%`,
            top: '-24px',
            transform: 'translateX(-50%)'
          }
          break
        case Side.RIGHT:
          position = Position.Right
          handleStyle = { top: `${portPos.offset}%` }
          labelStyle = {
            right: '-8px',
            top: `${portPos.offset}%`,
            transform: 'translateY(-50%) translateX(100%)'
          }
          break
        case Side.BOTTOM:
          position = Position.Bottom
          handleStyle = { left: `${portPos.offset}%` }
          labelStyle = {
            left: `${portPos.offset}%`,
            bottom: '-24px',
            transform: 'translateX(-50%)'
          }
          break
        case Side.LEFT:
          position = Position.Left
          handleStyle = { top: `${portPos.offset}%` }
          labelStyle = {
            left: '-8px',
            top: `${portPos.offset}%`,
            transform: 'translateY(-50%) translateX(-100%)'
          }
          break
        default:
          position = Position.Left
      }

      // ポートタイプに応じた色分け
      const getPortColor = () => {
        switch (portType) {
          case 'xlr-male':
          case 'xlr-female':
            return direction === 'input' ? 'bg-blue-400 border-blue-600' : 'bg-blue-500 border-blue-700'
          case 'trs-quarter':
          case 'ts-quarter':
          case 'trs-mini':
            return direction === 'input' ? 'bg-green-400 border-green-600' : 'bg-green-500 border-green-700'
          case 'hdmi':
          case 'displayport':
          case 'dvi':
            return direction === 'input' ? 'bg-purple-400 border-purple-600' : 'bg-purple-500 border-purple-700'
          case 'usb-a':
          case 'usb-b':
          case 'usb-c':
          case 'thunderbolt':
            return 'bg-yellow-400 border-yellow-600'
          case 'ethernet':
          case 'dante':
            return 'bg-orange-400 border-orange-600'
          case 'power-ac':
          case 'power-dc':
          case 'iec':
            return 'bg-red-400 border-red-600'
          default:
            return direction === 'input' ? 'bg-gray-400 border-gray-600' : 'bg-gray-500 border-gray-700'
        }
      }

      const handleClasses = `w-3 h-3 border-2 ${getPortColor()}`

      return (
        <div key={portComponent.id}>
          {/* ポートハンドル - 双方向ポートは両方のタイプを作成 */}
          {direction === 'bidirectional' ? (
            <>
              <Handle
                type="source"
                position={position}
                id={portComponent.id}
                style={handleStyle}
                className={handleClasses}
              />
              <Handle
                type="target"
                position={position}
                id={portComponent.id}
                style={{ ...handleStyle, zIndex: -1 }}
                className={handleClasses}
              />
            </>
          ) : (
            <Handle
              type={direction === 'input' ? 'target' : 'source'}
              position={position}
              id={portComponent.id}
              style={handleStyle}
              className={handleClasses}
            />
          )}

          {/* ポートラベル */}
          {portLabel && (
            showPortLabels === 'always' || 
            (showPortLabels === 'connected' && isPortConnected(portComponent.id)) ||
            (showPortLabels === 'connectedHover' && (isPortConnected(portComponent.id) || (selected || showLabels))) ||
            (showPortLabels === 'selected' && selected) ||
            (showPortLabels === 'hover' && (selected || showLabels))
          ) && (
            <div
              className={labelClasses}
              style={labelStyle}
            >
              <span 
                className="text-gray-700 text-xs font-semibold" 
                style={{ 
                  fontSize: '7px',
                  textShadow: '0 0 2px white, 0 0 2px white, 0 0 2px white'
                }}
              >
                {portLabel}
              </span>
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <ResizableNodeSelected
      isSelected={selected}
      onResize={handleResize}
      minWidth={50}
      minHeight={30}
      maxWidth={400}
      maxHeight={300}
    >
      <div
        className="relative"
        onMouseEnter={() => setShowLabels(true)}
        onMouseLeave={() => setShowLabels(false)}
      >
        {/* メイン図形 */}
        <div className="relative flex items-center justify-center">
          {renderShape()}

          {/* ラベル */}
          {label && (
            <div
              className="absolute text-xs font-medium pointer-events-none select-none"
              style={{
                color: label.color,
                fontSize: label.fontSize
              }}
            >
              {name}
            </div>
          )}
        </div>

        {/* ポートハンドル */}
        {renderPorts()}
      </div>
    </ResizableNodeSelected>
  )
}