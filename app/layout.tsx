import type { Metadata, Viewport } from 'next'
import { Amiri, Amiri_Quran, Noto_Sans, Scheherazade_New } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
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

const scheherazade = Scheherazade_New({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-scheherazade',
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
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className="dark h-[100dvh] overflow-hidden">
      <head />
      <body
        className={`${amiri.variable} ${amiriQuran.variable} ${scheherazade.variable} ${notoSans.variable} font-sans antialiased h-full min-h-0 overflow-hidden bg-zinc-950 text-zinc-100`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
