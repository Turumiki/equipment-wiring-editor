import { EquipmentObject, ComponentType, Side, PortType, PortDirection } from '@/types'
import { getConnectionPortComponents } from './componentSystem'

export interface PortArrangementOptions {
    side: Side
    sortBy: 'name' | 'type' | 'direction' | 'position'
    sortOrder: 'asc' | 'desc'
    spacing: number // ％ベースの間隔（0-100）
    startOffset: number // ％ベースの開始位置（0-100）
}

// ポートを指定した条件で並び替え
export function arrangePortsOnSide(
    equipmentObject: EquipmentObject,
    options: PortArrangementOptions
): EquipmentObject {
    const { side, sortBy, sortOrder, spacing, startOffset } = options

    // 指定した辺のポートを取得
    const allPorts = getConnectionPortComponents(equipmentObject)
    const sidePorts = allPorts.filter(port => port.data.position.side === side)

    if (sidePorts.length === 0) {
        return equipmentObject // 対象ポートがない場合はそのまま返す
    }

    // ポートをソート
    const sortedPorts = [...sidePorts].sort((a, b) => {
        let comparison = 0

        switch (sortBy) {
            case 'name':
                const nameA = a.data.label || ''
                const nameB = b.data.label || ''
                comparison = nameA.localeCompare(nameB, undefined, { numeric: true })
                break

            case 'type':
                comparison = a.data.portType.localeCompare(b.data.portType)
                break

            case 'direction':
                const directionOrder = { 'input': 0, 'output': 1, 'bidirectional': 2 }
                comparison = (directionOrder[a.data.direction] || 0) - (directionOrder[b.data.direction] || 0)
                break

            case 'position':
                comparison = a.data.position.offset - b.data.position.offset
                break
        }

        return sortOrder === 'desc' ? -comparison : comparison
    })

    // 新しい位置を計算して適用
    const updatedComponents = equipmentObject.components.map(component => {
        if (component.type === ComponentType.CONNECTION_PORT) {
            const portIndex = sortedPorts.findIndex(p => p.id === component.id)
            if (portIndex !== -1) {
                return {
                    ...component,
                    data: {
                        ...component.data,
                        position: {
                            ...component.data.position,
                            offset: startOffset + portIndex * spacing
                        }
                    }
                }
            }
        }
        return component
    })

    return {
        ...equipmentObject,
        components: updatedComponents
    }
}

// 辺ごとのポート統計を取得
export function getPortStatsBySide(equipmentObject: EquipmentObject) {
    const allPorts = getConnectionPortComponents(equipmentObject)
    const stats = {
        [Side.LEFT]: { count: 0, types: new Set<PortType>(), directions: new Set<PortDirection>() },
        [Side.RIGHT]: { count: 0, types: new Set<PortType>(), directions: new Set<PortDirection>() },
        [Side.TOP]: { count: 0, types: new Set<PortType>(), directions: new Set<PortDirection>() },
        [Side.BOTTOM]: { count: 0, types: new Set<PortType>(), directions: new Set<PortDirection>() }
    }

    allPorts.forEach(port => {
        const side = port.data.position.side
        stats[side].count++
        stats[side].types.add(port.data.portType)
        stats[side].directions.add(port.data.direction)
    })

    return stats
}

// 自動配置の推奨設定を取得
export function getRecommendedArrangement(equipmentObject: EquipmentObject, side: Side): PortArrangementOptions {
    const allPorts = getConnectionPortComponents(equipmentObject)
    const sidePorts = allPorts.filter(port => port.data.position.side === side)

    // ポート数に基づいて間隔を調整（％ベース: 0-100）
    const portCount = sidePorts.length

    if (portCount <= 1) {
        return {
            side,
            sortBy: 'name',
            sortOrder: 'asc',
            spacing: 0,
            startOffset: 50 // 中央に配置
        }
    }

    // 利用可能な範囲（両端に余裕を持たせる）
    const availableRange = 80 // 10% - 90%の範囲を使用
    const spacing = availableRange / (portCount - 1)
    const startOffset = 10 // 10%から開始

    // 方向の種類を確認
    const directions = new Set(sidePorts.map(p => p.data.direction))
    const types = new Set(sidePorts.map(p => p.data.portType))

    // 推奨ソート方法を決定
    let sortBy: 'name' | 'type' | 'direction' | 'position' = 'name'

    if (directions.size > 1) {
        // 複数の方向がある場合は方向でソート
        sortBy = 'direction'
    } else if (types.size > 1) {
        // 複数のタイプがある場合はタイプでソート
        sortBy = 'type'
    }

    return {
        side,
        sortBy,
        sortOrder: 'asc',
        spacing,
        startOffset
    }
}

// プリセット配置パターン
export const ARRANGEMENT_PRESETS = {
    inputsFirst: {
        name: '入力→出力順',
        description: '入力ポートを先に、出力ポートを後に配置',
        sortBy: 'direction' as const,
        sortOrder: 'asc' as const
    },
    typeGrouped: {
        name: 'タイプ別グループ',
        description: 'ポートタイプごとにグループ化',
        sortBy: 'type' as const,
        sortOrder: 'asc' as const
    },
    alphabetical: {
        name: 'アルファベット順',
        description: 'ポート名をアルファベット順に配置',
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
    },
    numerical: {
        name: '数値順',
        description: 'ポート名の数値部分で並び替え',
        sortBy: 'name' as const,
        sortOrder: 'asc' as const
    }
}