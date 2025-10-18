import { create } from 'zustand'
import { Domain, DomainConfig, AUDIO_VISUAL_DOMAIN, PLUMBING_DOMAIN, ORGANIZATIONAL_DOMAIN } from '@/types/generic'

interface DomainState {
  currentDomain: Domain
  availableDomains: DomainConfig[]
  
  // Actions
  setCurrentDomain: (domain: Domain) => void
  addDomain: (config: DomainConfig) => void
  updateDomain: (domain: Domain, updates: Partial<DomainConfig>) => void
  removeDomain: (domain: Domain) => void
  getCurrentDomainConfig: () => DomainConfig | undefined
  getTerminology: () => { node: string; connector: string; connection: string }
}

export const useDomainStore = create<DomainState>((set, get) => ({
  currentDomain: Domain.AUDIO_VISUAL,
  availableDomains: [
    AUDIO_VISUAL_DOMAIN,
    PLUMBING_DOMAIN,
    ORGANIZATIONAL_DOMAIN
  ],

  setCurrentDomain: (domain: Domain) => {
    set({ currentDomain: domain })
  },

  addDomain: (config: DomainConfig) => {
    set(state => ({
      availableDomains: [...state.availableDomains, config]
    }))
  },

  updateDomain: (domain: Domain, updates: Partial<DomainConfig>) => {
    set(state => ({
      availableDomains: state.availableDomains.map(config =>
        config.domain === domain ? { ...config, ...updates } : config
      )
    }))
  },

  removeDomain: (domain: Domain) => {
    set(state => ({
      availableDomains: state.availableDomains.filter(config => config.domain !== domain),
      currentDomain: state.currentDomain === domain ? Domain.AUDIO_VISUAL : state.currentDomain
    }))
  },

  getCurrentDomainConfig: () => {
    const { currentDomain, availableDomains } = get()
    return availableDomains.find(config => config.domain === currentDomain)
  },

  getTerminology: () => {
    const config = get().getCurrentDomainConfig()
    return config?.terminology || {
      node: 'ノード',
      connector: 'コネクタ',
      connection: '接続'
    }
  }
}))

// ドメイン切り替えのヘルパー関数
export const switchToDomain = (domain: Domain) => {
  const { setCurrentDomain } = useDomainStore.getState()
  setCurrentDomain(domain)
  
  // UI更新のための追加処理があればここに
  console.log(`Switched to domain: ${domain}`)
}