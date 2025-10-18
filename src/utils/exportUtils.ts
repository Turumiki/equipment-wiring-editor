import { toPng, toJpeg, toSvg } from 'html-to-image'

export async function exportCanvasAsPNG(elementId: string, filename: string = 'diagram.png') {
  try {
    const element = document.querySelector(`[data-id="${elementId}"]`) as HTMLElement || 
                   document.querySelector('.react-flow') as HTMLElement
    if (!element) {
      throw new Error('Canvas element not found')
    }

    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2, // 高解像度
      backgroundColor: '#ffffff'
    })

    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('PNG export failed:', error)
    throw error
  }
}

export async function exportCanvasAsJPEG(elementId: string, filename: string = 'diagram.jpg') {
  try {
    const element = document.querySelector(`[data-id="${elementId}"]`) as HTMLElement || 
                   document.querySelector('.react-flow') as HTMLElement
    if (!element) {
      throw new Error('Canvas element not found')
    }

    const dataUrl = await toJpeg(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff'
    })

    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('JPEG export failed:', error)
    throw error
  }
}

export async function exportCanvasAsSVG(elementId: string, filename: string = 'diagram.svg') {
  try {
    const element = document.querySelector(`[data-id="${elementId}"]`) as HTMLElement || 
                   document.querySelector('.react-flow') as HTMLElement
    if (!element) {
      throw new Error('Canvas element not found')
    }

    const dataUrl = await toSvg(element, {
      backgroundColor: '#ffffff'
    })

    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('SVG export failed:', error)
    throw error
  }
}

// PDF出力（ブラウザの印刷機能を使用）
export function exportCanvasAsPDF() {
  // ReactFlowキャンバスを印刷用に最適化
  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      .react-flow, .react-flow * {
        visibility: visible;
      }
      .react-flow {
        position: absolute;
        left: 0;
        top: 0;
        width: 100% !important;
        height: 100% !important;
      }
      /* ツールバーやパネルを非表示 */
      .react-flow__controls,
      .react-flow__minimap,
      .react-flow__panel {
        display: none !important;
      }
    }
  `

  // 印刷用スタイルを追加
  const styleElement = document.createElement('style')
  styleElement.textContent = printStyles
  document.head.appendChild(styleElement)

  // 印刷ダイアログを開く
  window.print()

  // 印刷後にスタイルを削除
  setTimeout(() => {
    document.head.removeChild(styleElement)
  }, 1000)
}

// ReactFlowの特定の要素を取得するヘルパー
export function getReactFlowElement(): HTMLElement | null {
  return document.querySelector('.react-flow') as HTMLElement
}

// キャンバスの境界を計算してクロップ
export async function exportCanvasWithBounds(
  format: 'png' | 'jpeg' | 'svg' = 'png',
  filename?: string
) {
  const reactFlowElement = getReactFlowElement()
  if (!reactFlowElement) {
    throw new Error('ReactFlow element not found')
  }

  // ノードの境界を計算
  const nodes = reactFlowElement.querySelectorAll('.react-flow__node')
  if (nodes.length === 0) {
    throw new Error('No nodes found to export')
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  nodes.forEach(node => {
    const rect = node.getBoundingClientRect()
    const containerRect = reactFlowElement.getBoundingClientRect()
    
    const x = rect.left - containerRect.left
    const y = rect.top - containerRect.top
    
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + rect.width)
    maxY = Math.max(maxY, y + rect.height)
  })

  // マージンを追加
  const margin = 50
  const cropArea = {
    x: Math.max(0, minX - margin),
    y: Math.max(0, minY - margin),
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2
  }

  const defaultFilename = `diagram.${format}`
  const exportFilename = filename || defaultFilename

  try {
    let dataUrl: string
    
    switch (format) {
      case 'png':
        dataUrl = await toPng(reactFlowElement, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          filter: (node) => {
            // コントロールやミニマップを除外
            return !node.classList?.contains('react-flow__controls') &&
                   !node.classList?.contains('react-flow__minimap') &&
                   !node.classList?.contains('react-flow__panel')
          }
        })
        break
      case 'jpeg':
        dataUrl = await toJpeg(reactFlowElement, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          filter: (node) => {
            return !node.classList?.contains('react-flow__controls') &&
                   !node.classList?.contains('react-flow__minimap') &&
                   !node.classList?.contains('react-flow__panel')
          }
        })
        break
      case 'svg':
        dataUrl = await toSvg(reactFlowElement, {
          backgroundColor: '#ffffff',
          filter: (node) => {
            return !node.classList?.contains('react-flow__controls') &&
                   !node.classList?.contains('react-flow__minimap') &&
                   !node.classList?.contains('react-flow__panel')
          }
        })
        break
      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    const link = document.createElement('a')
    link.download = exportFilename
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error(`${format.toUpperCase()} export failed:`, error)
    throw error
  }
}

// CSV export functionality
export function exportConnectionsAsCSV(
  objects: any[],
  wires: any[],
  filename: string = 'connections.csv'
) {
  try {
    // CSVヘッダー
    const headers = [
      '接続元機材',
      '接続元ポート',
      '接続先機材', 
      '接続先ポート',
      'ワイヤータイプ',
      'ラベル',
      '備考'
    ]

    // オブジェクトIDから名前を取得するマップ
    const objectMap = new Map(objects.map(obj => [obj.id, obj.name]))

    // ポートIDからポート情報を取得するヘルパー
    const getPortInfo = (objectId: string, portId: string) => {
      const obj = objects.find(o => o.id === objectId)
      if (!obj) return { name: 'Unknown', type: 'unknown' }
      
      const port = obj.components?.find((comp: any) => 
        comp.id === portId && comp.type === 'connectionPort'
      )
      
      return {
        name: port?.data?.label || port?.data?.portType || 'Unknown',
        type: port?.data?.portType || 'unknown'
      }
    }

    // ワイヤーデータをCSV行に変換
    const csvRows = wires.map(wire => {
      const sourceObject = objectMap.get(wire.sourceObjectId) || 'Unknown'
      const targetObject = objectMap.get(wire.targetObjectId) || 'Unknown'
      const sourcePort = getPortInfo(wire.sourceObjectId, wire.sourcePortId)
      const targetPort = getPortInfo(wire.targetObjectId, wire.targetPortId)

      return [
        sourceObject,
        sourcePort.name,
        targetObject,
        targetPort.name,
        wire.wireType || 'signal',
        wire.label || '',
        `${sourcePort.type} → ${targetPort.type}`
      ]
    })

    // CSV文字列を生成
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => 
        row.map(cell => {
          // セルにカンマや改行が含まれる場合はクォートで囲む
          const cellStr = String(cell)
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      )
    ].join('\n')

    // BOMを追加してExcelで正しく表示されるようにする
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    
    URL.revokeObjectURL(link.href)
  } catch (error) {
    console.error('CSV export failed:', error)
    throw error
  }
}

// プロジェクト全体をCSVとしてエクスポート（機材リスト + 接続リスト）
export function exportProjectAsCSV(
  project: any,
  filename: string = 'project.csv'
) {
  try {
    const sheets = []

    // 機材リストシート
    const equipmentHeaders = ['ID', '機材名', '種類', 'X座標', 'Y座標', '説明']
    const equipmentRows = project.objects.map((obj: any) => [
      obj.id,
      obj.name,
      obj.metadata?.equipmentType || 'カスタム',
      obj.position.x,
      obj.position.y,
      obj.description || ''
    ])

    sheets.push('# 機材リスト')
    sheets.push(equipmentHeaders.join(','))
    sheets.push(...equipmentRows.map((row: any[]) => 
      row.map(cell => {
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    ))

    sheets.push('') // 空行

    // 接続リストシート
    const connectionHeaders = [
      '接続元機材',
      '接続元ポート', 
      '接続先機材',
      '接続先ポート',
      'ワイヤータイプ',
      'ラベル'
    ]

    const objectMap = new Map(project.objects.map((obj: any) => [obj.id, obj.name]))
    
    const getPortInfo = (objectId: string, portId: string) => {
      const obj = project.objects.find((o: any) => o.id === objectId)
      if (!obj) return 'Unknown'
      
      const port = obj.components?.find((comp: any) => 
        comp.id === portId && comp.type === 'connectionPort'
      )
      
      return port?.data?.label || port?.data?.portType || 'Unknown'
    }

    const connectionRows = project.wires.map((wire: any) => [
      objectMap.get(wire.sourceObjectId) || 'Unknown',
      getPortInfo(wire.sourceObjectId, wire.sourcePortId),
      objectMap.get(wire.targetObjectId) || 'Unknown', 
      getPortInfo(wire.targetObjectId, wire.targetPortId),
      wire.wireType || 'signal',
      wire.label || ''
    ])

    sheets.push('# 接続リスト')
    sheets.push(connectionHeaders.join(','))
    sheets.push(...connectionRows.map((row: any[]) => 
      row.map(cell => {
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    ))

    const csvContent = sheets.join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    
    URL.revokeObjectURL(link.href)
  } catch (error) {
    console.error('Project CSV export failed:', error)
    throw error
  }
}