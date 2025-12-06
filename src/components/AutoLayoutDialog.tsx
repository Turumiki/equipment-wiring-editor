import React, { useState, useRef } from 'react'
import { LayoutOptions, LayoutProgress, LayoutCancelToken } from '@/utils/autoLayout'

interface AutoLayoutDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (options: LayoutOptions, onProgress?: (progress: LayoutProgress) => void, cancelToken?: LayoutCancelToken) => Promise<void>
}

export default function AutoLayoutDialog({ isOpen, onClose, onApply }: AutoLayoutDialogProps) {
  const [options, setOptions] = useState<LayoutOptions>({
    algorithm: 'smart',
    spacing: 100,
    padding: 50,
    direction: 'horizontal',
    minimizeCrossings: true,
    avoidNodeOverlap: true,
    populationSize: 50,
    generations: 100,
    mutationRate: 0.1,
    crossoverRate: 0.8
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<LayoutProgress | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  if (!isOpen) return null

  const handleApply = async () => {
    setIsProcessing(true)
    setProgress({ stage: '開始', progress: 0, message: 'レイアウト処理を開始します...' })

    // AbortControllerを作成
    abortControllerRef.current = new AbortController()
    const cancelToken: LayoutCancelToken = { signal: abortControllerRef.current.signal }

    try {
      await onApply(options, (progress) => {
        setProgress(progress)
      }, cancelToken)
      // 完了後、少し待ってからダイアログを閉じる
      setTimeout(() => {
        setIsProcessing(false)
        setProgress(null)
        abortControllerRef.current = null
        onClose()
      }, 500)
    } catch (error: any) {
      console.error('Auto layout error:', error)
      const errorMessage = error?.message || error?.toString() || '不明なエラー'
      
      if (errorMessage === 'レイアウト処理がキャンセルされました') {
        setIsProcessing(false)
        setProgress(null)
        abortControllerRef.current = null
        onClose()
      } else {
        console.error('Error details:', error)
        alert(`自動レイアウトの適用中にエラーが発生しました: ${errorMessage}`)
        setIsProcessing(false)
        setProgress(null)
        abortControllerRef.current = null
      }
    }
  }

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsProcessing(false)
    setProgress(null)
  }

  const handleClose = () => {
    if (isProcessing) {
      handleCancel()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-100 border border-gray-400 w-full max-w-md">
        <div className="px-2 py-1 border-b border-gray-400 bg-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-black uppercase tracking-wide">Auto Layout</h2>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="text-black hover:bg-gray-300 px-2 py-1 text-xs font-bold disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-2 space-y-2">
          {/* レイアウトアルゴリズム */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              レイアウトアルゴリズム
            </label>
            <select
              value={options.algorithm}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                algorithm: e.target.value as LayoutOptions['algorithm']
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-black"
            >
              <option value="smart">🧠 スマート（推奨）</option>
              <option value="genetic">🧬 遺伝的アルゴリズム</option>
              <option value="signal-flow">🔄 信号フロー</option>
              <option value="hierarchical">📊 階層</option>
              <option value="force">⚡ 力学</option>
              <option value="grid">📋 グリッド</option>
              <option value="circular">⭕ 円形</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              {options.algorithm === 'smart' && '設備タイプ別にグループ化し、接続関係を考慮した最適配置'}
              {options.algorithm === 'genetic' && '遺伝的アルゴリズムで進化的に最適な配置を探索'}
              {options.algorithm === 'signal-flow' && '信号の流れ（入力→処理→出力）に沿った配置'}
              {options.algorithm === 'hierarchical' && '接続関係に基づいて階層的に配置'}
              {options.algorithm === 'force' && '力学シミュレーションで自然な配置を作成'}
              {options.algorithm === 'grid' && 'ノードを格子状に配置'}
              {options.algorithm === 'circular' && 'ノードを円形に配置'}
            </p>
          </div>

          {/* 方向（階層・信号フローレイアウト用） */}
          {(options.algorithm === 'hierarchical' || options.algorithm === 'signal-flow') && (
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                方向
              </label>
              <select
                value={options.direction}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  direction: e.target.value as 'horizontal' | 'vertical'
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded text-black"
              >
                <option value="horizontal">水平（左→右）</option>
                <option value="vertical">垂直（上→下）</option>
              </select>
            </div>
          )}

          {/* スマートレイアウト用オプション */}
          {options.algorithm === 'smart' && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="minimizeCrossings"
                  checked={options.minimizeCrossings}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    minimizeCrossings: e.target.checked
                  }))}
                  className="rounded"
                />
                <label htmlFor="minimizeCrossings" className="text-sm text-black">
                  配線交差を最小化
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="avoidNodeOverlap"
                  checked={options.avoidNodeOverlap}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    avoidNodeOverlap: e.target.checked
                  }))}
                  className="rounded"
                />
                <label htmlFor="avoidNodeOverlap" className="text-sm text-black">
                  配線と機材の重複を回避
                </label>
              </div>
            </>
          )}

          {/* 遺伝的アルゴリズム用オプション */}
          {options.algorithm === 'genetic' && (
            <>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  集団サイズ: {options.populationSize}
                </label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={options.populationSize || 50}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    populationSize: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  集団サイズが大きいほど多様性が増しますが、計算時間が長くなります
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  世代数: {options.generations}
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={options.generations || 100}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    generations: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  世代数が多いほど最適化が進みますが、計算時間が長くなります
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  突然変異率: {(options.mutationRate || 0.1) * 100}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={(options.mutationRate || 0.1) * 100}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    mutationRate: parseInt(e.target.value) / 100
                  }))}
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  突然変異率が高いほど探索範囲が広がりますが、収束が遅くなります
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  交叉率: {(options.crossoverRate || 0.8) * 100}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={(options.crossoverRate || 0.8) * 100}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    crossoverRate: parseInt(e.target.value) / 100
                  }))}
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-1">
                  交叉率が高いほど親の特性が受け継がれやすくなります
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="minimizeCrossingsGenetic"
                  checked={options.minimizeCrossings}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    minimizeCrossings: e.target.checked
                  }))}
                  className="rounded"
                />
                <label htmlFor="minimizeCrossingsGenetic" className="text-sm text-black">
                  配線交差を最小化
                </label>
              </div>
            </>
          )}

          {/* 間隔 */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              間隔: {options.spacing}px
            </label>
            <input
              type="range"
              min="50"
              max="200"
              step="10"
              value={options.spacing}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                spacing: parseInt(e.target.value)
              }))}
              className="w-full"
            />
          </div>

          {/* パディング */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              パディング: {options.padding}px
            </label>
            <input
              type="range"
              min="20"
              max="100"
              step="10"
              value={options.padding}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                padding: parseInt(e.target.value)
              }))}
              className="w-full"
            />
          </div>
        </div>

        {/* 進捗表示 */}
        {isProcessing && progress && (
          <div className="px-2 py-2 border-t border-gray-400 bg-gray-50">
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-black">{progress.stage}</span>
                <span className="text-xs text-gray-600">{Math.round(progress.progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
            {progress.message && (
              <p className="text-xs text-gray-600">{progress.message}</p>
            )}
          </div>
        )}

        {/* ボタン */}
        <div className="px-2 py-1 border-t border-gray-400 bg-gray-200">
          <div className="flex gap-1">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 px-2 py-1 text-xs font-bold bg-gray-300 text-black border border-gray-500 hover:bg-gray-400 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleApply}
              disabled={isProcessing}
              className="flex-1 px-2 py-1 text-xs font-bold bg-gray-600 text-white border border-gray-700 hover:bg-gray-700 disabled:opacity-50"
            >
              {isProcessing ? '処理中...' : '適用'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}