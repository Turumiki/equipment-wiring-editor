import React from 'react'
import { useDomainStore } from '@/store/useDomainStore'
import { Domain } from '@/types/generic'

interface DomainSelectorProps {
  className?: string
}

export default function DomainSelector({ className = '' }: DomainSelectorProps) {
  const { currentDomain, availableDomains, setCurrentDomain } = useDomainStore()

  const handleDomainChange = (domain: Domain) => {
    setCurrentDomain(domain)
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label className="text-sm font-medium text-gray-700">
        用途:
      </label>
      <select
        value={currentDomain}
        onChange={(e) => handleDomainChange(e.target.value as Domain)}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {availableDomains.map((config) => (
          <option key={config.domain} value={config.domain}>
            {config.displayName}
          </option>
        ))}
      </select>
    </div>
  )
}

// ドメイン固有の用語表示コンポーネント
export function DomainTerminology() {
  const { getTerminology } = useDomainStore()
  const terminology = getTerminology()

  return (
    <div className="text-xs text-gray-500 space-x-4">
      <span>ノード: {terminology.node}</span>
      <span>コネクタ: {terminology.connector}</span>
      <span>接続: {terminology.connection}</span>
    </div>
  )
}