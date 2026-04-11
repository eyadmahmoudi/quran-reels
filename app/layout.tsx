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
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head />
      <body className={`${amiri.variable} ${amiriQuran.variable} ${scheherazade.variable} ${notoSans.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
