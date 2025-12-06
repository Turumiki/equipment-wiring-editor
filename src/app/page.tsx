'use client'

import { useState, useRef, useEffect } from 'react'
import WiringDiagramEditor from '@/components/WiringDiagramEditor'
import MenuBar from '@/components/MenuBar'
import SettingsDialog from '@/components/SettingsDialog'
import ExportDialog from '@/components/ExportDialog'
import CSVImportDialog from '@/components/CSVImportDialog'
import AutoLayoutDialog from '@/components/AutoLayoutDialog'
import HelpDialog from '@/components/HelpDialog'
import ShortcutsDialog from '@/components/ShortcutsDialog'
import AboutDialog from '@/components/AboutDialog'
import ScoreDetailsPanel from '@/components/ScoreDetailsDialog'
import { useProjectStore } from '@/store/useProjectStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { Project } from '@/types'

export default function Home() {
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(true)
  const [showTableEditor, setShowTableEditor] = useState(false)
  const [showAutoLayout, setShowAutoLayout] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // WiringDiagramEditorの参照を取得するためのref
  const editorRef = useRef<any>(null)

  // プロジェクトストアから保存・読み込み機能を取得
  const { saveProject, loadProject, createNewProject, loadAutoSavedProject, project, removeDuplicateWires } = useProjectStore()
  const { showScoreCalculation } = useSettingsStore()

  // アプリ起動時に自動保存されたプロジェクトを読み込む
  useEffect(() => {
    const loaded = loadAutoSavedProject()
    if (loaded) {
      console.log('自動保存されたプロジェクトを読み込みました')
    }
  }, []) // 初回マウント時のみ実行

  // プロジェクトが変更されたときに自動保存（Zustandのsubscribeを使用）
  useEffect(() => {
    // デバウンス用のタイマー
    let saveTimer: NodeJS.Timeout | null = null
    let previousProject: Project | null = null
    
    const unsubscribe = useProjectStore.subscribe((state) => {
      // プロジェクトが変更された場合のみ自動保存
      if (previousProject !== state.project) {
        previousProject = state.project
        // デバウンスして自動保存（300ms後に保存）
        if (saveTimer) {
          clearTimeout(saveTimer)
        }
        saveTimer = setTimeout(() => {
          useProjectStore.getState().autoSaveProject()
        }, 300)
      }
    })
    return () => {
      unsubscribe()
      if (saveTimer) {
        clearTimeout(saveTimer)
      }
    }
  }, [])

  const handleNewProject = () => {
    if (confirm('新しいプロジェクトを作成しますか？現在の作業内容は失われます。')) {
      createNewProject()
    }
  }

  const handleOpenProject = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
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
            alert('プロジェクトファイルの読み込みに失敗しました')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const handleSaveProject = () => {
    saveProject()
  }

  const handleSaveAsProject = () => {
    // 名前を付けて保存の場合は、ファイル名を指定できるようにする
    const fileName = prompt('ファイル名を入力してください:', 'project.json')
    if (fileName) {
      // プロジェクトデータを取得して直接ダウンロード
      const { project } = useProjectStore.getState()
      const projectData = JSON.stringify(project, null, 2)
      const blob = new Blob([projectData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.endsWith('.json') ? fileName : fileName + '.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleExportProject = () => {
    // エクスポートダイアログを表示
    setShowExport(true)
  }

  const handleImportProject = () => {
    // プロジェクトインポートは既にhandleOpenProjectで実装済み
    handleOpenProject()
  }

  return (
    <main className="h-screen w-full flex flex-col">
      <MenuBar
        // メニュー状態管理
        openMenu={openMenu}
        onMenuChange={setOpenMenu}

        // ファイルメニュー
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onSaveAsProject={handleSaveAsProject}
        onExportProject={() => setShowExport(true)}
        onImportProject={handleImportProject}
        onImportCSV={() => setShowCSVImport(true)}

        // 編集メニュー
        onSelectAll={() => editorRef.current?.selectAll()}
        onDeselectAll={() => editorRef.current?.deselectAll()}
        onCopy={() => editorRef.current?.copy()}
        onPaste={() => editorRef.current?.paste()}
        onDelete={() => editorRef.current?.deleteSelected()}
        onDuplicate={() => editorRef.current?.duplicateSelected()}

        // 表示メニュー
        onShowTemplateLibrary={() => setShowTemplateLibrary(!showTemplateLibrary)}
        onShowTableEditor={() => setShowTableEditor(!showTableEditor)}
        onShowInspector={() => { }}
        onZoomIn={() => editorRef.current?.zoomIn()}
        onZoomOut={() => editorRef.current?.zoomOut()}
        onZoomToFit={() => editorRef.current?.zoomToFit()}
        onZoomToActual={() => editorRef.current?.zoomToActual()}

        // ツールメニュー
        onShowAutoLayout={() => setShowAutoLayout(true)}
        onAlignLeft={() => editorRef.current?.alignLeft()}
        onAlignCenter={() => editorRef.current?.alignCenter()}
        onAlignRight={() => editorRef.current?.alignRight()}
        onAlignTop={() => editorRef.current?.alignTop()}
        onAlignCenterVertical={() => editorRef.current?.alignCenterVertical()}
        onAlignBottom={() => editorRef.current?.alignBottom()}
        onDistributeHorizontal={() => editorRef.current?.distributeHorizontal()}
        onDistributeVertical={() => editorRef.current?.distributeVertical()}
        onValidateConnections={() => editorRef.current?.validateConnections()}
        onRemoveDuplicateWires={() => {
          const removedCount = removeDuplicateWires()
          if (removedCount > 0) {
            alert(`${removedCount}個の重複接続を削除しました`)
          } else {
            alert('重複接続は見つかりませんでした')
          }
        }}
        onShowSettings={() => setShowSettings(true)}

        // ヘルプメニュー
        onShowHelp={() => setShowHelp(true)}
        onShowShortcuts={() => setShowShortcuts(true)}
        onShowAbout={() => setShowAbout(true)}
      />
      <div className="flex-1 overflow-hidden">
        <WiringDiagramEditor
          ref={editorRef}
          showTemplateLibrary={showTemplateLibrary}
          showTableEditor={showTableEditor}
          showAutoLayout={showAutoLayout}
          onCloseTemplateLibrary={() => setShowTemplateLibrary(false)}
          onCloseTableEditor={() => setShowTableEditor(false)}
          onCloseAutoLayout={() => setShowAutoLayout(false)}
          onCloseMenus={() => setOpenMenu(null)}
        />
      </div>

      {/* ダイアログ */}
      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <ExportDialog
        isOpen={showExport}
        onClose={() => setShowExport(false)}
      />

      <CSVImportDialog
        isOpen={showCSVImport}
        onClose={() => setShowCSVImport(false)}
      />

      <AutoLayoutDialog
        isOpen={showAutoLayout}
        onClose={() => setShowAutoLayout(false)}
        onApply={async (options, onProgress) => {
          // 自動レイアウト適用処理
          await editorRef.current?.applyAutoLayout(options, onProgress)
        }}
      />

      <HelpDialog
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      <ShortcutsDialog
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      <AboutDialog
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />

      {/* 評価スコア詳細パネル（設定で有効化時のみ表示） */}
      {showScoreCalculation && (
        <ScoreDetailsPanel project={project} />
      )}
    </main>
  )
}