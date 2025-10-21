// 基本データ型定義

export interface EquipmentObject {
  id: string;
  name: string;
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
  components: Component[];
  templateId?: string;
  metadata: Record<string, any>;
}

export interface Component {
  id: string;
  type: ComponentType;
  enabled: boolean;
  data: Record<string, any>;
}

export enum ComponentType {
  RENDER = 'render',
  CONNECTION_PORT = 'connectionPort',
  PROPERTY = 'property',
  TRANSFORM = 'transform'
}

export interface RenderComponent extends Component {
  type: ComponentType.RENDER;
  data: {
    shape: ShapeType;
    color: string;
    strokeColor: string;
    strokeWidth: number;
    size: { width: number; height: number };
    svgIcon?: string;
    label?: {
      text: string;
      position: LabelPosition;
      fontSize: number;
      color: string;
    };
  };
}

export enum ShapeType {
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  TRIANGLE = 'triangle',
  POLYGON = 'polygon',
  CUSTOM_SVG = 'customSvg'
}

export enum LabelPosition {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
  CENTER = 'center'
}

export interface ConnectionPortComponent extends Component {
  type: ComponentType.CONNECTION_PORT;
  data: {
    portType: PortType;
    direction: PortDirection;
    position: PortPosition;
    constraints: PortConstraints;
    connectedWires: string[];
    label?: string;
  };
}

export enum PortType {
  // オーディオコネクタ
  XLR_MALE = 'xlr-male',
  XLR_FEMALE = 'xlr-female',
  TRS_QUARTER = 'trs-quarter', // 6.3mm TRS
  TS_QUARTER = 'ts-quarter',   // 6.3mm TS
  TRS_MINI = 'trs-mini',       // 3.5mm TRS
  RCA = 'rca',
  SPEAKON = 'speakon',

  // デジタルオーディオ
  AES_EBU = 'aes-ebu',
  SPDIF = 'spdif',
  ADAT = 'adat',
  DANTE = 'dante',

  // 映像コネクタ
  HDMI = 'hdmi',
  DISPLAYPORT = 'displayport',
  DVI = 'dvi',
  VGA = 'vga',
  SDI = 'sdi',
  COMPOSITE = 'composite',

  // データ・ネットワーク
  USB_A = 'usb-a',
  USB_B = 'usb-b',
  USB_C = 'usb-c',
  THUNDERBOLT = 'thunderbolt',
  ETHERNET = 'ethernet',

  // 電源
  POWER_AC = 'power-ac',
  POWER_DC = 'power-dc',
  IEC = 'iec',

  // その他
  MIDI = 'midi',
  CUSTOM = 'custom'
}

export enum PortDirection {
  INPUT = 'input',
  OUTPUT = 'output',
  BIDIRECTIONAL = 'bidirectional'
}

export interface PortPosition {
  side: Side;
  offset: number;
  absoluteOffset?: number;
}

export enum Side {
  TOP = 'top',
  RIGHT = 'right',
  BOTTOM = 'bottom',
  LEFT = 'left'
}

export interface PortConstraints {
  maxConnections: number;
  allowedPortTypes: PortType[];
  allowedDirections: PortDirection[];
}

export interface PropertyComponent extends Component {
  type: ComponentType.PROPERTY;
  data: {
    properties: Record<string, PropertyValue>;
    schema: PropertySchema[];
  };
}

export interface PropertyValue {
  value: any;
  type: PropertyValueType;
  displayName: string;
  description?: string;
}

export enum PropertyValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  COLOR = 'color',
  FILE = 'file'
}

export interface PropertySchema {
  key: string;
  type: PropertyValueType;
  displayName: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: string;
  value: any;
  message: string;
}

export interface Wire {
  id: string;
  sourceObjectId: string;
  sourcePortId: string;
  targetObjectId: string;
  targetPortId: string;
  wireType: WireType;
  style: WireStyle;
  label?: string;
  metadata: Record<string, any>;
}

export enum WireType {
  // オーディオケーブル
  XLR_CABLE = 'xlr-cable',
  TRS_CABLE = 'trs-cable',
  TS_CABLE = 'ts-cable',
  RCA_CABLE = 'rca-cable',
  SPEAKON_CABLE = 'speakon-cable',

  // デジタルオーディオケーブル
  AES_CABLE = 'aes-cable',
  SPDIF_CABLE = 'spdif-cable',
  ADAT_CABLE = 'adat-cable',
  DANTE_NETWORK = 'dante-network',

  // 映像ケーブル
  HDMI_CABLE = 'hdmi-cable',
  DISPLAYPORT_CABLE = 'displayport-cable',
  DVI_CABLE = 'dvi-cable',
  VGA_CABLE = 'vga-cable',
  SDI_CABLE = 'sdi-cable',
  COMPOSITE_CABLE = 'composite-cable',

  // データケーブル
  USB_CABLE = 'usb-cable',
  THUNDERBOLT_CABLE = 'thunderbolt-cable',
  ETHERNET_CABLE = 'ethernet-cable',

  // 電源ケーブル
  POWER_CABLE = 'power-cable',

  // その他
  MIDI_CABLE = 'midi-cable',
  CUSTOM = 'custom'
}

export interface WireStyle {
  color: string;
  strokeWidth: number;
  strokeDashArray?: string;
  animated?: boolean;
}

// シンプルなテンプレート形式のポート定義
export interface SimpleTemplatePort {
  side: 'top' | 'right' | 'bottom' | 'left';
  offset: number; // 0-100の％
  type: string; // PortTypeの文字列
  direction: 'input' | 'output' | 'bidirectional';
  label: string;
}

// 機材タイプの定義（抽象的なカテゴリ）
export interface EquipmentType {
  id: string;
  name: string;
  category: string;
  description?: string;
  defaultPorts?: SimpleTemplatePort[];
  icon?: string;
}

export interface EquipmentTemplate {
  id: string;
  name: string;
  category: string;
  equipmentType?: string; // 機材タイプ（抽象的なカテゴリ）
  description?: string;
  thumbnail?: string;
  
  // 旧形式（複雑なコンポーネント定義）
  defaultComponents?: any[];
  
  // 新形式（シンプルなポート配列）
  ports?: SimpleTemplatePort[];
  shape?: 'rectangle' | 'circle' | 'triangle';
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  size?: { width: number; height: number };
  
  tags: string[];
  version: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  objects: EquipmentObject[];
  wires: Wire[];
  customTemplates: EquipmentTemplate[];
  canvasSettings: CanvasSettings;
  metadata: ProjectMetadata;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanvasSettings {
  backgroundColor: string;
  gridEnabled: boolean;
  gridSize: number;
  snapToGrid: boolean;
  zoom: number;
  panPosition: { x: number; y: number };
}

export interface ProjectMetadata {
  author?: string;
  tags: string[];
  customFields: Record<string, any>;
}

export interface ConnectionTableRow {
  id: string;
  sourceObject: string;
  sourcePort: string;
  targetObject: string;
  targetPort: string;
  wireType: WireType;
  label?: string;
  notes?: string;
}

// 設定管理用の型定義
export interface PortTypeDefinition {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  color: string;
  category: 'audio' | 'video' | 'data' | 'power' | 'network' | 'custom';
  compatibleWith: string[]; // 他のポートタイプのID
  defaultDirection: PortDirection;
  maxConnections: number;
}

export interface WireTypeDefinition {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  color: string;
  strokeWidth: number;
  strokeDashArray?: string;
  animated?: boolean;
  supportedPortTypes: string[]; // サポートするポートタイプのID
}

export interface ConnectionSettings {
  portTypes: PortTypeDefinition[];
  wireTypes: WireTypeDefinition[];
  compatibilityMatrix: Record<string, string[]>; // portTypeId -> compatiblePortTypeIds
}