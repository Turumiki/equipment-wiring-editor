# シンプルなテンプレート形式の例

## 🎯 **新しいシンプル形式**

テンプレートの定義がとてもシンプルになりました！

### **YAMAHA QL1 の例**

```javascript
{
  id: 'yamaha-ql1-simple',
  name: 'YAMAHA QL1 (シンプル)',
  category: 'オーディオ',
  description: 'YAMAHA QL1 デジタルミキサー - シンプル形式',
  
  // ポートを直接配列で定義
  ports: [
    // 左側：入力ポート（％で位置指定）
    { side: 'left', offset: 10, type: 'xlr-female', direction: 'input', label: 'Ch 1' },
    { side: 'left', offset: 20, type: 'xlr-female', direction: 'input', label: 'Ch 2' },
    { side: 'left', offset: 30, type: 'xlr-female', direction: 'input', label: 'Ch 3' },
    // ... 他のチャンネル
    
    // 右側：出力ポート
    { side: 'right', offset: 25, type: 'xlr-male', direction: 'output', label: 'Main L' },
    { side: 'right', offset: 75, type: 'xlr-male', direction: 'output', label: 'Main R' },
    
    // 上側：ネットワーク
    { side: 'top', offset: 30, type: 'dante', direction: 'bidirectional', label: 'Dante 1' },
    { side: 'top', offset: 70, type: 'dante', direction: 'bidirectional', label: 'Dante 2' },
    
    // 下側：USB
    { side: 'bottom', offset: 50, type: 'usb-b', direction: 'bidirectional', label: 'USB' }
  ],
  
  // 外観設定
  shape: 'rectangle',
  color: '#7c3aed',
  size: { width: 150, height: 80 }
}
```

## 🚀 **メリット**

### **1. 直感的**
- ポートの位置が％で直接指定できる
- 複雑な計算や配列設定が不要

### **2. シンプル**
- `PORT_ARRAY` や `PORT_SINGLE` などの複雑な設定が不要
- 各ポートを直接配列で定義

### **3. 分かりやすい**
- `side`: どの辺か（'top', 'right', 'bottom', 'left'）
- `offset`: 0-100の％で位置指定
- `type`: ポートタイプ（'xlr-male', 'usb-a', 'ethernet' など）
- `direction`: 方向（'input', 'output', 'bidirectional'）
- `label`: ポートのラベル

### **4. 柔軟**
- 旧形式（`defaultComponents`）も引き続きサポート
- 新形式（`ports`）を使えばシンプルに定義可能

## 📝 **使用可能なポートタイプ**

- `xlr-male`, `xlr-female`
- `trs-quarter`, `ts-quarter`, `trs-mini`
- `usb-a`, `usb-b`, `usb-c`
- `ethernet`, `dante`
- `hdmi`, `power-ac`

## 🎨 **外観設定**

- `shape`: 'rectangle', 'circle', 'triangle'
- `color`: CSS色コード（例：'#7c3aed'）
- `size`: { width: 150, height: 80 }

これで、テンプレート作成がとても簡単になりました！