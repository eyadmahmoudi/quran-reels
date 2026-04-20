/**
 * Curated stock video backgrounds (hosted MP4s).
 * Replace `url` / `thumbnail` with your production assets when ready.
 */
export interface StockVideoDefinition {
  id: string
  name: string
  type: 'video'
  url: string
  thumbnail: string
}

export const STOCK_VIDEOS: StockVideoDefinition[] = [
  { id: 'stock-vid-1', name: 'Ocean Waves', type: 'video', url: '/videos/ocean.mp4', thumbnail: '/images/ocean-thumb.jpg' },
  { id: 'stock-vid-2', name: 'City Night', type: 'video', url: '/videos/city.mp4', thumbnail: '/images/city-thumb.jpg' },
  { id: 'stock-vid-3', name: 'Mountain Clouds', type: 'video', url: '/videos/mountain.mp4', thumbnail: '/images/mountain-thumb.jpg' },
]
