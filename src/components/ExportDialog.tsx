import React, { useState } from 'react'
import { exportCanvasWithBounds, exportCanvasAsPDF } from '@/utils/exportUtils'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'svg' | 'pdf'>('png')
  const [filename, setFilename] = useState('diagram')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      if (format === 'pdf') {
        exportCanvasAsPDF()
      } else {
        const fullFilename = `${filename}.${format}`
        await exportCanvasWithBounds(format, fullFilename)
      }
      onClose()
    } catch (error) {
      alert('エクスポートに失敗しました: ' + (error as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">図面エクスポート</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* ファイル名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ファイル名
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="diagram"
            />
          </div>

          {/* フォーマット選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              フォーマット
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'png', label: 'PNG', desc: '高品質画像' },
                { value: 'jpeg', label: 'JPEG', desc: '圧縮画像' },
                { value: 'svg', label: 'SVG', desc: 'ベクター画像' },
                { value: 'pdf', label: 'PDF', desc: '印刷用' }
              ].map(option => (
                <label
                  key={option.value}
                  className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${
                    format === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={option.value}
                    checked={format === option.value}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="sr-only"
                  />
                  <span className="font-medium text-sm">{option.label}</span>
                  <span className="text-xs text-gray-500">{option.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 説明 */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            {format === 'png' && '透明背景対応の高品質画像形式です。'}
            {format === 'jpeg' && 'ファイルサイズが小さい画像形式です。'}
            {format === 'svg' && '拡大縮小しても劣化しないベクター形式です。'}
            {format === 'pdf' && 'ブラウザの印刷機能を使用してPDFを生成します。'}
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            disabled={isExporting}
          >
            キャンセル
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isExporting ? 'エクスポート中...' : 'エクスポート'}
          </button>
        </div>
      </div>
    </div>
  )
}