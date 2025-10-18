import React, { useState } from 'react'
import { LayoutOptions } from '@/utils/autoLayout'

interface AutoLayoutDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (options: LayoutOptions) => void
}

export default function AutoLayoutDialog({ isOpen, onClose, onApply }: AutoLayoutDialogProps) {
  const [options, setOptions] = useState<LayoutOptions>({
    algorithm: 'smart',
    spacing: 100,
    padding: 50,
    direction: 'horizontal',
    groupByType: true,
    minimizeCrossings: true,
    avoidNodeOverlap: true
  })

  if (!isOpen) return null

  const handleApply = () => {
    onApply(options)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-100 border border-gray-400 w-full max-w-md">
        <div className="px-2 py-1 border-b border-gray-400 bg-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-black uppercase tracking-wide">Auto Layout</h2>
            <button
              onClick={onClose}
              className="text-black hover:bg-gray-300 px-2 py-1 text-xs font-bold"
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
              <option value="signal-flow">🔄 信号フロー</option>
              <option value="hierarchical">📊 階層</option>
              <option value="force">⚡ 力学</option>
              <option value="grid">📋 グリッド</option>
              <option value="circular">⭕ 円形</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              {options.algorithm === 'smart' && '設備タイプ別にグループ化し、接続関係を考慮した最適配置'}
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
                  id="groupByType"
                  checked={options.groupByType}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    groupByType: e.target.checked
                  }))}
                  className="rounded"
                />
                <label htmlFor="groupByType" className="text-sm text-black">
                  設備タイプ別にグループ化
                </label>
              </div>
              
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

        {/* ボタン */}
        <div className="px-2 py-1 border-t border-gray-400 bg-gray-200">
          <div className="flex gap-1">
            <button
              onClick={onClose}
              className="flex-1 px-2 py-1 text-xs font-bold bg-gray-300 text-black border border-gray-500 hover:bg-gray-400"
            >
              キャンセル
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-2 py-1 text-xs font-bold bg-gray-600 text-white border border-gray-700 hover:bg-gray-700"
            >
              適用
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}