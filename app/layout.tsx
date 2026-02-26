import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import './globals.css'

const _dmSans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'Balance - Find Your Tribe, Move Together',
    template: '%s | Balance',
  },
  description:
    'Connect with local sports clubs, health communities, and fitness events near you. Padel, running, yoga, and more.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Navbar />
        <main className="min-h-[calc(100dvh-4rem)]">{children}</main>
        <Footer />
        <Toaster position="bottom-right" richColors />
        <Analytics />
      </body>
    </html>
  )
}
