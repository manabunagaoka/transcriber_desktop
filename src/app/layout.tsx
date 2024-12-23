import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Manaboodle Transcriber',
  description: 'Real-time speech transcription app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="fixed top-0 w-full bg-gray-800 p-4 shadow-lg z-50">
          <h1 className="text-2xl font-bold text-center">Manaboodle</h1>
        </header>
        <main className="pt-16">
          {children}
        </main>
      </body>
    </html>
  )
}