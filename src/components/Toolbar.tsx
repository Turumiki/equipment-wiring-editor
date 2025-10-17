import React, { useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import CSVImportDialog from './CSVImportDialog'
import ExportDialog from './ExportDialog'
import SettingsDialog from './SettingsDialog'

interface ToolbarProps {
  onToggleTemplateLibrary: () => void
  onToggleTableEditor: () => void
  onToggleAutoLayout: () => void
}

export default function Toolbar({ onToggleTemplateLibrary, onToggleTableEditor, onToggleAutoLayout }: ToolbarProps) {
  const { 
    saveProject, 
    loadProject, 
    createNewProject, 
    toggleEditMode, 
    isEditMode,
    undo,
    redo,
    canUndo,
    canRedo
  } = useProjectStore()
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const projectData = JSON.parse(e.target?.result as string)
          // 日付文字列をDateオブジェクトに変換
          projectData.createdAt = new Date(projectData.createdAt)
          projectData.updatedAt = new Date(projectData.updatedAt)
          if (projectData.customTemplates) {
            projectData.customTemplates.forEach((template: any) => {
              template.createdAt = new Date(template.createdAt)
              template.updatedAt = new Date(template.updatedAt)
            })
          }
          loadProject(projectData)
          alert('プロジェクトを読み込みました')
        } catch (error) {
          console.error('Failed to load project:', error)
          alert('プロジェクトの読み込みに失敗しました')
        }
      }
      reader.readAsText(file)
    }
    // ファイル選択をリセット
    event.target.value = ''
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex flex-wrap gap-2">
      {/* ファイル操作 */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={createNewProject}
          className="px-2 lg:px-3 py-2 text-xs lg:text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          title="新規プロジェクト"
          aria-label="新規プロジェクト"
        >
          新規
        </button>
        
        <label className="px-2 lg:px-3 py-2 text-xs lg:text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors cursor-pointer">
          開く
          <input
            type="file"
            accept=".json"
            onChange={handleFileInput}
            className="hidden"
            aria-label="プロジェクトファイルを開く"
          />
        </label>
        
        <button
          onClick={saveProject}
          className="px-2 lg:px-3 py-2 text-xs lg:text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          title="プロジェクトを保存"
          aria-label="プロジェクトを保存"
        >
          保存
        </button>
        
        <button
          onClick={() => setShowCSVImport(true)}
          className="px-2 lg:px-3 py-2 text-xs lg:text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          title="CSVインポート"
          aria-label="CSVファイルをインポート"
        >
          CSV
        </button>
        
        <button
          onClick={() => setShowExport(true)}
          className="px-2 lg:px-3 py-2 text-xs lg:text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
          title="図面エクスポート"
          aria-label="図面をエクスポート"
        >
          出力
        </button>
        
        <button
          onClick={() => setShowSettings(true)}
          className="px-2 lg:px-3 py-2 text-xs lg:text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          title="接続設定"
          aria-label="接続設定を開く"
        >
          <span className="hidden lg:inline">設定</span>
          <span className="lg:hidden">⚙️</span>
        </button>
      </div>

      <div className="hidden lg:block w-px bg-gray-300" />

      {/* 表示切替 */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={onToggleTemplateLibrary}
          className="px-2 lg:px-3 py-2 text-xs lg:text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          title="テンプレートライブラリ"
          aria-label="テンプレートライブラリを開く"
        >
          <span className="hidden lg:inline">テンプレート</span>
          <span className="lg:hidden">📚</span>
        </button>
        
        <button
          onClick={onToggleTableEditor}
          className="px-2 lg:px-3 py-2 text-xs lg:text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          title="テーブルエディタ"
          aria-label="テーブルエディタを開く"
        >
          <span className="hidden lg:inline">テーブル</span>
          <span className="lg:hidden">📊</span>
        </button>
        
        <button
          onClick={onToggleAutoLayout}
          className="px-2 lg:px-3 py-2 text-xs lg:text-sm bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
          title="自動レイアウト"
          aria-label="自動レイアウトを開く"
        >
          <span className="hidden lg:inline">レイアウト</span>
          <span className="lg:hidden">🔄</span>
        </button>
      </div>

      <div className="hidden lg:block w-px bg-gray-300" />

      {/* Undo/Redo */}
      <div className="flex gap-1">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="px-2 lg:px-3 py-2 text-xs lg:text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="元に戻す (Ctrl+Z)"
          aria-label="元に戻す"
        >
          ↶
        </button>
        
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="px-2 lg:px-3 py-2 text-xs lg:text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="やり直し (Ctrl+Y)"
          aria-label="やり直し"
        >
          ↷
        </button>
      </div>

      <div className="hidden lg:block w-px bg-gray-300" />

      {/* 編集モード */}
      <button
        onClick={toggleEditMode}
        className={`px-2 lg:px-3 py-2 text-xs lg:text-sm rounded transition-colors ${
          isEditMode 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        title="編集モード切替"
        aria-label={isEditMode ? '編集モードを終了' : '編集モードを開始'}
      >
        <span className="hidden lg:inline">{isEditMode ? '編集中' : '編集'}</span>
        <span className="lg:hidden">{isEditMode ? '✏️' : '📝'}</span>
      </button>
      
      <CSVImportDialog 
        isOpen={showCSVImport}
        onClose={() => setShowCSVImport(false)}
      />
      
      <ExportDialog 
        isOpen={showExport}
        onClose={() => setShowExport(false)}
      />
      
      <SettingsDialog 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}