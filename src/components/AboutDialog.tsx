import React, { useEffect } from 'react'

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-black">バージョン情報</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-black mb-2">配線図エディタ</h3>
              <p className="text-gray-600">Equipment Wiring Tool</p>
            </div>
            
            <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">バージョン:</span>
                <span className="text-black font-medium">0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ビルド日:</span>
                <span className="text-black">{new Date().toLocaleDateString('ja-JP')}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-black mb-2">主な機能</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 機材テンプレートの作成と管理</li>
                <li>• 配線図の作成と編集</li>
                <li>• 接続の検証と管理</li>
                <li>• プロジェクトの保存・読み込み</li>
                <li>• 画像・CSV形式でのエクスポート</li>
                <li>• 自動レイアウト機能</li>
              </ul>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 text-center">
                © 2024 Equipment Wiring Tool. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

