import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter, Amiri, Reem_Kufi, JetBrains_Mono, Scheherazade_New, Noto_Naskh_Arabic, Aref_Ruqaa, Noto_Kufi_Arabic } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
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

const scheherazadeNew = Scheherazade_New({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-scheherazade',
  display: 'swap',
})

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-naskh',
  display: 'swap',
})

const arefRuqaa = Aref_Ruqaa({
  subsets: ['arabic', 'latin'],
  weight: ['400'],
  style: ['normal'],
  variable: '--font-aref-ruqaa',
  display: 'swap',
})

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-kufi',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'مولد مقاطع القرآن | Quran Reels Studio',
  description:
    'استوديو احترافي لإنشاء مقاطع فيديو قرآنية بخط عثماني أصيل وأصوات قراء متميزين. A crafted studio for generating vertical Quran recitation reels with authentic Uthmani script and professional reciters.',
  keywords: ['Quran', 'قرآن', 'Reels', 'Islamic', 'إسلامي', 'Arabic', 'عربي', 'Video', 'فيديو', 'Recitation', 'تلاوة'],
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
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${amiri.variable} ${reemKufi.variable} ${jetbrainsMono.variable} ${scheherazadeNew.variable} ${notoNaskhArabic.variable} ${arefRuqaa.variable} ${notoKufiArabic.variable} lg:h-[100dvh] lg:overflow-hidden`}
    >
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8T7SK384HE"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-8T7SK384HE');
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-canvas font-sans text-ink-primary antialiased lg:h-full lg:min-h-0 lg:overflow-hidden">
        <div className="flex min-h-screen flex-col lg:h-full lg:min-h-0">
          <div className="flex flex-1 flex-col lg:min-h-0">{children}</div>
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </div>
      </body>
    </html>
  )
}