import React from 'react'

interface ShortcutsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  if (!isOpen) return null

  const shortcuts = [
    {
      category: 'ファイル操作',
      items: [
        { keys: ['Ctrl', 'N'], description: '新しいプロジェクトを作成' },
        { keys: ['Ctrl', 'S'], description: 'プロジェクトを保存' },
      ]
    },
    {
      category: '編集操作',
      items: [
        { keys: ['Ctrl', 'Z'], description: '元に戻す' },
        { keys: ['Ctrl', 'Shift', 'Z'], description: 'やり直し' },
        { keys: ['Ctrl', 'Y'], description: 'やり直し（代替）' },
        { keys: ['Ctrl', 'C'], description: 'コピー' },
        { keys: ['Ctrl', 'V'], description: '貼り付け' },
        { keys: ['Ctrl', 'D'], description: '複製' },
        { keys: ['Delete'], description: '削除' },
        { keys: ['Backspace'], description: '削除（代替）' },
        { keys: ['Ctrl', 'A'], description: 'すべて選択' },
        { keys: ['Esc'], description: '選択解除' },
      ]
    },
    {
      category: '移動',
      items: [
        { keys: ['←'], description: '左に1px移動' },
        { keys: ['Shift', '←'], description: '左に10px移動' },
        { keys: ['→'], description: '右に1px移動' },
        { keys: ['Shift', '→'], description: '右に10px移動' },
        { keys: ['↑'], description: '上に1px移動' },
        { keys: ['Shift', '↑'], description: '上に10px移動' },
        { keys: ['↓'], description: '下に1px移動' },
        { keys: ['Shift', '↓'], description: '下に10px移動' },
      ]
    },
    {
      category: '整列',
      items: [
        { keys: ['Ctrl', 'Shift', '←'], description: '左揃え' },
        { keys: ['Ctrl', 'Shift', '→'], description: '右揃え' },
        { keys: ['Ctrl', 'Shift', '↑'], description: '上揃え' },
        { keys: ['Ctrl', 'Shift', '↓'], description: '下揃え' },
      ]
    },
    {
      category: '分散配置',
      items: [
        { keys: ['Ctrl', 'Alt', '←', '→'], description: '水平に分散' },
        { keys: ['Ctrl', 'Alt', '↑', '↓'], description: '垂直に分散' },
      ]
    },
  ]

  const renderKey = (key: string) => {
    const keyMap: { [key: string]: string } = {
      'Ctrl': 'Ctrl',
      'Shift': 'Shift',
      'Alt': 'Alt',
      '←': '←',
      '→': '→',
      '↑': '↑',
      '↓': '↓',
      'Delete': 'Del',
      'Backspace': 'Backspace',
      'Esc': 'Esc',
    }
    return keyMap[key] || key
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-black">キーボードショートカット</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {shortcuts.map((category, categoryIndex) => (
              <section key={categoryIndex}>
                <h3 className="text-lg font-semibold text-black mb-3">{category.category}</h3>
                <div className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-700 flex-1">{item.description}</span>
                      <div className="flex gap-1">
                        {item.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-800">
                              {renderKey(key)}
                            </kbd>
                            {keyIndex < item.keys.length - 1 && (
                              <span className="text-gray-400 mx-1">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
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

