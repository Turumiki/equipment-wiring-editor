import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { calculateFitness } from '@/utils/autoLayout'

interface MenuBarProps {
  // メニュー状態管理
  openMenu?: string | null
  onMenuChange?: (menu: string | null) => void
  
  // ファイルメニュー
  onNewProject: () => void
  onOpenProject: () => void
  onSaveProject: () => void
  onSaveAsProject: () => void
  onExportProject: () => void
  onImportProject: () => void
  onImportCSV: () => void
  
  // 編集メニュー
  onSelectAll: () => void
  onDeselectAll: () => void
  onCopy: () => void
  onPaste: () => void
  onDelete: () => void
  onDuplicate: () => void
  
  // 表示メニュー
  onShowTemplateLibrary: () => void
  onShowTableEditor: () => void
  onShowInspector: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomToFit: () => void
  onZoomToActual: () => void
  
  // ツールメニュー
  onShowAutoLayout: () => void
  onAlignLeft: () => void
  onAlignCenter: () => void
  onAlignRight: () => void
  onAlignTop: () => void
  onAlignCenterVertical: () => void
  onAlignBottom: () => void
  onDistributeHorizontal: () => void
  onDistributeVertical: () => void
  onValidateConnections: () => void
  onRemoveDuplicateWires: () => void
  onShowSettings: () => void
  
  // ヘルプメニュー
  onShowHelp: () => void
  onShowShortcuts: () => void
  onShowAbout: () => void
}

interface MenuItemProps {
  label: string
  items: Array<{
    label?: string
    shortcut?: string
    separator?: boolean
    disabled?: boolean
    onClick?: () => void
  }>
  onItemClick: (item: any) => void
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

function MenuItem({ label, items, onItemClick, isOpen, onToggle, onClose }: MenuItemProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative" ref={menuRef}>
      <button
        className={`px-2 py-1 text-xs font-medium hover:bg-gray-100 hover:text-gray-900 ${
          isOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-800'
        }`}
        onClick={onToggle}
      >
        {label}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 bg-white border border-gray-300 shadow-lg py-1 z-50 min-w-48">
          {items.map((item, index) => (
            item.separator ? (
              <div key={index} className="border-t border-gray-300 my-1" />
            ) : (
              <button
                key={index}
                className={`w-full px-3 py-1 text-left text-xs hover:bg-gray-100 flex justify-between items-center ${
                  item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900'
                }`}
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled && item.onClick) {
                    item.onClick()
                    onItemClick(item)
                    onClose()
                  }
                }}
              >
                <span>{item.label || ''}</span>
                {item.shortcut && (
                  <span className="text-xs text-gray-500 ml-4 font-mono">{item.shortcut}</span>
                )}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  )
}

export default function MenuBar({
  // メニュー状態管理
  openMenu: externalOpenMenu,
  onMenuChange,
  
  // ファイルメニュー
  onNewProject,
  onOpenProject,
  onSaveProject,
  onSaveAsProject,
  onExportProject,
  onImportProject,
  onImportCSV,
  
  // 編集メニュー
  onSelectAll,
  onDeselectAll,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  
  // 表示メニュー
  onShowTemplateLibrary,
  onShowTableEditor,
  onShowInspector,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onZoomToActual,
  
  // ツールメニュー
  onShowAutoLayout,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignCenterVertical,
  onAlignBottom,
  onDistributeHorizontal,
  onDistributeVertical,
  onValidateConnections,
  onRemoveDuplicateWires,
  onShowSettings,
  
  // ヘルプメニュー
  onShowHelp,
  onShowShortcuts,
  onShowAbout
}: MenuBarProps) {
  const { project, canUndo, canRedo, undo, redo, canPaste, setProjectName } = useProjectStore()
  const { showScoreCalculation } = useSettingsStore()
  
  // 評価スコアを計算（位置情報も依存配列に含める）
  const layoutScore = useMemo(() => {
    if (!showScoreCalculation || project.objects.length === 0) return null
    
    // 現在の位置から評価スコアを計算
    const positions: Record<string, { x: number; y: number }> = {}
    project.objects.forEach(obj => {
      positions[obj.id] = { ...obj.position }
    })
    
    try {
      const score = calculateFitness(positions, project.objects, project.wires, {
        algorithm: 'smart',
        spacing: 100,
        padding: 50,
        minimizeCrossings: true,
        avoidNodeOverlap: true
      })
      return score
    } catch (error) {
      console.error('Failed to calculate layout score:', error)
      return null
    }
  }, [
    showScoreCalculation,
    project.objects.length,
    project.wires.length,
    // 位置情報を文字列化して依存配列に含める
    JSON.stringify(project.objects.map(obj => ({ id: obj.id, x: obj.position.x, y: obj.position.y })))
  ])
  
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  const startTitleEdit = () => {
    setTitleValue(project.name || '新規プロジェクト')
    setEditingTitle(true)
  }

  const commitTitleEdit = () => {
    const trimmed = titleValue.trim()
    if (trimmed) setProjectName(trimmed)
    setEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitTitleEdit()
    else if (e.key === 'Escape') setEditingTitle(false)
  }

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.select()
  }, [editingTitle])

  const [internalOpenMenu, setInternalOpenMenu] = useState<string | null>(null)
  const openMenu = externalOpenMenu !== undefined ? externalOpenMenu : internalOpenMenu
  // setOpenMenuをuseRefで保持して安定した参照を確保
  const setOpenMenuRef = useRef(onMenuChange || setInternalOpenMenu)
  useEffect(() => {
    setOpenMenuRef.current = onMenuChange || setInternalOpenMenu
  }, [onMenuChange])
  const setOpenMenu = useCallback((value: string | null) => {
    setOpenMenuRef.current(value)
  }, [])
  const menuBarRef = useRef<HTMLDivElement>(null)

  // 外側クリックでメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        console.log('Clicked outside menu bar, closing menu')
        setOpenMenuRef.current(null)
      }
    }

    if (openMenu) {
      console.log('Adding click outside listener for menu:', openMenu)
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        console.log('Removing click outside listener')
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [openMenu]) // setOpenMenuRefはuseRefで保持されているため、依存配列に含める必要はない

  const handleItemClick = (item: any) => {
    // メニューアイテムがクリックされた時の共通処理
    console.log('Menu item clicked:', item.label)
    setOpenMenu(null)
  }

  const handleMenuToggle = (menuName: string) => {
    console.log('Menu toggle:', menuName, 'current:', openMenu)
    setOpenMenu(openMenu === menuName ? null : menuName)
  }

  const fileMenuItems = [
    { label: '新規プロジェクト', shortcut: 'Ctrl+N', onClick: onNewProject },
    { separator: true },
    { label: 'プロジェクトを開く', onClick: onOpenProject },
    { separator: true },
    { label: '保存', shortcut: 'Ctrl+S', onClick: onSaveProject },
    { label: '名前を付けて保存', onClick: onSaveAsProject },
    { separator: true },
    { label: 'エクスポート', onClick: onExportProject },
    { label: 'プロジェクトをインポート', onClick: onImportProject },
    { label: 'CSVをインポート', onClick: onImportCSV },
    { separator: true },
    { label: '終了', onClick: () => window.close() }
  ]

  const editMenuItems = [
    { label: '元に戻す', shortcut: 'Ctrl+Z', disabled: !canUndo, onClick: undo },
    { label: 'やり直し', shortcut: 'Ctrl+Y', disabled: !canRedo, onClick: redo },
    { separator: true },
    { label: 'すべて選択', shortcut: 'Ctrl+A', onClick: onSelectAll },
    { label: '選択を解除', onClick: onDeselectAll },
    { separator: true },
    { label: 'コピー', shortcut: 'Ctrl+C', onClick: onCopy, disabled: false },
    { label: '貼り付け', shortcut: 'Ctrl+V', onClick: onPaste, disabled: !canPaste },
    { label: '複製', shortcut: 'Ctrl+D', onClick: onDuplicate },
    { label: '削除', shortcut: 'Delete', onClick: onDelete }
  ]

  const viewMenuItems = [
    { label: 'ズームイン', onClick: onZoomIn },
    { label: 'ズームアウト', onClick: onZoomOut },
    { label: '実際のサイズ', onClick: onZoomToActual },
    { label: '全体を表示', onClick: onZoomToFit },
    { separator: true },
    { label: 'テンプレートライブラリ', onClick: onShowTemplateLibrary },
    { label: 'テーブルエディタ', onClick: onShowTableEditor },
    { label: 'インスペクター', onClick: onShowInspector }
  ]

  const toolsMenuItems = [
    { label: '自動レイアウト', onClick: onShowAutoLayout },
    { separator: true },
    { label: '左揃え', onClick: onAlignLeft },
    { label: '中央揃え', onClick: onAlignCenter },
    { label: '右揃え', onClick: onAlignRight },
    { separator: true },
    { label: '上揃え', onClick: onAlignTop },
    { label: '中央揃え（縦）', onClick: onAlignCenterVertical },
    { label: '下揃え', onClick: onAlignBottom },
    { separator: true },
    { label: '水平に分散', onClick: onDistributeHorizontal },
    { label: '垂直に分散', onClick: onDistributeVertical },
    { separator: true },
    { label: '接続の検証', onClick: onValidateConnections },
    { label: '重複接続を削除', onClick: onRemoveDuplicateWires },
    { separator: true },
    { label: '設定', onClick: onShowSettings }
  ]

  const helpMenuItems = [
    { label: 'ヘルプ', onClick: onShowHelp },
    { label: 'キーボードショートカット', onClick: onShowShortcuts },
    { separator: true },
    { label: 'バージョン情報', onClick: onShowAbout }
  ]

  return (
    <div ref={menuBarRef} className="bg-white border-b border-gray-300 flex items-center h-6 text-sm select-none shadow-sm">
      <MenuItem 
        label="ファイル" 
        items={fileMenuItems} 
        onItemClick={handleItemClick}
        isOpen={openMenu === 'file'}
        onToggle={() => handleMenuToggle('file')}
        onClose={() => setOpenMenu(null)}
      />
      <MenuItem 
        label="編集" 
        items={editMenuItems} 
        onItemClick={handleItemClick}
        isOpen={openMenu === 'edit'}
        onToggle={() => handleMenuToggle('edit')}
        onClose={() => setOpenMenu(null)}
      />
      <MenuItem 
        label="表示" 
        items={viewMenuItems} 
        onItemClick={handleItemClick}
        isOpen={openMenu === 'view'}
        onToggle={() => handleMenuToggle('view')}
        onClose={() => setOpenMenu(null)}
      />
      <MenuItem 
        label="ツール" 
        items={toolsMenuItems} 
        onItemClick={handleItemClick}
        isOpen={openMenu === 'tools'}
        onToggle={() => handleMenuToggle('tools')}
        onClose={() => setOpenMenu(null)}
      />
      <MenuItem 
        label="ヘルプ" 
        items={helpMenuItems} 
        onItemClick={handleItemClick}
        isOpen={openMenu === 'help'}
        onToggle={() => handleMenuToggle('help')}
        onClose={() => setOpenMenu(null)}
      />
      
      {/* プロジェクト名（クリックで編集） */}
      <div className="flex-1 flex justify-center">
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={commitTitleEdit}
            onKeyDown={handleTitleKeyDown}
            className="text-xs text-gray-800 font-medium bg-white border border-blue-400 px-1 rounded outline-none w-48 text-center"
          />
        ) : (
          <button
            onClick={startTitleEdit}
            className="text-xs text-gray-800 font-medium hover:bg-gray-100 px-2 py-0.5 rounded"
            title="クリックしてプロジェクト名を編集"
          >
            {project.name || '新規プロジェクト'}
          </button>
        )}
      </div>
      
      {/* 評価スコア表示 */}
      {layoutScore !== null && (
        <div className="px-2 text-xs text-gray-600 font-medium">
          評価スコア: <span className="text-gray-900">{layoutScore.toFixed(1)}</span>
        </div>
      )}
    </div>
  )
}