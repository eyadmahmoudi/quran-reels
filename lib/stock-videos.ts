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

const UNSPLASH_PARAMS = '?w=400&q=80&auto=format&fit=crop'

export const STOCK_VIDEOS: StockVideoDefinition[] = [
  { id: 'stock-vid-1',  name: 'Ocean Waves',     type: 'video', url: '/videos/12999549_2160_3840_30fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1505142468610-359e7d316be0${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-2',  name: 'City Night',      type: 'video', url: '/videos/13247023_3840_2160_24fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1514565131-fce0801e5785${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-3',  name: 'Mountain Clouds', type: 'video', url: '/videos/13725809-uhd_3840_2160_25fps.mp4', thumbnail: `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-4',  name: 'Starry Sky',      type: 'video', url: '/videos/14369716_1080_1920_30fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1502134249126-9f3755a50d78${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-5',  name: 'Desert Dunes',    type: 'video', url: '/videos/14557366_1920_1080_60fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-6',  name: 'Forest Mist',     type: 'video', url: '/videos/14830989_1920_1080_25fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1448375240586-882707db888b${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-7',  name: 'Northern Lights', type: 'video', url: '/videos/14890800_2160_3840_30fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1483347756197-71ef80e95f73${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-8',  name: 'Sunset Horizon',  type: 'video', url: '/videos/15504936_3840_2160_25fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1506905925346-21bda4d32df4${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-9',  name: 'Rainy Window',    type: 'video', url: '/videos/15562597_2160_3840_60fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1519692933481-e162a57d6721${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-10', name: 'Golden Hour',     type: 'video', url: '/videos/15616072_1080_1920_30fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1500382017468-9049fed747ef${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-11', name: 'Misty Valley',    type: 'video', url: '/videos/15631487_1080_1920_30fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1506260408121-e353d10b87c7${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-12', name: 'Calm Lake',       type: 'video', url: '/videos/15652352_2160_3840_30fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1506744038136-46273834b3fb${UNSPLASH_PARAMS}` },
  { id: 'stock-vid-13', name: 'Autumn Woods',    type: 'video', url: '/videos/15685254_2160_3840_60fps.mp4',     thumbnail: `https://images.unsplash.com/photo-1507783548227-544c3b8fc065${UNSPLASH_PARAMS}` },
]
