import React, { useState, useEffect } from 'react'
import { EquipmentTemplate, SimpleTemplatePort } from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useProjectStore } from '@/store/useProjectStore'
import TemplatePortEditor from '@/components/TemplatePortEditor'

interface EditTemplateDialogProps {
  isOpen: boolean
  template: EquipmentTemplate | null
  templateSource: 'global' | 'project'
  onClose: () => void
}

export default function EditTemplateDialog({ 
  isOpen, 
  template, 
  templateSource,
  onClose 
}: EditTemplateDialogProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'ports'>('basic')
  const [templateName, setTemplateName] = useState('')
  const [templateCategory, setTemplateCategory] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateTags, setTemplateTags] = useState('')
  const [templatePorts, setTemplatePorts] = useState<SimpleTemplatePort[]>([])
  
  const { updateEquipmentTemplate, equipmentTemplates } = useSettingsStore()
  const { updateTemplateInProject, project } = useProjectStore()

  // 既存のカテゴリを取得（グローバル + プロジェクト）
  const customTemplates = Array.isArray(project.customTemplates) ? project.customTemplates : []
  const allTemplates = [...equipmentTemplates, ...customTemplates]
  const existingCategories = Array.from(new Set(allTemplates.map(t => t.category)))

  useEffect(() => {
    if (template && isOpen) {
      setTemplateName(template.name || '')
      setTemplateCategory(template.category || '')
      setTemplateDescription(template.description || '')
      setTemplateTags(template.tags ? template.tags.join(', ') : '')
      
      // ポート情報を読み込み（idを追加）
      if (template.ports && Array.isArray(template.ports)) {
        setTemplatePorts(template.ports.map((port, index) => ({
          ...port,
          id: (port as any).id || `port-${index}`
        })))
      } else {
        setTemplatePorts([])
      }
    }
  }, [template, isOpen])

  const handleSave = () => {
    if (!template || !templateName.trim()) {
      alert('テンプレート名を入力してください')
      return
    }

    const updatedTemplate = {
      name: templateName.trim(),
      category: templateCategory.trim() || 'カスタム',
      description: templateDescription.trim(),
      tags: templateTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      ports: templatePorts.map(({ id, ...port }) => port), // idを除外して保存
      updatedAt: new Date()
    }

    // 保存先に応じて処理を分岐
    if (templateSource === 'global') {
      updateEquipmentTemplate(template.id, updatedTemplate)
      alert(`テンプレート「${templateName}」を更新しました`)
    } else {
      updateTemplateInProject(template.id, updatedTemplate)
      alert(`テンプレート「${templateName}」を更新しました`)
    }
    
    handleClose()
  }

  const handleClose = () => {
    setTemplateName('')
    setTemplateCategory('')
    setTemplateDescription('')
    setTemplateTags('')
    onClose()
  }

  if (!isOpen || !template) return null

  return (
    <div className="fixed inset-0 bg-gray-100 bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] p-6 flex flex-col shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-black">テンプレートを編集</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-4 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'basic'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            基本情報
          </button>
          <button
            onClick={() => setActiveTab('ports')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'ports'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ポート編集
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
        {activeTab === 'basic' ? (
        <div className="space-y-4">
          {/* 保存先表示 */}
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-sm text-gray-600">
              <span className="font-medium">保存先:</span>{' '}
              {templateSource === 'global' ? 'グローバルテンプレート' : 'プロジェクトテンプレート'}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-gray-50"
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-black bg-gray-50"
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-black bg-gray-50"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-gray-50"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-gray-50"
              placeholder="タグをカンマ区切りで入力（例: PLC, 制御, 産業用）"
            />
            <p className="text-xs text-gray-500 mt-1">
              タグはカンマ（,）で区切って入力してください
            </p>
          </div>

          {/* テンプレート情報 */}
          <div className="bg-gray-50 p-3 rounded border">
            <h4 className="text-sm font-medium text-black mb-2">テンプレート情報</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• ID: {template.id}</li>
              <li>• 作成日: {template.createdAt ? new Date(template.createdAt).toLocaleDateString('ja-JP') : '不明'}</li>
              <li>• 更新日: {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString('ja-JP') : '不明'}</li>
              <li>• バージョン: {template.version || '1.0.0'}</li>
            </ul>
          </div>
        </div>
        ) : (
          <TemplatePortEditor
            ports={templatePorts}
            onPortsChange={setTemplatePorts}
            size={template.size || { width: 200, height: 120 }}
          />
        )}
        </div>

        {/* ボタン */}
        <div className="flex justify-end gap-3 mt-6 border-t border-gray-300 pt-4">
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

