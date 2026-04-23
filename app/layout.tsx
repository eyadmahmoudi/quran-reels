import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter, Amiri, Reem_Kufi, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap',
})

const reemKufi = Reem_Kufi({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-reem-kufi',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Quran Reels Studio | مولد مقاطع القرآن',
  description:
    'A crafted studio for generating vertical Quran recitation reels with authentic Uthmani script and professional reciters.',
  keywords: ['Quran', 'Reels', 'Islamic', 'Arabic', 'Video', 'Recitation'],
}

export const viewport: Viewport = {
  themeColor: '#FAF7F0',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${amiri.variable} ${reemKufi.variable} ${jetbrainsMono.variable} lg:h-[100dvh] lg:overflow-hidden`}
    >
      <head />
      <body className="min-h-screen bg-canvas font-sans text-ink-primary antialiased lg:h-full lg:min-h-0 lg:overflow-hidden">
        <div className="flex min-h-screen flex-col lg:h-full lg:min-h-0">
          <div className="flex flex-1 flex-col lg:min-h-0">{children}</div>
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </div>
      </body>
    </html>
  )
}
