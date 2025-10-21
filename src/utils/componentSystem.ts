import {
  EquipmentObject,
  Component,
  ComponentType,
  RenderComponent,
  ConnectionPortComponent,
  PropertyComponent,
  ShapeType,
  PortType,
  PortDirection,
  Side
} from '@/types'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useProjectStore } from '@/store/useProjectStore'

// コンポーネント作成ヘルパー関数
export function createRenderComponent(
  shape: ShapeType = ShapeType.RECTANGLE,
  color: string = '#6b7280',
  size: { width: number; height: number } = { width: 100, height: 60 },
  labelText: string = ''
): RenderComponent {
  return {
    id: `render-${Date.now()}`,
    type: ComponentType.RENDER,
    enabled: true,
    data: {
      shape,
      color,
      strokeColor: '#4b5563',
      strokeWidth: 2,
      size,
      label: {
        text: labelText,
        position: 'center' as any,
        fontSize: 6,
        color: '#000000'
      }
    }
  }
}

export function createConnectionPortComponent(
  side: Side = Side.LEFT,
  offset: number = 50,
  portType: PortType = PortType.XLR_FEMALE,
  direction: PortDirection = PortDirection.INPUT,
  label?: string
): ConnectionPortComponent {
  // 設定ストアから互換性情報を取得
  const getCompatiblePorts = (type: PortType): PortType[] => {
    // 基本的な互換性マトリックス（フォールバック）
    const basicCompatibility: Partial<Record<PortType, PortType[]>> = {
      [PortType.XLR_MALE]: [PortType.XLR_FEMALE],
      [PortType.XLR_FEMALE]: [PortType.XLR_MALE],
      [PortType.TRS_QUARTER]: [PortType.TRS_QUARTER, PortType.TS_QUARTER],
      [PortType.TS_QUARTER]: [PortType.TS_QUARTER, PortType.TRS_QUARTER],
      [PortType.USB_A]: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
      [PortType.USB_B]: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
      [PortType.USB_C]: [PortType.USB_A, PortType.USB_B, PortType.USB_C],
      [PortType.ETHERNET]: [PortType.ETHERNET, PortType.DANTE], // ETHERNET同士は確実に互換
      [PortType.DANTE]: [PortType.DANTE, PortType.ETHERNET],
      [PortType.HDMI]: [PortType.HDMI],
      [PortType.TRS_MINI]: [PortType.TRS_MINI],
      [PortType.POWER_AC]: [PortType.POWER_AC]
    }

    return basicCompatibility[type] || [type]
  }

  // 許可される方向を設定
  const getAllowedDirections = (direction: PortDirection): PortDirection[] => {
    switch (direction) {
      case PortDirection.BIDIRECTIONAL:
        return [PortDirection.INPUT, PortDirection.OUTPUT, PortDirection.BIDIRECTIONAL]
      default:
        return [direction, PortDirection.BIDIRECTIONAL] // 双方向ポートとの接続を許可
    }
  }

  return {
    id: `port-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${performance.now()}`,
    type: ComponentType.CONNECTION_PORT,
    enabled: true,
    data: {
      portType,
      direction,
      position: {
        side,
        offset
      },
      constraints: {
        maxConnections: direction === PortDirection.INPUT ? 1 : -1,
        allowedPortTypes: getCompatiblePorts(portType),
        allowedDirections: getAllowedDirections(direction)
      },
      connectedWires: [],
      label
    }
  }
}

export function createPropertyComponent(
  name: string = '機材',
  description: string = ''
): PropertyComponent {
  return {
    id: `property-${Date.now()}`,
    type: ComponentType.PROPERTY,
    enabled: true,
    data: {
      properties: {
        name: {
          value: name,
          type: 'string' as any,
          displayName: '名前'
        },
        description: {
          value: description,
          type: 'string' as any,
          displayName: '説明'
        }
      },
      schema: [
        {
          key: 'name',
          type: 'string' as any,
          displayName: '名前',
          required: true,
          defaultValue: name
        },
        {
          key: 'description',
          type: 'string' as any,
          displayName: '説明',
          required: false,
          defaultValue: description
        }
      ]
    }
  }
}

// コンポーネント検索ヘルパー
export function getComponentsByType<T extends Component>(
  object: EquipmentObject,
  type: ComponentType
): T[] {
  return object.components.filter(comp => comp.type === type) as T[]
}

export function getRenderComponent(object: EquipmentObject): RenderComponent | null {
  const components = getComponentsByType<RenderComponent>(object, ComponentType.RENDER)
  return components.length > 0 ? components[0] : null
}

export function getConnectionPortComponents(object: EquipmentObject): ConnectionPortComponent[] {
  return getComponentsByType<ConnectionPortComponent>(object, ComponentType.CONNECTION_PORT)
}

export function getPropertyComponent(object: EquipmentObject): PropertyComponent | null {
  const components = getComponentsByType<PropertyComponent>(object, ComponentType.PROPERTY)
  return components.length > 0 ? components[0] : null
}

// コンポーネント操作ヘルパー
export function addComponentToObject(
  object: EquipmentObject,
  component: Component
): EquipmentObject {
  return {
    ...object,
    components: [...object.components, component]
  }
}

export function removeComponentFromObject(
  object: EquipmentObject,
  componentId: string
): EquipmentObject {
  return {
    ...object,
    components: object.components.filter(comp => comp.id !== componentId)
  }
}

export function updateComponentInObject(
  object: EquipmentObject,
  componentId: string,
  updates: Partial<Component>
): EquipmentObject {
  return {
    ...object,
    components: object.components.map(comp =>
      comp.id === componentId ? { ...comp, ...updates } : comp
    )
  }
}

// 機材タイプに応じたポート作成（動的テンプレートベース）
export function createEquipmentPorts(equipmentType: string): ConnectionPortComponent[] {
  console.log('Creating ports for equipment type:', equipmentType)

  // テンプレートライブラリから動的に取得
  const { equipmentTemplates } = useSettingsStore.getState()
  const { project } = useProjectStore.getState()

  // グローバルテンプレートから検索
  let template = equipmentTemplates.find(t => t.id === equipmentType)

  // プロジェクトテンプレートからも検索
  if (!template) {
    template = project.customTemplates.find(t => t.id === equipmentType)
  }

  // テンプレートにポート定義がある場合は使用
  if (template && template.ports && Array.isArray(template.ports)) {
    return template.ports.map(portConfig => {
      return createConnectionPortComponent(
        stringToSide(portConfig.side),
        Math.max(0, Math.min(100, portConfig.offset)),
        stringToPortType(portConfig.type),
        stringToPortDirection(portConfig.direction),
        portConfig.label
      )
    })
  }

  // フォールバック：従来のハードコードされた定義
  switch (equipmentType) {
    case 'audio-interface':
      return [
        createConnectionPortComponent(Side.LEFT, 25, PortType.XLR_FEMALE, PortDirection.INPUT, 'Mic 1'),
        createConnectionPortComponent(Side.LEFT, 75, PortType.XLR_FEMALE, PortDirection.INPUT, 'Mic 2'),
        createConnectionPortComponent(Side.RIGHT, 25, PortType.TRS_QUARTER, PortDirection.OUTPUT, 'Main L'),
        createConnectionPortComponent(Side.RIGHT, 75, PortType.TRS_QUARTER, PortDirection.OUTPUT, 'Main R'),
        createConnectionPortComponent(Side.TOP, 50, PortType.USB_B, PortDirection.BIDIRECTIONAL, 'USB')
      ]

    case 'microphone':
      return [
        createConnectionPortComponent(Side.BOTTOM, 50, PortType.XLR_MALE, PortDirection.OUTPUT, 'XLR Out')
      ]

    case 'computer':
      return [
        createConnectionPortComponent(Side.LEFT, 20, PortType.USB_A, PortDirection.BIDIRECTIONAL, 'USB 1'),
        createConnectionPortComponent(Side.LEFT, 40, PortType.USB_A, PortDirection.BIDIRECTIONAL, 'USB 2'),
        createConnectionPortComponent(Side.LEFT, 60, PortType.USB_C, PortDirection.BIDIRECTIONAL, 'USB-C'),
        createConnectionPortComponent(Side.LEFT, 80, PortType.ETHERNET, PortDirection.BIDIRECTIONAL, 'LAN'),
        createConnectionPortComponent(Side.RIGHT, 30, PortType.HDMI, PortDirection.OUTPUT, 'HDMI'),
        createConnectionPortComponent(Side.RIGHT, 70, PortType.TRS_MINI, PortDirection.OUTPUT, 'Audio Out')
      ]

    case 'switching-hub':
      return [
        createConnectionPortComponent(Side.BOTTOM, 10, PortType.ETHERNET, PortDirection.BIDIRECTIONAL, 'Port 1'),
        createConnectionPortComponent(Side.BOTTOM, 30, PortType.ETHERNET, PortDirection.BIDIRECTIONAL, 'Port 2'),
        createConnectionPortComponent(Side.BOTTOM, 50, PortType.ETHERNET, PortDirection.BIDIRECTIONAL, 'Port 3'),
        createConnectionPortComponent(Side.BOTTOM, 70, PortType.ETHERNET, PortDirection.BIDIRECTIONAL, 'Port 4'),
        createConnectionPortComponent(Side.BOTTOM, 90, PortType.ETHERNET, PortDirection.BIDIRECTIONAL, 'Port 5')
      ]

    case 'dante-mixer':
      return [
        createConnectionPortComponent(Side.LEFT, 15, PortType.XLR_FEMALE, PortDirection.INPUT, 'Ch 1'),
        createConnectionPortComponent(Side.LEFT, 30, PortType.XLR_FEMALE, PortDirection.INPUT, 'Ch 2'),
        createConnectionPortComponent(Side.LEFT, 45, PortType.XLR_FEMALE, PortDirection.INPUT, 'Ch 3'),
        createConnectionPortComponent(Side.LEFT, 60, PortType.XLR_FEMALE, PortDirection.INPUT, 'Ch 4'),
        createConnectionPortComponent(Side.RIGHT, 25, PortType.XLR_MALE, PortDirection.OUTPUT, 'Main L'),
        createConnectionPortComponent(Side.RIGHT, 75, PortType.XLR_MALE, PortDirection.OUTPUT, 'Main R'),
        createConnectionPortComponent(Side.TOP, 50, PortType.DANTE, PortDirection.BIDIRECTIONAL, 'Dante')
      ]

    case 'camera':
      return [
        createConnectionPortComponent(Side.RIGHT, 50, PortType.HDMI, PortDirection.OUTPUT, 'HDMI Out'),
        createConnectionPortComponent(Side.BOTTOM, 50, PortType.USB_C, PortDirection.BIDIRECTIONAL, 'USB-C')
      ]

    case 'display':
      return [
        createConnectionPortComponent(Side.LEFT, 30, PortType.HDMI, PortDirection.INPUT, 'HDMI 1'),
        createConnectionPortComponent(Side.LEFT, 70, PortType.HDMI, PortDirection.INPUT, 'HDMI 2'),
        createConnectionPortComponent(Side.BOTTOM, 50, PortType.POWER_AC, PortDirection.INPUT, 'Power')
      ]

    case 'speaker':
      return [
        createConnectionPortComponent(Side.LEFT, 50, PortType.TRS_QUARTER, PortDirection.INPUT, 'Audio In')
      ]

    case 'video-switcher':
      return [
        createConnectionPortComponent(Side.LEFT, 20, PortType.HDMI, PortDirection.INPUT, 'Input 1'),
        createConnectionPortComponent(Side.LEFT, 40, PortType.HDMI, PortDirection.INPUT, 'Input 2'),
        createConnectionPortComponent(Side.LEFT, 60, PortType.HDMI, PortDirection.INPUT, 'Input 3'),
        createConnectionPortComponent(Side.LEFT, 80, PortType.HDMI, PortDirection.INPUT, 'Input 4'),
        createConnectionPortComponent(Side.RIGHT, 50, PortType.HDMI, PortDirection.OUTPUT, 'Output'),
        createConnectionPortComponent(Side.TOP, 50, PortType.ETHERNET, PortDirection.BIDIRECTIONAL, 'Control')
      ]

    default:
      // デフォルトポート
      return [
        createConnectionPortComponent(Side.LEFT, 50, PortType.XLR_FEMALE, PortDirection.INPUT, 'Input'),
        createConnectionPortComponent(Side.RIGHT, 50, PortType.XLR_MALE, PortDirection.OUTPUT, 'Output')
      ]
  }
}

// 機材オブジェクト作成ヘルパー
export function createBasicEquipmentObject(
  name: string,
  position: { x: number; y: number },
  shape: ShapeType = ShapeType.RECTANGLE,
  equipmentType?: string
): EquipmentObject {
  const renderComponent = createRenderComponent(shape)
  const propertyComponent = createPropertyComponent(name)

  // 機材タイプに応じたポートを作成
  const ports = equipmentType ? createEquipmentPorts(equipmentType) : [
    createConnectionPortComponent(Side.LEFT, 50, PortType.XLR_FEMALE, PortDirection.INPUT, 'Input'),
    createConnectionPortComponent(Side.RIGHT, 50, PortType.XLR_MALE, PortDirection.OUTPUT, 'Output')
  ]

  return {
    id: `equipment-${Date.now()}`,
    name,
    position,
    rotation: 0,
    scale: { x: 1, y: 1 },
    components: [renderComponent, propertyComponent, ...ports],
    metadata: { equipmentType }
  }
}

// ポート位置計算ヘルパー
export function calculatePortPosition(
  objectPosition: { x: number; y: number },
  objectSize: { width: number; height: number },
  portPosition: { side: Side; offset: number }
): { x: number; y: number } {
  const { x, y } = objectPosition
  const { width, height } = objectSize
  const { side, offset } = portPosition

  const offsetRatio = offset / 100

  switch (side) {
    case Side.TOP:
      return { x: x + width * offsetRatio, y }
    case Side.RIGHT:
      return { x: x + width, y: y + height * offsetRatio }
    case Side.BOTTOM:
      return { x: x + width * offsetRatio, y: y + height }
    case Side.LEFT:
      return { x, y: y + height * offsetRatio }
    default:
      return { x, y }
  }
}

// シンプルなテンプレート形式の型定義
interface SimpleTemplatePort {
  side: 'top' | 'right' | 'bottom' | 'left'
  offset: number // 0-100の％
  type: string // PortTypeの文字列
  direction: 'input' | 'output' | 'bidirectional'
  label: string
}

interface SimpleTemplate {
  id: string
  name: string
  category: string
  description: string
  shape?: 'rectangle' | 'circle' | 'triangle'
  color?: string
  strokeColor?: string
  strokeWidth?: number
  size?: { width: number; height: number }
  ports: SimpleTemplatePort[]
}

// 文字列からenumへの変換ヘルパー
function stringToSide(side: string): Side {
  switch (side.toLowerCase()) {
    case 'top': return Side.TOP
    case 'right': return Side.RIGHT
    case 'bottom': return Side.BOTTOM
    case 'left': return Side.LEFT
    default: return Side.LEFT
  }
}

function stringToPortType(type: string): PortType {
  const typeMap: Record<string, PortType> = {
    'xlr-male': PortType.XLR_MALE,
    'xlr-female': PortType.XLR_FEMALE,
    'trs-quarter': PortType.TRS_QUARTER,
    'ts-quarter': PortType.TS_QUARTER,
    'trs-mini': PortType.TRS_MINI,
    'usb-a': PortType.USB_A,
    'usb-b': PortType.USB_B,
    'usb-c': PortType.USB_C,
    'ethernet': PortType.ETHERNET,
    'dante': PortType.DANTE,
    'hdmi': PortType.HDMI,
    'power-ac': PortType.POWER_AC
  }
  return typeMap[type.toLowerCase()] || PortType.XLR_FEMALE
}

function stringToPortDirection(direction: string): PortDirection {
  switch (direction.toLowerCase()) {
    case 'input': return PortDirection.INPUT
    case 'output': return PortDirection.OUTPUT
    case 'bidirectional': return PortDirection.BIDIRECTIONAL
    default: return PortDirection.INPUT
  }
}

function stringToShapeType(shape: string): ShapeType {
  switch (shape.toLowerCase()) {
    case 'rectangle': return ShapeType.RECTANGLE
    case 'circle': return ShapeType.CIRCLE
    case 'triangle': return ShapeType.TRIANGLE
    default: return ShapeType.RECTANGLE
  }
}

// シンプル形式テンプレート作成関数（統一）
export function createEquipmentFromTemplate(template: SimpleTemplate): EquipmentObject {
  // シンプル形式のテンプレートから機材オブジェクトを作成
  if (template.ports && Array.isArray(template.ports) && template.ports.length > 0) {
    return createEquipmentFromSimpleTemplate(template)
  }

  // ポートが定義されていない場合は基本的な機材オブジェクトを作成
  return createBasicEquipmentObject(
    template.name,
    { x: 100, y: 100 },
    template.shape ? stringToShapeType(template.shape) : ShapeType.RECTANGLE,
    template.id
  )
}

// シンプルテンプレートから機材オブジェクトを作成
function createEquipmentFromSimpleTemplate(template: SimpleTemplate): EquipmentObject {
  // レンダーコンポーネントを作成
  const renderComponent = createRenderComponent(
    template.shape ? stringToShapeType(template.shape) : ShapeType.RECTANGLE,
    template.color || '#ffffff',
    template.size || { width: 100, height: 60 },
    '' // ラベルはデフォルトで空白（オーバーライド用）
  )

  // 枠線設定を適用
  if (template.strokeColor) {
    renderComponent.data.strokeColor = template.strokeColor
  }
  if (template.strokeWidth !== undefined) {
    renderComponent.data.strokeWidth = template.strokeWidth
  }

  // プロパティコンポーネントを作成
  const propertyComponent = createPropertyComponent(template.name, template.description)

  // ポートコンポーネントを作成
  const ports = template.ports.map(portConfig => {
    const port = createConnectionPortComponent(
      stringToSide(portConfig.side),
      Math.max(0, Math.min(100, portConfig.offset)), // 0-100に制限
      stringToPortType(portConfig.type),
      stringToPortDirection(portConfig.direction),
      portConfig.label
    )
    return port
  })

  return {
    id: `${template.id}-${Date.now()}`,
    name: template.name,
    position: { x: 100, y: 100 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    components: [renderComponent, propertyComponent, ...ports],
    templateId: template.id,
    metadata: {
      category: template.category,
      description: template.description
    }
  }
}