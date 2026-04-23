'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, X, ChevronDown, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReel } from '@/lib/reel-context'
import { PRESET_BACKGROUNDS, ANIMATED_BACKGROUNDS, type BackgroundOption } from '@/lib/quran-types'
import { drawAnimatedBackground } from '@/lib/animations'

const gradients = PRESET_BACKGROUNDS.filter((b) => b.type === 'gradient')
const naturePhotos = PRESET_BACKGROUNDS.filter((b) => b.type === 'preset')

const INITIAL_COUNT = 4

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
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Custom upload
        </p>
        {isCustomImageActive && config.background ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2">
            <div className="relative h-14 w-10 overflow-hidden rounded-md ring-1 ring-emerald-500/30">
              <img
                src={typeof config.background.value === 'string' ? config.background.value : ''}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Check className="h-3.5 w-3.5 text-emerald-300" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-emerald-700">In use</p>
              <p className="truncate text-[10px] text-zinc-500">
                {config.background.name}
              </p>
            </div>
            <button
              type="button"
              onClick={clearCustomImage}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-red-500/40 hover:text-red-500"
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
              'group relative flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-6 text-center transition-all',
              isDraggingImage
                ? 'border-emerald-500/70 bg-emerald-500/10'
                : 'border-zinc-300 bg-white hover:border-emerald-500/50 hover:bg-zinc-50',
            )}
          >
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                isDraggingImage
                  ? 'bg-emerald-500/20 text-emerald-600'
                  : 'bg-zinc-100 text-zinc-500 group-hover:bg-emerald-500/15 group-hover:text-emerald-600',
              )}
            >
              <Upload className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-zinc-800">
                Drop image or click to upload
              </span>
              <span className="text-[10px] text-zinc-500">
                JPG, PNG, WebP
              </span>
            </div>
          </button>
        )}
        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      </div>

      {/* ── Category tabs ── */}
      <div
        className="inline-flex w-full rounded-lg bg-zinc-100 p-1 ring-1 ring-inset ring-zinc-200"
        role="tablist"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.key}
            onClick={() => switchCategory(cat.key)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-all',
              activeCategory === cat.key
                ? 'bg-emerald-500/10 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]'
                : 'text-zinc-500 hover:text-zinc-800',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-4 gap-1.5">
        {visibleItems.map((bg) => {
          const isSelected = config.background?.id === bg.id
          return (
            <button
              key={bg.id}
              onClick={() => handleSelect(bg)}
              title={bg.name}
              className={cn(
                'group relative aspect-[9/16] overflow-hidden rounded-md border transition-all',
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                  : 'border-zinc-200 hover:border-zinc-300',
              )}
            >
              <BgThumbnail bg={bg} />
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-[1px]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </div>
              )}
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1 py-1 text-center text-[9px] text-white/85">
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
          className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : `Show ${allItems.length - INITIAL_COUNT} more`}
        </button>
      )}
    </div>
  )
}
