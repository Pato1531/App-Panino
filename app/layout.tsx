import type { Metadata } from 'next'
import Link from 'next/link'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Panino — Gestión',
  description: 'Control de stock para Panino',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo: P negro fondo blanco con borde */}
              <div className="w-8 h-8 bg-white border-2 border-gray-900 rounded-lg flex items-center justify-center font-bold text-sm text-gray-900 select-none">
                P
              </div>
              <span className="text-sm font-semibold text-gray-900">Panino</span>
            </div>

            <div className="flex items-center gap-1">
              <NavLink href="/stock">📦 Stock</NavLink>
              <NavLink href="/reportes">📊 Reportes</NavLink>
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
    <Link href={href} className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
      {children}
    </Link>
  )
}
