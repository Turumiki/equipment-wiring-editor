import React, { useState } from 'react'
import { exportCanvasWithBounds, exportCanvasAsPDF, exportConnectionsAsCSV, exportProjectAsCSV } from '@/utils/exportUtils'
import { useProjectStore } from '@/store/useProjectStore'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const [exportType, setExportType] = useState<'image' | 'data'>('image')
  const [format, setFormat] = useState<'png' | 'jpeg' | 'svg' | 'pdf' | 'csv-connections' | 'csv-project'>('png')
  const [filename, setFilename] = useState('diagram')
  const [isExporting, setIsExporting] = useState(false)
  const { project } = useProjectStore()

  const handleExport = async () => {
    setIsExporting(true)
    try {
      if (exportType === 'image') {
        if (format === 'pdf') {
          exportCanvasAsPDF()
        } else {
          const fullFilename = `${filename}.${format}`
          await exportCanvasWithBounds(format as 'png' | 'jpeg' | 'svg', fullFilename)
        }
      } else {
        // データエクスポート
        if (format === 'csv-connections') {
          exportConnectionsAsCSV(project.objects, project.wires, `${filename}.csv`)
        } else if (format === 'csv-project') {
          exportProjectAsCSV(project, `${filename}.csv`)
        }
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
      <div className="bg-gray-100 border border-gray-400 w-full max-w-md">
        <div className="px-2 py-1 border-b border-gray-400 bg-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-black uppercase tracking-wide">Export</h2>
            <button onClick={onClose} className="text-black hover:bg-gray-300 px-2 py-1 text-xs font-bold">
              ×
            </button>
          </div>
        </div>

        <div className="p-2 space-y-2">
          {/* エクスポートタイプ選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              エクスポートタイプ
            </label>
            <div className="flex gap-2">
              <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition-colors ${
                exportType === 'image'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="exportType"
                  value="image"
                  checked={exportType === 'image'}
                  onChange={(e) => {
                    setExportType(e.target.value as 'image' | 'data')
                    setFormat('png')
                  }}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="font-medium text-sm">図面画像</div>
                  <div className="text-xs text-gray-500">PNG/PDF等</div>
                </div>
              </label>
              <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition-colors ${
                exportType === 'data'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="exportType"
                  value="data"
                  checked={exportType === 'data'}
                  onChange={(e) => {
                    setExportType(e.target.value as 'image' | 'data')
                    setFormat('csv-connections')
                  }}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="font-medium text-sm">データ</div>
                  <div className="text-xs text-gray-500">CSV等</div>
                </div>
              </label>
            </div>
          </div>

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
              {(exportType === 'image' ? [
                { value: 'png', label: 'PNG', desc: '高品質画像' },
                { value: 'jpeg', label: 'JPEG', desc: '圧縮画像' },
                { value: 'svg', label: 'SVG', desc: 'ベクター画像' },
                { value: 'pdf', label: 'PDF', desc: '印刷用' }
              ] : [
                { value: 'csv-connections', label: '接続CSV', desc: '結線情報のみ' },
                { value: 'csv-project', label: 'プロジェクトCSV', desc: '機材+結線情報' }
              ]).map(option => (
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
            {exportType === 'image' && format === 'png' && '透明背景対応の高品質画像形式です。'}
            {exportType === 'image' && format === 'jpeg' && 'ファイルサイズが小さい画像形式です。'}
            {exportType === 'image' && format === 'svg' && '拡大縮小しても劣化しないベクター形式です。'}
            {exportType === 'image' && format === 'pdf' && 'ブラウザの印刷機能を使用してPDFを生成します。'}
            {exportType === 'data' && format === 'csv-connections' && '接続情報のみをCSV形式でエクスポートします。'}
            {exportType === 'data' && format === 'csv-project' && '機材リストと接続情報を含む完全なCSVファイルを生成します。'}
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