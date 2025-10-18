import React, { useState } from 'react'
import { EquipmentTemplate, ShapeType } from '@/types'
import { createBasicEquipmentObject, createEquipmentFromTemplate } from '@/utils/componentSystem'
import { useProjectStore } from '@/store/useProjectStore'
import { useSettingsStore } from '@/store/useSettingsStore'

interface TemplateLibraryProps {
  onClose: () => void
  onAddEquipment: (template: EquipmentTemplate) => void
}


export default function TemplateLibrary({ onClose, onAddEquipment }: TemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('全て')
  const [searchTerm, setSearchTerm] = useState('')
  const [templateSource, setTemplateSource] = useState<'global' | 'project'>('global')
  const { 
    addEquipmentObject, 
    project,
    addTemplateToProject,
    removeTemplateFromProject,
    exportProjectTemplates,
    importProjectTemplates,
    exportSingleTemplate
  } = useProjectStore()
  const {
    equipmentTemplates: globalTemplates,
    addEquipmentTemplate,
    removeEquipmentTemplate,
    exportEquipmentTemplates,
    importEquipmentTemplates: importGlobalTemplates,
    exportEquipmentTemplatesToCSV
  } = useSettingsStore()

  // 現在選択されているテンプレートソースに応じてテンプレートを取得
  const currentTemplates = templateSource === 'global' ? globalTemplates : project.customTemplates

  const categories = ['全て', ...Array.from(new Set(currentTemplates.map(t => t.category)))]

  const filteredTemplates = currentTemplates.filter(template => {
    const matchesCategory = selectedCategory === '全て' || template.category === selectedCategory
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          
          // 単一テンプレートか配列かを判定
          const templates = Array.isArray(data) ? data : [data]
          
          if (templateSource === 'global') {
            importGlobalTemplates(templates)
          } else {
            importProjectTemplates(templates)
          }
          
          alert(`${templates.length}個のテンプレートを${templateSource === 'global' ? 'グローバル' : 'プロジェクト'}にインポートしました`)
        } catch (error) {
          alert('テンプレートファイルの読み込みに失敗しました')
        }
      }
      reader.readAsText(file)
    }
    // ファイル選択をリセット
    event.target.value = ''
  }

  const handleExportTemplates = () => {
    if (templateSource === 'global') {
      exportEquipmentTemplates()
    } else {
      exportProjectTemplates()
    }
  }

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('このテンプレートを削除しますか？')) {
      if (templateSource === 'global') {
        removeEquipmentTemplate(templateId)
      } else {
        removeTemplateFromProject(templateId)
      }
    }
  }

  const handleCopyToProject = (template: EquipmentTemplate) => {
    addTemplateToProject(template)
    alert(`テンプレート「${template.name}」をプロジェクトにコピーしました`)
  }

  const handleCopyToGlobal = (template: EquipmentTemplate) => {
    addEquipmentTemplate(template)
    alert(`テンプレート「${template.name}」をグローバルテンプレートにコピーしました`)
  }

  const handleAddTemplate = (template: EquipmentTemplate) => {
    let equipmentObject

    // defaultComponentsが定義されている場合は汎用テンプレート関数を使用
    if (template.defaultComponents && template.defaultComponents.length > 0) {
      equipmentObject = createEquipmentFromTemplate(template)
      // ランダムな位置に配置
      equipmentObject.position = { 
        x: Math.random() * 300 + 100, 
        y: Math.random() * 200 + 100 
      }
    } else {
      // 従来の基本テンプレートから機材オブジェクトを作成
      const shape = getShapeForTemplate(template.id)
      equipmentObject = createBasicEquipmentObject(
        template.name,
        { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
        shape,
        template.id // 機材タイプを渡す
      )
    }

    equipmentObject.templateId = template.id
    addEquipmentObject(equipmentObject)
    onAddEquipment(template)
  }

  const getShapeForTemplate = (templateId: string): ShapeType => {
    // 全て四角形で統一
    return ShapeType.RECTANGLE
  }

  const getColorForTemplate = (templateId: string): string => {
    switch (templateId) {
      case 'audio-interface':
        return '#3b82f6' // blue
      case 'microphone':
        return '#dc2626' // red
      case 'computer':
        return '#6b7280' // gray
      case 'switching-hub':
        return '#059669' // green
      case 'dante-mixer':
        return '#7c3aed' // purple
      case 'camera':
        return '#ea580c' // orange
      case 'display':
        return '#1f2937' // dark gray
      case 'speaker':
        return '#f59e0b' // amber
      case 'headphones':
        return '#8b5cf6' // violet
      case 'video-switcher':
        return '#ef4444' // red
      case 'yamaha-ql1':
        return '#1a1a1a' // YAMAHA black
      default:
        return '#3b82f6'
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* ヘッダー */}
      <div className="px-2 py-1 border-b border-gray-400 bg-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-bold text-black uppercase tracking-wide">Template Library</h2>
          <button
            onClick={onClose}
            className="text-black hover:bg-gray-300 px-2 py-1 text-xs font-bold"
          >
            ×
          </button>
        </div>

        {/* テンプレートソース切り替え */}
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setTemplateSource('global')}
            className={`flex-1 px-2 py-1 text-xs font-bold border ${templateSource === 'global'
              ? 'bg-blue-600 text-white border-blue-800'
              : 'bg-gray-300 text-black border-gray-500 hover:bg-gray-400'
            }`}
          >
            グローバル ({globalTemplates.length})
          </button>
          <button
            onClick={() => setTemplateSource('project')}
            className={`flex-1 px-2 py-1 text-xs font-bold border ${templateSource === 'project'
              ? 'bg-green-600 text-white border-green-800'
              : 'bg-gray-300 text-black border-gray-500 hover:bg-gray-400'
            }`}
          >
            プロジェクト ({project.customTemplates.length})
          </button>
        </div>

        {/* 管理ボタン */}
        <div className="flex gap-1 mb-2">
          <label className="flex-1 px-2 py-1 text-xs font-bold bg-yellow-500 text-white border border-yellow-700 hover:bg-yellow-600 cursor-pointer text-center">
            インポート
            <input
              type="file"
              accept=".json"
              onChange={handleImportTemplates}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportTemplates}
            className="flex-1 px-2 py-1 text-xs font-bold bg-orange-500 text-white border border-orange-700 hover:bg-orange-600"
            disabled={currentTemplates.length === 0}
          >
            エクスポート
          </button>
        </div>

        {/* 検索 */}
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-2 py-1 border border-gray-400 bg-white text-black text-xs focus:outline-none focus:border-black"
        />
      </div>

      {/* カテゴリフィルター */}
      <div className="px-2 py-1 border-b border-gray-400 bg-gray-200">
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2 py-1 text-xs font-bold border ${selectedCategory === category
                ? 'bg-blue-600 text-white border-blue-800'
                : 'bg-gray-300 text-black border-gray-500 hover:bg-gray-400'
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* テンプレート一覧 */}
      <div className="flex-1 overflow-y-auto p-1">
        {filteredTemplates.length === 0 ? (
          <div className="text-center text-gray-500 text-xs mt-4">
            {templateSource === 'project' ? 'プロジェクトにテンプレートがありません' : 'テンプレートが見つかりません'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="border border-gray-400 bg-white p-2 hover:bg-gray-50 group"
              >
                <div className="flex items-center gap-2">
                  {/* テンプレートアイコン */}
                  <div
                    className="w-8 h-6 border border-gray-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer"
                    style={{ backgroundColor: getColorForTemplate(template.id) }}
                    onClick={() => handleAddTemplate(template)}
                    title="クリックして機材を追加"
                  >
                    {template.name.charAt(0)}
                  </div>

                  {/* テンプレート情報 */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleAddTemplate(template)}
                  >
                    <h3 className="font-bold text-xs text-black truncate">{template.name}</h3>
                    <p className="text-xs text-gray-600 truncate">{template.description}</p>
                    <div className="flex gap-1 mt-1">
                      {template.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-1 py-0 bg-gray-200 text-black text-xs border border-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 管理ボタン */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* 単体エクスポート */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        exportSingleTemplate(template.id)
                      }}
                      className="px-1 py-0.5 text-xs bg-blue-500 text-white hover:bg-blue-600"
                      title="単体エクスポート"
                    >
                      📤
                    </button>
                    
                    {/* コピー */}
                    {templateSource === 'global' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyToProject(template)
                        }}
                        className="px-1 py-0.5 text-xs bg-green-500 text-white hover:bg-green-600"
                        title="プロジェクトにコピー"
                      >
                        📋
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyToGlobal(template)
                        }}
                        className="px-1 py-0.5 text-xs bg-purple-500 text-white hover:bg-purple-600"
                        title="グローバルにコピー"
                      >
                        🌐
                      </button>
                    )}
                    
                    {/* 削除 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTemplate(template.id)
                      }}
                      className="px-1 py-0.5 text-xs bg-red-500 text-white hover:bg-red-600"
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}