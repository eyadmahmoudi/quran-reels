'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Upload, X, ChevronDown, ImageIcon } from 'lucide-react'
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

/** Small "ACTIVE" badge to clearly indicate the selected background */
function ActiveBadge() {
  return (
    <span
      className="absolute top-1 left-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm z-10"
      style={{
        background: 'rgba(34,197,94,0.85)',
        color: 'white',
        backdropFilter: 'blur(4px)',
      }}
    >
      Active
    </span>
  )
}

export function BackgroundSelector() {
  const { config, setConfig } = useReel()
  const [customBackground, setCustomBackground] = useState<BackgroundOption | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('animated')
  const [expanded, setExpanded] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  const isCustomActive = config.background?.id === 'custom-upload'

  const handleSelect = (bg: BackgroundOption) => setConfig({ background: bg })

  const applyImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    if (customBackground?.value) URL.revokeObjectURL(customBackground.value)
    const url = URL.createObjectURL(file)
    const custom: BackgroundOption = {
      id: 'custom-upload', name: file.name, type: 'custom', value: url, thumbnail: url,
    }
    setCustomBackground(custom)
    setConfig({ background: custom })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    applyImageFile(file)
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

  const onDragOverUpload = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types?.includes('Files')) setIsDraggingFile(true)
  }

  const onDragLeaveUpload = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)
  }

  const onDropUpload = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)
    const file = e.dataTransfer.files?.[0]
    if (file) applyImageFile(file)
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="text-sm font-medium text-stone-600 dark:text-slate-400">
        Background / الخلفية
      </label>

      {/* ── Currently active indicator ── */}
      <div
        className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white/90 px-3 py-2 text-xs dark:border-slate-700/80 dark:bg-slate-900/50"
        style={{
          background: isCustomActive
            ? 'rgba(34,197,94,0.08)'
            : 'rgba(201,168,76,0.06)',
          borderColor: isCustomActive ? 'rgba(34,197,94,0.25)' : undefined,
        }}
      >
        <ImageIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: isCustomActive ? '#22c55e' : '#c9a84c' }} />
        <span style={{ color: isCustomActive ? '#22c55e' : '#c9a84c' }}>
          Using: <strong>{isCustomActive ? `Uploaded — ${config.background?.name}` : config.background?.name || 'None'}</strong>
        </span>
      </div>

      {/* ── Custom Image Upload (drag-and-drop zone) ── */}
      <div
        className="border-b border-t border-stone-200/90 pt-2 pb-3 dark:border-slate-800/90"
        style={{
          background: isCustomActive ? 'rgba(34,197,94,0.03)' : undefined,
        }}
      >
        <p className="mb-3 text-xs text-stone-600 dark:text-slate-500">
          Custom Image {isCustomActive && <span className="font-semibold text-emerald-600 dark:text-emerald-400"> • In use</span>}
        </p>
        {customBackground ? (
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => handleSelect(customBackground)}
                className={cn(
                  'relative w-16 aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all block',
                  isCustomActive
                    ? 'border-green-500 ring-2 ring-green-500/20'
                    : 'border-transparent hover:border-primary/50'
                )}
              >
                <img src={customBackground.value} alt="Custom" className="w-full h-full object-cover" />
                {isCustomActive && <ActiveBadge />}
                {isCustomActive && (
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
            {!isCustomActive && (
              <p className="text-xs text-stone-600 dark:text-slate-500">
                Click the thumbnail to use this image
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            onDragOver={onDragOverUpload}
            onDragLeave={onDragLeaveUpload}
            onDrop={onDropUpload}
            className={cn(
              'relative flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors',
              'bg-stone-50/90 hover:bg-amber-50/60 dark:bg-slate-900/30 dark:hover:bg-slate-800/40',
              isDraggingFile
                ? 'border-amber-500/80 bg-amber-100/80 ring-2 ring-amber-400/25 dark:bg-amber-500/10 dark:ring-amber-500/20'
                : 'border-stone-400/90 hover:border-amber-400/70 dark:border-slate-600/90 dark:hover:border-slate-500'
            )}
          >
            <div className="rounded-full bg-white p-2.5 ring-1 ring-stone-300 dark:bg-slate-800/90 dark:ring-slate-600/80">
              <Upload className="h-5 w-5 text-stone-600 dark:text-slate-300" />
            </div>
            <span className="text-sm font-medium text-stone-800 dark:text-slate-200">Upload image</span>
            <span className="text-xs text-stone-600 dark:text-slate-500">Drag &amp; drop here, or click to browse</span>
          </button>
        )}
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      </div>

      {/* ── Category segmented control ── */}
      <div
        className="inline-flex w-full rounded-full bg-stone-200/90 p-1 shadow-inner ring-1 ring-stone-300/80 dark:bg-slate-800/90 dark:ring-slate-700/80"
        role="tablist"
        aria-label="Background category"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.key}
            onClick={() => switchCategory(cat.key)}
            className={cn(
              'flex-1 rounded-full py-2 px-2 text-[11px] font-semibold transition-all duration-200 sm:px-3 sm:text-xs',
              activeCategory === cat.key
                ? 'bg-white text-stone-900 shadow-md ring-1 ring-stone-300/60 dark:bg-slate-700 dark:text-white dark:ring-white/10'
                : 'text-stone-600 hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Background grid ── */}
      <div className="grid grid-cols-4 gap-2">
        {visibleItems.map((bg) => {
          const isSelected = config.background?.id === bg.id
          return (
            <button
              key={bg.id}
              onClick={() => handleSelect(bg)}
              title={bg.name}
              className={cn(
                'relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all',
                bg.type === 'animated' || bg.type === 'preset' ? 'bg-black' : 'bg-muted',
                isSelected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent hover:border-primary/50'
              )}
            >
              <BgThumbnail bg={bg} />
              {isSelected && <ActiveBadge />}
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check className="h-4 w-4 text-white drop-shadow" />
                </div>
              )}
              <span className="absolute bottom-0 inset-x-0 text-[9px] text-white/90 text-center py-0.5 bg-black/50 truncate px-0.5">
                {bg.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Show more / less ── */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 py-2 text-xs font-medium text-stone-600 transition-colors hover:text-stone-900 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show more (${allItems.length - INITIAL_COUNT})`}
        </button>
      )}
    </div>
  )
}
