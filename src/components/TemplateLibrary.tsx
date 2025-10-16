import React, { useState } from 'react'
import { EquipmentTemplate, ShapeType } from '@/types'
import { createBasicEquipmentObject } from '@/utils/componentSystem'
import { useProjectStore } from '@/store/useProjectStore'

interface TemplateLibraryProps {
  onClose: () => void
  onAddEquipment: (template: EquipmentTemplate) => void
}

// オーディオ・映像機器テンプレート定義
const basicTemplates: EquipmentTemplate[] = [
  {
    id: 'audio-interface',
    name: 'オーディオインターフェース',
    category: 'オーディオ',
    description: 'USB/Thunderbolt オーディオインターフェース',
    defaultComponents: [],
    tags: ['オーディオ', 'USB', 'レコーディング'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'microphone',
    name: 'マイクロフォン',
    category: 'オーディオ',
    description: 'コンデンサー・ダイナミックマイク',
    defaultComponents: [],
    tags: ['マイク', '入力', 'XLR'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'computer',
    name: 'パソコン',
    category: 'コンピューター',
    description: 'デスクトップ・ノートパソコン',
    defaultComponents: [],
    tags: ['PC', 'コンピューター', 'DAW'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'switching-hub',
    name: 'スイッチングハブ',
    category: 'ネットワーク',
    description: 'Ethernet スイッチングハブ',
    defaultComponents: [],
    tags: ['ネットワーク', 'Ethernet', 'LAN'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'dante-mixer',
    name: 'Dante対応デジタルミキサー',
    category: 'オーディオ',
    description: 'Danteネットワーク対応デジタルミキサー',
    defaultComponents: [],
    tags: ['ミキサー', 'Dante', 'デジタル'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'camera',
    name: 'カメラ',
    category: '映像',
    description: 'ビデオカメラ・Webカメラ',
    defaultComponents: [],
    tags: ['カメラ', '映像', 'HDMI'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'display',
    name: 'ディスプレイ',
    category: '映像',
    description: 'モニター・プロジェクター',
    defaultComponents: [],
    tags: ['ディスプレイ', 'モニター', 'HDMI'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'speaker',
    name: 'スピーカー',
    category: 'オーディオ',
    description: 'モニタースピーカー・PA スピーカー',
    defaultComponents: [],
    tags: ['スピーカー', '出力', 'モニター'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'headphones',
    name: 'ヘッドフォン',
    category: 'オーディオ',
    description: 'モニターヘッドフォン',
    defaultComponents: [],
    tags: ['ヘッドフォン', 'モニター', '個人'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'video-switcher',
    name: 'ビデオスイッチャー',
    category: '映像',
    description: 'HDMI・SDI ビデオスイッチャー',
    defaultComponents: [],
    tags: ['スイッチャー', '映像', 'ライブ'],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export default function TemplateLibrary({ onClose, onAddEquipment }: TemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('全て')
  const [searchTerm, setSearchTerm] = useState('')
  const { addEquipmentObject } = useProjectStore()

  const categories = ['全て', ...Array.from(new Set(basicTemplates.map(t => t.category)))]
  
  const filteredTemplates = basicTemplates.filter(template => {
    const matchesCategory = selectedCategory === '全て' || template.category === selectedCategory
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleAddTemplate = (template: EquipmentTemplate) => {
    // テンプレートから機材オブジェクトを作成
    const shape = getShapeForTemplate(template.id)
    const equipmentObject = createBasicEquipmentObject(
      template.name,
      { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
      shape,
      template.id // 機材タイプを渡す
    )
    
    equipmentObject.templateId = template.id
    addEquipmentObject(equipmentObject)
    onAddEquipment(template)
  }

  const getShapeForTemplate = (templateId: string): ShapeType => {
    switch (templateId) {
      case 'audio-interface':
        return ShapeType.RECTANGLE
      case 'microphone':
        return ShapeType.CIRCLE
      case 'computer':
        return ShapeType.RECTANGLE
      case 'switching-hub':
        return ShapeType.RECTANGLE
      case 'dante-mixer':
        return ShapeType.RECTANGLE
      case 'camera':
        return ShapeType.TRIANGLE
      case 'display':
        return ShapeType.RECTANGLE
      case 'speaker':
        return ShapeType.TRIANGLE
      case 'headphones':
        return ShapeType.CIRCLE
      case 'video-switcher':
        return ShapeType.RECTANGLE
      default:
        return ShapeType.RECTANGLE
    }
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
      default:
        return '#3b82f6'
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-black">テンプレートライブラリ</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {/* 検索 */}
        <input
          type="text"
          placeholder="テンプレートを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
      </div>

      {/* カテゴリフィルター */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-black hover:bg-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* テンプレート一覧 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-3">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleAddTemplate(template)}
            >
              <div className="flex items-center gap-3">
                {/* テンプレートアイコン */}
                <div 
                  className="w-12 h-8 rounded flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: getColorForTemplate(template.id) }}
                >
                  {template.name.charAt(0)}
                </div>
                
                {/* テンプレート情報 */}
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-black">{template.name}</h3>
                  <p className="text-xs text-gray-700">{template.description}</p>
                  <div className="flex gap-1 mt-1">
                    {template.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 text-black text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}