import { EquipmentObject, Wire } from '@/types'
import { getRenderComponent } from './componentSystem'

export interface LayoutOptions {
  algorithm: 'grid' | 'hierarchical' | 'force' | 'circular' | 'smart' | 'signal-flow'
  spacing: number
  padding: number
  direction?: 'horizontal' | 'vertical'
  groupByType?: boolean
  minimizeCrossings?: boolean
  avoidNodeOverlap?: boolean
}

export interface LayoutResult {
  positions: Record<string, { x: number; y: number }>
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

  // 簡単なアプローチ: 接続数に基づいてレベル分け
  const connectionCounts = new Map<string, { incoming: number; outgoing: number }>()

  // 接続数を計算
  objects.forEach(obj => {
    connectionCounts.set(obj.id, { incoming: 0, outgoing: 0 })
  })

  wires.forEach(wire => {
    const source = connectionCounts.get(wire.sourceObjectId)
    const target = connectionCounts.get(wire.targetObjectId)
    if (source) source.outgoing++
    if (target) target.incoming++
  })

  // レベル分け
  const levels: Record<number, string[]> = { 0: [], 1: [], 2: [] }

  objects.forEach(obj => {
    const counts = connectionCounts.get(obj.id)
    if (!counts) return

    if (counts.outgoing > 0 && counts.incoming === 0) {
      levels[0].push(obj.id) // 入力ノード
    } else if (counts.outgoing === 0 && counts.incoming > 0) {
      levels[2].push(obj.id) // 出力ノード
    } else {
      levels[1].push(obj.id) // 処理ノード
    }
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

// 力学レイアウト（簡易版）
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

// スマートレイアウト（設備配線図に特化）
export function smartLayout(
  objects: EquipmentObject[],
  wires: Wire[],
  options: LayoutOptions
): LayoutResult {
  const { spacing, padding, groupByType = true } = options
  const positions: Record<string, { x: number; y: number }> = {}

  // 1. 設備タイプ別にグループ化
  const groups = groupByType ? groupByEquipmentType(objects) : { all: objects }

  // 2. 各グループの重要度を計算（接続数ベース）
  const groupImportance = calculateGroupImportance(groups, wires)

  // 3. 重要度順にソート
  const sortedGroups = Object.entries(groups).sort(([a], [b]) =>
    (groupImportance[b] || 0) - (groupImportance[a] || 0)
  )

  let currentY = padding
  const groupPositions: Record<string, { x: number; y: number; width: number; height: number }> = {}

  // 4. グループごとに配置
  sortedGroups.forEach(([groupName, groupObjects]) => {
    const groupLayout = layoutGroup(groupObjects, wires, { spacing, padding: 0 })

    // グループの境界を計算
    const bounds = calculateBounds(groupLayout.positions, groupObjects)

    // グループを配置
    const groupX = padding
    Object.entries(groupLayout.positions).forEach(([objId, pos]) => {
      positions[objId] = {
        x: groupX + pos.x,
        y: currentY + pos.y
      }
    })

    groupPositions[groupName] = {
      x: groupX,
      y: currentY,
      width: bounds.width,
      height: bounds.height
    }

    currentY += bounds.height + spacing * 2
  })

  // 5. グループ間の接続を最適化
  if (options.minimizeCrossings) {
    optimizeInterGroupConnections(positions, wires, groupPositions)
  }

  // 6. 機材同士の重複を回避
  resolveNodeOverlaps(positions, objects, options)

  // 7. 配線と機材の重複を回避
  if (options.avoidNodeOverlap) {
    optimizeWireRouting(positions, objects, wires, options)
  }

  return { positions }
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

// メインの自動レイアウト関数
export function autoLayout(
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

// Helper function: Simple level assignment without recursion
function assignLevels(graph: Record<string, string[]>): Record<string, number> {
  const levels: Record<string, number> = {}
  const nodeIds = Object.keys(graph)

  // Initialize all nodes to level 0
  nodeIds.forEach(nodeId => {
    levels[nodeId] = 0
  })

  // Simple approach: assign levels based on connection count
  // Nodes with no outgoing connections get higher levels
  nodeIds.forEach(nodeId => {
    const outgoingCount = graph[nodeId].length
    const incomingCount = nodeIds.filter(otherId =>
      graph[otherId].includes(nodeId)
    ).length

    // Level based on connection pattern
    if (outgoingCount === 0 && incomingCount > 0) {
      // Sink nodes (outputs) - highest level
      levels[nodeId] = 2
    } else if (outgoingCount > 0 && incomingCount === 0) {
      // Source nodes (inputs) - lowest level
      levels[nodeId] = 0
    } else {
      // Processing nodes - middle level
      levels[nodeId] = 1
    }
  })

  return levels
}

// Helper function: Group by equipment type
function groupByEquipmentType(objects: EquipmentObject[]): Record<string, EquipmentObject[]> {
  const groups: Record<string, EquipmentObject[]> = {}

  objects.forEach(obj => {
    // Use name prefix as type (e.g., "PLC-001" -> "PLC")
    const type = obj.name.split('-')[0] || 'other'
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
  // 安全のため、常にグリッドレイアウトを使用
  return gridLayout(objects, { ...options, algorithm: 'grid' })
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

// Helper function: Optimize inter-group connections
function optimizeInterGroupConnections(
  positions: Record<string, { x: number; y: number }>,
  wires: Wire[],
  groupPositions: Record<string, { x: number; y: number; width: number; height: number }>
): void {
  // 交差する配線を最小化するための簡易最適化
  // 実装は複雑になるため、ここでは基本的な調整のみ

  const interGroupWires = wires.filter(wire => {
    const sourcePos = positions[wire.sourceObjectId]
    const targetPos = positions[wire.targetObjectId]
    return sourcePos && targetPos
  })

  // グループ間の配線が多い場合、グループの順序を調整
  // （詳細な実装は省略）
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

// Helper function: Check if line intersects rectangle
function lineIntersectsRectangle(
  x1: number, y1: number, x2: number, y2: number,
  rectX: number, rectY: number, rectWidth: number, rectHeight: number
): boolean {
  // Check if line passes through rectangle
  const left = rectX
  const right = rectX + rectWidth
  const top = rectY
  const bottom = rectY + rectHeight

  // Line equation: y = mx + b
  const dx = x2 - x1
  const dy = y2 - y1

  if (Math.abs(dx) < 0.001) {
    // Vertical line
    return x1 >= left && x1 <= right &&
      Math.min(y1, y2) <= bottom && Math.max(y1, y2) >= top
  }

  const m = dy / dx
  const b = y1 - m * x1

  // Check intersection with rectangle edges
  const intersections = []

  // Left edge
  const yLeft = m * left + b
  if (yLeft >= top && yLeft <= bottom) {
    intersections.push({ x: left, y: yLeft })
  }

  // Right edge
  const yRight = m * right + b
  if (yRight >= top && yRight <= bottom) {
    intersections.push({ x: right, y: yRight })
  }

  // Top edge
  const xTop = (top - b) / m
  if (xTop >= left && xTop <= right) {
    intersections.push({ x: xTop, y: top })
  }

  // Bottom edge
  const xBottom = (bottom - b) / m
  if (xBottom >= left && xBottom <= right) {
    intersections.push({ x: xBottom, y: bottom })
  }

  return intersections.length > 0
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