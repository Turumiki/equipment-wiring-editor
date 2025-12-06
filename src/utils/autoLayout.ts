import { EquipmentObject, Wire, Side, ComponentType, ConnectionPortComponent } from '@/types'
import { getRenderComponent, getConnectionPortComponents, calculatePortPosition } from './componentSystem'
import { getSmoothStepPath, Position } from 'reactflow'

export interface LayoutOptions {
  algorithm: 'grid' | 'hierarchical' | 'force' | 'circular' | 'smart' | 'signal-flow' | 'genetic'
  spacing: number
  padding: number
  direction?: 'horizontal' | 'vertical'
  minimizeCrossings?: boolean
  avoidNodeOverlap?: boolean
  // 遺伝的アルゴリズム用パラメータ
  populationSize?: number
  generations?: number
  mutationRate?: number
  crossoverRate?: number
}

export interface LayoutResult {
  positions: Record<string, { x: number; y: number }>
}

export interface LayoutProgress {
  stage: string
  progress: number // 0-100
  message?: string
  positions?: Record<string, { x: number; y: number }> // リアルタイム表示用の位置情報（遺伝的アルゴリズムなど）
}

export interface LayoutCancelToken {
  signal: AbortSignal
}

// グリッドレイアウト
export function gridLayout(
  objects: EquipmentObject[],
  options: LayoutOptions
): LayoutResult {
  const { spacing, padding } = options
  const positions: Record<string, { x: number; y: number }> = {}

  if (objects.length === 0) {
    return { positions }
  }

  const cols = Math.ceil(Math.sqrt(objects.length))

  // Calculate maximum dimensions for consistent grid
  let maxWidth = 0
  let maxHeight = 0

  objects.forEach(obj => {
    const renderComponent = getRenderComponent(obj)
    const width = renderComponent?.data.size.width || 100
    const height = renderComponent?.data.size.height || 60
    maxWidth = Math.max(maxWidth, width)
    maxHeight = Math.max(maxHeight, height)
  })

  objects.forEach((obj, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)

    // Use consistent cell size for better alignment
    const cellWidth = maxWidth + spacing
    const cellHeight = maxHeight + spacing

    positions[obj.id] = {
      x: padding + col * cellWidth,
      y: padding + row * cellHeight
    }
  })

  return { positions }
}

// 階層レイアウト（非同期版）
export async function hierarchicalLayoutAsync(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions,
  onProgress?: (progress: LayoutProgress) => void,
  cancelToken?: LayoutCancelToken
): Promise<LayoutResult> {
  if (onProgress) {
    onProgress({ stage: '階層分析', progress: 30, message: '階層構造を分析中...' })
    await new Promise(resolve => setTimeout(resolve, 20))
    onProgress({ stage: '階層配置', progress: 60, message: '階層的に配置中...' })
    await new Promise(resolve => setTimeout(resolve, 30))
  }
  return hierarchicalLayout(objects, wires, options)
}

// 階層レイアウト（接続関係に基づく）
export function hierarchicalLayout(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): LayoutResult {
  const { spacing, padding, direction = 'horizontal' } = options
  const positions: Record<string, { x: number; y: number }> = {}

  if (objects.length === 0) {
    return { positions }
  }

  // ポートの辺配置を考慮したレベル分け
  const connectionCounts = new Map<string, { incoming: number; outgoing: number }>()
  const portSideInfo = new Map<string, { hasLeftPort: boolean; hasRightPort: boolean; hasTopPort: boolean; hasBottomPort: boolean }>()

  // 各オブジェクトのポート位置を記録
  objects.forEach(obj => {
    connectionCounts.set(obj.id, { incoming: 0, outgoing: 0 })
    const ports = getConnectionPortComponents(obj)
    const sideInfo = {
      hasLeftPort: false,
      hasRightPort: false,
      hasTopPort: false,
      hasBottomPort: false
    }
    ports.forEach(port => {
      const side = port.data.position?.side || Side.LEFT
      if (side === Side.LEFT) sideInfo.hasLeftPort = true
      if (side === Side.RIGHT) sideInfo.hasRightPort = true
      if (side === Side.TOP) sideInfo.hasTopPort = true
      if (side === Side.BOTTOM) sideInfo.hasBottomPort = true
    })
    portSideInfo.set(obj.id, sideInfo)
  })

  // 接続数を計算し、ポートの辺配置を考慮
  wires.forEach(wire => {
    const source = connectionCounts.get(wire.sourceObjectId)
    const target = connectionCounts.get(wire.targetObjectId)
    if (source) source.outgoing++
    if (target) target.incoming++
  })

  // ポートの辺配置を考慮したレベル分け
  const levels: Record<number, string[]> = { 0: [], 1: [], 2: [] }
  const processed = new Set<string>()

  // まず、ポートの辺配置に基づいて接続関係を分析
  const portBasedLevels = new Map<string, number>()
  
  // ポートの辺配置から、オブジェクト間の相対位置を決定
  wires.forEach(wire => {
    const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
    const targetObj = objects.find(o => o.id === wire.targetObjectId)
    if (!sourceObj || !targetObj) return

    const sourcePorts = getConnectionPortComponents(sourceObj)
    const targetPorts = getConnectionPortComponents(targetObj)
    const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
    const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

    if (sourcePort && targetPort) {
      const sourceSide = sourcePort.data.position.side
      const targetSide = targetPort.data.position.side

      // ポートの辺配置に基づいて、相対的なレベルを決定
      // 右辺のポートを持つオブジェクトは、左辺のポートを持つオブジェクトより左側（低いレベル）に配置
      if (sourceSide === Side.RIGHT && targetSide === Side.LEFT) {
        // 機材A（右辺）→ 機材B（左辺）：AをBの左側に配置
        const sourceLevel = portBasedLevels.get(wire.sourceObjectId) || 0
        const targetLevel = portBasedLevels.get(wire.targetObjectId) || 1
        if (sourceLevel >= targetLevel) {
          portBasedLevels.set(wire.sourceObjectId, targetLevel - 1)
          portBasedLevels.set(wire.targetObjectId, targetLevel)
        }
      } else if (sourceSide === Side.LEFT && targetSide === Side.RIGHT) {
        // 機材A（左辺）→ 機材B（右辺）：AをBの左側に配置
        const sourceLevel = portBasedLevels.get(wire.sourceObjectId) || 0
        const targetLevel = portBasedLevels.get(wire.targetObjectId) || 1
        if (sourceLevel >= targetLevel) {
          portBasedLevels.set(wire.sourceObjectId, targetLevel - 1)
          portBasedLevels.set(wire.targetObjectId, targetLevel)
        }
      } else if (sourceSide === Side.BOTTOM && targetSide === Side.TOP) {
        // 機材A（下辺）→ 機材B（上辺）：AをBの下側に配置（垂直方向）
        const sourceLevel = portBasedLevels.get(wire.sourceObjectId) || 0
        const targetLevel = portBasedLevels.get(wire.targetObjectId) || 1
        if (sourceLevel <= targetLevel) {
          portBasedLevels.set(wire.sourceObjectId, targetLevel + 1)
          portBasedLevels.set(wire.targetObjectId, targetLevel)
        }
      } else if (sourceSide === Side.TOP && targetSide === Side.BOTTOM) {
        // 機材A（上辺）→ 機材B（下辺）：AをBの上側に配置（垂直方向）
        const sourceLevel = portBasedLevels.get(wire.sourceObjectId) || 0
        const targetLevel = portBasedLevels.get(wire.targetObjectId) || 1
        if (sourceLevel >= targetLevel) {
          portBasedLevels.set(wire.sourceObjectId, targetLevel - 1)
          portBasedLevels.set(wire.targetObjectId, targetLevel)
        }
      }
    }
  })

  // ポートベースのレベルが設定されていない場合は、接続数ベースで決定
  objects.forEach(obj => {
    const counts = connectionCounts.get(obj.id)
    if (!counts) return

    let level = portBasedLevels.get(obj.id)
    if (level === undefined) {
      // ポートベースのレベルが設定されていない場合は、接続数ベースで決定
      if (counts.outgoing > 0 && counts.incoming === 0) {
        level = 0 // 入力ノード
      } else if (counts.outgoing === 0 && counts.incoming > 0) {
        level = 2 // 出力ノード
      } else {
        level = 1 // 処理ノード
      }
    }

    // レベルを正規化（0-2の範囲に）
    const normalizedLevel = Math.max(0, Math.min(2, level))
    if (!levels[normalizedLevel]) levels[normalizedLevel] = []
    levels[normalizedLevel].push(obj.id)
  })

  // 各レベルを配置
  Object.entries(levels).forEach(([levelStr, nodeIds]) => {
    const level = parseInt(levelStr)
    nodeIds.forEach((nodeId, index) => {
      const obj = objects.find(o => o.id === nodeId)
      if (!obj) return

      const renderComponent = getRenderComponent(obj)
      const width = renderComponent?.data.size.width || 100
      const height = renderComponent?.data.size.height || 60

      if (direction === 'horizontal') {
        positions[nodeId] = {
          x: padding + level * (width + spacing * 2),
          y: padding + index * (height + spacing)
        }
      } else {
        positions[nodeId] = {
          x: padding + index * (width + spacing),
          y: padding + level * (height + spacing * 2)
        }
      }
    })
  })

  return { positions }
}

// 力学レイアウト（非同期版）
export async function forceLayoutAsync(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions,
  onProgress?: (progress: LayoutProgress) => void,
  cancelToken?: LayoutCancelToken
): Promise<LayoutResult> {
  const { spacing, padding } = options
  const positions: Record<string, { x: number; y: number }> = {}

  // 初期位置をランダムに設定
  objects.forEach((obj, index) => {
    const angle = (index / objects.length) * 2 * Math.PI
    const radius = 200
    positions[obj.id] = {
      x: padding + 300 + Math.cos(angle) * radius,
      y: padding + 300 + Math.sin(angle) * radius
    }
  })

  // より高度な力学シミュレーション（100回のイテレーション）
  const iterations = 100
  for (let iteration = 0; iteration < iterations; iteration++) {
    if (onProgress && iteration % 10 === 0) {
      const progress = 20 + (iteration / iterations) * 70
      onProgress({
        stage: '力学シミュレーション',
        progress,
        message: `イテレーション ${iteration}/${iterations}`
      })
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    const forces: Record<string, { x: number; y: number }> = {}

    // 初期化
    objects.forEach(obj => {
      forces[obj.id] = { x: 0, y: 0 }
    })

    // 反発力（ノード間）
    objects.forEach(obj1 => {
      objects.forEach(obj2 => {
        if (obj1.id === obj2.id) return

        const pos1 = positions[obj1.id]
        const pos2 = positions[obj2.id]
        const dx = pos1.x - pos2.x
        const dy = pos1.y - pos2.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const repulsion = spacing * spacing / distance
        forces[obj1.id].x += (dx / distance) * repulsion * 0.1
        forces[obj1.id].y += (dy / distance) * repulsion * 0.1
      })
    })

    // 引力（接続されたノード間）
    wires.forEach(wire => {
      const pos1 = positions[wire.sourceObjectId]
      const pos2 = positions[wire.targetObjectId]
      if (!pos1 || !pos2) return

      const dx = pos2.x - pos1.x
      const dy = pos2.y - pos1.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1

      const attraction = distance * 0.01
      forces[wire.sourceObjectId].x += (dx / distance) * attraction
      forces[wire.sourceObjectId].y += (dy / distance) * attraction
      forces[wire.targetObjectId].x -= (dx / distance) * attraction
      forces[wire.targetObjectId].y -= (dy / distance) * attraction
    })

    // 位置を更新
    objects.forEach(obj => {
      positions[obj.id].x += forces[obj.id].x
      positions[obj.id].y += forces[obj.id].y
    })
  }

  return { positions }
}

// 力学レイアウト（同期版）
export function forceLayout(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): LayoutResult {
  const { spacing, padding } = options
  const positions: Record<string, { x: number; y: number }> = {}

  // 初期位置をランダムに設定
  objects.forEach((obj, index) => {
    const angle = (index / objects.length) * 2 * Math.PI
    const radius = 200
    positions[obj.id] = {
      x: padding + 300 + Math.cos(angle) * radius,
      y: padding + 300 + Math.sin(angle) * radius
    }
  })

  // 簡易的な力学シミュレーション
  for (let iteration = 0; iteration < 50; iteration++) {
    const forces: Record<string, { x: number; y: number }> = {}

    // 初期化
    objects.forEach(obj => {
      forces[obj.id] = { x: 0, y: 0 }
    })

    // 反発力（ノード間）
    objects.forEach(obj1 => {
      objects.forEach(obj2 => {
        if (obj1.id === obj2.id) return

        const pos1 = positions[obj1.id]
        const pos2 = positions[obj2.id]
        const dx = pos1.x - pos2.x
        const dy = pos1.y - pos2.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const repulsion = spacing * spacing / distance
        forces[obj1.id].x += (dx / distance) * repulsion * 0.1
        forces[obj1.id].y += (dy / distance) * repulsion * 0.1
      })
    })

    // 引力（接続されたノード間）
    wires.forEach(wire => {
      const pos1 = positions[wire.sourceObjectId]
      const pos2 = positions[wire.targetObjectId]
      if (!pos1 || !pos2) return

      const dx = pos2.x - pos1.x
      const dy = pos2.y - pos1.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1

      const attraction = distance * 0.01
      forces[wire.sourceObjectId].x += (dx / distance) * attraction
      forces[wire.sourceObjectId].y += (dy / distance) * attraction
      forces[wire.targetObjectId].x -= (dx / distance) * attraction
      forces[wire.targetObjectId].y -= (dy / distance) * attraction
    })

    // 位置を更新
    objects.forEach(obj => {
      positions[obj.id].x += forces[obj.id].x
      positions[obj.id].y += forces[obj.id].y
    })
  }

  return { positions }
}

// 円形レイアウト
export function circularLayout(
  objects: EquipmentObject[],
  options: LayoutOptions
): LayoutResult {
  const { padding } = options
  const positions: Record<string, { x: number; y: number }> = {}

  const centerX = 400
  const centerY = 300
  const radius = Math.max(150, objects.length * 20)

  objects.forEach((obj, index) => {
    const angle = (index / objects.length) * 2 * Math.PI
    positions[obj.id] = {
      x: padding + centerX + Math.cos(angle) * radius,
      y: padding + centerY + Math.sin(angle) * radius
    }
  })

  return { positions }
}

// スマートレイアウト（設備配線図に特化）- 非同期版
export async function smartLayoutAsync(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions,
  onProgress?: (progress: LayoutProgress) => void,
  cancelToken?: LayoutCancelToken
): Promise<LayoutResult> {
  const reportProgress = (progress: LayoutProgress) => {
    if (onProgress) {
      onProgress(progress)
    }
  }

  const { spacing, padding } = options
  const positions: Record<string, { x: number; y: number }> = {}

  // 1. 初期配置：階層レイアウトまたは水平グリッドレイアウト
  reportProgress({ stage: '初期配置', progress: 20, message: '初期配置を計算中...' })
  await new Promise(resolve => setTimeout(resolve, 30))
  
  if (wires.length > 0) {
    // 接続がある場合は階層レイアウト
    const hierarchicalResult = hierarchicalLayout(objects, wires, { ...options, direction: 'horizontal' })
    Object.assign(positions, hierarchicalResult.positions)
  } else {
    // 接続がない場合は水平グリッドレイアウト（Y方向を最小限に）
    const gridResult = horizontalGridLayout(objects, { spacing, padding })
    Object.assign(positions, gridResult.positions)
  }

  // 2. ポート位置を考慮した配置最適化
  reportProgress({ stage: 'ポート最適化', progress: 40, message: 'ポート位置を考慮した配置を最適化中...' })
  await optimizePortBasedLayoutAsync(positions, objects, wires, options, (progress) => {
    reportProgress({ stage: 'ポート最適化', progress: 40 + Math.floor(progress * 0.1), message: `ポート最適化中... ${Math.floor(progress)}%` })
  })

  // 3. 接続の長さを最小化（グローバル最適化）
  reportProgress({ stage: '接続長最適化', progress: 50, message: '接続の長さを最小化中...' })
  await minimizeConnectionLengthsAsync(positions, objects, wires, options, (progress) => {
    reportProgress({ stage: '接続長最適化', progress: 50 + Math.floor(progress * 0.1), message: `接続長最適化中... ${Math.floor(progress)}%` })
  })

  // 4. 配線の交差を最小化
  if (options.minimizeCrossings) {
    reportProgress({ stage: '交差最小化', progress: 70, message: '配線の交差を最小化中...' })
    await new Promise(resolve => setTimeout(resolve, 50))
    minimizeWireCrossings(positions, objects, wires, {})
  }

  // 5. 接続の方向性を考慮した配置調整
  reportProgress({ stage: '方向性最適化', progress: 80, message: '接続の方向性を考慮した配置を調整中...' })
  await new Promise(resolve => setTimeout(resolve, 30))
  optimizeConnectionDirection(positions, objects, wires, options)

  // 6. 機材同士の重複を回避
  reportProgress({ stage: '重複回避', progress: 85, message: '機材の重複を回避中...' })
  await new Promise(resolve => setTimeout(resolve, 30))
  resolveNodeOverlaps(positions, objects, options)

  // 7. 配線と機材の重複を回避
  if (options.avoidNodeOverlap) {
    reportProgress({ stage: '配線最適化', progress: 90, message: '配線と機材の重複を回避中...' })
    await new Promise(resolve => setTimeout(resolve, 50))
    optimizeWireRouting(positions, objects, wires, options)
  }

  // 8. 最終的な力学的調整（全体のバランス、Y方向の整列を強化）
  reportProgress({ stage: '力学的調整', progress: 85, message: '全体のバランスを調整中...' })
  await applyGlobalForceLayoutWithHorizontalAlignmentAsync(positions, objects, wires, options, (progress) => {
    reportProgress({ stage: '力学的調整', progress: 85 + Math.floor(progress * 0.1), message: `力学的調整中... ${Math.floor(progress)}%` })
  })

  // 9. 視覚的な階層の改善（重心調整）
  reportProgress({ stage: '視覚階層改善', progress: 98, message: '視覚的な階層を改善中...' })
  await new Promise(resolve => setTimeout(resolve, 30))
  improveVisualHierarchy(positions, objects, wires, options)

  return { positions }
}

// スマートレイアウト（設備配線図に特化）- 同期版（後方互換性）
export function smartLayout(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): LayoutResult {
  const { spacing, padding } = options
  const positions: Record<string, { x: number; y: number }> = {}

  // 1. 初期配置：階層レイアウトまたは水平グリッドレイアウト
  if (wires.length > 0) {
    // 接続がある場合は階層レイアウト
    const hierarchicalResult = hierarchicalLayout(objects, wires, { ...options, direction: 'horizontal' })
    Object.assign(positions, hierarchicalResult.positions)
  } else {
    // 接続がない場合は水平グリッドレイアウト（Y方向を最小限に）
    const gridResult = horizontalGridLayout(objects, { spacing, padding })
    Object.assign(positions, gridResult.positions)
  }

  // 2. ポート位置を考慮した配置最適化
  optimizePortBasedLayout(positions, objects, wires, options)

  // 3. 接続の長さを最小化（グローバル最適化）
  minimizeConnectionLengths(positions, objects, wires, options)

  // 4. 配線の交差を最小化
  if (options.minimizeCrossings) {
    minimizeWireCrossings(positions, objects, wires, {})
  }

  // 5. 接続の方向性を考慮した配置調整
  optimizeConnectionDirection(positions, objects, wires, options)

  // 6. 機材同士の重複を回避
  resolveNodeOverlaps(positions, objects, options)

  // 7. 配線と機材の重複を回避
  if (options.avoidNodeOverlap) {
    optimizeWireRouting(positions, objects, wires, options)
  }

  // 8. 最終的な力学的調整（全体のバランス、Y方向の整列を強化）
  applyGlobalForceLayoutWithHorizontalAlignment(positions, objects, wires, options)

  // 9. 視覚的な階層の改善（重心調整）
  improveVisualHierarchy(positions, objects, wires, options)

  return { positions }
}

// Helper function: Optimize group order based on connections
function optimizeGroupOrder(
  groups: Record<string, EquipmentObject[]>,
  wires: Wire[],
  groupImportance: Record<string, number>
): string[] {
  // グループ間の接続マトリックスを構築
  const groupConnections: Record<string, Record<string, number>> = {}
  const groupNames = Object.keys(groups)

  groupNames.forEach(sourceGroup => {
    groupConnections[sourceGroup] = {}
    groupNames.forEach(targetGroup => {
      groupConnections[sourceGroup][targetGroup] = 0
    })
  })

  // 接続数をカウント
  wires.forEach(wire => {
    const sourceGroup = findGroupForObject(wire.sourceObjectId, groups)
    const targetGroup = findGroupForObject(wire.targetObjectId, groups)
    
    if (sourceGroup && targetGroup && sourceGroup !== targetGroup) {
      groupConnections[sourceGroup][targetGroup]++
    }
  })

  // 接続密度に基づいてグループをソート
  // 接続が多いグループ同士を近くに配置
  const sortedGroups: string[] = []
  const used = new Set<string>()

  // 最初のグループ：最も重要度が高いもの
  let current = groupNames.reduce((max, name) => 
    (groupImportance[name] || 0) > (groupImportance[max] || 0) ? name : max, groupNames[0]
  )
  sortedGroups.push(current)
  used.add(current)

  // 残りのグループを接続密度に基づいて追加
  while (sortedGroups.length < groupNames.length) {
    let bestNext: string | null = null
    let bestScore = -1

    groupNames.forEach(candidate => {
      if (used.has(candidate)) return

      // 現在のグループとの接続数をスコアとして使用
      const score = groupConnections[current][candidate] + groupConnections[candidate][current]
      if (score > bestScore) {
        bestScore = score
        bestNext = candidate
      }
    })

    if (bestNext) {
      sortedGroups.push(bestNext)
      used.add(bestNext)
      current = bestNext
    } else {
      // 接続がない場合は重要度順
      const remaining = groupNames.filter(name => !used.has(name))
      if (remaining.length > 0) {
        const next = remaining.reduce((max, name) =>
          (groupImportance[name] || 0) > (groupImportance[max] || 0) ? name : max, remaining[0]
        )
        sortedGroups.push(next)
        used.add(next)
        current = next
      }
    }
  }

  return sortedGroups
}

// Helper function: Find group for an object
function findGroupForObject(
  objectId: string,
  groups: Record<string, EquipmentObject[]>
): string | null {
  for (const [groupName, objects] of Object.entries(groups)) {
    if (objects.some(obj => obj.id === objectId)) {
      return groupName
    }
  }
  return null
}

// Helper function: Arrange groups in a 2D grid
function arrangeGroupsInGrid(
  groupOrder: string[],
  groups: Record<string, EquipmentObject[]>,
  wires: Wire[],
  options: LayoutOptions
): Array<{ groupName: string; groupObjects: EquipmentObject[]; gridX: number; gridY: number }> {
  const { spacing } = options
  const result: Array<{ groupName: string; groupObjects: EquipmentObject[]; gridX: number; gridY: number }> = []

  // グループ間の接続を分析
  const groupConnections: Record<string, Record<string, number>> = {}
  groupOrder.forEach(sourceGroup => {
    groupConnections[sourceGroup] = {}
    groupOrder.forEach(targetGroup => {
      if (sourceGroup === targetGroup) return
      groupConnections[sourceGroup][targetGroup] = 0
    })
  })

  wires.forEach(wire => {
    const sourceGroup = findGroupForObject(wire.sourceObjectId, groups)
    const targetGroup = findGroupForObject(wire.targetObjectId, groups)
    if (sourceGroup && targetGroup && sourceGroup !== targetGroup) {
      groupConnections[sourceGroup][targetGroup]++
    }
  })

  // 2次元グリッドに配置（接続が多いグループ同士を近くに）
  const gridSize = Math.ceil(Math.sqrt(groupOrder.length))
  const grid: Array<Array<string | null>> = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null))
  const groupPositions: Record<string, { x: number; y: number }> = {}

  // 最初のグループを中央に配置
  const center = Math.floor(gridSize / 2)
  grid[center][center] = groupOrder[0]
  groupPositions[groupOrder[0]] = { x: center, y: center }

  // 残りのグループを接続に基づいて配置
  for (let i = 1; i < groupOrder.length; i++) {
    const currentGroup = groupOrder[i]
    let bestX = -1
    let bestY = -1
    let bestScore = -Infinity

    // 空いているグリッド位置を探す
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (grid[y][x] !== null) continue

        // 既に配置されたグループとの接続数をスコアとして計算
        let score = 0
        Object.entries(groupPositions).forEach(([placedGroup, pos]) => {
          const connections = (groupConnections[currentGroup]?.[placedGroup] || 0) +
                             (groupConnections[placedGroup]?.[currentGroup] || 0)
          const distance = Math.abs(x - pos.x) + Math.abs(y - pos.y)
          score += connections / (distance + 1) // 距離が近いほど高スコア
        })

        if (score > bestScore) {
          bestScore = score
          bestX = x
          bestY = y
        }
      }
    }

    if (bestX >= 0 && bestY >= 0) {
      grid[bestY][bestX] = currentGroup
      groupPositions[currentGroup] = { x: bestX, y: bestY }
    }
  }

  // 結果を構築
  groupOrder.forEach(groupName => {
    const pos = groupPositions[groupName]
    if (pos) {
      result.push({
        groupName,
        groupObjects: groups[groupName],
        gridX: pos.x,
        gridY: pos.y
      })
    }
  })

  return result
}

// 信号フローレイアウト（非同期版）
export async function signalFlowLayoutAsync(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions,
  onProgress?: (progress: LayoutProgress) => void,
  cancelToken?: LayoutCancelToken
): Promise<LayoutResult> {
  if (onProgress) {
    onProgress({ stage: '信号フロー分析', progress: 30, message: '信号フローを分析中...' })
    await new Promise(resolve => setTimeout(resolve, 30))
    onProgress({ stage: '信号フロー配置', progress: 70, message: '信号フローに沿って配置中...' })
    await new Promise(resolve => setTimeout(resolve, 30))
  }
  return signalFlowLayout(objects, wires, options)
}

// 信号フローレイアウト（信号の流れに沿った配置）
export function signalFlowLayout(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): LayoutResult {
  const { spacing, padding, direction = 'horizontal' } = options
  const positions: Record<string, { x: number; y: number }> = {}

  // 1. 信号フローの分析
  const flowAnalysis = analyzeSignalFlow(objects, wires)

  // 2. 入力→処理→出力の順序で配置
  const layers = [
    flowAnalysis.inputs,
    ...flowAnalysis.processors,
    flowAnalysis.outputs
  ].filter(layer => layer.length > 0)

  // 3. 各レイヤーを配置
  layers.forEach((layer, layerIndex) => {
    layer.forEach((objId, objIndex) => {
      const obj = objects.find(o => o.id === objId)
      if (!obj) return

      const renderComponent = getRenderComponent(obj)
      const width = renderComponent?.data.size.width || 100
      const height = renderComponent?.data.size.height || 60

      if (direction === 'horizontal') {
        positions[objId] = {
          x: padding + layerIndex * (width + spacing * 3),
          y: padding + objIndex * (height + spacing)
        }
      } else {
        positions[objId] = {
          x: padding + objIndex * (width + spacing),
          y: padding + layerIndex * (height + spacing * 3)
        }
      }
    })
  })

  return { positions }
}

// 遺伝的アルゴリズム用の型定義
interface Individual {
  positions: Record<string, { x: number; y: number }>
  fitness: number
}

// 遺伝的アルゴリズムレイアウト（非同期版）
export async function geneticLayoutAsync(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions,
  onProgress?: (progress: LayoutProgress) => void,
  cancelToken?: LayoutCancelToken
): Promise<LayoutResult> {
  const reportProgress = (progress: LayoutProgress) => {
    if (onProgress) {
      onProgress(progress)
    }
  }

  const populationSize = options.populationSize || 50
  const generations = options.generations || 100
  const mutationRate = options.mutationRate || 0.1
  const crossoverRate = options.crossoverRate || 0.8
  const { spacing, padding } = options

  // 初期集団の生成
  reportProgress({ stage: '初期集団生成', progress: 5, message: '初期集団を生成中...' })
  await new Promise(resolve => setTimeout(resolve, 10))
  
  // キャンセルチェック
  if (cancelToken?.signal.aborted) {
    throw new Error('レイアウト処理がキャンセルされました')
  }

  let population: Individual[] = []
  
  // 境界を計算（初期集団生成の前に計算）
  const bounds = calculateGeneticBounds(objects, spacing, padding)
  
  // 既存のレイアウトから初期集団を生成（多様性を確保）
  const initialLayouts = [
    gridLayout(objects, options),
    hierarchicalLayout(objects, wires, { ...options, direction: 'horizontal' }),
    circularLayout(objects, options)
  ]
  
  // キャンセルチェック
  if (cancelToken?.signal.aborted) {
    throw new Error('レイアウト処理がキャンセルされました')
  }

  // 各初期レイアウトから個体を生成（ランダムな変動を加えて多様性を確保）
  initialLayouts.forEach((layout, index) => {
    // キャンセルチェック（各レイアウト処理の後）
    if (cancelToken?.signal.aborted) {
      throw new Error('レイアウト処理がキャンセルされました')
    }
    const positions: Record<string, { x: number; y: number }> = {}
    objects.forEach(obj => {
      const originalPos = layout.positions[obj.id]
      if (originalPos) {
        // 元の位置にランダムな変動を加える（±20%の範囲）
        const variationX = (bounds.maxX - bounds.minX) * 0.2
        const variationY = (bounds.maxY - bounds.minY) * 0.2
        positions[obj.id] = {
          x: Math.max(padding, Math.min(bounds.maxX, originalPos.x + (Math.random() - 0.5) * variationX)),
          y: Math.max(padding, Math.min(bounds.maxY, originalPos.y + (Math.random() - 0.5) * variationY))
        }
      } else {
        positions[obj.id] = {
          x: padding + Math.random() * (bounds.maxX - bounds.minX),
          y: padding + Math.random() * (bounds.maxY - bounds.minY)
        }
      }
    })
    // 重複を解消してから個体を追加
    resolveNodeOverlaps(positions, objects, options)
    population.push({ positions, fitness: 0 })
  })

  // 残りをランダムに生成（より広い範囲で多様性を確保）
  for (let i = initialLayouts.length; i < populationSize; i++) {
    // キャンセルチェック（定期的に）
    if (i % 10 === 0 && cancelToken?.signal.aborted) {
      throw new Error('レイアウト処理がキャンセルされました')
    }
    
    const positions: Record<string, { x: number; y: number }> = {}
    objects.forEach(obj => {
      // より広い範囲でランダム生成
      positions[obj.id] = {
        x: padding + Math.random() * (bounds.maxX - bounds.minX) * 1.5,
        y: padding + Math.random() * (bounds.maxY - bounds.minY) * 1.5
      }
    })
    // 重複を解消してから個体を追加
    resolveNodeOverlaps(positions, objects, options)
    population.push({ positions, fitness: 0 })
  }

  // 各世代で進化
  let bestIndividual: Individual | null = null
  for (let generation = 0; generation < generations; generation++) {
    // キャンセルチェック
    if (cancelToken?.signal.aborted) {
      throw new Error('レイアウト処理がキャンセルされました')
    }

    // 適応度を計算（キャンセルチェックを定期的に実行）
    population.forEach((individual, index) => {
      // 10個ごとにキャンセルチェック
      if (index % 10 === 0 && cancelToken?.signal.aborted) {
        throw new Error('レイアウト処理がキャンセルされました')
      }
      individual.fitness = calculateFitness(individual.positions, objects, wires, options)
    })

    // 適応度でソート（高い順）
    population.sort((a, b) => b.fitness - a.fitness)

    // 最良個体を記録
    if (!bestIndividual || population[0].fitness > bestIndividual.fitness) {
      bestIndividual = { ...population[0] }
    }

    // 進捗を報告（最優秀個体の配置も含める）
    const progress = 5 + Math.floor((generation / generations) * 90)
    reportProgress({
      stage: '遺伝的アルゴリズム',
      progress,
      message: `世代 ${generation + 1}/${generations} (適応度: ${bestIndividual.fitness.toFixed(2)})`,
      positions: { ...bestIndividual.positions } // 最優秀個体の配置をリアルタイム表示
    })
    
    // キャンセルチェック（進捗報告後）
    if (cancelToken?.signal.aborted) {
      throw new Error('レイアウト処理がキャンセルされました')
    }
    
    await new Promise(resolve => setTimeout(resolve, 20))
    
    // キャンセルチェック（待機後）
    if (cancelToken?.signal.aborted) {
      throw new Error('レイアウト処理がキャンセルされました')
    }

    // 最後の世代でなければ進化
    if (generation < generations - 1) {
      const newPopulation: Individual[] = []

      // エリート選択：上位5%をそのまま残す（10%から減らしてランダム性を増やす）
      const eliteCount = Math.floor(populationSize * 0.05)
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push({ ...population[i] })
      }

      // 残りを交叉と突然変異で生成
      while (newPopulation.length < populationSize) {
        // キャンセルチェック（定期的に）
        if (newPopulation.length % 10 === 0 && cancelToken?.signal.aborted) {
          throw new Error('レイアウト処理がキャンセルされました')
        }
        
        // トーナメント選択で親を選ぶ（トーナメントサイズをランダムにして多様性を増やす）
        const tournamentSize = 2 + Math.floor(Math.random() * 4) // 2-5のランダム
        const parent1 = tournamentSelection(population, tournamentSize)
        const parent2 = tournamentSelection(population, tournamentSize)

        // 交叉
        let child: Individual
        if (Math.random() < crossoverRate) {
          child = crossover(parent1, parent2, objects)
        } else {
          // 親をそのままコピーする場合も、少しランダムな変動を加える
          child = { ...parent1 }
          if (Math.random() < 0.3) { // 30%の確率で軽い変動
            const variationX = spacing * 0.1
            const variationY = spacing * 0.1
            const randomObj = objects[Math.floor(Math.random() * objects.length)]
            child.positions[randomObj.id] = {
              x: Math.max(padding, Math.min(bounds.maxX, child.positions[randomObj.id].x + (Math.random() - 0.5) * variationX * 2)),
              y: Math.max(padding, Math.min(bounds.maxY, child.positions[randomObj.id].y + (Math.random() - 0.5) * variationY * 2))
            }
          }
        }

        // 突然変異（より多様な突然変異を適用）
        if (Math.random() < mutationRate) {
          mutate(child, objects, bounds, spacing, padding)
        }

        // 重複を解消してから個体を追加
        resolveNodeOverlaps(child.positions, objects, options)
        newPopulation.push(child)
      }

      // 多様性を維持するため、ランダムな個体を追加（5%）
      const randomIndividualCount = Math.floor(populationSize * 0.05)
      for (let i = 0; i < randomIndividualCount && newPopulation.length < populationSize; i++) {
        // キャンセルチェック
        if (cancelToken?.signal.aborted) {
          throw new Error('レイアウト処理がキャンセルされました')
        }
        
        const positions: Record<string, { x: number; y: number }> = {}
        objects.forEach(obj => {
          positions[obj.id] = {
            x: padding + Math.random() * (bounds.maxX - bounds.minX) * 1.5,
            y: padding + Math.random() * (bounds.maxY - bounds.minY) * 1.5
          }
        })
        // 重複を解消してから個体を追加
        resolveNodeOverlaps(positions, objects, options)
        newPopulation.push({ positions, fitness: 0 })
      }

      population = newPopulation
    }
  }

  reportProgress({ stage: '完了', progress: 100, message: '遺伝的アルゴリズムが完了しました' })
  return { positions: bestIndividual?.positions || population[0].positions }
}

// 適応度関数：レイアウトの品質を評価
export function calculateFitness(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): number {
  let fitness = 0
  const { spacing } = options

  // 1. 接続の長さを最小化（ポート位置を考慮）
  let totalConnectionLength = 0
  wires.forEach(wire => {
    const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
    const targetObj = objects.find(o => o.id === wire.targetObjectId)
    if (!sourceObj || !targetObj) return

    const sourcePos = positions[wire.sourceObjectId]
    const targetPos = positions[wire.targetObjectId]
    if (!sourcePos || !targetPos) return

    const render1 = getRenderComponent(sourceObj)
    const render2 = getRenderComponent(targetObj)
    const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
    const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

    const sourcePorts = getConnectionPortComponents(sourceObj)
    const targetPorts = getConnectionPortComponents(targetObj)
    const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
    const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

    let distance: number
    if (sourcePort && targetPort) {
      const port1Pos = calculatePortPosition(sourcePos, size1, sourcePort.data.position)
      const port2Pos = calculatePortPosition(targetPos, size2, targetPort.data.position)
      const dx = port2Pos.x - port1Pos.x
      const dy = port2Pos.y - port1Pos.y
      distance = Math.sqrt(dx * dx + dy * dy)
    } else {
      const center1 = { x: sourcePos.x + size1.width / 2, y: sourcePos.y + size1.height / 2 }
      const center2 = { x: targetPos.x + size2.width / 2, y: targetPos.y + size2.height / 2 }
      const dx = center2.x - center1.x
      const dy = center2.y - center1.y
      distance = Math.sqrt(dx * dx + dy * dy)
    }
    totalConnectionLength += distance
  })
  // 接続の長さが短いほど良い（負の値として扱う）
  fitness -= totalConnectionLength * 0.1

  // 2. 重複をペナルティ（同じペアを2回カウントしないように改善）
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const obj1 = objects[i]
      const obj2 = objects[j]
      const pos1 = positions[obj1.id]
      const pos2 = positions[obj2.id]
      if (!pos1 || !pos2) continue

      const render1 = getRenderComponent(obj1)
      const render2 = getRenderComponent(obj2)
      const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
      const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

      const overlap = calculateOverlap(pos1, size1, pos2, size2)
      if (overlap > 0) {
        fitness -= overlap * 100 // 重複は大きなペナルティ
      }
    }
  }

  // 3. 配線の交差をペナルティ（常に考慮）
  const crossings = countWireCrossings(positions, objects, wires)
  fitness -= crossings * 50

  // 3.5. エッジと機材の交差をペナルティ
  const wireEquipmentIntersections = countWireEquipmentIntersections(positions, objects, wires)
  fitness -= wireEquipmentIntersections * 80 // 機材との交差は大きなペナルティ

  // 4. ポートの辺配置に基づく配置制約（ボーナス）
  wires.forEach(wire => {
    const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
    const targetObj = objects.find(o => o.id === wire.targetObjectId)
    if (!sourceObj || !targetObj) return

    const sourcePos = positions[wire.sourceObjectId]
    const targetPos = positions[wire.targetObjectId]
    if (!sourcePos || !targetPos) return

    const sourcePorts = getConnectionPortComponents(sourceObj)
    const targetPorts = getConnectionPortComponents(targetObj)
    const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
    const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

    if (sourcePort && targetPort) {
      const sourceSide = sourcePort.data.position.side
      const targetSide = targetPort.data.position.side
      const render1 = getRenderComponent(sourceObj)
      const render2 = getRenderComponent(targetObj)
      const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
      const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

      const sourceCenterX = sourcePos.x + size1.width / 2
      const targetCenterX = targetPos.x + size2.width / 2
      const sourceCenterY = sourcePos.y + size1.height / 2
      const targetCenterY = targetPos.y + size2.height / 2

      // 配置制約が満たされている場合にボーナス
      if ((sourceSide === Side.RIGHT && targetSide === Side.LEFT && sourceCenterX < targetCenterX) ||
          (sourceSide === Side.LEFT && targetSide === Side.RIGHT && sourceCenterX < targetCenterX) ||
          (sourceSide === Side.BOTTOM && targetSide === Side.TOP && sourceCenterY > targetCenterY) ||
          (sourceSide === Side.TOP && targetSide === Side.BOTTOM && sourceCenterY < targetCenterY)) {
        fitness += 10 // ボーナス
      }
    }
  })

  // 5. 折れ曲がり開始点よりも近い接続のペナルティ
  // 折れ曲がり開始点までの距離（offset）は20pxなので、接続距離が40px未満の場合、線が折れ曲がって汚くなる
  const minBendDistance = 40 // 折れ曲がり開始点までの距離 * 2
  wires.forEach(wire => {
    const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
    const targetObj = objects.find(o => o.id === wire.targetObjectId)
    if (!sourceObj || !targetObj) return

    const sourcePos = positions[wire.sourceObjectId]
    const targetPos = positions[wire.targetObjectId]
    if (!sourcePos || !targetPos) return

    const render1 = getRenderComponent(sourceObj)
    const render2 = getRenderComponent(targetObj)
    const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
    const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

    const sourcePorts = getConnectionPortComponents(sourceObj)
    const targetPorts = getConnectionPortComponents(targetObj)
    const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
    const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

    let distance: number
    if (sourcePort && targetPort) {
      const port1Pos = calculatePortPosition(sourcePos, size1, sourcePort.data.position)
      const port2Pos = calculatePortPosition(targetPos, size2, targetPort.data.position)
      const dx = port2Pos.x - port1Pos.x
      const dy = port2Pos.y - port1Pos.y
      distance = Math.sqrt(dx * dx + dy * dy)
    } else {
      const center1 = { x: sourcePos.x + size1.width / 2, y: sourcePos.y + size1.height / 2 }
      const center2 = { x: targetPos.x + size2.width / 2, y: targetPos.y + size2.height / 2 }
      const dx = center2.x - center1.x
      const dy = center2.y - center1.y
      distance = Math.sqrt(dx * dx + dy * dy)
    }

    // 距離が近すぎる場合、ペナルティを追加（距離が近いほど大きなペナルティ）
    if (distance < minBendDistance) {
      const penalty = (minBendDistance - distance) * 5 // 距離が近いほど大きなペナルティ
      fitness -= penalty
    }
  })

  return fitness
}

// 評価スコアの詳細情報を返す
export interface FitnessDetails {
  totalScore: number
  connectionLength: {
    total: number
    penalty: number
  }
  overlaps: {
    count: number
    totalOverlap: number
    penalty: number
  }
  wireCrossings: {
    count: number
    penalty: number
  }
  wireEquipmentIntersections: {
    count: number
    penalty: number
  }
  portAlignment: {
    satisfied: number
    total: number
    bonus: number
  }
  tooCloseConnections: {
    count: number
    totalPenalty: number
  }
}

export function calculateFitnessDetails(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): FitnessDetails {
  let totalScore = 0
  const { spacing } = options

  // 1. 接続の長さを最小化（ポート位置を考慮）
  let totalConnectionLength = 0
  wires.forEach(wire => {
    const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
    const targetObj = objects.find(o => o.id === wire.targetObjectId)
    if (!sourceObj || !targetObj) return

    const sourcePos = positions[wire.sourceObjectId]
    const targetPos = positions[wire.targetObjectId]
    if (!sourcePos || !targetPos) return

    const render1 = getRenderComponent(sourceObj)
    const render2 = getRenderComponent(targetObj)
    const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
    const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

    const sourcePorts = getConnectionPortComponents(sourceObj)
    const targetPorts = getConnectionPortComponents(targetObj)
    const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
    const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

    let distance: number
    if (sourcePort && targetPort) {
      const port1Pos = calculatePortPosition(sourcePos, size1, sourcePort.data.position)
      const port2Pos = calculatePortPosition(targetPos, size2, targetPort.data.position)
      const dx = port2Pos.x - port1Pos.x
      const dy = port2Pos.y - port1Pos.y
      distance = Math.sqrt(dx * dx + dy * dy)
    } else {
      const center1 = { x: sourcePos.x + size1.width / 2, y: sourcePos.y + size1.height / 2 }
      const center2 = { x: targetPos.x + size2.width / 2, y: targetPos.y + size2.height / 2 }
      const dx = center2.x - center1.x
      const dy = center2.y - center1.y
      distance = Math.sqrt(dx * dx + dy * dy)
    }
    totalConnectionLength += distance
  })
  const connectionLengthPenalty = totalConnectionLength * 0.1
  totalScore -= connectionLengthPenalty

  // 2. 重複をペナルティ
  let overlapCount = 0
  let totalOverlap = 0
  objects.forEach(obj1 => {
    objects.forEach(obj2 => {
      if (obj1.id === obj2.id) return
      const pos1 = positions[obj1.id]
      const pos2 = positions[obj2.id]
      if (!pos1 || !pos2) return

      const render1 = getRenderComponent(obj1)
      const render2 = getRenderComponent(obj2)
      const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
      const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

      const overlap = calculateOverlap(pos1, size1, pos2, size2)
      if (overlap > 0) {
        overlapCount++
        totalOverlap += overlap
        totalScore -= overlap * 100
      }
    })
  })
  const overlapPenalty = totalOverlap * 100

  // 3. 配線の交差をペナルティ（常に考慮）
  const crossings = countWireCrossings(positions, objects, wires)
  const crossingsPenalty = crossings * 50
  totalScore -= crossingsPenalty

  // 3.5. エッジと機材の交差をペナルティ
  const wireEquipmentIntersections = countWireEquipmentIntersections(positions, objects, wires)
  const wireEquipmentPenalty = wireEquipmentIntersections * 80
  totalScore -= wireEquipmentPenalty

  // 4. ポートの辺配置に基づく配置制約（ボーナス）
  let satisfiedConstraints = 0
  let totalConstraints = 0
  wires.forEach(wire => {
    const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
    const targetObj = objects.find(o => o.id === wire.targetObjectId)
    if (!sourceObj || !targetObj) return

    const sourcePos = positions[wire.sourceObjectId]
    const targetPos = positions[wire.targetObjectId]
    if (!sourcePos || !targetPos) return

    const sourcePorts = getConnectionPortComponents(sourceObj)
    const targetPorts = getConnectionPortComponents(targetObj)
    const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
    const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

    if (sourcePort && targetPort) {
      totalConstraints++
      const sourceSide = sourcePort.data.position.side
      const targetSide = targetPort.data.position.side
      const render1 = getRenderComponent(sourceObj)
      const render2 = getRenderComponent(targetObj)
      const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
      const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

      const sourceCenterX = sourcePos.x + size1.width / 2
      const targetCenterX = targetPos.x + size2.width / 2
      const sourceCenterY = sourcePos.y + size1.height / 2
      const targetCenterY = targetPos.y + size2.height / 2

      // 配置制約が満たされている場合にボーナス
      if ((sourceSide === Side.RIGHT && targetSide === Side.LEFT && sourceCenterX < targetCenterX) ||
          (sourceSide === Side.LEFT && targetSide === Side.RIGHT && sourceCenterX < targetCenterX) ||
          (sourceSide === Side.BOTTOM && targetSide === Side.TOP && sourceCenterY > targetCenterY) ||
          (sourceSide === Side.TOP && targetSide === Side.BOTTOM && sourceCenterY < targetCenterY)) {
        satisfiedConstraints++
        totalScore += 10
      }
    }
  })
  const portAlignmentBonus = satisfiedConstraints * 10

  // 5. 折れ曲がり開始点よりも近い接続のペナルティ
  const minBendDistance = 40 // 折れ曲がり開始点までの距離 * 2
  let tooCloseCount = 0
  let tooClosePenalty = 0
  wires.forEach(wire => {
    const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
    const targetObj = objects.find(o => o.id === wire.targetObjectId)
    if (!sourceObj || !targetObj) return

    const sourcePos = positions[wire.sourceObjectId]
    const targetPos = positions[wire.targetObjectId]
    if (!sourcePos || !targetPos) return

    const render1 = getRenderComponent(sourceObj)
    const render2 = getRenderComponent(targetObj)
    const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
    const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

    const sourcePorts = getConnectionPortComponents(sourceObj)
    const targetPorts = getConnectionPortComponents(targetObj)
    const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
    const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

    let distance: number
    if (sourcePort && targetPort) {
      const port1Pos = calculatePortPosition(sourcePos, size1, sourcePort.data.position)
      const port2Pos = calculatePortPosition(targetPos, size2, targetPort.data.position)
      const dx = port2Pos.x - port1Pos.x
      const dy = port2Pos.y - port1Pos.y
      distance = Math.sqrt(dx * dx + dy * dy)
    } else {
      const center1 = { x: sourcePos.x + size1.width / 2, y: sourcePos.y + size1.height / 2 }
      const center2 = { x: targetPos.x + size2.width / 2, y: targetPos.y + size2.height / 2 }
      const dx = center2.x - center1.x
      const dy = center2.y - center1.y
      distance = Math.sqrt(dx * dx + dy * dy)
    }

    // 距離が近すぎる場合、ペナルティを追加
    if (distance < minBendDistance) {
      tooCloseCount++
      const penalty = (minBendDistance - distance) * 5
      tooClosePenalty += penalty
      totalScore -= penalty
    }
  })

  return {
    totalScore,
    connectionLength: {
      total: totalConnectionLength,
      penalty: connectionLengthPenalty
    },
    overlaps: {
      count: overlapCount,
      totalOverlap,
      penalty: overlapPenalty
    },
    wireCrossings: {
      count: crossings,
      penalty: crossingsPenalty
    },
    wireEquipmentIntersections: {
      count: wireEquipmentIntersections,
      penalty: wireEquipmentPenalty
    },
    portAlignment: {
      satisfied: satisfiedConstraints,
      total: totalConstraints,
      bonus: portAlignmentBonus
    },
    tooCloseConnections: {
      count: tooCloseCount,
      totalPenalty: tooClosePenalty
    }
  }
}

// トーナメント選択
function tournamentSelection(population: Individual[], tournamentSize: number): Individual {
  const tournament: Individual[] = []
  for (let i = 0; i < tournamentSize; i++) {
    const randomIndex = Math.floor(Math.random() * population.length)
    tournament.push(population[randomIndex])
  }
  tournament.sort((a, b) => b.fitness - a.fitness)
  return tournament[0]
}

// 交叉（一様交叉と算術交叉の混合）
function crossover(parent1: Individual, parent2: Individual, objects: EquipmentObject[]): Individual {
  const positions: Record<string, { x: number; y: number }> = {}
  const crossoverType = Math.random()
  
  if (crossoverType < 0.5) {
    // 一様交叉（50%の確率）
    objects.forEach(obj => {
      if (Math.random() < 0.5) {
        positions[obj.id] = { ...parent1.positions[obj.id] }
      } else {
        positions[obj.id] = { ...parent2.positions[obj.id] }
      }
    })
  } else {
    // 算術交叉（50%の確率）- 親の位置の平均を取る
    objects.forEach(obj => {
      const pos1 = parent1.positions[obj.id]
      const pos2 = parent2.positions[obj.id]
      const alpha = Math.random() // 0-1のランダムな重み
      positions[obj.id] = {
        x: pos1.x * alpha + pos2.x * (1 - alpha),
        y: pos1.y * alpha + pos2.y * (1 - alpha)
      }
    })
  }
  
  return { positions, fitness: 0 }
}

// 突然変異（より多様な変異を適用）
function mutate(
  individual: Individual,
  objects: EquipmentObject[],
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  spacing: number,
  padding: number
): void {
  const mutationType = Math.random()
  
  if (mutationType < 0.3) {
    // 30%の確率：1つのオブジェクトを大きく変異
    const randomObj = objects[Math.floor(Math.random() * objects.length)]
    const mutationStrength = spacing * (0.5 + Math.random() * 1.0) // 0.5-1.5倍の範囲
    individual.positions[randomObj.id] = {
      x: Math.max(padding, Math.min(bounds.maxX, individual.positions[randomObj.id].x + (Math.random() - 0.5) * mutationStrength * 2)),
      y: Math.max(padding, Math.min(bounds.maxY, individual.positions[randomObj.id].y + (Math.random() - 0.5) * mutationStrength * 2))
    }
  } else if (mutationType < 0.6) {
    // 30%の確率：複数のオブジェクトを少し変異
    const mutationCount = 1 + Math.floor(Math.random() * Math.min(5, objects.length))
    const mutationStrength = spacing * 0.3
    for (let i = 0; i < mutationCount; i++) {
      const randomObj = objects[Math.floor(Math.random() * objects.length)]
      individual.positions[randomObj.id] = {
        x: Math.max(padding, Math.min(bounds.maxX, individual.positions[randomObj.id].x + (Math.random() - 0.5) * mutationStrength * 2)),
        y: Math.max(padding, Math.min(bounds.maxY, individual.positions[randomObj.id].y + (Math.random() - 0.5) * mutationStrength * 2))
      }
    }
  } else {
    // 40%の確率：1つのオブジェクトを完全にランダムな位置に移動
    const randomObj = objects[Math.floor(Math.random() * objects.length)]
    individual.positions[randomObj.id] = {
      x: padding + Math.random() * (bounds.maxX - bounds.minX) * 1.5,
      y: padding + Math.random() * (bounds.maxY - bounds.minY) * 1.5
    }
  }
}

// 重複計算
function calculateOverlap(
  pos1: { x: number; y: number },
  size1: { width: number; height: number },
  pos2: { x: number; y: number },
  size2: { width: number; height: number }
): number {
  const left1 = pos1.x
  const right1 = pos1.x + size1.width
  const top1 = pos1.y
  const bottom1 = pos1.y + size1.height

  const left2 = pos2.x
  const right2 = pos2.x + size2.width
  const top2 = pos2.y
  const bottom2 = pos2.y + size2.height

  const overlapX = Math.max(0, Math.min(right1, right2) - Math.max(left1, left2))
  const overlapY = Math.max(0, Math.min(bottom1, bottom2) - Math.max(top1, top2))

  return overlapX * overlapY
}

// SVGパス文字列を線分の配列に変換
function parsePathToSegments(pathData: string): Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> {
  const segments: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> = []
  let currentX = 0
  let currentY = 0
  let startX = 0
  let startY = 0

  // パスコマンドを解析（簡易版：M, L, H, Vのみ対応）
  const commands = pathData.match(/[MLHV][^MLHV]*/gi) || []
  
  for (const cmd of commands) {
    const type = cmd[0].toUpperCase()
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
    
    if (type === 'M') {
      // Move to
      currentX = coords[0] || currentX
      currentY = coords[1] || currentY
      startX = currentX
      startY = currentY
    } else if (type === 'L') {
      // Line to
      const x = coords[0] ?? currentX
      const y = coords[1] ?? currentY
      segments.push({ start: { x: currentX, y: currentY }, end: { x, y } })
      currentX = x
      currentY = y
    } else if (type === 'H') {
      // Horizontal line to
      const x = coords[0] ?? currentX
      segments.push({ start: { x: currentX, y: currentY }, end: { x, y: currentY } })
      currentX = x
    } else if (type === 'V') {
      // Vertical line to
      const y = coords[0] ?? currentY
      segments.push({ start: { x: currentX, y: currentY }, end: { x: currentX, y } })
      currentY = y
    }
  }
  
  return segments
}

// ポートのsideをReactFlowのPositionに変換
function sideToPosition(side: Side): Position {
  switch (side) {
    case 'top': return Position.Top
    case 'right': return Position.Right
    case 'bottom': return Position.Bottom
    case 'left': return Position.Left
    default: return Position.Right
  }
}

// 配線の交差数をカウント（ReactFlowの実際のパスに基づく）
function countWireCrossings(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[]
): number {
  let crossings = 0
  
  // 各ワイヤーのパスを計算して線分に変換
  const wireSegments: Array<Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>> = []
  
  for (const wire of wires) {
    const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
    const targetObj = objects.find(o => o.id === wire.targetObjectId)
    
    if (!sourceObj || !targetObj) {
      wireSegments.push([])
      continue
    }
    
    const pos1 = positions[wire.sourceObjectId]
    const pos2 = positions[wire.targetObjectId]
    
    if (!pos1 || !pos2) {
      wireSegments.push([])
      continue
    }
    
    const render1 = getRenderComponent(sourceObj)
    const render2 = getRenderComponent(targetObj)
    
    const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
    const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }
    
    const sourcePorts = getConnectionPortComponents(sourceObj)
    const targetPorts = getConnectionPortComponents(targetObj)
    const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
    const targetPort = targetPorts.find(p => p.id === wire.targetPortId)
    
    let sourceX: number, sourceY: number
    let targetX: number, targetY: number
    let sourcePosition: Position
    let targetPosition: Position
    
    if (sourcePort && targetPort) {
      const sourcePos = calculatePortPosition(pos1, size1, sourcePort.data.position)
      const targetPos = calculatePortPosition(pos2, size2, targetPort.data.position)
      sourceX = sourcePos.x
      sourceY = sourcePos.y
      targetX = targetPos.x
      targetY = targetPos.y
      sourcePosition = sideToPosition(sourcePort.data.position.side)
      targetPosition = sideToPosition(targetPort.data.position.side)
    } else {
      sourceX = pos1.x + size1.width / 2
      sourceY = pos1.y + size1.height / 2
      targetX = pos2.x + size2.width / 2
      targetY = pos2.y + size2.height / 2
      sourcePosition = Position.Right
      targetPosition = Position.Left
    }
    
    // ReactFlowのgetSmoothStepPathを使用して実際のパスを取得
    // WireEdge.tsxと同じようにoffsetを指定しない（デフォルト値を使用）
    try {
      const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      })
      
      // パスを線分に変換
      const segments = parsePathToSegments(edgePath)
      wireSegments.push(segments)
    } catch (error) {
      // エラー時はフォールバックとして直線を使用
      wireSegments.push([{ start: { x: sourceX, y: sourceY }, end: { x: targetX, y: targetY } }])
    }
  }
  
  // すべてのワイヤーペアの線分を比較
  for (let i = 0; i < wireSegments.length; i++) {
    for (let j = i + 1; j < wireSegments.length; j++) {
      const segments1 = wireSegments[i]
      const segments2 = wireSegments[j]
      
      // 各線分ペアで交差判定
      for (const seg1 of segments1) {
        for (const seg2 of segments2) {
          if (doLineSegmentsIntersect(seg1.start, seg1.end, seg2.start, seg2.end)) {
            crossings++
          }
        }
      }
    }
  }
  
  return crossings
}

// エッジと機材の交差数をカウント（ReactFlowの実際のパスに基づく）
function countWireEquipmentIntersections(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[]
): number {
  let intersections = 0

  wires.forEach(wire => {
    const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
    const targetObj = objects.find(o => o.id === wire.targetObjectId)
    if (!sourceObj || !targetObj) return

    const sourcePos = positions[wire.sourceObjectId]
    const targetPos = positions[wire.targetObjectId]
    if (!sourcePos || !targetPos) return

    const render1 = getRenderComponent(sourceObj)
    const render2 = getRenderComponent(targetObj)
    const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
    const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

    const sourcePorts = getConnectionPortComponents(sourceObj)
    const targetPorts = getConnectionPortComponents(targetObj)
    const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
    const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

    let sourceX: number, sourceY: number
    let targetX: number, targetY: number
    let sourcePosition: Position
    let targetPosition: Position

    if (sourcePort && targetPort) {
      const sourcePosCalc = calculatePortPosition(sourcePos, size1, sourcePort.data.position)
      const targetPosCalc = calculatePortPosition(targetPos, size2, targetPort.data.position)
      sourceX = sourcePosCalc.x
      sourceY = sourcePosCalc.y
      targetX = targetPosCalc.x
      targetY = targetPosCalc.y
      sourcePosition = sideToPosition(sourcePort.data.position.side)
      targetPosition = sideToPosition(targetPort.data.position.side)
    } else {
      sourceX = sourcePos.x + size1.width / 2
      sourceY = sourcePos.y + size1.height / 2
      targetX = targetPos.x + size2.width / 2
      targetY = targetPos.y + size2.height / 2
      sourcePosition = Position.Right
      targetPosition = Position.Left
    }

    // ReactFlowのgetSmoothStepPathを使用して実際のパスを取得
    let wireSegments: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> = []
    try {
      const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      })
      wireSegments = parsePathToSegments(edgePath)
    } catch (error) {
      // エラー時はフォールバックとして直線を使用
      wireSegments = [{ start: { x: sourceX, y: sourceY }, end: { x: targetX, y: targetY } }]
    }

    // 接続元と接続先の機材以外の機材と交差しているかチェック
    objects.forEach(obj => {
      // 接続元と接続先の機材はスキップ
      if (obj.id === wire.sourceObjectId || obj.id === wire.targetObjectId) return

      const objPos = positions[obj.id]
      if (!objPos) return

      const render = getRenderComponent(obj)
      const objSize = { width: render?.data.size.width || 100, height: render?.data.size.height || 60 }

      // ポート位置から一定距離以内の線分は除外（SmoothStepPathの折れ曲がり開始点までの距離）
      // ReactFlowのデフォルトでは、ノードから約20px離れた位置から折れ曲がる
      const nodePadding = 20 // ポート位置から折れ曲がり開始点までの距離
      
      // パスの各線分と矩形の交差判定
      for (const segment of wireSegments) {
        // 線分の開始点がポート位置から一定距離以内にある場合はスキップ
        const distFromSource = Math.sqrt(
          Math.pow(segment.start.x - sourceX, 2) + Math.pow(segment.start.y - sourceY, 2)
        )
        const distFromTarget = Math.sqrt(
          Math.pow(segment.start.x - targetX, 2) + Math.pow(segment.start.y - targetY, 2)
        )
        
        // ポート位置から一定距離以内の線分は除外
        if (distFromSource < nodePadding || distFromTarget < nodePadding) {
          continue
        }
        
        // 線分の終了点もチェック
        const distFromSourceEnd = Math.sqrt(
          Math.pow(segment.end.x - sourceX, 2) + Math.pow(segment.end.y - sourceY, 2)
        )
        const distFromTargetEnd = Math.sqrt(
          Math.pow(segment.end.x - targetX, 2) + Math.pow(segment.end.y - targetY, 2)
        )
        
        if (distFromSourceEnd < nodePadding || distFromTargetEnd < nodePadding) {
          continue
        }

        if (lineIntersectsRectangle(
          segment.start.x, segment.start.y,
          segment.end.x, segment.end.y,
          objPos.x, objPos.y, objSize.width, objSize.height
        )) {
          intersections++
          break // 1つの機材との交差は1回だけカウント
        }
      }
    })
  })

  return intersections
}

// 線分の交差判定
function doLineSegmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const ccw = (A: { x: number; y: number }, B: { x: number; y: number }, C: { x: number; y: number }) => {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x)
  }
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
}

// 境界を計算（遺伝的アルゴリズム用）
function calculateGeneticBounds(
  objects: EquipmentObject[],
  spacing: number,
  padding: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  const estimatedWidth = Math.ceil(Math.sqrt(objects.length)) * spacing * 2
  const estimatedHeight = Math.ceil(Math.sqrt(objects.length)) * spacing * 2

  return {
    minX: padding,
    maxX: padding + estimatedWidth,
    minY: padding,
    maxY: padding + estimatedHeight
  }
}

// メインの自動レイアウト関数（非同期版）
export async function autoLayout(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions,
  onProgress?: (progress: LayoutProgress) => void,
  cancelToken?: LayoutCancelToken
): Promise<LayoutResult> {
  const reportProgress = (progress: LayoutProgress) => {
    if (onProgress) {
      onProgress(progress)
    }
  }

  const checkCancel = () => {
    if (cancelToken?.signal.aborted) {
      throw new Error('レイアウト処理がキャンセルされました')
    }
  }

  // 進捗を報告しながら処理
  reportProgress({ stage: '初期化', progress: 0, message: 'レイアウトアルゴリズムを準備中...' })
  await new Promise(resolve => setTimeout(resolve, 10))
  checkCancel()

  let result: LayoutResult

  switch (options.algorithm) {
    case 'grid':
      reportProgress({ stage: 'グリッドレイアウト', progress: 20, message: 'グリッド配置を計算中...' })
      await new Promise(resolve => setTimeout(resolve, 10))
      checkCancel()
      result = gridLayout(objects, options)
      break
    case 'hierarchical':
      reportProgress({ stage: '階層レイアウト', progress: 20, message: '階層構造を分析中...' })
      await new Promise(resolve => setTimeout(resolve, 10))
      checkCancel()
      result = await hierarchicalLayoutAsync(objects, wires, options, reportProgress, cancelToken)
      break
    case 'force':
      reportProgress({ stage: '力学レイアウト', progress: 20, message: '力学シミュレーションを実行中...' })
      await new Promise(resolve => setTimeout(resolve, 10))
      checkCancel()
      result = await forceLayoutAsync(objects, wires, options, reportProgress, cancelToken)
      break
    case 'circular':
      reportProgress({ stage: '円形レイアウト', progress: 20, message: '円形配置を計算中...' })
      await new Promise(resolve => setTimeout(resolve, 10))
      checkCancel()
      result = circularLayout(objects, options)
      break
    case 'smart':
      reportProgress({ stage: 'スマートレイアウト', progress: 10, message: '最適な配置を計算中...' })
      await new Promise(resolve => setTimeout(resolve, 10))
      checkCancel()
      result = await smartLayoutAsync(objects, wires, options, reportProgress, cancelToken)
      break
    case 'signal-flow':
      reportProgress({ stage: '信号フローレイアウト', progress: 20, message: '信号フローを分析中...' })
      await new Promise(resolve => setTimeout(resolve, 10))
      checkCancel()
      result = await signalFlowLayoutAsync(objects, wires, options, reportProgress, cancelToken)
      break
    case 'genetic':
      reportProgress({ stage: '遺伝的アルゴリズム', progress: 5, message: '遺伝的アルゴリズムを開始...' })
      await new Promise(resolve => setTimeout(resolve, 10))
      checkCancel()
      result = await geneticLayoutAsync(objects, wires, options, reportProgress, cancelToken)
      break
    default:
      result = gridLayout(objects, options)
  }

  checkCancel()
  reportProgress({ stage: '完了', progress: 100, message: 'レイアウトが完了しました' })
  return result
}

// 同期版（後方互換性のため）
export function autoLayoutSync(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): LayoutResult {
  switch (options.algorithm) {
    case 'grid':
      return gridLayout(objects, options)
    case 'hierarchical':
      return hierarchicalLayout(objects, wires, options)
    case 'force':
      return forceLayout(objects, wires, options)
    case 'circular':
      return circularLayout(objects, options)
    case 'smart':
      return smartLayout(objects, wires, options)
    case 'signal-flow':
      return signalFlowLayout(objects, wires, options)
    default:
      return gridLayout(objects, options)
  }
}

// Helper function: Build connection graph (undirected)
function buildConnectionGraph(objects: EquipmentObject[], wires: Wire[]): Record<string, string[]> {
  const graph: Record<string, string[]> = {}

  objects.forEach(obj => {
    graph[obj.id] = []
  })

  wires.forEach(wire => {
    if (graph[wire.sourceObjectId]) {
      graph[wire.sourceObjectId].push(wire.targetObjectId)
    }
    if (graph[wire.targetObjectId]) {
      graph[wire.targetObjectId].push(wire.sourceObjectId)
    }
  })

  return graph
}

// Helper function: Build directed graph for hierarchical layout
function buildDirectedGraph(objects: EquipmentObject[], wires: Wire[]): Record<string, string[]> {
  const graph: Record<string, string[]> = {}

  objects.forEach(obj => {
    graph[obj.id] = []
  })

  wires.forEach(wire => {
    if (graph[wire.sourceObjectId]) {
      graph[wire.sourceObjectId].push(wire.targetObjectId)
    }
  })

  return graph
}

// Helper function: Topological sort for level assignment
function assignLevels(graph: Record<string, string[]>): Record<string, number> {
  const levels: Record<string, number> = {}
  const nodeIds = Object.keys(graph)
  const visited = new Set<string>()
  const inDegree: Record<string, number> = {}

  // 入次数を計算
  nodeIds.forEach(nodeId => {
    inDegree[nodeId] = 0
  })
  nodeIds.forEach(nodeId => {
    graph[nodeId].forEach(targetId => {
      inDegree[targetId] = (inDegree[targetId] || 0) + 1
    })
  })

  // トポロジカルソート（BFSベース）
  const queue: string[] = []
  nodeIds.forEach(nodeId => {
    if (inDegree[nodeId] === 0) {
      queue.push(nodeId)
      levels[nodeId] = 0
      visited.add(nodeId)
    }
  })

  while (queue.length > 0) {
    const current = queue.shift()!
    const currentLevel = levels[current]

    graph[current].forEach(neighbor => {
      if (!visited.has(neighbor)) {
        inDegree[neighbor]--
        if (inDegree[neighbor] === 0) {
          levels[neighbor] = currentLevel + 1
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    })
  }

  // 未訪問のノード（循環がある場合）は最大レベル+1
  const maxLevel = Math.max(...Object.values(levels), -1)
  nodeIds.forEach(nodeId => {
    if (!visited.has(nodeId)) {
      levels[nodeId] = maxLevel + 1
    }
  })

  return levels
}

// Helper function: Group by equipment type
function groupByEquipmentType(objects: EquipmentObject[]): Record<string, EquipmentObject[]> {
  const groups: Record<string, EquipmentObject[]> = {}

  objects.forEach(obj => {
    // 優先順位: 1. metadata.category, 2. templateId, 3. name prefix
    let type = 'other'
    
    if (obj.metadata?.category) {
      type = obj.metadata.category
    } else if (obj.templateId) {
      // テンプレートIDからカテゴリを推測（例: "yamaha-ql1" -> "yamaha"）
      type = obj.templateId.split('-')[0] || obj.templateId
    } else {
      // 名前のプレフィックスを使用（例: "PLC-001" -> "PLC"）
      type = obj.name.split('-')[0] || 'other'
    }
    
    if (!groups[type]) groups[type] = []
    groups[type].push(obj)
  })

  return groups
}

// Helper function: Calculate group importance
function calculateGroupImportance(
  groups: Record<string, EquipmentObject[]>,
  wires: Wire[]
): Record<string, number> {
  const importance: Record<string, number> = {}

  Object.entries(groups).forEach(([groupName, objects]) => {
    const objectIds = new Set(objects.map(o => o.id))

    // グループ内の接続数
    const internalConnections = wires.filter(wire =>
      objectIds.has(wire.sourceObjectId) && objectIds.has(wire.targetObjectId)
    ).length

    // グループ外との接続数
    const externalConnections = wires.filter(wire =>
      (objectIds.has(wire.sourceObjectId) && !objectIds.has(wire.targetObjectId)) ||
      (!objectIds.has(wire.sourceObjectId) && objectIds.has(wire.targetObjectId))
    ).length

    // 重要度 = オブジェクト数 + 外部接続数 * 2 + 内部接続数
    importance[groupName] = objects.length + externalConnections * 2 + internalConnections
  })

  return importance
}

// Helper function: Layout within group
function layoutGroup(
  objects: EquipmentObject[],
  wires: Wire[],
  options: { spacing: number; padding: number }
): LayoutResult {
  if (objects.length === 0) {
    return { positions: {} }
  }

  // グループ内の接続をフィルタリング
  const groupObjectIds = new Set(objects.map(o => o.id))
  const groupWires = wires.filter(wire =>
    groupObjectIds.has(wire.sourceObjectId) && groupObjectIds.has(wire.targetObjectId)
  )

  // 接続がある場合は階層レイアウト+力学的調整、ない場合はグリッドレイアウト
  if (groupWires.length > 0) {
    // 接続関係を考慮した階層的配置
    const hierarchicalResult = hierarchicalLayoutForGroup(objects, groupWires, options)
    
    // 力学的レイアウトで微調整（接続を考慮、Y方向の整列を強化）
    return applyForceLayoutRefinement(objects, groupWires, hierarchicalResult, options, true)
  } else {
    // 接続がない場合は水平グリッドレイアウト（Y方向を最小限に）
    return horizontalGridLayout(objects, options)
  }
}

// Helper function: Apply force-directed refinement to hierarchical layout
function applyForceLayoutRefinement(
  objects: EquipmentObject[],
  wires: Wire[],
  initialPositions: LayoutResult,
  options: { spacing: number; padding: number },
  alignHorizontally: boolean = false
): LayoutResult {
  const { spacing } = options
  const positions = { ...initialPositions.positions }
  
  // 力学的調整（冷却スケジュール付き、50回のイテレーション）
  let temperature = 1.0
  const coolingRate = 0.98
  
  for (let iteration = 0; iteration < 50; iteration++) {
    temperature *= coolingRate
    const forces: Record<string, { x: number; y: number }> = {}
    
    objects.forEach(obj => {
      forces[obj.id] = { x: 0, y: 0 }
    })

    // 反発力（ノード間）
    objects.forEach(obj1 => {
      objects.forEach(obj2 => {
        if (obj1.id === obj2.id) return

        const pos1 = positions[obj1.id]
        const pos2 = positions[obj2.id]
        if (!pos1 || !pos2) return

        const render1 = getRenderComponent(obj1)
        const render2 = getRenderComponent(obj2)
        const width1 = render1?.data.size.width || 100
        const height1 = render1?.data.size.height || 60
        const width2 = render2?.data.size.width || 100
        const height2 = render2?.data.size.height || 60

        const dx = (pos1.x + width1 / 2) - (pos2.x + width2 / 2)
        const dy = (pos1.y + height1 / 2) - (pos2.y + height2 / 2)
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const minDistance = Math.max(width1, height1, width2, height2) + spacing
        const repulsion = minDistance * minDistance / distance
        const forceStrength = 0.05 * temperature
        forces[obj1.id].x += (dx / distance) * repulsion * forceStrength
        forces[obj1.id].y += (dy / distance) * repulsion * forceStrength
      })
    })

    // 引力（接続されたノード間）
    wires.forEach(wire => {
      const pos1 = positions[wire.sourceObjectId]
      const pos2 = positions[wire.targetObjectId]
      if (!pos1 || !pos2) return

      const render1 = getRenderComponent(objects.find(o => o.id === wire.sourceObjectId)!)
      const render2 = getRenderComponent(objects.find(o => o.id === wire.targetObjectId)!)
      const width1 = render1?.data.size.width || 100
      const height1 = render1?.data.size.height || 60
      const width2 = render2?.data.size.width || 100
      const height2 = render2?.data.size.height || 60

      const dx = (pos2.x + width2 / 2) - (pos1.x + width1 / 2)
      const dy = (pos2.y + height2 / 2) - (pos1.y + height1 / 2)
      const distance = Math.sqrt(dx * dx + dy * dy) || 1

      const idealDistance = spacing * 2
      const attraction = (distance - idealDistance) * 0.02 * temperature
      forces[wire.sourceObjectId].x += (dx / distance) * attraction
      forces[wire.sourceObjectId].y += (dy / distance) * attraction
      forces[wire.targetObjectId].x -= (dx / distance) * attraction
      forces[wire.targetObjectId].y -= (dy / distance) * attraction
    })

    // 位置を更新（制限付き）
    objects.forEach(obj => {
      const pos = positions[obj.id]
      if (!pos) return

      const force = forces[obj.id]
      const newX = pos.x + force.x
      const newY = pos.y + force.y

      // 移動を制限（階層構造を維持）
      positions[obj.id] = {
        x: newX,
        y: newY
      }
    })
  }

  return { positions }
}

// Helper function: Horizontal grid layout (Y direction minimized)
function horizontalGridLayout(
  objects: EquipmentObject[],
  options: { spacing: number; padding: number }
): LayoutResult {
  const { spacing, padding } = options
  const positions: Record<string, { x: number; y: number }> = {}
  
  if (objects.length === 0) {
    return { positions }
  }
  
  // 最大サイズを計算
  let maxWidth = 0
  let maxHeight = 0
  objects.forEach(obj => {
    const render = getRenderComponent(obj)
    const width = render?.data.size.width || 100
    const height = render?.data.size.height || 60
    maxWidth = Math.max(maxWidth, width)
    maxHeight = Math.max(maxHeight, height)
  })
  
  // 水平方向に配置（Y方向は最小限）
  objects.forEach((obj, index) => {
    positions[obj.id] = {
      x: padding + index * (maxWidth + spacing),
      y: padding  // すべて同じY座標（水平整列）
    }
  })
  
  return { positions }
}

// Helper function: Hierarchical layout for a group
function hierarchicalLayoutForGroup(
  objects: EquipmentObject[],
  wires: Wire[],
  options: { spacing: number; padding: number }
): LayoutResult {
  const { spacing, padding } = options
  const positions: Record<string, { x: number; y: number }> = {}

  if (objects.length === 0) {
    return { positions }
  }

  // 接続グラフを構築
  const graph = buildDirectedGraph(objects, wires)
  const levels = assignLevels(graph)

  // レベルごとにグループ化
  const levelGroups: Record<number, EquipmentObject[]> = {}
  objects.forEach(obj => {
    const level = levels[obj.id] || 0
    if (!levelGroups[level]) levelGroups[level] = []
    levelGroups[level].push(obj)
  })

  // 各レベルの最大サイズを計算
  const levelSizes: Record<number, { width: number; height: number }> = {}
  Object.keys(levelGroups).forEach(levelStr => {
    const level = parseInt(levelStr)
    let maxWidth = 0
    let maxHeight = 0
    levelGroups[level].forEach(obj => {
      const renderComponent = getRenderComponent(obj)
      const width = renderComponent?.data.size.width || 100
      const height = renderComponent?.data.size.height || 60
      maxWidth = Math.max(maxWidth, width)
      maxHeight = Math.max(maxHeight, height)
    })
    levelSizes[level] = { width: maxWidth, height: maxHeight }
  })

  // レベルごとに配置
  const sortedLevels = Object.keys(levelGroups).map(Number).sort((a, b) => a - b)
  let currentX = padding

  sortedLevels.forEach(level => {
    const levelObjects = levelGroups[level]
    const levelSize = levelSizes[level]

    // レベル内でオブジェクトを接続密度に基づいてソート
    const sortedObjects = sortObjectsByConnectionDensity(levelObjects, wires, graph)

    let currentY = padding

    // レベル内でオブジェクトを配置
    sortedObjects.forEach(obj => {
      const renderComponent = getRenderComponent(obj)
      const width = renderComponent?.data.size.width || 100
      const height = renderComponent?.data.size.height || 60

      positions[obj.id] = {
        x: currentX,
        y: currentY
      }

      currentY += height + spacing
    })

    // 次のレベルへ
    currentX += levelSize.width + spacing * 2
  })

  return { positions }
}

// Helper function: Sort objects by connection density within a level
function sortObjectsByConnectionDensity(
  objects: EquipmentObject[],
  wires: Wire[],
  graph: Record<string, string[]>
): EquipmentObject[] {
  if (objects.length <= 1) return objects

  // 各オブジェクトの接続密度を計算
  const density: Record<string, number> = {}
  objects.forEach(obj => {
    const connections = (graph[obj.id] || []).length
    const incoming = objects.filter(other => 
      graph[other.id]?.includes(obj.id)
    ).length
    density[obj.id] = connections + incoming
  })

  // 接続密度が高い順にソート
  return [...objects].sort((a, b) => {
    const densityDiff = (density[b.id] || 0) - (density[a.id] || 0)
    if (densityDiff !== 0) return densityDiff
    
    // 接続密度が同じ場合は、接続先が同じレベルにあるものを近くに
    const aConnections = (graph[a.id] || []).length
    const bConnections = (graph[b.id] || []).length
    return bConnections - aConnections
  })
}

// Helper function: Calculate bounds
function calculateBounds(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[]
): { width: number; height: number } {
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity

  objects.forEach(obj => {
    const pos = positions[obj.id]
    if (!pos) return

    const renderComponent = getRenderComponent(obj)
    const width = renderComponent?.data.size.width || 100
    const height = renderComponent?.data.size.height || 60

    minX = Math.min(minX, pos.x)
    maxX = Math.max(maxX, pos.x + width)
    minY = Math.min(minY, pos.y)
    maxY = Math.max(maxY, pos.y + height)
  })

  return {
    width: maxX - minX,
    height: maxY - minY
  }
}

// Helper function: Minimize connection lengths globally
function minimizeConnectionLengths(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): void {
  const { spacing } = options
  const iterations = 30

  for (let iter = 0; iter < iterations; iter++) {
    const adjustments: Record<string, { x: number; y: number }> = {}
    objects.forEach(obj => {
      adjustments[obj.id] = { x: 0, y: 0 }
    })

    // 各接続の長さを最小化する方向に調整（ポート位置を考慮）
    wires.forEach(wire => {
      const sourcePos = positions[wire.sourceObjectId]
      const targetPos = positions[wire.targetObjectId]
      if (!sourcePos || !targetPos) return

      const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
      const targetObj = objects.find(o => o.id === wire.targetObjectId)
      if (!sourceObj || !targetObj) return

      const render1 = getRenderComponent(sourceObj)
      const render2 = getRenderComponent(targetObj)
      const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
      const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

      // ポート位置を取得
      const sourcePorts = getConnectionPortComponents(sourceObj)
      const targetPorts = getConnectionPortComponents(targetObj)
      const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
      const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

      let dx: number, dy: number, distance: number

      if (sourcePort && targetPort) {
        // ポートの実際の位置を計算
        const port1Pos = calculatePortPosition(sourcePos, size1, sourcePort.data.position)
        const port2Pos = calculatePortPosition(targetPos, size2, targetPort.data.position)

        dx = port2Pos.x - port1Pos.x
        dy = port2Pos.y - port1Pos.y
        distance = Math.sqrt(dx * dx + dy * dy) || 1
        
        // ポートの辺配置を取得
        const sourceSide = sourcePort.data.position.side
        const targetSide = targetPort.data.position.side
        
        // 理想的な距離に近づける（ポート間の距離を最小化）
        const idealDistance = spacing * 1.5
        const adjustment = (distance - idealDistance) * 0.01
        
        // 辺配置に基づいた方向性の重み付け
        let weightX = 1.0
        let weightY = 1.0
        
        // ポートの辺配置に基づいた配置制約を追加
        const sourceCenterX = sourcePos.x + size1.width / 2
        const targetCenterX = targetPos.x + size2.width / 2
        const sourceCenterY = sourcePos.y + size1.height / 2
        const targetCenterY = targetPos.y + size2.height / 2
        
        // 水平方向の接続（左↔右）を優先
        if ((sourceSide === Side.LEFT && targetSide === Side.RIGHT) ||
            (sourceSide === Side.RIGHT && targetSide === Side.LEFT)) {
          weightX = 1.5
          weightY = 0.5
          
          // 配置制約：右辺のポートを持つオブジェクトを左辺のポートを持つオブジェクトの左側に配置
          if (sourceSide === Side.RIGHT && targetSide === Side.LEFT) {
            // 機材A（右辺）→ 機材B（左辺）：AをBの左側に配置
            if (sourceCenterX >= targetCenterX) {
              // AがBの右側にある場合、強制的に左側に移動させる力
              const constraintStrength = 0.2
              adjustments[wire.sourceObjectId].x -= constraintStrength
              adjustments[wire.targetObjectId].x += constraintStrength
            }
          } else if (sourceSide === Side.LEFT && targetSide === Side.RIGHT) {
            // 機材A（左辺）→ 機材B（右辺）：AをBの左側に配置
            if (sourceCenterX >= targetCenterX) {
              // AがBの右側にある場合、強制的に左側に移動させる力
              const constraintStrength = 0.2
              adjustments[wire.sourceObjectId].x -= constraintStrength
              adjustments[wire.targetObjectId].x += constraintStrength
            }
          }
        }
        // 垂直方向の接続（上↔下）を優先
        else if ((sourceSide === Side.TOP && targetSide === Side.BOTTOM) ||
                 (sourceSide === Side.BOTTOM && targetSide === Side.TOP)) {
          weightX = 0.5
          weightY = 1.5
          
          // 配置制約：下辺のポートを持つオブジェクトを上辺のポートを持つオブジェクトの下側に配置
          if (sourceSide === Side.BOTTOM && targetSide === Side.TOP) {
            // 機材A（下辺）→ 機材B（上辺）：AをBの下側に配置
            if (sourceCenterY <= targetCenterY) {
              // AがBの上側にある場合、強制的に下側に移動させる力
              const constraintStrength = 0.2
              adjustments[wire.sourceObjectId].y += constraintStrength
              adjustments[wire.targetObjectId].y -= constraintStrength
            }
          } else if (sourceSide === Side.TOP && targetSide === Side.BOTTOM) {
            // 機材A（上辺）→ 機材B（下辺）：AをBの上側に配置
            if (sourceCenterY >= targetCenterY) {
              // AがBの下側にある場合、強制的に上側に移動させる力
              const constraintStrength = 0.2
              adjustments[wire.sourceObjectId].y -= constraintStrength
              adjustments[wire.targetObjectId].y += constraintStrength
            }
          }
        }
        // 同じ辺のポートの場合は、整列を優先
        else if (sourceSide === targetSide) {
          if (sourceSide === Side.LEFT || sourceSide === Side.RIGHT) {
            weightX = 0.3
            weightY = 1.0  // Y方向の整列を優先
          } else {
            weightX = 1.0  // X方向の整列を優先
            weightY = 0.3
          }
        }
        
        adjustments[wire.sourceObjectId].x += (dx / distance) * adjustment * weightX
        adjustments[wire.sourceObjectId].y += (dy / distance) * adjustment * weightY
        adjustments[wire.targetObjectId].x -= (dx / distance) * adjustment * weightX
        adjustments[wire.targetObjectId].y -= (dy / distance) * adjustment * weightY
      } else {
        // ポートが見つからない場合は、オブジェクトの中心を使用（フォールバック）
        const center1 = {
          x: sourcePos.x + size1.width / 2,
          y: sourcePos.y + size1.height / 2
        }
        const center2 = {
          x: targetPos.x + size2.width / 2,
          y: targetPos.y + size2.height / 2
        }

        dx = center2.x - center1.x
        dy = center2.y - center1.y
        distance = Math.sqrt(dx * dx + dy * dy) || 1

        // 理想的な距離に近づける
        const idealDistance = spacing * 3
        const adjustment = (distance - idealDistance) * 0.01

        adjustments[wire.sourceObjectId].x += (dx / distance) * adjustment
        adjustments[wire.sourceObjectId].y += (dy / distance) * adjustment
        adjustments[wire.targetObjectId].x -= (dx / distance) * adjustment
        adjustments[wire.targetObjectId].y -= (dy / distance) * adjustment
      }
    })

    // 位置を更新
    objects.forEach(obj => {
      const pos = positions[obj.id]
      if (!pos) return
      const adj = adjustments[obj.id]
      positions[obj.id] = {
        x: pos.x + adj.x,
        y: pos.y + adj.y
      }
    })
  }
}

// Helper function: Minimize connection lengths globally (async version with progress)
async function minimizeConnectionLengthsAsync(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions,
  onProgress?: (progress: number) => void
): Promise<void> {
  const { spacing } = options
  const iterations = 30

  for (let iter = 0; iter < iterations; iter++) {
    const adjustments: Record<string, { x: number; y: number }> = {}
    objects.forEach(obj => {
      adjustments[obj.id] = { x: 0, y: 0 }
    })

    wires.forEach(wire => {
      const sourcePos = positions[wire.sourceObjectId]
      const targetPos = positions[wire.targetObjectId]
      if (!sourcePos || !targetPos) return

      const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
      const targetObj = objects.find(o => o.id === wire.targetObjectId)
      if (!sourceObj || !targetObj) return

      const render1 = getRenderComponent(sourceObj)
      const render2 = getRenderComponent(targetObj)
      const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
      const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

      const sourcePorts = getConnectionPortComponents(sourceObj)
      const targetPorts = getConnectionPortComponents(targetObj)
      const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
      const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

      let dx: number, dy: number, distance: number

      if (sourcePort && targetPort) {
        const port1Pos = calculatePortPosition(sourcePos, size1, sourcePort.data.position)
        const port2Pos = calculatePortPosition(targetPos, size2, targetPort.data.position)

        dx = port2Pos.x - port1Pos.x
        dy = port2Pos.y - port1Pos.y
        distance = Math.sqrt(dx * dx + dy * dy) || 1
        
        const sourceSide = sourcePort.data.position.side
        const targetSide = targetPort.data.position.side
        
        const idealDistance = spacing * 1.5
        const adjustment = (distance - idealDistance) * 0.01
        
        let weightX = 1.0
        let weightY = 1.0
        
        const sourceCenterX = sourcePos.x + size1.width / 2
        const targetCenterX = targetPos.x + size2.width / 2
        const sourceCenterY = sourcePos.y + size1.height / 2
        const targetCenterY = targetPos.y + size2.height / 2
        
        if ((sourceSide === Side.LEFT && targetSide === Side.RIGHT) ||
            (sourceSide === Side.RIGHT && targetSide === Side.LEFT)) {
          weightX = 1.5
          weightY = 0.5
          
          if (sourceSide === Side.RIGHT && targetSide === Side.LEFT) {
            if (sourceCenterX >= targetCenterX) {
              const constraintStrength = 0.2
              adjustments[wire.sourceObjectId].x -= constraintStrength
              adjustments[wire.targetObjectId].x += constraintStrength
            }
          } else if (sourceSide === Side.LEFT && targetSide === Side.RIGHT) {
            if (sourceCenterX >= targetCenterX) {
              const constraintStrength = 0.2
              adjustments[wire.sourceObjectId].x -= constraintStrength
              adjustments[wire.targetObjectId].x += constraintStrength
            }
          }
        }
        else if ((sourceSide === Side.TOP && targetSide === Side.BOTTOM) ||
                 (sourceSide === Side.BOTTOM && targetSide === Side.TOP)) {
          weightX = 0.5
          weightY = 1.5
          
          if (sourceSide === Side.BOTTOM && targetSide === Side.TOP) {
            if (sourceCenterY <= targetCenterY) {
              const constraintStrength = 0.2
              adjustments[wire.sourceObjectId].y += constraintStrength
              adjustments[wire.targetObjectId].y -= constraintStrength
            }
          } else if (sourceSide === Side.TOP && targetSide === Side.BOTTOM) {
            if (sourceCenterY >= targetCenterY) {
              const constraintStrength = 0.2
              adjustments[wire.sourceObjectId].y -= constraintStrength
              adjustments[wire.targetObjectId].y += constraintStrength
            }
          }
        }
        else if (sourceSide === targetSide) {
          if (sourceSide === Side.LEFT || sourceSide === Side.RIGHT) {
            weightX = 0.3
            weightY = 1.0
          } else {
            weightX = 1.0
            weightY = 0.3
          }
        }
        
        adjustments[wire.sourceObjectId].x += (dx / distance) * adjustment * weightX
        adjustments[wire.sourceObjectId].y += (dy / distance) * adjustment * weightY
        adjustments[wire.targetObjectId].x -= (dx / distance) * adjustment * weightX
        adjustments[wire.targetObjectId].y -= (dy / distance) * adjustment * weightY
      } else {
        const center1 = {
          x: sourcePos.x + size1.width / 2,
          y: sourcePos.y + size1.height / 2
        }
        const center2 = {
          x: targetPos.x + size2.width / 2,
          y: targetPos.y + size2.height / 2
        }

        dx = center2.x - center1.x
        dy = center2.y - center1.y
        distance = Math.sqrt(dx * dx + dy * dy) || 1

        const idealDistance = spacing * 3
        const adjustment = (distance - idealDistance) * 0.01

        adjustments[wire.sourceObjectId].x += (dx / distance) * adjustment
        adjustments[wire.sourceObjectId].y += (dy / distance) * adjustment
        adjustments[wire.targetObjectId].x -= (dx / distance) * adjustment
        adjustments[wire.targetObjectId].y -= (dy / distance) * adjustment
      }
    })

    objects.forEach(obj => {
      const pos = positions[obj.id]
      if (!pos) return
      const adj = adjustments[obj.id]
      positions[obj.id] = {
        x: pos.x + adj.x,
        y: pos.y + adj.y
      }
    })

    if (onProgress) {
      onProgress(((iter + 1) / iterations) * 100)
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

// Helper function: Minimize wire crossings
function minimizeWireCrossings(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  groupPositions?: Record<string, { x: number; y: number; width: number; height: number }>
): void {
  // 接続の交差を検出して、交差を減らすように位置を調整
  const crossings: Array<{ wire1: Wire; wire2: Wire }> = []

  // すべての接続ペアをチェック
  for (let i = 0; i < wires.length; i++) {
    for (let j = i + 1; j < wires.length; j++) {
      const wire1 = wires[i]
      const wire2 = wires[j]

      if (doWiresCross(wire1, wire2, positions, objects)) {
        crossings.push({ wire1, wire2 })
      }
    }
  }

  // 交差が多い接続の端点を調整
  const adjustments: Record<string, { x: number; y: number }> = {}
  objects.forEach(obj => {
    adjustments[obj.id] = { x: 0, y: 0 }
  })

  crossings.forEach(({ wire1, wire2 }) => {
    // 交差を減らすために、接続の端点を少し移動
    const source1 = objects.find(o => o.id === wire1.sourceObjectId)
    const target1 = objects.find(o => o.id === wire1.targetObjectId)
    const source2 = objects.find(o => o.id === wire2.sourceObjectId)
    const target2 = objects.find(o => o.id === wire2.targetObjectId)

    if (source1 && target1 && source2 && target2) {
      // 接続の方向を考慮して微調整
      const pos1 = positions[wire1.sourceObjectId]
      const pos2 = positions[wire1.targetObjectId]
      const pos3 = positions[wire2.sourceObjectId]
      const pos4 = positions[wire2.targetObjectId]

      if (pos1 && pos2 && pos3 && pos4) {
        // 交差を減らすために、接続の端点を垂直方向に少し移動
        const adjustment = 5
        adjustments[wire1.sourceObjectId].y += adjustment * 0.1
        adjustments[wire2.sourceObjectId].y -= adjustment * 0.1
      }
    }
  })

  // 位置を更新
  objects.forEach(obj => {
    const pos = positions[obj.id]
    if (!pos) return
    const adj = adjustments[obj.id]
    positions[obj.id] = {
      x: pos.x + adj.x,
      y: pos.y + adj.y
    }
  })
}

// Helper function: Check if two wires cross
function doWiresCross(
  wire1: Wire,
  wire2: Wire,
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[]
): boolean {
  const pos1 = positions[wire1.sourceObjectId]
  const pos2 = positions[wire1.targetObjectId]
  const pos3 = positions[wire2.sourceObjectId]
  const pos4 = positions[wire2.targetObjectId]

  if (!pos1 || !pos2 || !pos3 || !pos4) return false

  const obj1 = objects.find(o => o.id === wire1.sourceObjectId)
  const obj2 = objects.find(o => o.id === wire1.targetObjectId)
  const obj3 = objects.find(o => o.id === wire2.sourceObjectId)
  const obj4 = objects.find(o => o.id === wire2.targetObjectId)

  if (!obj1 || !obj2 || !obj3 || !obj4) return false

  const render1 = getRenderComponent(obj1)
  const render2 = getRenderComponent(obj2)
  const render3 = getRenderComponent(obj3)
  const render4 = getRenderComponent(obj4)

  const center1 = {
    x: pos1.x + (render1?.data.size.width || 100) / 2,
    y: pos1.y + (render1?.data.size.height || 60) / 2
  }
  const center2 = {
    x: pos2.x + (render2?.data.size.width || 100) / 2,
    y: pos2.y + (render2?.data.size.height || 60) / 2
  }
  const center3 = {
    x: pos3.x + (render3?.data.size.width || 100) / 2,
    y: pos3.y + (render3?.data.size.height || 60) / 2
  }
  const center4 = {
    x: pos4.x + (render4?.data.size.width || 100) / 2,
    y: pos4.y + (render4?.data.size.height || 60) / 2
  }

  // 線分の交差判定
  return doLineSegmentsIntersect(center1, center2, center3, center4)
}

// Helper function: Apply global force layout with horizontal alignment
function applyGlobalForceLayoutWithHorizontalAlignment(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): void {
  const { spacing } = options
  
  // Y方向の整列を強化するため、平均Y座標を計算
  const yCoords = objects.map(obj => {
    const pos = positions[obj.id]
    if (!pos) return 0
    const render = getRenderComponent(obj)
    const height = render?.data.size.height || 60
    return pos.y + height / 2
  })
  const targetY = yCoords.reduce((a, b) => a + b, 0) / yCoords.length
  
  // 力学的調整（冷却スケジュール付き、50回のイテレーション）
  let temperature = 1.0
  const coolingRate = 0.95
  
  for (let iteration = 0; iteration < 50; iteration++) {
    temperature *= coolingRate
    const forces: Record<string, { x: number; y: number }> = {}
    
    objects.forEach(obj => {
      forces[obj.id] = { x: 0, y: 0 }
    })

    // Y方向の整列力（水平方向に近い配置を促進）
    objects.forEach(obj => {
      const pos = positions[obj.id]
      if (!pos) return
      const render = getRenderComponent(obj)
      const height = render?.data.size.height || 60
      const centerY = pos.y + height / 2
      const alignmentForce = (targetY - centerY) * 0.15 * temperature
      forces[obj.id].y += alignmentForce
    })

    // 反発力（ノード間）
    objects.forEach(obj1 => {
      objects.forEach(obj2 => {
        if (obj1.id === obj2.id) return

        const pos1 = positions[obj1.id]
        const pos2 = positions[obj2.id]
        if (!pos1 || !pos2) return

        const render1 = getRenderComponent(obj1)
        const render2 = getRenderComponent(obj2)
        const width1 = render1?.data.size.width || 100
        const height1 = render1?.data.size.height || 60
        const width2 = render2?.data.size.width || 100
        const height2 = render2?.data.size.height || 60

        const dx = (pos1.x + width1 / 2) - (pos2.x + width2 / 2)
        const dy = (pos1.y + height1 / 2) - (pos2.y + height2 / 2)
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const minDistance = Math.max(width1, height1, width2, height2) + spacing
        const repulsion = minDistance * minDistance / distance
        forces[obj1.id].x += (dx / distance) * repulsion * 0.01
        // Y方向の反発力を弱める（水平配置を促進）
        forces[obj1.id].y += (dy / distance) * repulsion * 0.01 * 0.3
      })
    })

    // 引力（接続されたノード間）- ポート位置を考慮
    wires.forEach(wire => {
      const pos1 = positions[wire.sourceObjectId]
      const pos2 = positions[wire.targetObjectId]
      if (!pos1 || !pos2) return

      const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
      const targetObj = objects.find(o => o.id === wire.targetObjectId)
      if (!sourceObj || !targetObj) return

      const render1 = getRenderComponent(sourceObj)
      const render2 = getRenderComponent(targetObj)
      const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
      const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

      // ポート位置を取得
      const sourcePorts = getConnectionPortComponents(sourceObj)
      const targetPorts = getConnectionPortComponents(targetObj)
      const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
      const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

      if (sourcePort && targetPort) {
        // ポートの実際の位置を計算
        const port1Pos = calculatePortPosition(pos1, size1, sourcePort.data.position)
        const port2Pos = calculatePortPosition(pos2, size2, targetPort.data.position)

        // ポート間の距離と方向を計算
        const dx = port2Pos.x - port1Pos.x
        const dy = port2Pos.y - port1Pos.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        // ポートの辺配置を取得
        const sourceSide = sourcePort.data.position.side
        const targetSide = targetPort.data.position.side

        const idealDistance = spacing * 1.5
        const attraction = (distance - idealDistance) * 0.005 * temperature
        
        // 辺配置に基づいた方向性の重み付け
        let weightX = 1.0
        let weightY = 0.3  // デフォルトでY方向を弱める（水平配置を促進）
        
        // ポートの辺配置に基づいた配置制約を追加
        const sourceCenterX = pos1.x + size1.width / 2
        const targetCenterX = pos2.x + size2.width / 2
        const sourceCenterY = pos1.y + size1.height / 2
        const targetCenterY = pos2.y + size2.height / 2
        
        // 水平方向の接続（左↔右）を優先
        if ((sourceSide === Side.LEFT && targetSide === Side.RIGHT) ||
            (sourceSide === Side.RIGHT && targetSide === Side.LEFT)) {
          weightX = 1.5
          weightY = 0.2
          
          // 配置制約：右辺のポートを持つオブジェクトを左辺のポートを持つオブジェクトの左側に配置
          if (sourceSide === Side.RIGHT && targetSide === Side.LEFT) {
            // 機材A（右辺）→ 機材B（左辺）：AをBの左側に配置
            if (sourceCenterX >= targetCenterX) {
              // AがBの右側にある場合、強制的に左側に移動させる力
              const constraintForce = 0.1 * temperature
              forces[wire.sourceObjectId].x -= constraintForce
              forces[wire.targetObjectId].x += constraintForce
            }
          } else if (sourceSide === Side.LEFT && targetSide === Side.RIGHT) {
            // 機材A（左辺）→ 機材B（右辺）：AをBの左側に配置
            if (sourceCenterX >= targetCenterX) {
              // AがBの右側にある場合、強制的に左側に移動させる力
              const constraintForce = 0.1 * temperature
              forces[wire.sourceObjectId].x -= constraintForce
              forces[wire.targetObjectId].x += constraintForce
            }
          }
        }
        // 垂直方向の接続（上↔下）を優先
        else if ((sourceSide === Side.TOP && targetSide === Side.BOTTOM) ||
                 (sourceSide === Side.BOTTOM && targetSide === Side.TOP)) {
          weightX = 0.3
          weightY = 1.0
          
          // 配置制約：下辺のポートを持つオブジェクトを上辺のポートを持つオブジェクトの下側に配置
          if (sourceSide === Side.BOTTOM && targetSide === Side.TOP) {
            // 機材A（下辺）→ 機材B（上辺）：AをBの下側に配置
            if (sourceCenterY <= targetCenterY) {
              // AがBの上側にある場合、強制的に下側に移動させる力
              const constraintForce = 0.1 * temperature
              forces[wire.sourceObjectId].y += constraintForce
              forces[wire.targetObjectId].y -= constraintForce
            }
          } else if (sourceSide === Side.TOP && targetSide === Side.BOTTOM) {
            // 機材A（上辺）→ 機材B（下辺）：AをBの上側に配置
            if (sourceCenterY >= targetCenterY) {
              // AがBの下側にある場合、強制的に上側に移動させる力
              const constraintForce = 0.1 * temperature
              forces[wire.sourceObjectId].y -= constraintForce
              forces[wire.targetObjectId].y += constraintForce
            }
          }
        }
        // 同じ辺のポートの場合は、整列を優先
        else if (sourceSide === targetSide) {
          if (sourceSide === Side.LEFT || sourceSide === Side.RIGHT) {
            weightX = 0.2
            weightY = 0.8  // Y方向の整列を優先
          } else {
            weightX = 0.8  // X方向の整列を優先
            weightY = 0.2
          }
        }
        
        forces[wire.sourceObjectId].x += (dx / distance) * attraction * weightX
        forces[wire.sourceObjectId].y += (dy / distance) * attraction * weightY
        forces[wire.targetObjectId].x -= (dx / distance) * attraction * weightX
        forces[wire.targetObjectId].y -= (dy / distance) * attraction * weightY
      } else {
        // ポートが見つからない場合は、オブジェクトの中心を使用（フォールバック）
        const dx = (pos2.x + size2.width / 2) - (pos1.x + size1.width / 2)
        const dy = (pos2.y + size2.height / 2) - (pos1.y + size1.height / 2)
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const idealDistance = spacing * 2.5
        const attraction = (distance - idealDistance) * 0.005 * temperature
        forces[wire.sourceObjectId].x += (dx / distance) * attraction
        forces[wire.sourceObjectId].y += (dy / distance) * attraction * 0.3
        forces[wire.targetObjectId].x -= (dx / distance) * attraction
        forces[wire.targetObjectId].y -= (dy / distance) * attraction * 0.3
      }
    })

    // 位置を更新
    objects.forEach(obj => {
      const pos = positions[obj.id]
      if (!pos) return
      const force = forces[obj.id]
      positions[obj.id] = {
        x: pos.x + force.x,
        y: pos.y + force.y
      }
    })
  }
}

// Helper function: Apply global force layout for final balance
function applyGlobalForceLayout(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): void {
  const { spacing } = options
  const iterations = 20

  for (let iter = 0; iter < iterations; iter++) {
    const forces: Record<string, { x: number; y: number }> = {}
    objects.forEach(obj => {
      forces[obj.id] = { x: 0, y: 0 }
    })

    // 反発力（すべてのノード間）
    objects.forEach(obj1 => {
      objects.forEach(obj2 => {
        if (obj1.id === obj2.id) return

        const pos1 = positions[obj1.id]
        const pos2 = positions[obj2.id]
        if (!pos1 || !pos2) return

        const render1 = getRenderComponent(obj1)
        const render2 = getRenderComponent(obj2)
        const width1 = render1?.data.size.width || 100
        const height1 = render1?.data.size.height || 60
        const width2 = render2?.data.size.width || 100
        const height2 = render2?.data.size.height || 60

        const dx = (pos1.x + width1 / 2) - (pos2.x + width2 / 2)
        const dy = (pos1.y + height1 / 2) - (pos2.y + height2 / 2)
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const minDistance = Math.max(width1, height1, width2, height2) + spacing
        const repulsion = minDistance * minDistance / distance
        forces[obj1.id].x += (dx / distance) * repulsion * 0.01
        forces[obj1.id].y += (dy / distance) * repulsion * 0.01
      })
    })

    // 引力（接続されたノード間）
    wires.forEach(wire => {
      const pos1 = positions[wire.sourceObjectId]
      const pos2 = positions[wire.targetObjectId]
      if (!pos1 || !pos2) return

      const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
      const targetObj = objects.find(o => o.id === wire.targetObjectId)
      if (!sourceObj || !targetObj) return

      const render1 = getRenderComponent(sourceObj)
      const render2 = getRenderComponent(targetObj)
      const width1 = render1?.data.size.width || 100
      const height1 = render1?.data.size.height || 60
      const width2 = render2?.data.size.width || 100
      const height2 = render2?.data.size.height || 60

      const dx = (pos2.x + width2 / 2) - (pos1.x + width1 / 2)
      const dy = (pos2.y + height2 / 2) - (pos1.y + height1 / 2)
      const distance = Math.sqrt(dx * dx + dy * dy) || 1

      const idealDistance = spacing * 2.5
      const attraction = (distance - idealDistance) * 0.005
      forces[wire.sourceObjectId].x += (dx / distance) * attraction
      forces[wire.sourceObjectId].y += (dy / distance) * attraction
      forces[wire.targetObjectId].x -= (dx / distance) * attraction
      forces[wire.targetObjectId].y -= (dy / distance) * attraction
    })

    // 位置を更新
    objects.forEach(obj => {
      const pos = positions[obj.id]
      if (!pos) return
      const force = forces[obj.id]
      positions[obj.id] = {
        x: pos.x + force.x,
        y: pos.y + force.y
      }
    })
  }
}

// Helper function: Apply global force layout with horizontal alignment (async version with progress)
async function applyGlobalForceLayoutWithHorizontalAlignmentAsync(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions,
  onProgress?: (progress: number) => void
): Promise<void> {
  const { spacing } = options
  
  const yCoords = objects.map(obj => {
    const pos = positions[obj.id]
    if (!pos) return 0
    const render = getRenderComponent(obj)
    const height = render?.data.size.height || 60
    return pos.y + height / 2
  })
  const targetY = yCoords.reduce((a, b) => a + b, 0) / yCoords.length
  
  let temperature = 1.0
  const coolingRate = 0.95
  
  for (let iteration = 0; iteration < 50; iteration++) {
    temperature *= coolingRate
    const forces: Record<string, { x: number; y: number }> = {}
    
    objects.forEach(obj => {
      forces[obj.id] = { x: 0, y: 0 }
    })

    // 反発力（ノード間）
    objects.forEach(obj1 => {
      objects.forEach(obj2 => {
        if (obj1.id === obj2.id) return

        const pos1 = positions[obj1.id]
        const pos2 = positions[obj2.id]
        if (!pos1 || !pos2) return

        const render1 = getRenderComponent(obj1)
        const render2 = getRenderComponent(obj2)
        const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
        const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

        const center1 = {
          x: pos1.x + size1.width / 2,
          y: pos1.y + size1.height / 2
        }
        const center2 = {
          x: pos2.x + size2.width / 2,
          y: pos2.y + size2.height / 2
        }

        const dx = center1.x - center2.x
        const dy = center1.y - center2.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const minDistance = spacing * 1.5
        const repulsion = (minDistance * minDistance) / (distance * distance + 1)
        forces[obj1.id].x += (dx / distance) * repulsion * 0.1 * temperature
        forces[obj1.id].y += (dy / distance) * repulsion * 0.1 * temperature
      })
    })

    // 引力（接続されたノード間、ポート位置を考慮）
    wires.forEach(wire => {
      const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
      const targetObj = objects.find(o => o.id === wire.targetObjectId)
      if (!sourceObj || !targetObj) return

      const sourcePos = positions[wire.sourceObjectId]
      const targetPos = positions[wire.targetObjectId]
      if (!sourcePos || !targetPos) return

      const render1 = getRenderComponent(sourceObj)
      const render2 = getRenderComponent(targetObj)
      const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
      const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

      const sourcePorts = getConnectionPortComponents(sourceObj)
      const targetPorts = getConnectionPortComponents(targetObj)
      const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
      const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

      if (sourcePort && targetPort) {
        const port1Pos = calculatePortPosition(sourcePos, size1, sourcePort.data.position)
        const port2Pos = calculatePortPosition(targetPos, size2, targetPort.data.position)

        const dx = port2Pos.x - port1Pos.x
        const dy = port2Pos.y - port1Pos.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const idealDistance = spacing * 1.5
        const attraction = (distance - idealDistance) * 0.005 * temperature
        
        // ポートの辺配置を取得
        const sourceSide = sourcePort.data.position.side
        const targetSide = targetPort.data.position.side

        const sourceCenterX = sourcePos.x + size1.width / 2
        const targetCenterX = targetPos.x + size2.width / 2
        const sourceCenterY = sourcePos.y + size1.height / 2
        const targetCenterY = targetPos.y + size2.height / 2
        
        // 辺配置に基づいた方向性の重み付け
        let weightX = 1.0
        let weightY = 0.3  // デフォルトでY方向を弱める（水平配置を促進）
        
        // 水平方向の接続（左↔右）を優先
        if ((sourceSide === Side.LEFT && targetSide === Side.RIGHT) ||
            (sourceSide === Side.RIGHT && targetSide === Side.LEFT)) {
          weightX = 1.5
          weightY = 0.2
          
          // 配置制約：右辺のポートを持つオブジェクトを左辺のポートを持つオブジェクトの左側に配置
          if (sourceSide === Side.RIGHT && targetSide === Side.LEFT) {
            // 機材A（右辺）→ 機材B（左辺）：AをBの左側に配置
            if (sourceCenterX >= targetCenterX) {
              // AがBの右側にある場合、強制的に左側に移動させる力
              const constraintForce = 0.1 * temperature
              forces[wire.sourceObjectId].x -= constraintForce
              forces[wire.targetObjectId].x += constraintForce
            }
          } else if (sourceSide === Side.LEFT && targetSide === Side.RIGHT) {
            // 機材A（左辺）→ 機材B（右辺）：AをBの左側に配置
            if (sourceCenterX >= targetCenterX) {
              // AがBの右側にある場合、強制的に左側に移動させる力
              const constraintForce = 0.1 * temperature
              forces[wire.sourceObjectId].x -= constraintForce
              forces[wire.targetObjectId].x += constraintForce
            }
          }
        }
        // 垂直方向の接続（上↔下）を優先
        else if ((sourceSide === Side.TOP && targetSide === Side.BOTTOM) ||
                 (sourceSide === Side.BOTTOM && targetSide === Side.TOP)) {
          weightX = 0.3
          weightY = 1.0
          
          // 配置制約：下辺のポートを持つオブジェクトを上辺のポートを持つオブジェクトの下側に配置
          if (sourceSide === Side.BOTTOM && targetSide === Side.TOP) {
            // 機材A（下辺）→ 機材B（上辺）：AをBの下側に配置
            if (sourceCenterY <= targetCenterY) {
              // AがBの上側にある場合、強制的に下側に移動させる力
              const constraintForce = 0.1 * temperature
              forces[wire.sourceObjectId].y += constraintForce
              forces[wire.targetObjectId].y -= constraintForce
            }
          } else if (sourceSide === Side.TOP && targetSide === Side.BOTTOM) {
            // 機材A（上辺）→ 機材B（下辺）：AをBの上側に配置
            if (sourceCenterY >= targetCenterY) {
              // AがBの下側にある場合、強制的に上側に移動させる力
              const constraintForce = 0.1 * temperature
              forces[wire.sourceObjectId].y -= constraintForce
              forces[wire.targetObjectId].y += constraintForce
            }
          }
        }
        // 同じ辺のポートの場合は、整列を優先
        else if (sourceSide === targetSide) {
          if (sourceSide === Side.LEFT || sourceSide === Side.RIGHT) {
            weightX = 0.2
            weightY = 0.8  // Y方向の整列を優先
          } else {
            weightX = 0.8  // X方向の整列を優先
            weightY = 0.2
          }
        }
        
        forces[wire.sourceObjectId].x += (dx / distance) * attraction * weightX
        forces[wire.sourceObjectId].y += (dy / distance) * attraction * weightY
        forces[wire.targetObjectId].x -= (dx / distance) * attraction * weightX
        forces[wire.targetObjectId].y -= (dy / distance) * attraction * weightY
      } else {
        const center1 = {
          x: sourcePos.x + size1.width / 2,
          y: sourcePos.y + size1.height / 2
        }
        const center2 = {
          x: targetPos.x + size2.width / 2,
          y: targetPos.y + size2.height / 2
        }

        const dx = center2.x - center1.x
        const dy = center2.y - center1.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1

        const idealDistance = spacing * 1.5
        const attraction = (distance - idealDistance) * 0.005 * temperature
        forces[wire.sourceObjectId].x += (dx / distance) * attraction
        forces[wire.sourceObjectId].y += (dy / distance) * attraction * 0.3
        forces[wire.targetObjectId].x -= (dx / distance) * attraction
        forces[wire.targetObjectId].y -= (dy / distance) * attraction * 0.3
      }
    })

    // 位置を更新
    objects.forEach(obj => {
      const pos = positions[obj.id]
      if (!pos) return
      const force = forces[obj.id]
      positions[obj.id] = {
        x: pos.x + force.x,
        y: pos.y + force.y
      }
    })

    if (onProgress) {
      onProgress(((iteration + 1) / 50) * 100)
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

// Helper function: Optimize layout based on port positions
function optimizePortBasedLayout(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): void {
  const { spacing } = options
  const iterations = 30  // イテレーション数を増やす

  for (let iter = 0; iter < iterations; iter++) {
    const adjustments: Record<string, { x: number; y: number }> = {}
    objects.forEach(obj => {
      adjustments[obj.id] = { x: 0, y: 0 }
    })

    // 各接続について、ポートの実際の位置を考慮した最適化
    wires.forEach(wire => {
      const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
      const targetObj = objects.find(o => o.id === wire.targetObjectId)
      if (!sourceObj || !targetObj) return

      const sourcePos = positions[wire.sourceObjectId]
      const targetPos = positions[wire.targetObjectId]
      if (!sourcePos || !targetPos) return

      // ポート位置を取得
      const sourcePorts = getConnectionPortComponents(sourceObj)
      const targetPorts = getConnectionPortComponents(targetObj)
      const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
      const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

      if (!sourcePort || !targetPort) return

      const render1 = getRenderComponent(sourceObj)
      const render2 = getRenderComponent(targetObj)
      const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
      const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

      // ポートの絶対位置を計算（offsetを含む）
      const port1Pos = calculatePortPosition(sourcePos, size1, sourcePort.data.position)
      const port2Pos = calculatePortPosition(targetPos, size2, targetPort.data.position)

      // ポート間の距離と方向を計算
      const dx = port2Pos.x - port1Pos.x
      const dy = port2Pos.y - port1Pos.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1

      // ポートの辺配置を取得
      const sourceSide = sourcePort.data.position.side
      const targetSide = targetPort.data.position.side

      // 理想的な距離（ポート間の距離を最小化）
      const idealDistance = spacing * 1.5
      const distanceDiff = distance - idealDistance
      
      // ポート位置を考慮した調整（辺配置も考慮）
      const adjustmentStrength = 0.05 * (1 - iter / iterations)  // イテレーションが進むにつれて弱める
      
      // 辺配置に基づいた方向性の重み付け
      let weightX = 1.0
      let weightY = 1.0
      
      // ポートの辺配置に基づいた配置制約を追加
      const sourceCenterX = sourcePos.x + size1.width / 2
      const targetCenterX = targetPos.x + size2.width / 2
      const sourceCenterY = sourcePos.y + size1.height / 2
      const targetCenterY = targetPos.y + size2.height / 2
      
      // 水平方向の接続（左↔右）を優先
      if ((sourceSide === Side.LEFT && targetSide === Side.RIGHT) ||
          (sourceSide === Side.RIGHT && targetSide === Side.LEFT)) {
        weightX = 1.5  // X方向の調整を強化
        weightY = 0.5  // Y方向の調整を弱化
        
        // 配置制約：右辺のポートを持つオブジェクトを左辺のポートを持つオブジェクトの左側に配置
        if (sourceSide === Side.RIGHT && targetSide === Side.LEFT) {
          // 機材A（右辺）→ 機材B（左辺）：AをBの左側に配置
          if (sourceCenterX >= targetCenterX) {
            // AがBの右側にある場合、強制的に左側に移動させる力
            const constraintStrength = 0.15 * (1 - iter / iterations)
            adjustments[wire.sourceObjectId].x -= constraintStrength
            adjustments[wire.targetObjectId].x += constraintStrength
          }
        } else if (sourceSide === Side.LEFT && targetSide === Side.RIGHT) {
          // 機材A（左辺）→ 機材B（右辺）：AをBの左側に配置
          if (sourceCenterX >= targetCenterX) {
            // AがBの右側にある場合、強制的に左側に移動させる力
            const constraintStrength = 0.15 * (1 - iter / iterations)
            adjustments[wire.sourceObjectId].x -= constraintStrength
            adjustments[wire.targetObjectId].x += constraintStrength
          }
        }
      }
      // 垂直方向の接続（上↔下）を優先
      else if ((sourceSide === Side.TOP && targetSide === Side.BOTTOM) ||
               (sourceSide === Side.BOTTOM && targetSide === Side.TOP)) {
        weightX = 0.5  // X方向の調整を弱化
        weightY = 1.5  // Y方向の調整を強化
        
        // 配置制約：下辺のポートを持つオブジェクトを上辺のポートを持つオブジェクトの下側に配置
        if (sourceSide === Side.BOTTOM && targetSide === Side.TOP) {
          // 機材A（下辺）→ 機材B（上辺）：AをBの下側に配置
          if (sourceCenterY <= targetCenterY) {
            // AがBの上側にある場合、強制的に下側に移動させる力
            const constraintStrength = 0.15 * (1 - iter / iterations)
            adjustments[wire.sourceObjectId].y += constraintStrength
            adjustments[wire.targetObjectId].y -= constraintStrength
          }
        } else if (sourceSide === Side.TOP && targetSide === Side.BOTTOM) {
          // 機材A（上辺）→ 機材B（下辺）：AをBの上側に配置
          if (sourceCenterY >= targetCenterY) {
            // AがBの下側にある場合、強制的に上側に移動させる力
            const constraintStrength = 0.15 * (1 - iter / iterations)
            adjustments[wire.sourceObjectId].y -= constraintStrength
            adjustments[wire.targetObjectId].y += constraintStrength
          }
        }
      }
      // 同じ辺のポート（例：左↔左）の場合は、Y方向の整列を優先
      else if (sourceSide === targetSide) {
        if (sourceSide === Side.LEFT || sourceSide === Side.RIGHT) {
          weightX = 0.3  // X方向の調整を弱化
          weightY = 1.0  // Y方向の整列を優先
        } else {
          weightX = 1.0  // X方向の整列を優先
          weightY = 0.3  // Y方向の調整を弱化
        }
      }
      
      const adjustmentX = (dx / distance) * distanceDiff * adjustmentStrength * weightX
      const adjustmentY = (dy / distance) * distanceDiff * adjustmentStrength * weightY

      // ポート位置と辺配置を考慮して、オブジェクトを調整
      adjustments[wire.sourceObjectId].x += adjustmentX
      adjustments[wire.sourceObjectId].y += adjustmentY
      adjustments[wire.targetObjectId].x -= adjustmentX
      adjustments[wire.targetObjectId].y -= adjustmentY
    })

    // 位置を更新
    objects.forEach(obj => {
      const pos = positions[obj.id]
      if (!pos) return
      const adj = adjustments[obj.id]
      positions[obj.id] = {
        x: pos.x + adj.x,
        y: pos.y + adj.y
      }
    })
  }
}

// Helper function: Optimize layout based on port positions (async version with progress)
async function optimizePortBasedLayoutAsync(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions,
  onProgress?: (progress: number) => void
): Promise<void> {
  const { spacing } = options
  const iterations = 30

  for (let iter = 0; iter < iterations; iter++) {
    const adjustments: Record<string, { x: number; y: number }> = {}
    objects.forEach(obj => {
      adjustments[obj.id] = { x: 0, y: 0 }
    })

    wires.forEach(wire => {
      const sourceObj = objects.find(o => o.id === wire.sourceObjectId)
      const targetObj = objects.find(o => o.id === wire.targetObjectId)
      if (!sourceObj || !targetObj) return

      const sourcePos = positions[wire.sourceObjectId]
      const targetPos = positions[wire.targetObjectId]
      if (!sourcePos || !targetPos) return

      const sourcePorts = getConnectionPortComponents(sourceObj)
      const targetPorts = getConnectionPortComponents(targetObj)
      const sourcePort = sourcePorts.find(p => p.id === wire.sourcePortId)
      const targetPort = targetPorts.find(p => p.id === wire.targetPortId)

      if (!sourcePort || !targetPort) return

      const render1 = getRenderComponent(sourceObj)
      const render2 = getRenderComponent(targetObj)
      const size1 = { width: render1?.data.size.width || 100, height: render1?.data.size.height || 60 }
      const size2 = { width: render2?.data.size.width || 100, height: render2?.data.size.height || 60 }

      const port1Pos = calculatePortPosition(sourcePos, size1, sourcePort.data.position)
      const port2Pos = calculatePortPosition(targetPos, size2, targetPort.data.position)

      const dx = port2Pos.x - port1Pos.x
      const dy = port2Pos.y - port1Pos.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1

      const sourceSide = sourcePort.data.position.side
      const targetSide = targetPort.data.position.side

      const idealDistance = spacing * 1.5
      const distanceDiff = distance - idealDistance
      const adjustmentStrength = 0.05 * (1 - iter / iterations)
      
      let weightX = 1.0
      let weightY = 1.0
      
      const sourceCenterX = sourcePos.x + size1.width / 2
      const targetCenterX = targetPos.x + size2.width / 2
      const sourceCenterY = sourcePos.y + size1.height / 2
      const targetCenterY = targetPos.y + size2.height / 2
      
      if ((sourceSide === Side.LEFT && targetSide === Side.RIGHT) ||
          (sourceSide === Side.RIGHT && targetSide === Side.LEFT)) {
        weightX = 1.5
        weightY = 0.5
        
        if (sourceSide === Side.RIGHT && targetSide === Side.LEFT) {
          if (sourceCenterX >= targetCenterX) {
            const constraintStrength = 0.15 * (1 - iter / iterations)
            adjustments[wire.sourceObjectId].x -= constraintStrength
            adjustments[wire.targetObjectId].x += constraintStrength
          }
        } else if (sourceSide === Side.LEFT && targetSide === Side.RIGHT) {
          if (sourceCenterX >= targetCenterX) {
            const constraintStrength = 0.15 * (1 - iter / iterations)
            adjustments[wire.sourceObjectId].x -= constraintStrength
            adjustments[wire.targetObjectId].x += constraintStrength
          }
        }
      }
      else if ((sourceSide === Side.TOP && targetSide === Side.BOTTOM) ||
               (sourceSide === Side.BOTTOM && targetSide === Side.TOP)) {
        weightX = 0.5
        weightY = 1.5
        
        if (sourceSide === Side.BOTTOM && targetSide === Side.TOP) {
          if (sourceCenterY <= targetCenterY) {
            const constraintStrength = 0.15 * (1 - iter / iterations)
            adjustments[wire.sourceObjectId].y += constraintStrength
            adjustments[wire.targetObjectId].y -= constraintStrength
          }
        } else if (sourceSide === Side.TOP && targetSide === Side.BOTTOM) {
          if (sourceCenterY >= targetCenterY) {
            const constraintStrength = 0.15 * (1 - iter / iterations)
            adjustments[wire.sourceObjectId].y -= constraintStrength
            adjustments[wire.targetObjectId].y += constraintStrength
          }
        }
      }
      else if (sourceSide === targetSide) {
        if (sourceSide === Side.LEFT || sourceSide === Side.RIGHT) {
          weightX = 0.3
          weightY = 1.0
        } else {
          weightX = 1.0
          weightY = 0.3
        }
      }
      
      const adjustmentX = (dx / distance) * distanceDiff * adjustmentStrength * weightX
      const adjustmentY = (dy / distance) * distanceDiff * adjustmentStrength * weightY

      adjustments[wire.sourceObjectId].x += adjustmentX
      adjustments[wire.sourceObjectId].y += adjustmentY
      adjustments[wire.targetObjectId].x -= adjustmentX
      adjustments[wire.targetObjectId].y -= adjustmentY
    })

    objects.forEach(obj => {
      const pos = positions[obj.id]
      if (!pos) return
      const adj = adjustments[obj.id]
      positions[obj.id] = {
        x: pos.x + adj.x,
        y: pos.y + adj.y
      }
    })

    if (onProgress) {
      onProgress(((iter + 1) / iterations) * 100)
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

// Helper function: Optimize connection direction
function optimizeConnectionDirection(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): void {
  // 接続の方向性を分析して、より自然な配置に調整
  const directionGroups: Record<string, { sources: string[]; targets: string[] }> = {}

  objects.forEach(obj => {
    directionGroups[obj.id] = { sources: [], targets: [] }
  })

  wires.forEach(wire => {
    directionGroups[wire.sourceObjectId].targets.push(wire.targetObjectId)
    directionGroups[wire.targetObjectId].sources.push(wire.sourceObjectId)
  })

  // 入力が多いオブジェクトを左/上に、出力が多いオブジェクトを右/下に配置
  const adjustments: Record<string, { x: number; y: number }> = {}
  objects.forEach(obj => {
    adjustments[obj.id] = { x: 0, y: 0 }
  })

  objects.forEach(obj => {
    const sources = directionGroups[obj.id].sources.length
    const targets = directionGroups[obj.id].targets.length

    // 入力が多い場合は左/上に、出力が多い場合は右/下に
    if (sources > targets) {
      adjustments[obj.id].x -= 10
      adjustments[obj.id].y -= 10
    } else if (targets > sources) {
      adjustments[obj.id].x += 10
      adjustments[obj.id].y += 10
    }
  })

  // 位置を更新
  objects.forEach(obj => {
    const pos = positions[obj.id]
    if (!pos) return
    const adj = adjustments[obj.id]
    positions[obj.id] = {
      x: pos.x + adj.x * 0.1,
      y: pos.y + adj.y * 0.1
    }
  })
}

// Helper function: Improve visual hierarchy
function improveVisualHierarchy(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): void {
  // 全体の重心を計算
  let totalX = 0
  let totalY = 0
  let totalWeight = 0

  objects.forEach(obj => {
    const pos = positions[obj.id]
    if (!pos) return

    const render = getRenderComponent(obj)
    const width = render?.data.size.width || 100
    const height = render?.data.size.height || 60
    const weight = width * height

    totalX += pos.x * weight
    totalY += pos.y * weight
    totalWeight += weight
  })

  if (totalWeight === 0) return

  const centerX = totalX / totalWeight
  const centerY = totalY / totalWeight

  // 接続密度が高いオブジェクトを中心に近づける
  const connectionDensity: Record<string, number> = {}
  objects.forEach(obj => {
    connectionDensity[obj.id] = 0
  })

  wires.forEach(wire => {
    connectionDensity[wire.sourceObjectId]++
    connectionDensity[wire.targetObjectId]++
  })

  // 接続密度が高いオブジェクトを中心に近づける
  objects.forEach(obj => {
    const pos = positions[obj.id]
    if (!pos) return

    const density = connectionDensity[obj.id] || 0
    if (density > 0) {
      const dx = centerX - pos.x
      const dy = centerY - pos.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1

      const attraction = density * 0.5
      positions[obj.id] = {
        x: pos.x + (dx / distance) * attraction,
        y: pos.y + (dy / distance) * attraction
      }
    }
  })
}

// Helper function: Analyze signal flow
function analyzeSignalFlow(
  objects: EquipmentObject[],
  wires: Wire[]
): {
  inputs: string[]
  processors: string[][]
  outputs: string[]
} {
  const graph = buildConnectionGraph(objects, wires)
  const inDegree: Record<string, number> = {}
  const outDegree: Record<string, number> = {}

  // 入次数・出次数を計算
  objects.forEach(obj => {
    inDegree[obj.id] = 0
    outDegree[obj.id] = 0
  })

  wires.forEach(wire => {
    outDegree[wire.sourceObjectId]++
    inDegree[wire.targetObjectId]++
  })

  // 分類
  const inputs: string[] = []
  const outputs: string[] = []
  const processors: string[] = []

  objects.forEach(obj => {
    const inCount = inDegree[obj.id]
    const outCount = outDegree[obj.id]

    if (inCount === 0 && outCount > 0) {
      inputs.push(obj.id)
    } else if (inCount > 0 && outCount === 0) {
      outputs.push(obj.id)
    } else {
      processors.push(obj.id)
    }
  })

  // プロセッサーを複数レイヤーに分割（簡易版）
  const processorLayers: string[][] = []
  if (processors.length > 0) {
    const layerSize = Math.ceil(Math.sqrt(processors.length))
    for (let i = 0; i < processors.length; i += layerSize) {
      processorLayers.push(processors.slice(i, i + layerSize))
    }
  }

  return {
    inputs,
    processors: processorLayers,
    outputs
  }
}

// Helper function: Optimize wire routing to avoid node overlap
function optimizeWireRouting(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): void {
  const { spacing } = options

  // Create node boundaries for collision detection
  const nodeBounds = objects.map(obj => {
    const pos = positions[obj.id]
    if (!pos) return null

    const renderComponent = getRenderComponent(obj)
    const width = renderComponent?.data.size.width || 100
    const height = renderComponent?.data.size.height || 60

    return {
      id: obj.id,
      x: pos.x,
      y: pos.y,
      width,
      height,
      centerX: pos.x + width / 2,
      centerY: pos.y + height / 2
    }
  }).filter(Boolean)

  // Analyze wire paths and adjust node positions to minimize overlap
  wires.forEach(wire => {
    const sourcePos = positions[wire.sourceObjectId]
    const targetPos = positions[wire.targetObjectId]

    if (!sourcePos || !targetPos) return

    const sourceBounds = nodeBounds.find(b => b?.id === wire.sourceObjectId)
    const targetBounds = nodeBounds.find(b => b?.id === wire.targetObjectId)

    if (!sourceBounds || !targetBounds) return

    // Check if wire path intersects with other nodes
    const wireIntersections = findWireNodeIntersections(
      sourceBounds,
      targetBounds,
      nodeBounds.filter(b => b && b.id !== wire.sourceObjectId && b.id !== wire.targetObjectId)
    )

    // If intersections found, try to adjust positions
    if (wireIntersections.length > 0) {
      adjustPositionsForWireClearing(
        positions,
        wireIntersections,
        sourceBounds,
        targetBounds,
        spacing
      )
    }
  })
}

// Helper function: Find intersections between wire and nodes
function findWireNodeIntersections(
  source: { x: number; y: number; width: number; height: number; centerX: number; centerY: number },
  target: { x: number; y: number; width: number; height: number; centerX: number; centerY: number },
  otherNodes: Array<{ id: string; x: number; y: number; width: number; height: number; centerX: number; centerY: number } | null>
): Array<{ id: string; x: number; y: number; width: number; height: number }> {
  const intersections: Array<{ id: string; x: number; y: number; width: number; height: number }> = []

  // Simple line-rectangle intersection check
  otherNodes.forEach(node => {
    if (!node) return

    if (lineIntersectsRectangle(
      source.centerX, source.centerY,
      target.centerX, target.centerY,
      node.x, node.y, node.width, node.height
    )) {
      intersections.push({
        id: node.id,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
      })
    }
  })

  return intersections
}

// Helper function: Check if line intersects rectangle (excluding boundary points)
// ポート位置は機材の境界上にあるため、端点が境界上にある場合は交差としてカウントしない
function lineIntersectsRectangle(
  x1: number, y1: number, x2: number, y2: number,
  rectX: number, rectY: number, rectWidth: number, rectHeight: number
): boolean {
  const left = rectX
  const right = rectX + rectWidth
  const top = rectY
  const bottom = rectY + rectHeight

  // 許容誤差（境界上の点を除外するための閾値）
  const epsilon = 0.5

  // 線分の端点が矩形の内部（境界を除く）にあるかチェック
  const point1Inside = x1 > left + epsilon && x1 < right - epsilon && 
                       y1 > top + epsilon && y1 < bottom - epsilon
  const point2Inside = x2 > left + epsilon && x2 < right - epsilon && 
                       y2 > top + epsilon && y2 < bottom - epsilon
  
  if (point1Inside || point2Inside) {
    return true
  }

  // 線分が矩形の境界と交差するかチェック（端点は除外）
  const dx = x2 - x1
  const dy = y2 - y1

  // 水平線の場合
  if (Math.abs(dy) < 0.001) {
    // 境界上にある場合は除外
    if (Math.abs(y1 - top) < epsilon || Math.abs(y1 - bottom) < epsilon) {
      return false
    }
    // 線分が矩形の水平範囲と重なるかチェック（内部を通過する場合のみ）
    if (y1 > top + epsilon && y1 < bottom - epsilon) {
      return Math.min(x1, x2) < right - epsilon && Math.max(x1, x2) > left + epsilon
    }
    return false
  }

  // 垂直線の場合
  if (Math.abs(dx) < 0.001) {
    // 境界上にある場合は除外
    if (Math.abs(x1 - left) < epsilon || Math.abs(x1 - right) < epsilon) {
      return false
    }
    // 線分が矩形の垂直範囲と重なるかチェック（内部を通過する場合のみ）
    if (x1 > left + epsilon && x1 < right - epsilon) {
      return Math.min(y1, y2) < bottom - epsilon && Math.max(y1, y2) > top + epsilon
    }
    return false
  }

  // 一般の線分の場合
  const m = dy / dx
  const b = y1 - m * x1

  // 線分のパラメータ範囲 [0, 1]（端点は除外）
  const tMin = 0.001
  const tMax = 0.999

  // 矩形の各辺との交点をチェック
  // 左辺: x = left
  const tLeft = (left - x1) / dx
  if (tLeft > tMin && tLeft < tMax) {
    const y = m * left + b
    if (y > top + epsilon && y < bottom - epsilon) {
      return true
    }
  }

  // 右辺: x = right
  const tRight = (right - x1) / dx
  if (tRight > tMin && tRight < tMax) {
    const y = m * right + b
    if (y > top + epsilon && y < bottom - epsilon) {
      return true
    }
  }

  // 上辺: y = top
  const tTop = (top - y1) / dy
  if (tTop > tMin && tTop < tMax) {
    const x = (top - b) / m
    if (x > left + epsilon && x < right - epsilon) {
      return true
    }
  }

  // 下辺: y = bottom
  const tBottom = (bottom - y1) / dy
  if (tBottom > tMin && tBottom < tMax) {
    const x = (bottom - b) / m
    if (x > left + epsilon && x < right - epsilon) {
      return true
    }
  }

  return false
}

// Helper function: Adjust positions to clear wire paths
function adjustPositionsForWireClearing(
  positions: Record<string, { x: number; y: number }>,
  intersections: Array<{ id: string; x: number; y: number; width: number; height: number }>,
  source: { centerX: number; centerY: number },
  target: { centerX: number; centerY: number },
  spacing: number
): void {
  intersections.forEach(intersection => {
    const currentPos = positions[intersection.id]
    if (!currentPos) return

    // Calculate wire direction
    const wireAngle = Math.atan2(target.centerY - source.centerY, target.centerX - source.centerX)

    // Move node perpendicular to wire direction
    const perpAngle = wireAngle + Math.PI / 2
    const moveDistance = spacing * 0.8

    // Try moving in both perpendicular directions and choose the one with less conflict
    const option1 = {
      x: currentPos.x + Math.cos(perpAngle) * moveDistance,
      y: currentPos.y + Math.sin(perpAngle) * moveDistance
    }

    const option2 = {
      x: currentPos.x - Math.cos(perpAngle) * moveDistance,
      y: currentPos.y - Math.sin(perpAngle) * moveDistance
    }

    // Choose option that moves node further from wire center
    const wireCenterX = (source.centerX + target.centerX) / 2
    const wireCenterY = (source.centerY + target.centerY) / 2

    const dist1 = Math.sqrt(
      Math.pow(option1.x + intersection.width / 2 - wireCenterX, 2) +
      Math.pow(option1.y + intersection.height / 2 - wireCenterY, 2)
    )

    const dist2 = Math.sqrt(
      Math.pow(option2.x + intersection.width / 2 - wireCenterX, 2) +
      Math.pow(option2.y + intersection.height / 2 - wireCenterY, 2)
    )

    positions[intersection.id] = dist1 > dist2 ? option1 : option2
  })
}

// Helper function: Resolve overlapping nodes
function resolveNodeOverlaps(
  positions: Record<string, { x: number; y: number }>,
  objects: EquipmentObject[],
  options: LayoutOptions
): void {
  const { spacing } = options
  const minSpacing = spacing * 0.5 // Minimum spacing between nodes

  // Create node bounds for all objects
  const nodeBounds = objects.map(obj => {
    const pos = positions[obj.id]
    if (!pos) return null

    const renderComponent = getRenderComponent(obj)
    const width = renderComponent?.data.size.width || 100
    const height = renderComponent?.data.size.height || 60

    return {
      id: obj.id,
      x: pos.x,
      y: pos.y,
      width,
      height,
      centerX: pos.x + width / 2,
      centerY: pos.y + height / 2
    }
  }).filter(Boolean)

  // Iteratively resolve overlaps
  let maxIterations = 10
  let hasOverlaps = true

  while (hasOverlaps && maxIterations > 0) {
    hasOverlaps = false
    maxIterations--

    for (let i = 0; i < nodeBounds.length; i++) {
      const nodeA = nodeBounds[i]
      if (!nodeA) continue

      for (let j = i + 1; j < nodeBounds.length; j++) {
        const nodeB = nodeBounds[j]
        if (!nodeB) continue

        // Check if nodes overlap
        const overlap = calculateNodeOverlap(nodeA, nodeB, minSpacing)

        if (overlap.hasOverlap) {
          hasOverlaps = true

          // Separate the nodes
          separateOverlappingNodes(nodeA, nodeB, overlap, positions)

          // Update bounds after position change
          const posA = positions[nodeA.id]
          const posB = positions[nodeB.id]

          if (posA) {
            nodeA.x = posA.x
            nodeA.y = posA.y
            nodeA.centerX = posA.x + nodeA.width / 2
            nodeA.centerY = posA.y + nodeA.height / 2
          }

          if (posB) {
            nodeB.x = posB.x
            nodeB.y = posB.y
            nodeB.centerX = posB.x + nodeB.width / 2
            nodeB.centerY = posB.y + nodeB.height / 2
          }
        }
      }
    }
  }
}

// Helper function: Calculate overlap between two nodes
function calculateNodeOverlap(
  nodeA: { x: number; y: number; width: number; height: number; centerX: number; centerY: number },
  nodeB: { x: number; y: number; width: number; height: number; centerX: number; centerY: number },
  minSpacing: number
): { hasOverlap: boolean; overlapX: number; overlapY: number; direction: { x: number; y: number } } {
  // Calculate required spacing including minimum spacing
  const requiredSpacingX = (nodeA.width + nodeB.width) / 2 + minSpacing
  const requiredSpacingY = (nodeA.height + nodeB.height) / 2 + minSpacing

  // Calculate actual distance between centers
  const distanceX = Math.abs(nodeA.centerX - nodeB.centerX)
  const distanceY = Math.abs(nodeA.centerY - nodeB.centerY)

  // Check for overlap
  const overlapX = Math.max(0, requiredSpacingX - distanceX)
  const overlapY = Math.max(0, requiredSpacingY - distanceY)

  const hasOverlap = overlapX > 0 && overlapY > 0

  // Calculate separation direction
  const directionX = nodeA.centerX < nodeB.centerX ? -1 : 1
  const directionY = nodeA.centerY < nodeB.centerY ? -1 : 1

  return {
    hasOverlap,
    overlapX,
    overlapY,
    direction: { x: directionX, y: directionY }
  }
}

// Helper function: Separate overlapping nodes
function separateOverlappingNodes(
  nodeA: { id: string; centerX: number; centerY: number },
  nodeB: { id: string; centerX: number; centerY: number },
  overlap: { overlapX: number; overlapY: number; direction: { x: number; y: number } },
  positions: Record<string, { x: number; y: number }>
): void {
  // Determine primary separation axis (larger overlap)
  const separateHorizontally = overlap.overlapX >= overlap.overlapY

  if (separateHorizontally) {
    // Separate horizontally
    const moveDistance = overlap.overlapX / 2

    const posA = positions[nodeA.id]
    const posB = positions[nodeB.id]

    if (posA && posB) {
      if (overlap.direction.x < 0) {
        // A is left of B
        posA.x -= moveDistance
        posB.x += moveDistance
      } else {
        // A is right of B
        posA.x += moveDistance
        posB.x -= moveDistance
      }
    }
  } else {
    // Separate vertically
    const moveDistance = overlap.overlapY / 2

    const posA = positions[nodeA.id]
    const posB = positions[nodeB.id]

    if (posA && posB) {
      if (overlap.direction.y < 0) {
        // A is above B
        posA.y -= moveDistance
        posB.y += moveDistance
      } else {
        // A is below B
        posA.y += moveDistance
        posB.y -= moveDistance
      }
    }
  }
}