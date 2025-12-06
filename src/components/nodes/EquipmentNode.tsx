import React, { useState, memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { EquipmentObject, Side, ShapeType } from '@/types'
import {
  getRenderComponent,
  getConnectionPortComponents,
  getPropertyComponent,
  calculatePortPosition
} from '@/utils/componentSystem'
import { getPortTypeDisplayName } from '@/utils/portTypeUtils'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useProjectStore } from '@/store/useProjectStore'
import ResizableNodeSelected from './ResizableNodeSelected'

interface EquipmentNodeData {
  equipmentObject: EquipmentObject
  isSelected: boolean
  onPortEdit?: (portId: string, equipmentId: string) => void
}

const EquipmentNode = ({ data, selected }: NodeProps<EquipmentNodeData>) => {
  const { equipmentObject, isSelected, onPortEdit } = data
  const renderComponent = getRenderComponent(equipmentObject)
  const portComponents = getConnectionPortComponents(equipmentObject)
  const propertyComponent = getPropertyComponent(equipmentObject)
  const { showPortLabels, settings } = useSettingsStore()
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

  // ポートクリック処理（ドラッグと競合しないように）
  const handlePortClick = (e: React.MouseEvent, portComponent: any) => {
    e.preventDefault()
    e.stopPropagation()

    // ダブルクリックでのみ編集を開始
    if (e.detail === 2 && onPortEdit) {
      onPortEdit(portComponent.id, equipmentObject.id)
    }
  }

  if (!renderComponent) {
    return <div className="w-20 h-12 bg-gray-300">No Render</div>
  }

  const { shape, color, strokeColor, strokeWidth, size, label } = renderComponent.data
  // 表示名の優先順位: レンダーコンポーネントのラベル > プロパティの名前 > オブジェクト名
  const name = (renderComponent?.data.label?.text && renderComponent.data.label.text !== '機材' && renderComponent.data.label.text !== '')
    ? renderComponent.data.label.text
    : (propertyComponent?.data.properties.name?.value || equipmentObject.name)

  // 図形の描画
  const renderShape = () => {
    const baseClasses = 'border-solid'
    const selectedClasses = selected ? 'ring-2 ring-blue-500' : ''

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

      // デバッグ用ログ（簡潔版）
      // if (direction === 'bidirectional') {
      //   console.log('🔄 Bidirectional port:', portComponent.id, 'Type:', portType, 'Side:', portPos?.side)
      // }

      let position: Position
      let handleStyle: React.CSSProperties = {}
      let labelStyle: React.CSSProperties = {}
      let labelClasses = 'absolute text-xs font-medium pointer-events-none select-none whitespace-nowrap'

      // ポートデータの安全な取得
      const portSide = portPos?.side || Side.LEFT
      const portOffset = portPos?.offset || 50

      // デバッグ: 強制的にテストケースを適用
      // console.log('Before switch - portSide:', portSide, 'Expected:', Side.RIGHT)

      switch (portSide) {
        case Side.TOP:
          position = Position.Top
          handleStyle = {
            left: `${portOffset}%`,
            transform: 'translateX(-50%) translateY(-50%)',
            top: '0px' // 辺の上に配置
          }
          labelStyle = {
            left: `${portOffset}%`,
            top: '4px', // 機材内側に配置
            transform: 'translateX(-50%)'
          }
          break
        case Side.RIGHT:
          position = Position.Right
          handleStyle = {
            top: `${portOffset}%`,
            transform: 'translateY(-50%) translateX(50%)',
            right: '0px' // 辺の上に配置
          }
          labelStyle = {
            right: '8px', // 機材内側に配置
            top: `${portOffset}%`,
            transform: 'translateY(-15%)', // メインラベルをハンドル位置に揃える
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }
          break
        case Side.BOTTOM:
          position = Position.Bottom
          handleStyle = {
            left: `${portOffset}%`,
            transform: 'translateX(-50%) translateY(50%)',
            bottom: '0px' // 辺の上に配置
          }
          labelStyle = {
            left: `${portOffset}%`,
            bottom: '4px', // 機材内側に配置
            transform: 'translateX(-50%)'
          }
          break
        case Side.LEFT:
          position = Position.Left
          handleStyle = {
            top: `${portOffset}%`,
            transform: 'translateY(-50%) translateX(-50%)',
            left: '0px' // 辺の上に配置
          }
          labelStyle = {
            left: '8px', // 機材内側に配置
            top: `${portOffset}%`,
            transform: 'translateY(-20%)', // メインラベルをハンドル位置に揃える
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }
          break
        default:
          position = Position.Left
          handleStyle = {
            top: `${portOffset}%`,
            transform: 'translateY(-50%) translateX(-50%)',
            left: '0px'
          }
          labelStyle = {
            left: '8px', // 機材内側に配置
            top: `${portOffset}%`,
            transform: 'translateY(-50%)', // メインラベルをハンドル位置に揃える
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }
      }

      // ポートタイプの表示名を取得（portTypeUtilsからインポートした関数を使用）

      // ポートの色とスタイルを取得（常に黒色、透明度なし）
      const getPortStyle = () => {
        return {
          backgroundColor: '#000000',
          borderColor: '#000000',
          borderWidth: '0.5px',
          opacity: 1,
          width: '3px',
          height: '3px',
          minWidth: '3px',
          minHeight: '3px'
        }
      }

      const getPortClasses = () => {
        // 3pxに近いサイズ (w-0.75 or w-[3px])
        return 'w-[3px] h-[3px] border-[0.5px] border-black bg-black'
      }

      const handleClasses = getPortClasses()
      const portStyle = getPortStyle()
      const portTypeTooltip = getPortTypeDisplayName(portType, direction)

      return (
        <div key={portComponent.id}>
          {/* ポートハンドル */}
          {direction === 'bidirectional' ? (
            <>
              {/* 双方向ポートは見た目は通常のポートと同じ、機能的にはsourceとtarget両方 */}
              <Handle
                type="target"
                position={position}
                id={portComponent.id}
                style={{
                  ...handleStyle,
                  zIndex: 1
                }}
                className="opacity-0" // 透明にして見えなくする
              />
              <Handle
                type="source"
                position={position}
                id={portComponent.id}
                style={{
                  ...handleStyle,
                  ...portStyle,
                  zIndex: 2 // sourceを上に配置してドラッグしやすくする
                }}
                className={handleClasses} // 通常のポートと同じ見た目
                onClick={(e) => handlePortClick(e, portComponent)}
                title={`${portTypeTooltip} (ダブルクリックで編集)`}
              />
            </>
          ) : (
            <Handle
              type={direction === 'input' ? 'target' : 'source'}
              position={position}
              id={portComponent.id}
              style={{
                ...handleStyle,
                ...portStyle
              }}
              className={handleClasses}
              onClick={(e) => handlePortClick(e, portComponent)}
              title={`${portTypeTooltip} (ダブルクリックで編集)`}
            />
          )}

          {/* ポートラベル */}
          {portLabel && (() => {
            // 表示条件の判定
            const shouldShow =
              showPortLabels === 'always' || showPortLabels === 'alwaysWithType' ||
              ((showPortLabels === 'connected' || showPortLabels === 'connectedWithType') && isPortConnected(portComponent.id)) ||
              ((showPortLabels === 'connectedHover' || showPortLabels === 'connectedHoverWithType') && (isPortConnected(portComponent.id) || (selected || showLabels))) ||
              ((showPortLabels === 'selected' || showPortLabels === 'selectedWithType') && selected) ||
              ((showPortLabels === 'hover' || showPortLabels === 'hoverWithType') && (selected || showLabels))

            // タイプ表示の判定
            const showType = showPortLabels.includes('WithType')

            if (!shouldShow) return null

            return (
              <div
                className={labelClasses}
                style={labelStyle}
              >
                <div
                  className={`font-medium ${portSide === Side.LEFT ? 'text-left' :
                    portSide === Side.RIGHT ? 'text-right' :
                      'text-center'
                    }`}
                  style={{
                    fontSize: '5px',
                    color: getContrastColor(renderComponent?.data.color || '#6b7280'),
                    textShadow: getContrastColor(renderComponent?.data.color || '#6b7280') === '#ffffff'
                      ? '0 0 2px rgba(0, 0, 0, 0.8)'
                      : '0 0 2px rgba(255, 255, 255, 0.8)',
                    lineHeight: '1.2'
                  }}
                >
                  {/* 上部と下部ポートでタイプを上に表示 */}
                  {showType && (portSide === Side.TOP || portSide === Side.BOTTOM) && (
                    <div
                      style={{
                        fontSize: '4px',
                        opacity: 0.8,
                        marginBottom: '1px'
                      }}
                    >
                      {getPortTypeDisplayName(portType, direction)}
                    </div>
                  )}
                  <div style={{
                    // 左右のポートでメインラベルをハンドル位置に揃える
                    margin: (portSide === Side.LEFT || portSide === Side.RIGHT) && showType ? '0' : undefined
                  }}>{portLabel}</div>
                  {/* 左右のポートでタイプを下に表示 */}
                  {showType && (portSide === Side.LEFT || portSide === Side.RIGHT) && (
                    <div
                      style={{
                        fontSize: '4px',
                        opacity: 0.8,
                        marginTop: '1px'
                      }}
                    >
                      {getPortTypeDisplayName(portType, direction)}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
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
      maxWidth={1000}
      maxHeight={2000}
    >
      <div
        className="relative"
        onMouseEnter={() => setShowLabels(true)}
        onMouseLeave={() => setShowLabels(false)}
      >
        {/* ラベル（図形の上部外側） */}
        {label && (
          <div
            className="absolute pointer-events-none select-none"
            style={{
              color: label.color,
              fontSize: label.fontSize,
              fontWeight: 500,
              top: `-${label.fontSize + 4}px`,
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap'
            }}
          >
            {name}
          </div>
        )}

        {/* メイン図形 */}
        <div className="relative flex items-center justify-center">
          {renderShape()}
        </div>

        {/* ポートハンドル */}
        {renderPorts()}
      </div>
    </ResizableNodeSelected>
  )
}

export default memo(EquipmentNode)