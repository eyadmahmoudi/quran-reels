'use client'

import { Download, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useReel } from '@/lib/reel-context'
import { useVideoGenerator } from '@/hooks/use-video-generator'

export function DownloadButton() {
  const { config, verses, isConfigValid } = useReel()
  const { isGenerating, progress, error, generateVideo, cancelGeneration } =
    useVideoGenerator()

  const handleGenerate = async () => {
    if (!config.surah || !config.background) return

    await generateVideo({
      verses,
      background: config.background,
      showTranslation: config.showTranslation,
      surahName: config.surah.name_arabic,
      reciterFolder: config.reciterFolder || 'Alafasy_128kbps',
      surahId: config.surah.id,
      startVerse: config.startVerse,
      endVerse: config.endVerse,
      displayMode: config.displayMode ?? 'minimal',
    })
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Generating video... {Math.round(progress)}%
          </span>
          <Button variant="ghost" size="sm" onClick={cancelGeneration}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground text-center">
          {progress < 30
            ? 'Loading audio files...'
            : progress < 50
              ? 'Processing audio...'
              : progress < 95
                ? 'Rendering video frames...'
                : 'Finalizing...'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <Button
        onClick={handleGenerate}
        disabled={!isConfigValid || verses.length === 0}
        className="w-full h-12 text-base gap-2"
        size="lg"
      >
        <Download className="h-5 w-5" />
        Generate and Download Video
      </Button>

      {error && (
        <p className="text-destructive text-sm text-center">{error}</p>
      )}

      {!isConfigValid && (
        <p className="text-muted-foreground text-xs text-center">
          Please complete all selections above
        </p>
      )}

      {isConfigValid && verses.length === 0 && (
        <p className="text-muted-foreground text-xs text-center">
          Loading verses...
        </p>
      )}
    </div>
  )
}
