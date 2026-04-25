import type { Metadata } from 'next'
import Link from 'next/link'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Panino — Sistema de Gestión',
  description: 'Control de stock y contenido para Panino',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm select-none">
                P
              </div>
              <span className="text-sm font-semibold text-gray-900">Panino</span>
            </div>

            <div className="flex items-center gap-1">
              <NavLink href="/stock">📦 Stock</NavLink>
              <NavLink href="/social">📱 Redes</NavLink>
            </div>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900
                 hover:bg-gray-100 rounded-lg transition-colors"
    >
      {children}
    </Link>
  )
}
