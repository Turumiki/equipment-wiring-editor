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
      pixelRatio: 3, // 高解像度（3倍）
      backgroundColor: '#ffffff',
      filter: (node) => {
        // コントロールやミニマップ、グリッドを除外
        return !node.classList?.contains('react-flow__controls') &&
               !node.classList?.contains('react-flow__minimap') &&
               !node.classList?.contains('react-flow__panel') &&
               !node.classList?.contains('react-flow__background')
      }
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
      backgroundColor: '#ffffff',
      filter: (node) => {
        // コントロールやミニマップ、グリッドを除外
        return !node.classList?.contains('react-flow__controls') &&
               !node.classList?.contains('react-flow__minimap') &&
               !node.classList?.contains('react-flow__panel') &&
               !node.classList?.contains('react-flow__background')
      }
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
      backgroundColor: '#ffffff',
      filter: (node) => {
        // コントロールやミニマップ、グリッドを除外
        return !node.classList?.contains('react-flow__controls') &&
               !node.classList?.contains('react-flow__minimap') &&
               !node.classList?.contains('react-flow__panel') &&
               !node.classList?.contains('react-flow__background')
      }
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

// PDF出力（SVGを生成してブラウザの印刷機能で出力）
// これによりベクター品質を維持しつつ、foreignObject内のHTMLも正しく描画できる
export async function exportCanvasAsPDF(filename: string = 'diagram.pdf') {
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
  const contentWidth = maxX - minX + margin * 2
  const contentHeight = maxY - minY + margin * 2

  // SVGを生成
  const svgDataUrl = await toSvg(reactFlowElement, {
    backgroundColor: '#ffffff',
    filter: (node) => {
      // コントロールやミニマップ、グリッドを除外
      return !node.classList?.contains('react-flow__controls') &&
             !node.classList?.contains('react-flow__minimap') &&
             !node.classList?.contains('react-flow__panel') &&
             !node.classList?.contains('react-flow__background')
    }
  })

  try {

    // SVGをPNGに変換してからPDFとして印刷
    // ブラウザの印刷機能でSVGが正しく表示されない場合があるため、PNGに変換
    // ノードの境界に合わせてクロップする
    const pngDataUrl = await toPng(reactFlowElement, {
      quality: 1.0,
      pixelRatio: 2, // 高解像度
      backgroundColor: '#ffffff',
      filter: (node) => {
        // コントロールやミニマップ、グリッドを除外
        return !node.classList?.contains('react-flow__controls') &&
               !node.classList?.contains('react-flow__minimap') &&
               !node.classList?.contains('react-flow__panel') &&
               !node.classList?.contains('react-flow__background')
      }
    })

    // 画像を読み込む
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise((resolve, reject) => {
      img.onload = () => {
        console.log('Image loaded, size:', img.width, 'x', img.height)
        console.log('ReactFlow element size:', reactFlowElement.offsetWidth, 'x', reactFlowElement.offsetHeight)
        resolve(null)
      }
      img.onerror = (error) => {
        console.error('Image load error:', error)
        reject(error)
      }
      img.src = pngDataUrl
    })

    // クロップ領域を計算（画像の座標系に変換）
    const cropX = Math.max(0, minX - margin)
    const cropY = Math.max(0, minY - margin)
    
    // 画像の実際のサイズと要素のサイズの比率を計算
    const imageScaleX = img.width / reactFlowElement.offsetWidth
    const imageScaleY = img.height / reactFlowElement.offsetHeight
    
    // 画像座標系でのクロップ位置とサイズ
    const imageCropX = cropX * imageScaleX
    const imageCropY = cropY * imageScaleY
    const imageCropWidth = contentWidth * imageScaleX
    const imageCropHeight = contentHeight * imageScaleY
    
    console.log('Crop area:', cropX, cropY, contentWidth, contentHeight)
    console.log('Image crop area:', imageCropX, imageCropY, imageCropWidth, imageCropHeight)
    
    // キャンバスを作成してクロップ
    const canvas = document.createElement('canvas')
    canvas.width = contentWidth
    canvas.height = contentHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context not found')
    
    // 白背景を描画
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, contentWidth, contentHeight)
    
    // 画像をクロップして描画（画像座標系を使用）
    ctx.drawImage(
      img,
      imageCropX, imageCropY, imageCropWidth, imageCropHeight,
      0, 0, contentWidth, contentHeight
    )

    const croppedDataUrl = canvas.toDataURL('image/png')
    console.log('Cropped image data URL length:', croppedDataUrl.length)
    console.log('Content size:', contentWidth, 'x', contentHeight)
    
    // A4サイズに収まるようにスケールを計算
    const isLandscape = contentWidth > contentHeight
    const a4WidthMM = 210
    const a4HeightMM = 297
    const pxToMm = 0.264583 // 1px = 0.264583mm (96 DPI)
    const contentWidthMM = contentWidth * pxToMm
    const contentHeightMM = contentHeight * pxToMm
    
    // ページサイズ（マージンを考慮）
    const pageWidthMM = isLandscape ? a4HeightMM : a4WidthMM
    const pageHeightMM = isLandscape ? a4WidthMM : a4HeightMM
    const marginMM = 15 // マージンを少し大きく
    const availableWidthMM = pageWidthMM - marginMM * 2
    const availableHeightMM = pageHeightMM - marginMM * 2
    
    // スケールを計算（拡大はしない）
    const scaleX = availableWidthMM / contentWidthMM
    const scaleY = availableHeightMM / contentHeightMM
    const scale = Math.min(scaleX, scaleY, 1) * 0.95 // 95%にスケールして安全マージンを確保
    
    const scaledWidthMM = contentWidthMM * scale
    const scaledHeightMM = contentHeightMM * scale
    
    // ピクセル単位でのサイズも計算（表示用）
    const dpi = 96
    const mmToPx = dpi / 25.4 // 1mm = 3.779527559px (96 DPI)
    const scaledWidthPx = scaledWidthMM * mmToPx
    const scaledHeightPx = scaledHeightMM * mmToPx
    
    console.log('Scale:', scale, 'Scaled size:', scaledWidthMM, 'x', scaledHeightMM, 'mm')
    console.log('Available size:', availableWidthMM, 'x', availableHeightMM, 'mm')
    
    // スタイル調整: ページ中央に配置
    const pageStyle = `
      @page {
        size: ${isLandscape ? 'landscape' : 'portrait'} A4;
        margin: ${marginMM}mm;
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html, body {
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: white;
      }
      body {
        display: flex;
        justify-content: center;
        align-items: center;
        background: white;
        padding: 0;
        margin: 0;
      }
      img {
        width: ${scaledWidthMM}mm !important;
        height: ${scaledHeightMM}mm !important;
        max-width: ${scaledWidthMM}mm !important;
        max-height: ${scaledHeightMM}mm !important;
        object-fit: contain;
        display: block;
        margin: 0;
        padding: 0;
      }
      @media print {
        img {
          width: ${scaledWidthMM}mm !important;
          height: ${scaledHeightMM}mm !important;
          max-width: ${scaledWidthMM}mm !important;
          max-height: ${scaledHeightMM}mm !important;
        }
      }
    `

    // 新しいウィンドウを開いて印刷
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Failed to open print window')
    }

    printWindow.document.open()
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>${pageStyle}</style>
        </head>
        <body>
          <img src="${croppedDataUrl}" alt="Diagram" 
               onload="window.setTimeout(function() { window.print(); }, 1000);" 
               onerror="console.error('Image load error');" />
        </body>
      </html>
    `)
    printWindow.document.close()

    // ウィンドウが閉じられたらクリーンアップ
    const checkClosed = setInterval(() => {
      if (printWindow.closed) {
        clearInterval(checkClosed)
      }
    }, 1000)

  } catch (error) {
    console.error('PDF export failed:', error)
    throw error
  }
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
          pixelRatio: 3, // 高解像度（3倍）
          backgroundColor: '#ffffff',
          filter: (node) => {
            // コントロールやミニマップ、グリッドを除外
            return !node.classList?.contains('react-flow__controls') &&
                   !node.classList?.contains('react-flow__minimap') &&
                   !node.classList?.contains('react-flow__panel') &&
                   !node.classList?.contains('react-flow__background')
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
                   !node.classList?.contains('react-flow__panel') &&
                   !node.classList?.contains('react-flow__background')
          }
        })
        break
      case 'svg':
        dataUrl = await toSvg(reactFlowElement, {
          backgroundColor: '#ffffff',
          filter: (node) => {
            return !node.classList?.contains('react-flow__controls') &&
                   !node.classList?.contains('react-flow__minimap') &&
                   !node.classList?.contains('react-flow__panel') &&
                   !node.classList?.contains('react-flow__background')
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