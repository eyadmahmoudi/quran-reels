'use client'

import { useRef, useState } from 'react'
import { Volume2, Pause, Loader2 } from 'lucide-react'
import { useReel } from '@/lib/reel-context'
import { POPULAR_RECITERS } from '@/lib/quran-types'
import { cn } from '@/lib/utils'

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
              'group relative flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-all duration-150 outline-none',
              'focus-visible:ring-2 focus-visible:ring-emerald-500/40',
              isSelected
                ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)]'
                : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900',
            )}
          >
            {isSelected && (
              <span
                className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-emerald-500 dark:bg-emerald-400"
                aria-hidden
              />
            )}

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'truncate text-sm font-medium leading-tight',
                  isSelected
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-zinc-800 dark:text-zinc-200',
                )}
              >
                {reciter.name}
              </p>
              <p
                className={cn(
                  'mt-0.5 truncate font-arabic text-[11px] leading-tight',
                  isSelected
                    ? 'text-emerald-600/70 dark:text-emerald-400/60'
                    : 'text-zinc-500 dark:text-zinc-500',
                )}
                style={{ direction: 'rtl' }}
              >
                {reciter.arabicName}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePreview(reciter) }}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors',
                isPlaying
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:border-emerald-500/40 hover:text-emerald-600 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:text-emerald-400',
              )}
              title="Preview reciter"
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
