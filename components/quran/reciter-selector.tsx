'use client'

import { useRef, useState } from 'react'
import { Volume2, Pause, Loader2 } from 'lucide-react'
import { useReel } from '@/lib/reel-context'
import { POPULAR_RECITERS } from '@/lib/quran-types'
import { cn } from '@/lib/utils'

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function ReciterSelector() {
  const { config, setConfig } = useReel()
  const [previewPlaying, setPreviewPlaying] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleSelect = (reciter: typeof POPULAR_RECITERS[0]) => {
    setConfig({ reciterId: reciter.id, reciterFolder: reciter.folder, qdcRecitationId: reciter.qdcRecitationId })
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPreviewPlaying(null)
  }

  const togglePreview = async (reciter: typeof POPULAR_RECITERS[0]) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (previewPlaying === reciter.id) { setPreviewPlaying(null); return }

    setPreviewLoading(reciter.id)
    try {
      const url = `/api/audio?url=${encodeURIComponent(`https://everyayah.com/data/${reciter.folder}/001002.mp3`)}`
      const audio = new Audio(url)
      audioRef.current = audio
      audio.oncanplay = () => { setPreviewLoading(null); setPreviewPlaying(reciter.id); audio.play() }
      audio.onended = () => setPreviewPlaying(null)
      audio.onerror = () => { setPreviewLoading(null); setPreviewPlaying(null) }
      audio.load()
    } catch { setPreviewLoading(null) }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {POPULAR_RECITERS.map((reciter) => {
        const isSelected = config.reciterId === reciter.id
        const isPlaying = previewPlaying === reciter.id
        const isLoading = previewLoading === reciter.id

        return (
          <div
            key={reciter.id}
            onClick={() => handleSelect(reciter)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(reciter) } }}
            className={cn(
              'group relative flex h-14 items-center gap-3 rounded-[10px] border pl-3 pr-2 cursor-pointer transition-all duration-150 ease-out outline-none',
              'focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
              isSelected
                ? 'border-accent-primary/30 bg-accent-soft'
                : 'border-border-subtle bg-surface hover:border-border-default hover:bg-subtle',
            )}
          >
            {isSelected && (
              <span
                className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-accent-primary"
                aria-hidden
              />
            )}

            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-display font-semibold transition-colors',
                isSelected
                  ? 'bg-accent-primary text-white'
                  : 'bg-accent-soft text-accent-primary',
              )}
            >
              {getInitials(reciter.name)}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'truncate font-arabic-ui text-[14px] font-medium leading-tight',
                  isSelected ? 'text-accent-primary' : 'text-ink-primary',
                )}
                style={{ direction: 'rtl' }}
              >
                {reciter.arabicName}
              </p>
              <p
                className={cn(
                  'mt-0.5 truncate text-[12px] leading-tight',
                  isSelected ? 'text-gold' : 'text-ink-tertiary',
                )}
              >
                {reciter.name}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePreview(reciter) }}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border transition-colors duration-150 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
                isPlaying
                  ? 'border-gold/40 bg-gold/15 text-gold'
                  : 'border-border-subtle bg-surface text-ink-tertiary hover:border-accent-primary/40 hover:text-accent-primary',
              )}
              title="استمع للقارئ"
            >
              {isLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : isPlaying
                  ? <Pause className="h-3.5 w-3.5" />
                  : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        )
      })}
    </div>
  )
}
