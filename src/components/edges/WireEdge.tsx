import React from 'react'
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, ConnectionLineType } from 'reactflow'
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
  const { showWireLabels, settings } = useSettingsStore()
  
  if (!data?.wire) {
    return null
  }
  
  const { wire } = data
  const { style, label, wireType } = wire

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // ワイヤータイプに応じた色とスタイル
  const getWireStyle = () => {
    // 設定ストアからワイヤータイプ設定を取得
    const wireTypeSettings = settings.wireTypes.find(wt => wt.name === wireType)
    
    const baseStyle = {
      stroke: wireTypeSettings?.color || style.color,
      strokeWidth: wireTypeSettings?.strokeWidth || style.strokeWidth,
      strokeDasharray: wireTypeSettings?.strokeDashArray || style.strokeDashArray,
    }

    if (selected) {
      return {
        ...baseStyle,
        stroke: '#3b82f6',
        strokeWidth: Math.max(baseStyle.strokeWidth + 2, 4), // 選択時は最低4pxの太さ
        filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))', // 青い光る効果
      }
    }

    return baseStyle
  }

  return (
    <>
      {/* 選択用の透明な太い線（クリック領域を広げる） */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth="12"
        className="react-flow__edge-interaction"
      />
      
      {/* 実際の表示線 */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={getWireStyle()}
      />

      {/* Reconnectハンドル（選択時のみ表示） */}
      {selected && (
        <>
          {/* ソース側のReconnectハンドル */}
          <circle
            cx={sourceX}
            cy={sourceY}
            r="4"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
            className="react-flow__edge-reconnect-source"
            style={{ cursor: 'grab' }}
          />
          
          {/* ターゲット側のReconnectハンドル */}
          <circle
            cx={targetX}
            cy={targetY}
            r="4"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
            className="react-flow__edge-reconnect-target"
            style={{ cursor: 'grab' }}
          />
        </>
      )}
      
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

    </>
  )
}