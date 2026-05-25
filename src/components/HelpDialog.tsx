import React, { useEffect } from 'react'

interface HelpDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-3xl h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-black">ヘルプ</h2>
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
            {/* 基本操作 */}
            <section>
              <h3 className="text-lg font-semibold text-black mb-3">基本操作</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <h4 className="font-medium text-black mb-1">機材の追加</h4>
                  <p>テンプレートライブラリの機材をクリックしてキャンバスに追加できます。ドラッグ＆ドロップでキャンバスの任意の場所に配置することもできます。</p>
                </div>
                <div>
                  <h4 className="font-medium text-black mb-1">機材の移動</h4>
                  <p>機材をドラッグして位置を変更できます。複数選択時は、選択したすべての機材が一緒に移動します。</p>
                </div>
                <div>
                  <h4 className="font-medium text-black mb-1">接続の作成</h4>
                  <p>ポートから別のポートへドラッグして接続を作成します。互換性のあるポートタイプのみ接続できます。</p>
                </div>
                <div>
                  <h4 className="font-medium text-black mb-1">選択</h4>
                  <p>クリックで単一選択、Shift+クリックで複数選択、Shift+ドラッグで範囲選択ができます。</p>
                </div>
              </div>
            </section>

            {/* 編集機能 */}
            <section>
              <h3 className="text-lg font-semibold text-black mb-3">編集機能</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <h4 className="font-medium text-black mb-1">コピー・貼り付け</h4>
                  <p>選択した機材や接続をコピーして、別の場所に貼り付けることができます。</p>
                </div>
                <div>
                  <h4 className="font-medium text-black mb-1">整列</h4>
                  <p>複数の機材を選択して、右クリックメニューまたはツールメニューから整列を実行できます。左揃え、右揃え、上揃え、下揃えが可能です。</p>
                </div>
                <div>
                  <h4 className="font-medium text-black mb-1">分散配置</h4>
                  <p>3つ以上の機材を選択して、水平または垂直に等間隔で配置できます。</p>
                </div>
              </div>
            </section>

            {/* テンプレート */}
            <section>
              <h3 className="text-lg font-semibold text-black mb-3">テンプレート</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <h4 className="font-medium text-black mb-1">テンプレートの作成</h4>
                  <p>機材を右クリックして「テンプレートとして保存」を選択すると、その機材をテンプレートとして保存できます。</p>
                </div>
                <div>
                  <h4 className="font-medium text-black mb-1">テンプレートの編集</h4>
                  <p>テンプレートライブラリでテンプレートを右クリックして編集できます。ポートの追加・削除、サイズの変更などが可能です。</p>
                </div>
              </div>
            </section>

            {/* プロジェクト管理 */}
            <section>
              <h3 className="text-lg font-semibold text-black mb-3">プロジェクト管理</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <h4 className="font-medium text-black mb-1">保存・読み込み</h4>
                  <p>ファイルメニューからプロジェクトを保存・読み込みできます。自動保存機能により、作業内容は定期的に保存されます。</p>
                </div>
                <div>
                  <h4 className="font-medium text-black mb-1">エクスポート</h4>
                  <p>配線図を画像（PNG、JPEG、SVG、PDF）やCSV形式でエクスポートできます。</p>
                </div>
              </div>
            </section>

            {/* その他 */}
            <section>
              <h3 className="text-lg font-semibold text-black mb-3">その他</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div>
                  <h4 className="font-medium text-black mb-1">インスペクター</h4>
                  <p>機材を選択すると、右側のインスペクターパネルで詳細情報を確認・編集できます。</p>
                </div>
                <div>
                  <h4 className="font-medium text-black mb-1">設定</h4>
                  <p>ツールメニューから設定を開き、ポートタイプ、ワイヤータイプ、互換性などをカスタマイズできます。</p>
                </div>
              </div>
            </section>
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

