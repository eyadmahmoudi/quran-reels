'use client'

import { useEffect, useRef } from 'react'
import { Check, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useReel } from '@/lib/reel-context'
import { PRESET_BACKGROUNDS, ANIMATED_BACKGROUNDS, type BackgroundOption } from '@/lib/quran-types'
import { drawAnimatedBackground } from '@/lib/animations'
import { useState } from 'react'

const gradients = PRESET_BACKGROUNDS.filter((b) => b.type === 'gradient')
const naturePhotos = PRESET_BACKGROUNDS.filter((b) => b.type === 'preset')

/** Static canvas thumbnail for animated backgrounds — renders one frame only */
function AnimatedPreview({ name }: { name: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Draw a single frame at t=2000ms (a representative moment) — no animation loop
    drawAnimatedBackground(ctx, canvas.width, canvas.height, 2000, name)
  }, [name])

  return (
    <canvas
      ref={ref}
      width={72}
      height={128}
      className="w-full h-full object-cover"
      style={{ display: 'block' }}
    />
  )
}

export function BackgroundSelector() {
  const { config, setConfig } = useReel()
  const [customBackground, setCustomBackground] = useState<BackgroundOption | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleSelect = (bg: BackgroundOption) => setConfig({ background: bg })

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    if (customBackground?.value) URL.revokeObjectURL(customBackground.value)
    const url = URL.createObjectURL(file)
    const custom: BackgroundOption = {
      id: 'custom-upload', name: file.name, type: 'custom', value: url, thumbnail: url,
    }
    setCustomBackground(custom)
    setConfig({ background: custom })
  }

  const clearCustomImage = () => {
    if (customBackground?.value) URL.revokeObjectURL(customBackground.value)
    setCustomBackground(null)
    setConfig({ background: PRESET_BACKGROUNDS[0] })
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium text-muted-foreground">
        Background / الخلفية
      </label>

      {/* ── Animated Backgrounds ── */}
      <div>
        <p className="text-xs font-medium text-primary mb-2">✦ Animated Backgrounds</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {ANIMATED_BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              onClick={() => handleSelect(bg)}
              title={bg.name}
              className={cn(
                'relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all bg-black',
                config.background?.id === bg.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent hover:border-primary/50'
              )}
            >
              <AnimatedPreview name={bg.value} />
              {config.background?.id === bg.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check className="h-4 w-4 text-white drop-shadow" />
                </div>
              )}
              <span className="absolute bottom-0 inset-x-0 text-[9px] text-white/90 text-center py-0.5 bg-black/50 truncate px-0.5">
                {bg.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Gradients ── */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Gradients</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {gradients.map((bg) => (
            <button
              key={bg.id}
              onClick={() => handleSelect(bg)}
              title={bg.name}
              className={cn(
                'relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all',
                config.background?.id === bg.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent hover:border-primary/50'
              )}
              style={{ background: bg.value }}
            >
              {config.background?.id === bg.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
              <span className="absolute bottom-0 inset-x-0 text-[9px] text-white/80 text-center py-0.5 bg-black/30 truncate px-0.5">
                {bg.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Nature Photos ── */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Nature Photos</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {naturePhotos.map((bg) => (
            <button
              key={bg.id}
              onClick={() => handleSelect(bg)}
              title={bg.name}
              className={cn(
                'relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all bg-muted',
                config.background?.id === bg.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent hover:border-primary/50'
              )}
            >
              <img src={bg.thumbnail || bg.value} alt={bg.name} className="w-full h-full object-cover" loading="lazy" />
              {config.background?.id === bg.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
              <span className="absolute bottom-0 inset-x-0 text-[9px] text-white/90 text-center py-0.5 bg-black/50 truncate px-0.5">
                {bg.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Custom Image Upload ── */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Upload Image</p>
        {customBackground ? (
          <div className="relative inline-block">
            <button
              onClick={() => handleSelect(customBackground)}
              className={cn(
                'relative w-16 aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all block',
                config.background?.id === 'custom-upload'
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent'
              )}
            >
              <img src={customBackground.value} alt="Custom" className="w-full h-full object-cover" />
              {config.background?.id === 'custom-upload' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
            <Button
              variant="ghost" size="icon"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground"
              onClick={clearCustomImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline" className="h-12 w-full border-dashed gap-2"
            onClick={() => imageInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            <span className="text-sm">Upload Image</span>
          </Button>
        )}
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      </div>
    </div>
  )
}
