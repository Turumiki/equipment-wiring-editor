import { EquipmentTemplate } from '@/types'

// テンプレートファイルのマッピング
const TEMPLATE_FILES = {
  audio: '/templates/audio.json',
  computer: '/templates/computer.json',
  network: '/templates/network.json',
  video: '/templates/video.json'
} as const

type TemplateCategory = keyof typeof TEMPLATE_FILES

// 単一カテゴリのテンプレートを読み込み
export async function loadTemplateCategory(category: TemplateCategory): Promise<EquipmentTemplate[]> {
  try {
    const response = await fetch(TEMPLATE_FILES[category])
    if (!response.ok) {
      throw new Error(`Failed to load ${category} templates: ${response.statusText}`)
    }
    
    const templates = await response.json()
    
    // 日付フィールドを追加
    return templates.map((template: any) => ({
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  } catch (error) {
    console.error(`Error loading ${category} templates:`, error)
    return []
  }
}

// 全テンプレートを読み込み
export async function loadAllTemplates(): Promise<EquipmentTemplate[]> {
  const categories = Object.keys(TEMPLATE_FILES) as TemplateCategory[]
  
  try {
    const templateArrays = await Promise.all(
      categories.map(category => loadTemplateCategory(category))
    )
    
    return templateArrays.flat()
  } catch (error) {
    console.error('Error loading templates:', error)
    return []
  }
}

// 特定のテンプレートIDを検索
export async function findTemplateById(id: string): Promise<EquipmentTemplate | null> {
  const allTemplates = await loadAllTemplates()
  return allTemplates.find(template => template.id === id) || null
}

// カテゴリ別にテンプレートを取得
export async function getTemplatesByCategory(): Promise<Record<string, EquipmentTemplate[]>> {
  const allTemplates = await loadAllTemplates()
  
  return allTemplates.reduce((acc, template) => {
    const category = template.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(template)
    return acc
  }, {} as Record<string, EquipmentTemplate[]>)
}

// フォールバック用のデフォルトテンプレート
export function getDefaultTemplates(): EquipmentTemplate[] {
  return [
    {
      id: 'default-equipment',
      name: '基本機材',
      category: '汎用',
      description: 'デフォルトの機材テンプレート',
      ports: [
        {
          side: 'left',
          offset: 50,
          type: 'xlr-female',
          direction: 'input',
          label: 'Input'
        },
        {
          side: 'right',
          offset: 50,
          type: 'xlr-male',
          direction: 'output',
          label: 'Output'
        }
      ],
      shape: 'rectangle',
      color: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 1,
      size: { width: 100, height: 60 },
      tags: ['汎用'],
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
}