'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Surah, Verse, BackgroundOption, ReelConfig } from './quran-types'
import { PRESET_BACKGROUNDS } from './quran-types'
import { fetchVerses } from './quran-api'

interface ReelContextType {
  config: ReelConfig
  setConfig: (config: Partial<ReelConfig>) => void
  verses: Verse[]
  setVerses: (verses: Verse[]) => void
  currentVerseIndex: number
  setCurrentVerseIndex: (index: number) => void
  resetConfig: () => void
  isConfigValid: boolean
}

const defaultConfig: ReelConfig = {
  surah: null,
  startVerse: 1,
  endVerse: 1,
  reciterId: 1,
  reciterFolder: 'Alafasy_128kbps',
  background: PRESET_BACKGROUNDS[0],
  showTranslation: true,
  translationId: 131,
  displayMode: 'minimal',
}

const ReelContext = createContext<ReelContextType | null>(null)

export function ReelProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<ReelConfig>(defaultConfig)
  const [verses, setVerses] = useState<Verse[]>([])
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)

  useEffect(() => {
    if (!config.surah) {
      setVerses([])
      return
    }

    let cancelled = false
    setVerses([])

    fetchVerses(config.surah.id, {
      startVerse: config.startVerse,
      endVerse: config.endVerse,
      translationId: config.showTranslation ? config.translationId : undefined,
    }).then((data) => {
      if (!cancelled) setVerses(data)
    }).catch((err) => {
      console.error('Failed to load verses:', err)
    })

    return () => { cancelled = true }
  }, [config.surah?.id, config.startVerse, config.endVerse, config.showTranslation, config.translationId])

  const setConfig = useCallback((updates: Partial<ReelConfig>) => {
    setConfigState((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetConfig = useCallback(() => {
    setConfigState(defaultConfig)
    setVerses([])
    setCurrentVerseIndex(0)
  }, [])

  const isConfigValid =
    config.surah !== null &&
    config.startVerse > 0 &&
    config.endVerse >= config.startVerse &&
    config.reciterId !== null

  return (
    <ReelContext.Provider value={{
      config, setConfig, verses, setVerses,
      currentVerseIndex, setCurrentVerseIndex,
      resetConfig, isConfigValid,
    }}>
      {children}
    </ReelContext.Provider>
  )
}

export function useReel() {
  const context = useContext(ReelContext)
  if (!context) throw new Error('useReel must be used within a ReelProvider')
  return context
}
