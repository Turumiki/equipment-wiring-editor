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