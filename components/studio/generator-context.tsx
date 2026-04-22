'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useReel } from '@/lib/reel-context'
import { useVideoGenerator } from '@/hooks/use-video-generator'

type GeneratorContextValue = ReturnType<typeof useVideoGenerator>

const GeneratorContext = createContext<GeneratorContextValue | null>(null)

export function GeneratorProvider({ children }: { children: ReactNode }) {
  const { config } = useReel()
  const value = useVideoGenerator(config)
  return <GeneratorContext.Provider value={value}>{children}</GeneratorContext.Provider>
}

export function useGenerator() {
  const ctx = useContext(GeneratorContext)
  if (!ctx) throw new Error('useGenerator must be used within a GeneratorProvider')
  return ctx
}
