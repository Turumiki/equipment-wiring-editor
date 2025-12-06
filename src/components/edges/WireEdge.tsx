import React, { memo } from 'react'
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, ConnectionLineType } from 'reactflow'
import { Wire, WireType } from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useProjectStore } from '@/store/useProjectStore'
import { getPropertyComponent } from '@/utils/componentSystem'

interface WireEdgeData {
  wire: Wire
  isSelected?: boolean
}

// 機材名の短縮形マッピング
const equipmentNameAbbreviations: Record<string, string> = {
  'HDMI': 'H',
  'SDI': 'S',
  'USB': 'U',
  'XLR': 'X',
  'TRS': 'T',
  'TS': 'T',
  'RCA': 'R',
  'DVI': 'D',
  'VGA': 'V',
  'BNC': 'B',
  'Ethernet': 'E',
  'LAN': 'L',
  'Dante': 'D',
  'AES': 'A',
  'SPDIF': 'S',
  'ADAT': 'A',
  'DisplayPort': 'DP',
  'Thunderbolt': 'TB',
  'MIDI': 'M',
  'Power': 'P',
  'AC': 'AC',
  'DC': 'DC'
}

// 機材名を省略するヘルパー関数
// フォントサイズ4px、最大幅120pxを考慮して適切に省略
// 末尾の文字（番号など）を優先的に表示
const truncateEquipmentName = (name: string, maxLength: number = 12): string => {
  if (!name) {
    return name
  }
  
  // まず、よく使われる略語を置き換え
  let abbreviated = name
  for (const [full, abbrev] of Object.entries(equipmentNameAbbreviations)) {
    // 大文字小文字を区別せずに置き換え
    const regex = new RegExp(full, 'gi')
    abbreviated = abbreviated.replace(regex, abbrev)
  }
  
  // 置き換え後の長さがmaxLength以下ならそのまま返す
  if (abbreviated.length <= maxLength) {
    return abbreviated
  }
  
  // 長い名前の場合、先頭を省略して末尾を優先的に表示
  // 末尾の文字数（番号などを考慮して4-5文字程度）を確保
  const tailLength = Math.min(5, Math.floor(maxLength * 0.4)) // 末尾40%、最大5文字
  const headLength = maxLength - tailLength - 3 // 先頭（"..."を除く）
  
  // 例: "非常に長い機材名-01" -> "...長い機材名-01"
  return `...${abbreviated.substring(abbreviated.length - tailLength - headLength, abbreviated.length)}`
}

const WireEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}: EdgeProps<WireEdgeData>) => {
  const { showWireLabels, settings } = useSettingsStore()
  const { project } = useProjectStore()

  if (!data?.wire) {
    return null
  }

  const { wire } = data
  const { style, label, wireType, sourceObjectId, targetObjectId } = wire

  // 機材名を取得
  const sourceObject = project.objects.find(obj => obj.id === sourceObjectId)
  const targetObject = project.objects.find(obj => obj.id === targetObjectId)
  const sourceObjectNameFull = getPropertyComponent(sourceObject!)?.data.properties.name?.value || sourceObject?.name || 'Unknown'
  const targetObjectNameFull = getPropertyComponent(targetObject!)?.data.properties.name?.value || targetObject?.name || 'Unknown'
  
  // 機材名を省略
  const sourceObjectName = truncateEquipmentName(sourceObjectNameFull)
  const targetObjectName = truncateEquipmentName(targetObjectNameFull)

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  
  // 機材側へのオフセットを計算（ポート位置から機材側に10px、エッジに被らないように上に5px）
  const getOffsetPosition = (x: number, y: number, position: string) => {
    const sideOffset = 0 // 機材側へのオフセット
    const verticalOffset = -5 // 上方向へのオフセット（エッジに被らないように）
    switch (position) {
      case 'top':
        return { x, y: y + sideOffset + verticalOffset }
      case 'right':
        return { x: x - sideOffset, y: y + verticalOffset }
      case 'bottom':
        return { x, y: y - sideOffset + verticalOffset }
      case 'left':
        return { x: x + sideOffset, y: y + verticalOffset }
      default:
        return { x, y: y + verticalOffset }
    }
  }

  // ラベルの配置を計算（右辺は右揃え、左辺は左揃え）
  const getLabelTransform = (position: string) => {
    switch (position) {
      case 'right':
        return 'translate(0%, -50%)' // 右揃え（ラベルの左端が基準点）
      case 'left':
        return 'translate(-100%, -50%)' // 左揃え（ラベルの右端が基準点）
      case 'top':
      case 'bottom':
      default:
        return 'translate(-50%, -50%)' // 中央揃え
    }
  }

  const sourceOffset = getOffsetPosition(sourceX, sourceY, sourcePosition)
  const targetOffset = getOffsetPosition(targetX, targetY, targetPosition)
  const sourceTransform = getLabelTransform(sourcePosition)
  const targetTransform = getLabelTransform(targetPosition)


  // ワイヤータイプに応じた色とスタイル
  const getWireStyle = () => {
    // 設定ストアからワイヤータイプ設定を取得
    // wireTypeの値（例: "xlr-cable"）でnameまたはidを検索
    const wireTypeSettings = settings.wireTypes.find(wt =>
      wt.name === wireType || wt.id === wireType
    )

    // デバッグログは無効化
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('Wire type:', wireType)
    //   console.log('Wire type settings found:', wireTypeSettings)
    //   console.log('Available wire types:', settings.wireTypes.map(wt => ({ id: wt.id, name: wt.name })))
    // }

    // 個別のワイヤースタイルを優先し、設定ストアをフォールバックとして使用
    const baseStyle = {
      stroke: (style.color && style.color !== '') ? style.color : (wireTypeSettings?.color || '#059669'),
      strokeWidth: (style.strokeWidth && style.strokeWidth > 0) ? style.strokeWidth : (wireTypeSettings?.strokeWidth || 2),
      strokeDasharray: style.strokeDashArray || wireTypeSettings?.strokeDashArray,
      fill: 'none', // 線の内側が塗りつぶされないようにする
    }

    if (selected) {
      return {
        ...baseStyle,
        stroke: '#2563eb',
        strokeWidth: Math.max(baseStyle.strokeWidth + 1, 3), // 選択時は少し太く
        opacity: 1,
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
        fill="none"
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

      {/* ラベル表示（中央） */}
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

      {/* ソース側（始点）にターゲット機材名を表示（機材側に揃える） */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `${sourceTransform} translate(${sourceOffset.x}px,${sourceOffset.y}px)`,
            pointerEvents: 'none',
            fontSize: '3px',
            fontWeight: '600',
            color: '#1f2937',
            whiteSpace: 'nowrap',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {targetObjectName}
        </div>
      </EdgeLabelRenderer>

      {/* ターゲット側（終点）にソース機材名を表示（機材側に揃える） */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `${targetTransform} translate(${targetOffset.x}px,${targetOffset.y}px)`,
            pointerEvents: 'none',
            fontSize: '4px',
            fontWeight: '600',
            color: '#1f2937',
            whiteSpace: 'nowrap',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {sourceObjectName}
        </div>
      </EdgeLabelRenderer>

    </>
  )
}

export default memo(WireEdge)