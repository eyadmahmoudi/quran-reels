import type { Metadata, Viewport } from 'next'
import { Amiri, Amiri_Quran, Noto_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const amiri = Amiri({ 
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-amiri',
})

const amiriQuran = Amiri_Quran({
  subsets: ['arabic'],
  weight: ['400'],
  variable: '--font-uthmani',
})

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto',
})

export const metadata: Metadata = {
  title: 'Quran Reels Generator | مولد مقاطع القرآن',
  description: 'Create beautiful Quran video reels with authentic Uthmani script, professional reciters, and customizable backgrounds',
  keywords: ['Quran', 'Reels', 'Islamic', 'Arabic', 'Video', 'Recitation'],
}

export const viewport: Viewport = {
  themeColor: '#0c1220',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head />
      <body className={`${amiri.variable} ${amiriQuran.variable} ${notoSans.variable} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
