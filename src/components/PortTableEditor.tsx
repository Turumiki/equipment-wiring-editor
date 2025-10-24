import React, { useState, useMemo, useCallback } from 'react'
import { ComponentType, Side, PortType, PortDirection } from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'
import { createConnectionPortComponent } from '@/utils/componentSystem'

interface PortRow {
    id: string
    label: string
    type: PortType
    direction: PortDirection
    side: Side
    offset: number
}

interface PortTableEditorProps {
    selectedObject: any
    updateEquipmentObject: (id: string, updates: any, skipHistory?: boolean) => void
    maxHeight?: string
}

export default function PortTableEditor({ selectedObject, updateEquipmentObject, maxHeight = 'max-h-96' }: PortTableEditorProps) {
    const { settings } = useSettingsStore()
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
    const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null)

    // ポートデータを取得
    const rows: PortRow[] = useMemo(() =>
        selectedObject.components
            .filter((comp: any) => comp.type === ComponentType.CONNECTION_PORT)
            .map((comp: any) => ({
                id: comp.id,
                label: comp.data.label || '',
                type: comp.data.portType,
                direction: comp.data.direction,
                side: comp.data.position?.side || Side.LEFT,
                offset: comp.data.position?.offset || 50
            })), [selectedObject.components]
    )

    // 単一セルの更新
    const updateCell = useCallback((rowId: string, field: keyof PortRow, value: any) => {
        const updatedComponents = selectedObject.components.map((comp: any) => {
            if (comp.id === rowId && comp.type === ComponentType.CONNECTION_PORT) {
                if (field === 'label') {
                    return {
                        ...comp,
                        data: { ...comp.data, label: value }
                    }
                } else if (field === 'type') {
                    return {
                        ...comp,
                        data: { ...comp.data, portType: value }
                    }
                } else if (field === 'direction') {
                    return {
                        ...comp,
                        data: { ...comp.data, direction: value }
                    }
                } else if (field === 'side') {
                    return {
                        ...comp,
                        data: {
                            ...comp.data,
                            position: { ...comp.data.position, side: value }
                        }
                    }
                } else if (field === 'offset') {
                    return {
                        ...comp,
                        data: {
                            ...comp.data,
                            position: { ...comp.data.position, offset: Number(value) }
                        }
                    }
                }
            }
            return comp
        })

        updateEquipmentObject(selectedObject.id, { components: updatedComponents }, true)
    }, [selectedObject, updateEquipmentObject])

    // 一括更新
    const bulkUpdate = useCallback((field: keyof PortRow, value: any) => {
        if (selectedRows.size === 0) return

        const updatedComponents = selectedObject.components.map((comp: any) => {
            if (selectedRows.has(comp.id) && comp.type === ComponentType.CONNECTION_PORT) {
                if (field === 'label' && typeof value === 'string') {
                    // ラベルの場合は連番を付ける
                    const selectedRowsArray = Array.from(selectedRows)
                    const index = selectedRowsArray.indexOf(comp.id) + 1
                    return {
                        ...comp,
                        data: { ...comp.data, label: `${value}${index}` }
                    }
                } else if (field === 'type') {
                    return {
                        ...comp,
                        data: { ...comp.data, portType: value }
                    }
                } else if (field === 'direction') {
                    return {
                        ...comp,
                        data: { ...comp.data, direction: value }
                    }
                } else if (field === 'side') {
                    return {
                        ...comp,
                        data: {
                            ...comp.data,
                            position: { ...comp.data.position, side: value }
                        }
                    }
                }
            }
            return comp
        })

        updateEquipmentObject(selectedObject.id, { components: updatedComponents })
    }, [selectedRows, selectedObject, updateEquipmentObject])

    // ポート追加
    const addPort = useCallback(() => {
        const newPort = createConnectionPortComponent(
            Side.LEFT,
            50,
            PortType.XLR_FEMALE,
            PortDirection.INPUT,
            'New Port'
        )

        const updatedComponents = [...selectedObject.components, newPort]
        updateEquipmentObject(selectedObject.id, { components: updatedComponents })

        // 新しく追加したポートを選択
        setSelectedRows(new Set([newPort.id]))
    }, [selectedObject, updateEquipmentObject])

    // 選択されたポートを削除
    const deleteSelectedPorts = useCallback(() => {
        if (selectedRows.size === 0) return

        const updatedComponents = selectedObject.components.filter((comp: any) =>
            !(comp.type === ComponentType.CONNECTION_PORT && selectedRows.has(comp.id))
        )

        updateEquipmentObject(selectedObject.id, { components: updatedComponents })
        setSelectedRows(new Set())
    }, [selectedRows, selectedObject, updateEquipmentObject])

    // 複数ポートを一度に追加
    const addMultiplePorts = useCallback((count: number) => {
        const newPorts = []
        for (let i = 0; i < count; i++) {
            const port = createConnectionPortComponent(
                Side.LEFT,
                10 + (i * 15), // 等間隔で配置
                PortType.XLR_FEMALE,
                PortDirection.INPUT,
                `Port ${rows.length + i + 1}`
            )
            newPorts.push(port)
        }

        const updatedComponents = [...selectedObject.components, ...newPorts]
        updateEquipmentObject(selectedObject.id, { components: updatedComponents })

        // 新しく追加したポートを選択
        setSelectedRows(new Set(newPorts.map(port => port.id)))
    }, [selectedObject, updateEquipmentObject, rows.length])

    // 最後に選択された行を記録
    const [lastSelectedRow, setLastSelectedRow] = useState<string | null>(null)

    // 行選択の切り替え
    const toggleRowSelection = (rowId: string, ctrlKey: boolean, shiftKey: boolean) => {
        if (shiftKey && lastSelectedRow) {
            // Shift+クリックで範囲選択
            const currentIndex = rows.findIndex(row => row.id === rowId)
            const lastIndex = rows.findIndex(row => row.id === lastSelectedRow)

            if (currentIndex !== -1 && lastIndex !== -1) {
                const startIndex = Math.min(currentIndex, lastIndex)
                const endIndex = Math.max(currentIndex, lastIndex)
                const newSelected = new Set(selectedRows)

                for (let i = startIndex; i <= endIndex; i++) {
                    newSelected.add(rows[i].id)
                }
                setSelectedRows(newSelected)
            }
        } else if (ctrlKey) {
            // Ctrl+クリックで複数選択
            const newSelected = new Set(selectedRows)
            if (newSelected.has(rowId)) {
                newSelected.delete(rowId)
            } else {
                newSelected.add(rowId)
            }
            setSelectedRows(newSelected)
            setLastSelectedRow(rowId)
        } else {
            // 通常クリックで単一選択
            setSelectedRows(new Set([rowId]))
            setLastSelectedRow(rowId)
        }
    }

    // 全選択/全解除
    const toggleSelectAll = () => {
        if (selectedRows.size === rows.length) {
            setSelectedRows(new Set())
        } else {
            setSelectedRows(new Set(rows.map(row => row.id)))
        }
    }

    const sideNames = {
        [Side.LEFT]: '左',
        [Side.RIGHT]: '右',
        [Side.TOP]: '上',
        [Side.BOTTOM]: '下'
    }

    const directionNames = {
        [PortDirection.INPUT]: '入力',
        [PortDirection.OUTPUT]: '出力',
        [PortDirection.BIDIRECTIONAL]: '双方向'
    }

    return (
        <div className="space-y-3" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
            {/* ポート管理ツールバー */}
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-800">ポート管理</h4>
                    <span className="text-xs text-gray-600">{rows.length}個のポート</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={addPort}
                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                    >
                        + ポート追加
                    </button>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => addMultiplePorts(2)}
                            className="px-2 py-1 text-xs bg-green-400 text-white rounded hover:bg-green-500"
                        >
                            +2
                        </button>
                        <button
                            onClick={() => addMultiplePorts(4)}
                            className="px-2 py-1 text-xs bg-green-400 text-white rounded hover:bg-green-500"
                        >
                            +4
                        </button>
                        <button
                            onClick={() => addMultiplePorts(8)}
                            className="px-2 py-1 text-xs bg-green-400 text-white rounded hover:bg-green-500"
                        >
                            +8
                        </button>
                    </div>

                    {selectedRows.size > 0 && (
                        <button
                            onClick={() => {
                                if (confirm(`選択した${selectedRows.size}個のポートを削除しますか？`)) {
                                    deleteSelectedPorts()
                                }
                            }}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 font-medium"
                        >
                            🗑️ 選択削除 ({selectedRows.size})
                        </button>
                    )}

                    {rows.length > 0 && (
                        <button
                            onClick={() => {
                                if (confirm(`全ての${rows.length}個のポートを削除しますか？`)) {
                                    const updatedComponents = selectedObject.components.filter((comp: any) =>
                                        comp.type !== ComponentType.CONNECTION_PORT
                                    )
                                    updateEquipmentObject(selectedObject.id, { components: updatedComponents })
                                    setSelectedRows(new Set())
                                }
                            }}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            🗑️ 全削除
                        </button>
                    )}
                </div>
            </div>

            {/* 一括操作ツールバー */}
            {selectedRows.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-blue-800">
                            {selectedRows.size}行を選択中
                        </span>
                        <button
                            onClick={() => setSelectedRows(new Set())}
                            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                            選択解除
                        </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    bulkUpdate('type', e.target.value)
                                    e.target.value = ''
                                }
                            }}
                            className="px-3 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900"
                            defaultValue=""
                        >
                            <option value="">タイプ変更</option>
                            {settings.portTypes.map(portTypeDef => (
                                <option key={portTypeDef.id} value={portTypeDef.name}>
                                    {portTypeDef.displayName}
                                </option>
                            ))}
                        </select>

                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    bulkUpdate('direction', e.target.value)
                                    e.target.value = ''
                                }
                            }}
                            className="px-3 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900"
                            defaultValue=""
                        >
                            <option value="">方向変更</option>
                            <option value={PortDirection.INPUT}>入力</option>
                            <option value={PortDirection.OUTPUT}>出力</option>
                            <option value={PortDirection.BIDIRECTIONAL}>双方向</option>
                        </select>

                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    bulkUpdate('side', e.target.value)
                                    e.target.value = ''
                                }
                            }}
                            className="px-3 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900"
                            defaultValue=""
                        >
                            <option value="">辺変更</option>
                            <option value={Side.LEFT}>左</option>
                            <option value={Side.RIGHT}>右</option>
                            <option value={Side.TOP}>上</option>
                            <option value={Side.BOTTOM}>下</option>
                        </select>

                        <input
                            type="text"
                            placeholder="ラベル連番"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value) {
                                    bulkUpdate('label', e.currentTarget.value)
                                    e.currentTarget.value = ''
                                }
                            }}
                            className="px-3 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900 w-32"
                        />
                    </div>
                </div>
            )}

            {/* テーブル */}
            <div
                className={`border border-gray-300 rounded overflow-auto select-none ${maxHeight}`}
                onDragStart={(e) => e.preventDefault()}
            >
                <table className="w-full text-sm select-none">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="w-8 px-2 py-2 text-left border-r border-gray-300">
                                <input
                                    type="checkbox"
                                    checked={selectedRows.size === rows.length && rows.length > 0}
                                    onChange={toggleSelectAll}
                                    className="rounded"
                                />
                            </th>
                            <th className="px-3 py-2 text-left border-r border-gray-300 font-medium text-gray-800">ラベル</th>
                            <th className="px-3 py-2 text-left border-r border-gray-300 font-medium text-gray-800">タイプ</th>
                            <th className="px-3 py-2 text-left border-r border-gray-300 font-medium text-gray-800">方向</th>
                            <th className="px-3 py-2 text-left border-r border-gray-300 font-medium text-gray-800">辺</th>
                            <th className="px-3 py-2 text-left border-r border-gray-300 font-medium text-gray-800">位置%</th>
                            <th className="w-16 px-2 py-2 text-center font-medium text-gray-800">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr
                                key={row.id}
                                className={`
                                    ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                    ${selectedRows.has(row.id) ? 'bg-blue-100' : ''}
                                    hover:bg-blue-50 cursor-pointer select-none
                                `}
                                onClick={(e) => {
                                    if (!(e.target as HTMLElement).closest('input, select')) {
                                        e.preventDefault()
                                        toggleRowSelection(row.id, e.ctrlKey || e.metaKey, e.shiftKey)
                                    }
                                }}
                                onMouseDown={(e) => {
                                    // テキスト選択を防ぐ
                                    if (!(e.target as HTMLElement).closest('input, select, .select-text')) {
                                        e.preventDefault()
                                    }
                                }}
                            >
                                {/* チェックボックス */}
                                <td className="w-8 px-2 py-2 border-r border-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.has(row.id)}
                                        onChange={(e) => {
                                            e.stopPropagation()
                                            // チェックボックスクリック時は常に複数選択モード
                                            const newSelected = new Set(selectedRows)
                                            if (newSelected.has(row.id)) {
                                                newSelected.delete(row.id)
                                            } else {
                                                newSelected.add(row.id)
                                            }
                                            setSelectedRows(newSelected)
                                        }}
                                        className="rounded"
                                    />
                                </td>

                                {/* ラベル */}
                                <td className="px-3 py-2 border-r border-gray-300">
                                    {editingCell?.rowId === row.id && editingCell?.column === 'label' ? (
                                        <input
                                            type="text"
                                            value={row.label}
                                            onChange={(e) => updateCell(row.id, 'label', e.target.value)}
                                            onBlur={() => setEditingCell(null)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === 'Tab') {
                                                    setEditingCell(null)
                                                }
                                                if (e.key === 'Escape') {
                                                    setEditingCell(null)
                                                }
                                            }}
                                            className="w-full px-1 py-0 text-sm border-none outline-none bg-transparent text-gray-900"
                                            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            className="block px-1 py-1 text-gray-900 cursor-text select-text"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingCell({ rowId: row.id, column: 'label' })
                                            }}
                                        >
                                            {row.label || '(空)'}
                                        </span>
                                    )}
                                </td>

                                {/* タイプ */}
                                <td className="px-3 py-2 border-r border-gray-300">
                                    <select
                                        value={row.type}
                                        onChange={(e) => updateCell(row.id, 'type', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full px-1 py-1 text-sm border-none outline-none bg-transparent text-gray-900 cursor-pointer"
                                    >
                                        {settings.portTypes.map(portTypeDef => (
                                            <option key={portTypeDef.id} value={portTypeDef.name}>
                                                {portTypeDef.displayName}
                                            </option>
                                        ))}
                                    </select>
                                </td>

                                {/* 方向 */}
                                <td className="px-3 py-2 border-r border-gray-300">
                                    <select
                                        value={row.direction}
                                        onChange={(e) => updateCell(row.id, 'direction', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full px-1 py-1 text-sm border-none outline-none bg-transparent text-gray-900 cursor-pointer"
                                    >
                                        <option value={PortDirection.INPUT}>入力</option>
                                        <option value={PortDirection.OUTPUT}>出力</option>
                                        <option value={PortDirection.BIDIRECTIONAL}>双方向</option>
                                    </select>
                                </td>

                                {/* 辺 */}
                                <td className="px-3 py-2 border-r border-gray-300">
                                    <select
                                        value={row.side}
                                        onChange={(e) => updateCell(row.id, 'side', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full px-1 py-1 text-sm border-none outline-none bg-transparent text-gray-900 cursor-pointer"
                                    >
                                        <option value={Side.LEFT}>左</option>
                                        <option value={Side.RIGHT}>右</option>
                                        <option value={Side.TOP}>上</option>
                                        <option value={Side.BOTTOM}>下</option>
                                    </select>
                                </td>

                                {/* 位置% */}
                                <td className="px-3 py-2">
                                    {editingCell?.rowId === row.id && editingCell?.column === 'offset' ? (
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={row.offset}
                                            onChange={(e) => updateCell(row.id, 'offset', e.target.value)}
                                            onBlur={() => setEditingCell(null)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === 'Tab') {
                                                    setEditingCell(null)
                                                }
                                                if (e.key === 'Escape') {
                                                    setEditingCell(null)
                                                }
                                            }}
                                            className="w-full px-1 py-0 text-sm border-none outline-none bg-transparent text-gray-900"
                                            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            className="block px-1 py-1 text-gray-900 cursor-text select-text"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingCell({ rowId: row.id, column: 'offset' })
                                            }}
                                        >
                                            {row.offset}%
                                        </span>
                                    )}
                                </td>

                                {/* 削除ボタン */}
                                <td className="w-16 px-2 py-2 text-center">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (confirm('このポートを削除しますか？')) {
                                                const updatedComponents = selectedObject.components.filter((comp: any) =>
                                                    comp.id !== row.id
                                                )
                                                updateEquipmentObject(selectedObject.id, { components: updatedComponents })

                                                // 選択状態からも削除
                                                const newSelected = new Set(selectedRows)
                                                newSelected.delete(row.id)
                                                setSelectedRows(newSelected)
                                            }
                                        }}
                                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                        title="このポートを削除"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {rows.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                    ポートがありません
                </p>
            )}

            {/* 操作ヘルプ */}
            <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <h4 className="text-sm font-medium text-gray-800 mb-2">操作方法</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>ポート追加</strong>: 「+ ポート追加」ボタンまたは「+2」「+4」「+8」で複数追加</li>
                    <li>• <strong>ポート削除</strong>: 行の🗑️ボタン、または選択後「選択削除」ボタン</li>
                    <li>• <strong>ラベル・位置%</strong>: クリックして直接編集</li>
                    <li>• <strong>タイプ・方向・辺</strong>: ドロップダウンで即座に変更</li>
                    <li>• <strong>行選択</strong>: 行をクリック</li>
                    <li>• <strong>複数選択</strong>: Ctrl+クリック（個別選択）、Shift+クリック（範囲選択）</li>
                    <li>• <strong>チェックボックス</strong>: クリックで選択切り替え（複数選択可能）</li>
                    <li>• <strong>一括編集</strong>: 行を選択後、上部ツールバーを使用</li>
                    <li>• <strong>連番設定</strong>: 「ラベル連番」に基本名を入力してEnter</li>
                </ul>
            </div>
        </div>
    )
}