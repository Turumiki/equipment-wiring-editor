import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '機材結線図ツール',
  description: 'Reactflowを使用した機材結線図作成ツール',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}