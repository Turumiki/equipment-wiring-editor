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

// コンポーネント作成ヘルパー関数
export function createRenderComponent(
  shape: ShapeType = ShapeType.RECTANGLE,
  color: string = '#3b82f6',
  size: { width: number; height: number } = { width: 100, height: 60 }
): RenderComponent {
  return {
    id: `render-${Date.now()}`,
    type: ComponentType.RENDER,
    enabled: true,
    data: {
      shape,
      color,
      strokeColor: '#1e40af',
      strokeWidth: 2,
      size,
      label: {
        text: '機材',
        position: 'center' as any,
        fontSize: 12,
        color: '#ffffff'
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
      [PortType.ETHERNET]: [PortType.ETHERNET, PortType.DANTE],
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
    id: `port-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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

// 機材タイプに応じたポート作成
export function createEquipmentPorts(equipmentType: string): ConnectionPortComponent[] {
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