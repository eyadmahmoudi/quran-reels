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
    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
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
              'group relative flex flex-col gap-1 rounded-xl px-2.5 py-2.5 sm:px-3 sm:py-3 cursor-pointer transition-all duration-200',
              'last:col-span-full sm:last:col-span-2',
              'border-2 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 dark:focus-visible:ring-offset-slate-950',
              isSelected
                ? 'border-amber-500/85 bg-amber-500/[0.12] shadow-[0_0_0_1px_rgba(251,191,36,0.15)]'
                : 'border-stone-300/90 bg-white/70 hover:border-stone-400 hover:bg-stone-50 dark:border-slate-700/90 dark:bg-slate-900/40 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'
            )}
          >
            <div className="min-w-0 pr-8">
              <p
                className={cn(
                  'text-xs sm:text-sm font-semibold leading-tight line-clamp-2',
                  isSelected
                    ? 'text-amber-900 dark:text-amber-100'
                    : 'text-stone-800 group-hover:text-stone-950 dark:text-slate-200 dark:group-hover:text-slate-100'
                )}
              >
                {reciter.name}
              </p>
              <p
                className={cn(
                  'mt-0.5 truncate font-arabic text-[10px] sm:text-xs',
                  isSelected
                    ? 'text-amber-800/90 dark:text-amber-200/65'
                    : 'text-stone-600 group-hover:text-stone-700 dark:text-slate-500 dark:group-hover:text-slate-400'
                )}
              >
                {reciter.arabicName}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePreview(reciter) }}
              className={cn(
                'absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200',
                isPlaying
                  ? 'border-amber-500/70 bg-amber-500/20 text-amber-900 dark:text-amber-100'
                  : 'border-stone-300 bg-white text-stone-600 hover:border-amber-500/50 hover:text-amber-800 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-amber-500/40 dark:hover:text-amber-200/90'
              )}
              title="Preview reciter"
            >
              {isLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700 dark:text-amber-400" />
                : isPlaying
                  ? <Pause className="h-3.5 w-3.5" />
                  : <Volume2 className="h-3.5 w-3.5" />
              }
            </button>
          </div>
        )
      })}
    </div>
  )
}
