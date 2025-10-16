import React from 'react'
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow'
import { Wire } from '@/types'

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
      case 'power':
        return { ...baseStyle, stroke: '#dc2626', strokeWidth: 3 }
      case 'signal':
        return { ...baseStyle, stroke: '#059669', strokeWidth: 2 }
      case 'data':
        return { ...baseStyle, stroke: '#7c3aed', strokeWidth: 2 }
      case 'ground':
        return { ...baseStyle, stroke: '#374151', strokeWidth: 2 }
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
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-white px-2 py-1 rounded border border-gray-300 text-xs font-medium shadow-sm"
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