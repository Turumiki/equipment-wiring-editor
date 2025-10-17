import { EquipmentObject, Wire } from '@/types'
import { getRenderComponent } from './componentSystem'

export interface LayoutOptions {
  algorithm: 'grid' | 'hierarchical' | 'force' | 'circular'
  spacing: number
  padding: number
  direction?: 'horizontal' | 'vertical'
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
  
  const cols = Math.ceil(Math.sqrt(objects.length))
  const rows = Math.ceil(objects.length / cols)
  
  objects.forEach((obj, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    
    const renderComponent = getRenderComponent(obj)
    const width = renderComponent?.data.size.width || 100
    const height = renderComponent?.data.size.height || 60
    
    positions[obj.id] = {
      x: padding + col * (width + spacing),
      y: padding + row * (height + spacing)
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
  
  // 接続グラフを構築
  const graph = buildConnectionGraph(objects, wires)
  
  // レベル分けを実行
  const levels = assignLevels(graph)
  
  // 各レベル内でのポジショニング
  const levelGroups: Record<number, string[]> = {}
  Object.entries(levels).forEach(([nodeId, level]) => {
    if (!levelGroups[level]) levelGroups[level] = []
    levelGroups[level].push(nodeId)
  })
  
  Object.entries(levelGroups).forEach(([levelStr, nodeIds]) => {
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
    default:
      return gridLayout(objects, options)
  }
}

// ヘルパー関数：接続グラフを構築
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

// ヘルパー関数：レベル分けを実行
function assignLevels(graph: Record<string, string[]>): Record<string, number> {
  const levels: Record<string, number> = {}
  const visited = new Set<string>()
  
  // 接続数が少ないノードから開始
  const nodeIds = Object.keys(graph).sort((a, b) => graph[a].length - graph[b].length)
  
  function dfs(nodeId: string, level: number) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    levels[nodeId] = Math.max(levels[nodeId] || 0, level)
    
    graph[nodeId].forEach(connectedId => {
      if (!visited.has(connectedId)) {
        dfs(connectedId, level + 1)
      }
    })
  }
  
  // 各連結成分を処理
  nodeIds.forEach(nodeId => {
    if (!visited.has(nodeId)) {
      dfs(nodeId, 0)
    }
  })
  
  return levels
}