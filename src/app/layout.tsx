import type { Metadata } from 'next'
import { Inter, Roboto, Roboto_Mono } from 'next/font/google'
import './globals.css'
import 'reactflow/dist/style.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});
const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'AI Workflow Portal',
  description: 'Easy-Button Portal UI for AI Workflow Infrastructure',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${roboto.variable} ${robotoMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}