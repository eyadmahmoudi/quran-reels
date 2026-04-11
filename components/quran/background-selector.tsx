'use client'

import { useState, useRef } from 'react'
import { Check, Upload, X, Film, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useReel } from '@/lib/reel-context'
import { PRESET_BACKGROUNDS, PRESET_VIDEOS, type BackgroundOption } from '@/lib/quran-types'

const gradients = PRESET_BACKGROUNDS.filter((b) => b.type === 'gradient')
const naturePhotos = PRESET_BACKGROUNDS.filter((b) => b.type === 'preset')

export function BackgroundSelector() {
  const { config, setConfig } = useReel()
  const [customBackground, setCustomBackground] = useState<BackgroundOption | null>(null)
  const [customVideo, setCustomVideo] = useState<BackgroundOption | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

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

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) { alert('Please select a video file'); return }
    if (customVideo?.value) URL.revokeObjectURL(customVideo.value)
    const url = URL.createObjectURL(file)
    const custom: BackgroundOption = {
      id: 'custom-video', name: file.name, type: 'video', value: url,
    }
    setCustomVideo(custom)
    setConfig({ background: custom })
  }

  const clearCustomImage = () => {
    if (customBackground?.value) URL.revokeObjectURL(customBackground.value)
    setCustomBackground(null)
    setConfig({ background: PRESET_BACKGROUNDS[0] })
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const clearCustomVideo = () => {
    if (customVideo?.value) URL.revokeObjectURL(customVideo.value)
    setCustomVideo(null)
    setConfig({ background: PRESET_BACKGROUNDS[0] })
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium text-muted-foreground">
        Background / الخلفية
      </label>

      {/* Built-in video presets */}
      <div>
        <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
          <Film className="h-3 w-3" />
          Video Backgrounds
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {PRESET_VIDEOS.map((bg) => (
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
              {bg.thumbnail ? (
                <img
                  src={bg.thumbnail}
                  alt={bg.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Play className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              {/* Play icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                {config.background?.id === bg.id ? (
                  <div className="bg-black/30 rounded-full p-1">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                ) : (
                  <div className="bg-black/40 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <span className="absolute bottom-0 inset-x-0 text-[9px] text-white/90 text-center py-0.5 bg-black/50 truncate px-0.5">
                {bg.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Video upload — custom upload */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Upload className="h-3 w-3" />
          Upload Your Own Video
        </p>
        {customVideo ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSelect(customVideo)}
              className={cn(
                'relative w-16 aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all block bg-black',
                config.background?.id === 'custom-video'
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <video
                src={customVideo.value}
                className="w-full h-full object-cover opacity-80"
                muted
                playsInline
              />
              {config.background?.id === 'custom-video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
            <div className="flex flex-col gap-1">
              <p className="text-xs text-foreground truncate max-w-[160px]">{customVideo.name}</p>
              <p className="text-xs text-muted-foreground">Video background loaded</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                  onClick={() => videoInputRef.current?.click()}>
                  <Upload className="h-3 w-3" /> Replace
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive"
                  onClick={clearCustomVideo}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="h-16 w-full border-dashed gap-2 border-primary/40 hover:border-primary"
            onClick={() => videoInputRef.current?.click()}
          >
            <Film className="h-4 w-4 text-primary" />
            <span className="text-sm">Upload Video (.mp4, .mov…)</span>
          </Button>
        )}
        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
      </div>

      {/* Gradient section */}
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

      {/* Nature photos section */}
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
              <img
                src={bg.thumbnail || bg.value}
                alt={bg.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
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

      {/* Custom image upload */}
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
