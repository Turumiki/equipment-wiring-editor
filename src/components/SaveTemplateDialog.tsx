import React, { useState } from 'react'
import { EquipmentObject, EquipmentTemplate, ComponentType } from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useProjectStore } from '@/store/useProjectStore'
import { getPropertyComponent } from '@/utils/componentSystem'

interface SaveTemplateDialogProps {
  isOpen: boolean
  equipmentObject: EquipmentObject | null
  onClose: () => void
}

export default function SaveTemplateDialog({ isOpen, equipmentObject, onClose }: SaveTemplateDialogProps) {
  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateTags, setTemplateTags] = useState('')
  const [saveLocation, setSaveLocation] = useState<'global' | 'project'>('project')
  
  const { addEquipmentTemplate, equipmentTemplates } = useSettingsStore()
  const { addTemplateToProject, project } = useProjectStore()

  // 既存のカテゴリを取得（グローバル + プロジェクト）
  const allTemplates = [...equipmentTemplates, ...project.customTemplates]
  const existingCategories = Array.from(new Set(allTemplates.map(t => t.category)))

  React.useEffect(() => {
    if (equipmentObject && isOpen) {
      const propertyComponent = getPropertyComponent(equipmentObject)
      const objectName = propertyComponent?.data.properties.name?.value || equipmentObject.name
      
      setTemplateName(objectName)
      setTemplateCategory('')
      setTemplateDescription(`${objectName}のテンプレート`)
      setTemplateTags('')
    }
  }, [equipmentObject, isOpen])

  const handleSave = () => {
    if (!equipmentObject || !templateName.trim()) {
      alert('テンプレート名を入力してください')
      return
    }

    // テンプレートIDの生成（名前をベースに）
    const templateId = templateName.toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    // 既存のIDと重複チェック（保存先に応じて）
    const targetTemplates = saveLocation === 'global' ? equipmentTemplates : project.customTemplates
    if (targetTemplates.some(t => t.id === templateId)) {
      alert(`同じ名前のテンプレートが既に${saveLocation === 'global' ? 'グローバル' : 'プロジェクト'}に存在します`)
      return
    }

    const newTemplate: EquipmentTemplate = {
      id: templateId,
      name: templateName.trim(),
      category: templateCategory.trim() || 'カスタム',
      description: templateDescription.trim(),
      defaultComponents: equipmentObject.components.map(comp => ({
        ...comp,
        // IDは新しいオブジェクト作成時に再生成されるため、テンプレートでは保持しない
        id: comp.id
      })),
      tags: templateTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // 保存先に応じて処理を分岐
    if (saveLocation === 'global') {
      addEquipmentTemplate(newTemplate)
      alert(`テンプレート「${templateName}」をグローバルテンプレートに保存しました`)
    } else {
      addTemplateToProject(newTemplate)
      alert(`テンプレート「${templateName}」をプロジェクトテンプレートに保存しました`)
    }
    
    handleClose()
  }

  const handleClose = () => {
    setTemplateName('')
    setTemplateCategory('')
    setTemplateDescription('')
    setTemplateTags('')
    setSaveLocation('project')
    onClose()
  }

  if (!isOpen || !equipmentObject) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-black">テンプレートとして保存</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* 保存先選択 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">保存先</label>
            <div className="flex gap-2">
              <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition-colors ${
                saveLocation === 'project'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="saveLocation"
                  value="project"
                  checked={saveLocation === 'project'}
                  onChange={(e) => setSaveLocation(e.target.value as 'project')}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="font-medium text-sm">プロジェクト</div>
                  <div className="text-xs text-gray-500">このプロジェクトのみ</div>
                </div>
              </label>
              <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition-colors ${
                saveLocation === 'global'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="saveLocation"
                  value="global"
                  checked={saveLocation === 'global'}
                  onChange={(e) => setSaveLocation(e.target.value as 'global')}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="font-medium text-sm">グローバル</div>
                  <div className="text-xs text-gray-500">全プロジェクトで使用</div>
                </div>
              </label>
            </div>
          </div>

          {/* テンプレート名 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              テンプレート名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="例: カスタムPLC"
            />
          </div>

          {/* カテゴリ */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">カテゴリ</label>
            <div className="flex gap-2">
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-black"
              >
                <option value="">新しいカテゴリ</option>
                {existingCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <input
                type="text"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-black"
                placeholder="または新規入力"
              />
            </div>
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">説明</label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              rows={3}
              placeholder="このテンプレートの説明を入力してください"
            />
          </div>

          {/* タグ */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">タグ</label>
            <input
              type="text"
              value={templateTags}
              onChange={(e) => setTemplateTags(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="タグをカンマ区切りで入力（例: PLC, 制御, 産業用）"
            />
            <p className="text-xs text-gray-500 mt-1">
              タグはカンマ（,）で区切って入力してください
            </p>
          </div>

          {/* プレビュー情報 */}
          <div className="bg-gray-50 p-3 rounded border">
            <h4 className="text-sm font-medium text-black mb-2">保存される情報</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• ポート設定: {equipmentObject.components.filter(c => c.type === ComponentType.CONNECTION_PORT).length}個</li>
              <li>• サイズ設定: 幅×高さ</li>
              <li>• プロパティ設定</li>
              <li>• 外観設定</li>
            </ul>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={!templateName.trim()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}