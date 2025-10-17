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
    // wireTypeの値（例: "xlr-cable"）でnameまたはidを検索
    const wireTypeSettings = settings.wireTypes.find(wt => 
      wt.name === wireType || wt.id === wireType
    )
    
    // デバッグログ（開発時のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('Wire type:', wireType)
      console.log('Wire type settings found:', wireTypeSettings)
      console.log('Available wire types:', settings.wireTypes.map(wt => ({ id: wt.id, name: wt.name })))
    }
    
    // 個別のワイヤースタイルを優先し、設定ストアをフォールバックとして使用
    const baseStyle = {
      stroke: (style.color && style.color !== '') ? style.color : (wireTypeSettings?.color || '#059669'),
      strokeWidth: (style.strokeWidth && style.strokeWidth > 0) ? style.strokeWidth : (wireTypeSettings?.strokeWidth || 2),
      strokeDasharray: style.strokeDashArray || wireTypeSettings?.strokeDashArray,
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