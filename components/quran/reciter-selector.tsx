'use client'

import { useRef, useState } from 'react'
import { Check, Volume2, Pause, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useReel } from '@/lib/reel-context'
import { POPULAR_RECITERS } from '@/lib/quran-types'

export function ReciterSelector() {
  const { config, setConfig } = useReel()
  const [previewPlaying, setPreviewPlaying] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleSelect = (reciter: typeof POPULAR_RECITERS[0]) => {
    setConfig({ reciterId: reciter.id, reciterFolder: reciter.folder })
    // Stop any playing preview
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPreviewPlaying(null)
  }

  const togglePreview = async (reciter: typeof POPULAR_RECITERS[0]) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (previewPlaying === reciter.id) { setPreviewPlaying(null); return }

    setPreviewLoading(reciter.id)
    try {
      const url = `/api/audio?url=${encodeURIComponent(`https://everyayah.com/data/${reciter.folder}/001001.mp3`)}`
      const audio = new Audio(url)
      audioRef.current = audio
      audio.oncanplay = () => { setPreviewLoading(null); setPreviewPlaying(reciter.id); audio.play() }
      audio.onended = () => setPreviewPlaying(null)
      audio.onerror = () => { setPreviewLoading(null); setPreviewPlaying(null) }
      audio.load()
    } catch { setPreviewLoading(null) }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-muted-foreground">Reciter / القارئ</label>
      <div className="flex flex-col gap-1">
        {POPULAR_RECITERS.map((reciter) => (
          <div
            key={reciter.id}
            className={cn(
              'flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer transition-all',
              config.reciterId === reciter.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
            onClick={() => handleSelect(reciter)}
          >
            <div className="flex items-center gap-3">
              {config.reciterId === reciter.id
                ? <Check className="h-4 w-4 text-primary shrink-0" />
                : <div className="h-4 w-4 shrink-0" />
              }
              <div>
                <p className="text-sm font-medium">{reciter.name}</p>
                <p className="text-xs text-muted-foreground font-arabic">{reciter.arabicName}</p>
              </div>
            </div>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => { e.stopPropagation(); togglePreview(reciter) }}
            >
              {previewLoading === reciter.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : previewPlaying === reciter.id
                ? <Pause className="h-3.5 w-3.5" />
                : <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
