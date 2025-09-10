import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '週次MTGダッシュボード',
  description: 'Venus Ark 週次MTGダッシュボード',
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
