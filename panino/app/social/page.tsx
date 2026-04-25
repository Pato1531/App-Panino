'use client'

import { useState } from 'react'
import { CONTENT_SCRIPTS, CALENDAR, FORMAT_META } from '@/lib/social-content'
import type { ContentFormat, ContentScript } from '@/lib/types'

export default function SocialPage() {
  const [selected, setSelected] = useState<ContentScript | null>(null)
  const [filterFormat, setFilterFormat] = useState<ContentFormat | 'all'>('all')

  const filtered = CONTENT_SCRIPTS.filter(
    (s) => filterFormat === 'all' || s.format === filterFormat
  )

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Libretos Redes Sociales</h1>
          <p className="text-sm text-gray-400 mt-0.5">3 publicaciones por semana. Consistencia &gt; cantidad.</p>
        </div>
      </div>

      {/* Calendario semanal */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Calendario sugerido</p>
        <div className="divide-y divide-gray-50">
          {CALENDAR.map(({ day, content, format }) => {
            const meta = FORMAT_META[format]
            return (
              <div key={day} className="flex items-center gap-3 py-2.5">
                <span className="text-xs font-medium text-gray-500 w-20 flex-shrink-0">{day}</span>
                <span className="text-sm text-gray-800 flex-1">{content}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: meta.bg, color: meta.color }}>
                  {meta.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Filtros por formato */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => setFilterFormat('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${filterFormat === 'all' ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          Todos
        </button>
        {(Object.keys(FORMAT_META) as ContentFormat[]).map((format) => {
          const meta = FORMAT_META[format]
          return (
            <button
              key={format}
              onClick={() => setFilterFormat(format)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all`}
              style={filterFormat === format
                ? { background: meta.bg, color: meta.color, borderColor: meta.color + '44' }
                : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }
              }
            >
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* Cards de libretos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((script) => {
          const meta = FORMAT_META[script.format]
          return (
            <div
              key={script.id}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => setSelected(script)}
            >
              <span
                className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.label}
              </span>

              <h3 className="text-sm font-semibold text-gray-900 mb-1">{script.title}</h3>
              <p className="text-xs text-gray-400 mb-3">{script.duration}</p>

              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-600 leading-relaxed line-clamp-3 mb-3">
                {script.script.split('\n\n')[0]}...
              </div>

              <p className="text-xs text-gray-500 leading-relaxed border-l-2 border-gray-200 pl-3">
                {script.tip}
              </p>

              <button
                className="mt-3 text-xs font-medium text-orange-600 hover:text-orange-700"
                onClick={(e) => { e.stopPropagation(); setSelected(script) }}
              >
                Ver libreto completo →
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal de libreto completo */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span
                  className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-1"
                  style={{ background: FORMAT_META[selected.format].bg, color: FORMAT_META[selected.format].color }}
                >
                  {FORMAT_META[selected.format].label}
                </span>
                <h2 className="text-base font-semibold text-gray-900">{selected.title}</h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                  Libreto ({selected.duration})
                </p>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {selected.script}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                  Por qué funciona
                </p>
                <p className="text-sm text-gray-600 leading-relaxed border-l-2 border-orange-300 pl-3">
                  {selected.tip}
                </p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(selected.script)
                  alert('Libreto copiado al portapapeles')
                }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
              >
                Copiar libreto
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
