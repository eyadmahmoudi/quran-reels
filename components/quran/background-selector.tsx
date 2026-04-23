'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, X, ChevronDown, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReel } from '@/lib/reel-context'
import { PRESET_BACKGROUNDS, ANIMATED_BACKGROUNDS, type BackgroundOption } from '@/lib/quran-types'
import { drawAnimatedBackground } from '@/lib/animations'

const gradients = PRESET_BACKGROUNDS.filter((b) => b.type === 'gradient')
const naturePhotos = PRESET_BACKGROUNDS.filter((b) => b.type === 'preset')

const INITIAL_COUNT = 6

type Category = 'animated' | 'nature' | 'gradients'

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'animated', label: 'Animated' },
  { key: 'nature', label: 'Nature' },
  { key: 'gradients', label: 'Gradients' },
]

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
      className="h-full w-full object-cover"
      style={{ display: 'block' }}
    />
  )
}

function BgThumbnail({ bg }: { bg: BackgroundOption }) {
  const valueStr = typeof bg.value === 'string' ? bg.value : (bg.value[0] ?? '')
  if (bg.type === 'animated') return <AnimatedPreview name={valueStr} />
  if (bg.type === 'gradient') return <div className="h-full w-full" style={{ background: valueStr }} />
  return (
    <img
      src={bg.thumbnail || valueStr}
      alt={bg.name}
      className="h-full w-full object-cover"
      loading="lazy"
    />
  )
}

const CUSTOM_IMAGE_ID = 'custom-upload'

export function BackgroundSelector() {
  const { config, setConfig } = useReel()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('animated')
  const [expanded, setExpanded] = useState(false)
  const [isDraggingImage, setIsDraggingImage] = useState(false)

  const isCustomImageActive =
    config.background?.id === CUSTOM_IMAGE_ID &&
    (config.background?.type === 'image' || config.background?.type === 'custom')

  const handleSelect = (bg: BackgroundOption) => setConfig({ background: bg })

  const revokeCurrentImageUrl = () => {
    const b = config.background
    if (
      b?.id === CUSTOM_IMAGE_ID &&
      (b.type === 'image' || b.type === 'custom') &&
      typeof b.value === 'string'
    ) {
      URL.revokeObjectURL(b.value)
    }
  }

  const applyImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    revokeCurrentImageUrl()
    const url = URL.createObjectURL(file)
    setConfig({
      background: {
        id: CUSTOM_IMAGE_ID,
        name: file.name,
        type: 'image',
        value: url,
        thumbnail: url,
      },
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    applyImageFile(file)
  }

  const clearCustomImage = () => {
    revokeCurrentImageUrl()
    if (isCustomImageActive) setConfig({ background: PRESET_BACKGROUNDS[0] })
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const allItems =
    activeCategory === 'animated' ? ANIMATED_BACKGROUNDS :
    activeCategory === 'nature' ? naturePhotos :
    gradients

  const visibleItems = expanded ? allItems : allItems.slice(0, INITIAL_COUNT)
  const hasMore = allItems.length > INITIAL_COUNT

  const switchCategory = (cat: Category) => {
    setActiveCategory(cat)
    setExpanded(false)
  }

  const onDragOverImage = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types?.includes('Files')) setIsDraggingImage(true)
  }

  const onDragLeaveImage = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingImage(false)
  }

  const onDropImage = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingImage(false)
    const file = e.dataTransfer.files?.[0]
    if (file) applyImageFile(file)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Custom image dropzone ── */}
      <div>
        <p className="mb-1.5 text-caption text-ink-tertiary">Custom upload</p>
        {isCustomImageActive && config.background ? (
          <div className="flex items-center gap-3 rounded-[10px] border border-accent-primary/30 bg-accent-soft p-2">
            <div className="relative h-14 w-10 overflow-hidden rounded-[6px] ring-1 ring-accent-primary/30">
              <img
                src={typeof config.background.value === 'string' ? config.background.value : ''}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-accent-primary">In use</p>
              <p className="truncate text-[11px] text-ink-tertiary">
                {config.background.name}
              </p>
            </div>
            <button
              type="button"
              onClick={clearCustomImage}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border-subtle bg-surface text-ink-tertiary transition-colors hover:border-destructive/40 hover:text-destructive"
              title="Remove custom image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            onDragOver={onDragOverImage}
            onDragLeave={onDragLeaveImage}
            onDrop={onDropImage}
            className={cn(
              'group relative flex w-full flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed px-3 py-6 text-center transition-all duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
              isDraggingImage
                ? 'border-accent-primary bg-accent-soft'
                : 'border-border-default bg-surface hover:border-accent-primary/60 hover:bg-subtle',
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                isDraggingImage
                  ? 'bg-accent-primary/15 text-accent-primary'
                  : 'bg-subtle text-ink-tertiary group-hover:bg-accent-soft group-hover:text-accent-primary',
              )}
            >
              <Upload className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-ink-primary">
                Drop image or click to upload
              </span>
              <span className="text-[11px] text-ink-tertiary">JPG, PNG, WebP</span>
            </div>
          </button>
        )}
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      </div>

      {/* ── Category tabs ── */}
      <div className="flex w-full gap-1 border-b border-border-subtle" role="tablist">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => switchCategory(cat.key)}
              className={cn(
                'relative flex-1 rounded-t-[8px] px-2 py-2 text-[12px] font-medium transition-colors duration-150 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
                isActive
                  ? 'text-accent-primary'
                  : 'text-ink-tertiary hover:text-ink-primary',
              )}
            >
              {cat.label}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute bottom-[-1px] left-2 right-2 h-[2px] rounded-full bg-accent-primary"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-3 gap-2">
        {visibleItems.map((bg) => {
          const isSelected = config.background?.id === bg.id
          return (
            <button
              key={bg.id}
              onClick={() => handleSelect(bg)}
              title={bg.name}
              className={cn(
                'group relative aspect-[9/16] overflow-hidden rounded-[8px] border transition-all duration-150 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]',
                isSelected
                  ? 'border-accent-primary ring-2 ring-accent-primary/25'
                  : 'border-border-subtle hover:border-border-default',
              )}
            >
              <BgThumbnail bg={bg} />
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-accent-primary/25 backdrop-blur-[1px]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary text-white shadow-lg">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </div>
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 text-center text-[10px] text-white/90">
                {bg.name}
              </span>
            </button>
          )
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 rounded-[8px] py-1.5 text-[12px] font-medium text-ink-tertiary transition-colors duration-150 ease-out hover:bg-subtle hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)]"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show ${allItems.length - INITIAL_COUNT} more`}
        </button>
      )}
    </div>
  )
}
