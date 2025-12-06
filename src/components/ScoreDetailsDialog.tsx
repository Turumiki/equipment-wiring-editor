import React, { useMemo, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { calculateFitnessDetails } from '@/utils/autoLayout'

interface ScoreDetailsPanelProps {
  project: ReturnType<typeof useProjectStore>['project']
}

export default function ScoreDetailsPanel({ project }: ScoreDetailsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const details = useMemo(() => {
    if (project.objects.length === 0) return null
    
    const positions: Record<string, { x: number; y: number }> = {}
    project.objects.forEach(obj => {
      positions[obj.id] = { ...obj.position }
    })
    
    try {
      return calculateFitnessDetails(positions, project.objects, project.wires, {
        algorithm: 'smart',
        spacing: 100,
        padding: 50,
        minimizeCrossings: true,
        avoidNodeOverlap: true
      })
    } catch (error) {
      console.error('Failed to calculate fitness details:', error)
      return null
    }
  }, [
    project.objects.length,
    project.wires.length,
    JSON.stringify(project.objects.map(obj => ({ id: obj.id, x: obj.position.x, y: obj.position.y })))
  ])

  if (!details) return null

  return (
    <div className="fixed top-16 right-4 z-40 bg-white border border-gray-300 rounded-lg shadow-lg">
      {/* ヘッダー */}
      <div 
        className="px-3 py-2 border-b border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="text-xs font-semibold text-gray-700">評価スコア詳細</div>
        <button
          className="text-gray-500 hover:text-gray-700 text-sm leading-none"
          onClick={(e) => {
            e.stopPropagation()
            setIsCollapsed(!isCollapsed)
          }}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {/* コンテンツ */}
      {!isCollapsed && (
        <div className="p-2 space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto">
          {/* 総合スコア */}
          <div className="bg-gray-50 px-2 py-1.5 rounded text-center">
            <div className="text-xs text-gray-600 mb-0.5">総合スコア</div>
            <div className="text-lg font-bold text-gray-900">{details.totalScore.toFixed(1)}</div>
          </div>

          {/* 詳細情報 */}
          <div className="space-y-1.5 text-xs">
            {/* 接続長 */}
            <div className="flex justify-between items-center px-1.5 py-1 bg-gray-50 rounded">
              <span className="text-gray-600">接続長:</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-900">{details.connectionLength.total.toFixed(0)}px</span>
                <span className="text-red-600 text-[10px]">-{details.connectionLength.penalty.toFixed(0)}</span>
              </div>
            </div>

            {/* 重複 */}
            <div className="flex justify-between items-center px-1.5 py-1 bg-gray-50 rounded">
              <span className="text-gray-600">重複:</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-900">{details.overlaps.count}箇所</span>
                <span className="text-red-600 text-[10px]">-{details.overlaps.penalty.toFixed(0)}</span>
              </div>
            </div>

            {/* 配線の交差 */}
            <div className="flex justify-between items-center px-1.5 py-1 bg-gray-50 rounded">
              <span className="text-gray-600">配線交差:</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-900">{details.wireCrossings.count}箇所</span>
                <span className="text-red-600 text-[10px]">-{details.wireCrossings.penalty.toFixed(0)}</span>
              </div>
            </div>

            {/* エッジと機材の交差 */}
            <div className="flex justify-between items-center px-1.5 py-1 bg-gray-50 rounded">
              <span className="text-gray-600">機材交差:</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-900">{details.wireEquipmentIntersections.count}箇所</span>
                <span className="text-red-600 text-[10px]">-{details.wireEquipmentIntersections.penalty.toFixed(0)}</span>
              </div>
            </div>

            {/* ポート配置制約 */}
            <div className="flex justify-between items-center px-1.5 py-1 bg-gray-50 rounded">
              <span className="text-gray-600">ポート配置:</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-900">{details.portAlignment.satisfied}/{details.portAlignment.total}</span>
                <span className="text-green-600 text-[10px]">+{details.portAlignment.bonus.toFixed(0)}</span>
              </div>
            </div>

            {/* 近すぎる接続 */}
            <div className="flex justify-between items-center px-1.5 py-1 bg-gray-50 rounded">
              <span className="text-gray-600">近すぎる接続:</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-900">{details.tooCloseConnections.count}箇所</span>
                <span className="text-red-600 text-[10px]">-{details.tooCloseConnections.totalPenalty.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

