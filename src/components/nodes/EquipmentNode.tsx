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

  // リサイズハンドラー（リアルタイム更新、履歴保存スキップ）
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

      updateEquipmentObject(equipmentObject.id, { components: updatedComponents }, true) // 履歴保存をスキップ
    }
  }

  // リサイズ終了時ハンドラー（履歴に保存）
  const handleResizeEnd = (width: number, height: number) => {
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

      updateEquipmentObject(equipmentObject.id, { components: updatedComponents }) // 履歴に保存
    }
  }

  if (!renderComponent) {
    return <div className="w-20 h-12 bg-gray-300">No Render</div>
  }

  const { shape, color, strokeColor, strokeWidth, size, label } = renderComponent.data
  const name = propertyComponent?.data.properties.name?.value || equipmentObject.name

  // 図形の描画
  const renderShape = () => {
    const baseClasses = 'border-solid'
    const selectedClasses = selected ? 'ring-1 ring-gray-600' : ''

    const style = {
      backgroundColor: color,
      borderColor: strokeColor,
      borderWidth: `${strokeWidth}px`,
      width: size.width,
      height: size.height,
    }

    switch (shape) {
      case ShapeType.RECTANGLE:
        return (
          <div
            className={`${baseClasses} ${selectedClasses} border-solid`}
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
            className={`${baseClasses} ${selectedClasses} border-solid`}
            style={style}
          />
        )
    }
  }

  // 背景色から見やすいテキスト色を計算する関数
  const getContrastColor = (backgroundColor: string): string => {
    // HEXカラーをRGBに変換
    const hex = backgroundColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    // 輝度を計算 (0-255)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b)

    // 輝度が128以上なら黒、未満なら白を返す
    return luminance > 128 ? '#000000' : '#ffffff'
  }

  // ポートハンドルとラベルの描画
  const renderPorts = () => {
    return portComponents.map((portComponent) => {
      const { position: portPos, direction, portType, label: portLabel } = portComponent.data

      let position: Position
      let handleStyle: React.CSSProperties = {}
      let labelStyle: React.CSSProperties = {}
      let labelClasses = 'absolute text-xs font-medium pointer-events-none select-none whitespace-nowrap'

      switch (portPos.side) {
        case Side.TOP:
          position = Position.Top
          handleStyle = { left: `${portPos.offset}%` }
          labelStyle = {
            left: `${portPos.offset}%`,
            top: '-2px',
            transform: 'translateX(-50%)'
          }
          break
        case Side.RIGHT:
          position = Position.Right
          handleStyle = { top: `${portPos.offset}%` }
          labelStyle = {
            right: '4px',
            top: `${portPos.offset}%`,
            transform: 'translateY(-50%)'
          }
          break
        case Side.BOTTOM:
          position = Position.Bottom
          handleStyle = { left: `${portPos.offset}%` }
          labelStyle = {
            left: `${portPos.offset}%`,
            bottom: '0px',
            transform: 'translateX(-50%)'
          }
          break
        case Side.LEFT:
          position = Position.Left
          handleStyle = { top: `${portPos.offset}%` }
          labelStyle = {
            left: '4px',
            top: `${portPos.offset}%`,
            transform: 'translateY(-50%)'
          }
          break
        default:
          position = Position.Left
      }

      // ポートタイプの表示名を取得
      const getPortTypeDisplayName = (portType: string, direction: string) => {
        const directionText = direction === 'input' ? 'Input' : direction === 'output' ? 'Output' : 'Bidirectional'

        switch (portType) {
          case 'xlr-male':
            return `XLR Male ${directionText}`
          case 'xlr-female':
            return `XLR Female ${directionText}`
          case 'trs-quarter':
            return `TRS 1/4" ${directionText}`
          case 'ts-quarter':
            return `TS 1/4" ${directionText}`
          case 'trs-mini':
            return `TRS 3.5mm ${directionText}`
          case 'hdmi':
            return `HDMI ${directionText}`
          case 'displayport':
            return `DisplayPort ${directionText}`
          case 'dvi':
            return `DVI ${directionText}`
          case 'usb-a':
            return `USB-A ${directionText}`
          case 'usb-b':
            return `USB-B ${directionText}`
          case 'usb-c':
            return `USB-C ${directionText}`
          case 'thunderbolt':
            return `Thunderbolt ${directionText}`
          case 'ethernet':
            return `Ethernet ${directionText}`
          case 'dante':
            return `Dante ${directionText}`
          case 'power-ac':
            return `AC Power ${directionText}`
          case 'power-dc':
            return `DC Power ${directionText}`
          case 'iec':
            return `IEC Power ${directionText}`
          default:
            return `${portType.toUpperCase()} ${directionText}`
        }
      }

      // シンプルなポートスタイル
      const getPortColor = () => {
        switch (portType) {
          case 'xlr-male':
          case 'xlr-female':
            return direction === 'input' ? 'bg-gray-600 border-gray-800' : 'bg-gray-700 border-gray-900'
          case 'trs-quarter':
          case 'ts-quarter':
          case 'trs-mini':
            return direction === 'input' ? 'bg-gray-500 border-gray-700' : 'bg-gray-600 border-gray-800'
          case 'hdmi':
          case 'displayport':
          case 'dvi':
            return direction === 'input' ? 'bg-gray-600 border-gray-800' : 'bg-gray-700 border-gray-900'
          case 'usb-a':
          case 'usb-b':
          case 'usb-c':
          case 'thunderbolt':
            return 'bg-gray-500 border-gray-700'
          case 'ethernet':
          case 'dante':
            return 'bg-gray-600 border-gray-800'
          case 'power-ac':
          case 'power-dc':
          case 'iec':
            return 'bg-gray-700 border-gray-900'
          default:
            return direction === 'input' ? 'bg-gray-400 border-gray-600' : 'bg-gray-500 border-gray-700'
        }
      }

      const handleClasses = `w-3 h-3 border-2 ${getPortColor()}`
      const portTypeTooltip = getPortTypeDisplayName(portType, direction)

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
                title={portTypeTooltip}
              />
              <Handle
                type="target"
                position={position}
                id={portComponent.id}
                style={{ ...handleStyle, zIndex: -1 }}
                className={handleClasses}
                title={portTypeTooltip}
              />
            </>
          ) : (
            <Handle
              type={direction === 'input' ? 'target' : 'source'}
              position={position}
              id={portComponent.id}
              style={handleStyle}
              className={handleClasses}
              title={portTypeTooltip}
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
                  className="font-medium"
                  style={{
                    fontSize: '5px',
                    color: getContrastColor(renderComponent?.data.color || '#6b7280'),
                    textShadow: getContrastColor(renderComponent?.data.color || '#6b7280') === '#ffffff'
                      ? '0 0 2px rgba(0, 0, 0, 0.8)'
                      : '0 0 2px rgba(255, 255, 255, 0.8)',
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
      onResizeEnd={handleResizeEnd}
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
              className="absolute pointer-events-none select-none"
              style={{
                color: label.color,
                fontSize: label.fontSize,
                fontWeight: 500
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