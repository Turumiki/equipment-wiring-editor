import React from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow'
import { Wire, WireType } from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'

interface WireEdgeData {
  wire: Wire
  isSelected?: boolean
}

export default function WireEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}: EdgeProps<WireEdgeData>) {
  const { showWireLabels } = useSettingsStore()
  
  if (!data?.wire) {
    return null
  }
  
  const { wire } = data
  const { style, label, wireType } = wire

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // ワイヤータイプに応じた色とスタイル
  const getWireStyle = () => {
    const baseStyle = {
      stroke: style.color,
      strokeWidth: style.strokeWidth,
      strokeDasharray: style.strokeDashArray,
    }

    if (selected) {
      return {
        ...baseStyle,
        stroke: '#3b82f6',
        strokeWidth: style.strokeWidth + 1,
      }
    }

    switch (wireType) {
      case WireType.POWER_CABLE:
        return { ...baseStyle, stroke: '#dc2626', strokeWidth: 3 }
      case WireType.XLR_CABLE:
      case WireType.TRS_CABLE:
      case WireType.TS_CABLE:
        return { ...baseStyle, stroke: '#059669', strokeWidth: 2 }
      case WireType.USB_CABLE:
      case WireType.ETHERNET_CABLE:
      case WireType.THUNDERBOLT_CABLE:
        return { ...baseStyle, stroke: '#7c3aed', strokeWidth: 2 }
      case WireType.HDMI_CABLE:
      case WireType.DISPLAYPORT_CABLE:
        return { ...baseStyle, stroke: '#8b5cf6', strokeWidth: 2 }
      default:
        return baseStyle
    }
  }

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={getWireStyle()}
        markerEnd="url(#arrowhead)"
      />
      
      {/* ラベル表示 */}
      {label && showWireLabels && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              fontSize: '8px',
              fontWeight: '600',
              color: '#374151',
              textShadow: '0 0 2px white, 0 0 2px white, 0 0 2px white'
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* 矢印マーカー定義 */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={getWireStyle().stroke}
          />
        </marker>
      </defs>
    </>
  )
}