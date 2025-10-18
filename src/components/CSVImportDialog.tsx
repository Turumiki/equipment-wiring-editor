import React, { useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { createBasicEquipmentObject, getConnectionPortComponents } from '@/utils/componentSystem'
import { ShapeType, WireType } from '@/types'

interface CSVImportDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface CSVRow {
  [key: string]: string
}

interface ColumnMapping {
  sourceEquipment: string
  sourcePort: string
  targetEquipment: string
  targetPort: string
  wireType: string
  label: string
}

export default function CSVImportDialog({ isOpen, onClose }: CSVImportDialogProps) {
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    sourceEquipment: '',
    sourcePort: '',
    targetEquipment: '',
    targetPort: '',
    wireType: '',
    label: ''
  })
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const [errors, setErrors] = useState<string[]>([])

  const { addEquipmentObject, addWire } = useProjectStore()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())

          if (lines.length < 2) {
            alert('CSVファイルにはヘッダー行とデータ行が必要です')
            return
          }

          const headers = lines[0].split(',').map(h => h.trim())
          const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim())
            const row: CSVRow = {}
            headers.forEach((header, index) => {
              row[header] = values[index] || ''
            })
            return row
          })

          setCsvHeaders(headers)
          setCsvData(rows)
          setStep('mapping')
        } catch (error) {
          alert('CSVファイルの読み込みに失敗しました')
        }
      }
      reader.readAsText(file)
    }
  }

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: value }))
  }

  const validateMapping = (): string[] => {
    const errors: string[] = []

    if (!columnMapping.sourceEquipment) errors.push('接続元機材の列を選択してください')
    if (!columnMapping.targetEquipment) errors.push('接続先機材の列を選択してください')

    return errors
  }

  const previewImport = () => {
    const validationErrors = validateMapping()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors([])
    setStep('preview')
  }

  const executeImport = () => {
    const equipmentNames = new Set<string>()
    const equipmentObjects = new Map<string, string>() // name -> id

    // 機材名を収集
    csvData.forEach(row => {
      const sourceName = row[columnMapping.sourceEquipment]
      const targetName = row[columnMapping.targetEquipment]
      if (sourceName) equipmentNames.add(sourceName)
      if (targetName) equipmentNames.add(targetName)
    })

    // 機材オブジェクトを作成
    Array.from(equipmentNames).forEach((name, index) => {
      const equipment = createBasicEquipmentObject(
        name,
        {
          x: 100 + (index % 5) * 150,
          y: 100 + Math.floor(index / 5) * 100
        },
        ShapeType.RECTANGLE
      )
      addEquipmentObject(equipment)
      equipmentObjects.set(name, equipment.id)
    })

    // 少し待ってからワイヤーを作成（オブジェクトが確実に追加されるまで）
    setTimeout(() => {

      // ワイヤーを作成
      csvData.forEach((row, index) => {
        const sourceName = row[columnMapping.sourceEquipment]
        const targetName = row[columnMapping.targetEquipment]
        const sourceId = equipmentObjects.get(sourceName)
        const targetId = equipmentObjects.get(targetName)

        if (sourceId && targetId) {
          // 実際のオブジェクトからポートIDを取得
          const sourceObj = useProjectStore.getState().project.objects.find(obj => obj.id === sourceId)
          const targetObj = useProjectStore.getState().project.objects.find(obj => obj.id === targetId)

          if (sourceObj && targetObj) {
            const sourcePortComponents = getConnectionPortComponents(sourceObj)
            const targetPortComponents = getConnectionPortComponents(targetObj)

            const outputPort = sourcePortComponents.find(port => port.data.direction === 'output')
            const inputPort = targetPortComponents.find(port => port.data.direction === 'input')

            if (outputPort && inputPort) {
              const wireTypeValue = row[columnMapping.wireType]?.toLowerCase() || 'xlr-cable'
              const wireType = Object.values(WireType).includes(wireTypeValue as WireType)
                ? wireTypeValue as WireType
                : WireType.XLR_CABLE

              const wire = {
                id: `imported-wire-${index}`,
                sourceObjectId: sourceId,
                sourcePortId: outputPort.id,
                targetObjectId: targetId,
                targetPortId: inputPort.id,
                wireType,
                style: {
                  color: wireType === WireType.POWER_CABLE ? '#dc2626' : '#059669',
                  strokeWidth: 2,
                },
                label: row[columnMapping.label] || '',
                metadata: {}
              }

              addWire(wire)
            }
          }
        }
      })

      alert(`${equipmentNames.size}個の機材と${csvData.length}個の接続をインポートしました`)
      onClose()
    }, 100) // 100ms待機
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">CSVインポート</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {step === 'upload' && (
          <div>
            <p className="mb-4 text-gray-600">
              接続情報が含まれるCSVファイルを選択してください。
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full p-2 border border-gray-300 rounded"
            />
            <div className="mt-4 text-sm text-gray-500">
              <p><strong>期待されるCSV形式:</strong></p>
              <p>接続元機材,接続元ポート,接続先機材,接続先ポート,ワイヤータイプ,ラベル</p>
              <p>PLC,OUT1,モーター,IN,power,メインモーター</p>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div>
            <h3 className="text-lg font-medium mb-4">列マッピング設定</h3>
            <p className="mb-4 text-gray-600">
              CSVの列を対応するフィールドにマッピングしてください。
            </p>

            <div className="space-y-4">
              {Object.entries({
                sourceEquipment: '接続元機材',
                sourcePort: '接続元ポート',
                targetEquipment: '接続先機材',
                targetPort: '接続先ポート',
                wireType: 'ワイヤータイプ',
                label: 'ラベル'
              }).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {field.includes('Equipment') && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={columnMapping[field as keyof ColumnMapping]}
                    onChange={(e) => handleMappingChange(field as keyof ColumnMapping, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    <option value="">選択してください</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                <ul className="text-red-700 text-sm">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                戻る
              </button>
              <button
                onClick={previewImport}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                プレビュー
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div>
            <h3 className="text-lg font-medium mb-4">インポートプレビュー</h3>
            <p className="mb-4 text-gray-600">
              {csvData.length}行のデータをインポートします。
            </p>

            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">接続元</th>
                    <th className="px-3 py-2 text-left">接続先</th>
                    <th className="px-3 py-2 text-left">タイプ</th>
                    <th className="px-3 py-2 text-left">ラベル</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="px-3 py-2">{row[columnMapping.sourceEquipment]}</td>
                      <td className="px-3 py-2">{row[columnMapping.targetEquipment]}</td>
                      <td className="px-3 py-2">{row[columnMapping.wireType] || 'signal'}</td>
                      <td className="px-3 py-2">{row[columnMapping.label] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvData.length > 10 && (
                <div className="p-2 text-center text-gray-500 text-sm">
                  ...他 {csvData.length - 10} 行
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                戻る
              </button>
              <button
                onClick={executeImport}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                インポート実行
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}