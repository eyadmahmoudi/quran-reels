'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Volume2, Pause, Loader2 } from 'lucide-react'
import { useReel } from '@/lib/reel-context'
import { POPULAR_RECITERS } from '@/lib/quran-types'

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
      // Preview: Fatiha v2 (001002.mp3) — الحمد لله رب العالمين, clean sample of the reciter's voice
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
    <div className="flex flex-col gap-2">
      {POPULAR_RECITERS.map((reciter) => {
        const isSelected = config.reciterId === reciter.id
        const isPlaying = previewPlaying === reciter.id
        const isLoading = previewLoading === reciter.id

        return (
          <div
            key={reciter.id}
            onClick={() => handleSelect(reciter)}
            className="group flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200"
            style={{
              border: isSelected
                ? '1px solid rgba(201,168,76,0.55)'
                : '1px solid rgba(201,168,76,0.1)',
              background: isSelected
                ? 'linear-gradient(135deg, rgba(201,168,76,0.14) 0%, rgba(201,168,76,0.06) 100%)'
                : 'rgba(255,255,255,0.02)',
              boxShadow: isSelected
                ? '0 0 20px rgba(201,168,76,0.12), inset 0 1px 0 rgba(201,168,76,0.1)'
                : 'none',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Check / empty indicator */}
              {isSelected ? (
                <CheckCircle2
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: '#c9a84c' }}
                />
              ) : (
                <div
                  className="h-5 w-5 rounded-full flex-shrink-0 border group-hover:border-[#c9a84c]/40 transition-colors"
                  style={{ borderColor: 'rgba(201,168,76,0.18)' }}
                />
              )}

              <div className="min-w-0">
                <p
                  className="text-sm font-semibold truncate transition-colors"
                  style={{ color: isSelected ? '#f0d080' : 'inherit' }}
                >
                  {reciter.name}
                </p>
                <p
                  className="text-xs font-arabic truncate mt-0.5"
                  style={{ color: isSelected ? 'rgba(201,168,76,0.7)' : 'rgba(150,150,160,0.6)' }}
                >
                  {reciter.arabicName}
                </p>
              </div>
            </div>

            {/* Play button */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePreview(reciter) }}
              className="flex-shrink-0 ml-2 flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200"
              style={{
                borderColor: isPlaying
                  ? 'rgba(201,168,76,0.6)'
                  : 'rgba(201,168,76,0.15)',
                background: isPlaying
                  ? 'rgba(201,168,76,0.2)'
                  : 'rgba(201,168,76,0.04)',
                boxShadow: isPlaying ? '0 0 12px rgba(201,168,76,0.3)' : 'none',
              }}
              title="Preview reciter"
            >
              {isLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#c9a84c' }} />
                : isPlaying
                ? <Pause className="h-3.5 w-3.5" style={{ color: '#f0d080' }} />
                : <Volume2 className="h-3.5 w-3.5" style={{ color: 'rgba(201,168,76,0.55)' }} />
              }
            </button>
          </div>
        )
      })}
    </div>
  )
}
