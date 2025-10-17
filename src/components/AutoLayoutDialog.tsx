import React, { useState } from 'react'
import { LayoutOptions } from '@/utils/autoLayout'

interface AutoLayoutDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (options: LayoutOptions) => void
}

export default function AutoLayoutDialog({ isOpen, onClose, onApply }: AutoLayoutDialogProps) {
  const [options, setOptions] = useState<LayoutOptions>({
    algorithm: 'grid',
    spacing: 100,
    padding: 50,
    direction: 'horizontal'
  })

  if (!isOpen) return null

  const handleApply = () => {
    onApply(options)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-black">自動レイアウト</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
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
              <option value="grid">グリッド</option>
              <option value="hierarchical">階層</option>
              <option value="force">力学</option>
              <option value="circular">円形</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              {options.algorithm === 'grid' && 'ノードを格子状に配置します'}
              {options.algorithm === 'hierarchical' && '接続関係に基づいて階層的に配置します'}
              {options.algorithm === 'force' && '力学シミュレーションで自然な配置を作成します'}
              {options.algorithm === 'circular' && 'ノードを円形に配置します'}
            </p>
          </div>

          {/* 方向（階層レイアウトのみ） */}
          {options.algorithm === 'hierarchical' && (
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
                <option value="horizontal">水平</option>
                <option value="vertical">垂直</option>
              </select>
            </div>
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
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}