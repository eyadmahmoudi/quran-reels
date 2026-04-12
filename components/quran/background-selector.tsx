'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Upload, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useReel } from '@/lib/reel-context'
import { PRESET_BACKGROUNDS, ANIMATED_BACKGROUNDS, type BackgroundOption } from '@/lib/quran-types'
import { drawAnimatedBackground } from '@/lib/animations'

const gradients = PRESET_BACKGROUNDS.filter((b) => b.type === 'gradient')
const naturePhotos = PRESET_BACKGROUNDS.filter((b) => b.type === 'preset')

const INITIAL_COUNT = 4

type Category = 'animated' | 'nature' | 'gradients'

const CATEGORIES: { key: Category; label: string; labelAr: string }[] = [
  { key: 'animated', label: 'Animated', labelAr: 'متحركة' },
  { key: 'nature', label: 'Nature', labelAr: 'طبيعة' },
  { key: 'gradients', label: 'Gradients', labelAr: 'تدرجات' },
]

/** Static canvas thumbnail — renders one frame only */
function AnimatedPreview({ name }: { name: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
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

function BgThumbnail({ bg }: { bg: BackgroundOption }) {
  if (bg.type === 'animated') {
    return <AnimatedPreview name={bg.value} />
  }
  if (bg.type === 'gradient') {
    return <div className="w-full h-full" style={{ background: bg.value }} />
  }
  // preset (nature photo)
  return (
    <img
      src={bg.thumbnail || bg.value}
      alt={bg.name}
      className="w-full h-full object-cover"
      loading="lazy"
    />
  )
}

export function BackgroundSelector() {
  const { config, setConfig } = useReel()
  const [customBackground, setCustomBackground] = useState<BackgroundOption | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('animated')
  const [expanded, setExpanded] = useState(false)

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

  // Get items for current category
  const allItems =
    activeCategory === 'animated' ? ANIMATED_BACKGROUNDS :
    activeCategory === 'nature' ? naturePhotos :
    gradients

  const visibleItems = expanded ? allItems : allItems.slice(0, INITIAL_COUNT)
  const hasMore = allItems.length > INITIAL_COUNT

  // Reset expanded state when switching categories
  const switchCategory = (cat: Category) => {
    setActiveCategory(cat)
    setExpanded(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium text-muted-foreground">
        Background / الخلفية
      </label>

      {/* ── Category tabs ── */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => switchCategory(cat.key)}
            className={cn(
              'flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors',
              activeCategory === cat.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Background grid ── */}
      <div className="grid grid-cols-4 gap-2">
        {visibleItems.map((bg) => (
          <button
            key={bg.id}
            onClick={() => handleSelect(bg)}
            title={bg.name}
            className={cn(
              'relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all',
              bg.type === 'animated' || bg.type === 'preset' ? 'bg-black' : 'bg-muted',
              config.background?.id === bg.id
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-transparent hover:border-primary/50'
            )}
          >
            <BgThumbnail bg={bg} />
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

      {/* ── Show more / less ── */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show more (${allItems.length - INITIAL_COUNT})`}
        </button>
      )}

      {/* ── Custom Image Upload ── */}
      <div className="pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-2">Custom Image</p>
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
            variant="outline" className="h-10 w-full border-dashed gap-2"
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
