'use client'
import { useState } from 'react'
import type { IngredientWithStatus } from '@/lib/types'
import { fmt, fmtCurrency } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'

const STATUS = {
  critical: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700', border: 'border-red-200', bar: 'bg-red-400', label: 'Crítico' },
  warning:  { dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200', bar: 'bg-amber-400', label: 'Stock bajo' },
  ok:       { dot: 'bg-green-500', badge: 'bg-green-100 text-green-700', border: 'border-green-200', bar: 'bg-green-400', label: 'OK' },
}

interface Props {
  ingredient: IngredientWithStatus
  onAdjust:  (id: string) => void
  onCheck:   (id: string) => void
  onConsume: (id: string) => void
  onEdit:    (id: string) => void
  onDelete:  (id: string) => void
}

function IngredientDetail({ ingredient: i, onClose, onAdjust, onCheck, onConsume, onEdit }: {
  ingredient: IngredientWithStatus
  onClose: () => void
  onAdjust:  (id: string) => void
  onCheck:   (id: string) => void
  onConsume: (id: string) => void
  onEdit:    (id: string) => void
}) {
  const s = STATUS[i.status]
  const stockCajon   = (i as any).stock_cajon   ?? 0
  const stockFreezer = (i as any).stock_freezer ?? 0
  const pct = i.stock_min > 0 ? Math.min(100, (i.stock_current / (i.stock_min * 2)) * 100) : 100

  return (
    <Modal title={i.name} onClose={onClose}>
      <div className="space-y-4">

        {/* Estado + stock total */}
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.badge}`}>{s.label}</span>
          <div className="text-right">
            <p className="text-2xl font-semibold text-gray-900">{fmt(i.stock_current)}</p>
            <p className="text-xs text-gray-400">{i.unit} totales</p>
          </div>
        </div>

        {/* Barra */}
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`h-2 rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
        </div>

        {/* Cajón y Freezer */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">📦</p>
            <p className="text-xs font-medium text-orange-700 mb-1">Cajón</p>
            <p className="text-xl font-semibold text-orange-900">{fmt(stockCajon)}</p>
            <p className="text-xs text-orange-500">{i.unit}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">🧊</p>
            <p className="text-xs font-medium text-blue-700 mb-1">Freezer</p>
            <p className="text-xl font-semibold text-blue-900">{fmt(stockFreezer)}</p>
            <p className="text-xs text-blue-500">{i.unit}</p>
          </div>
        </div>

        {/* Datos */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          {[
            { label: 'Stock mínimo',     value: `${fmt(i.stock_min)} ${i.unit}` },
            { label: 'Costo unitario',   value: fmtCurrency(i.cost_unit) },
            { label: 'Valor en stock',   value: fmtCurrency(i.stock_value) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-xs font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Alertas */}
        {i.status === 'critical' && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
            ⚠️ Stock por debajo del mínimo — necesita reposición
          </div>
        )}
        {i.status === 'warning' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
            ⚡ Stock bajo — considerá reponer pronto
          </div>
        )}

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { onConsume(i.id); onClose() }}
            className="py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            🍽 Consumo
          </button>
          <button onClick={() => { onAdjust(i.id); onClose() }}
            className="py-2 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
            ⚡ Ajustar
          </button>
          <button onClick={() => { onCheck(i.id); onClose() }}
            className="py-2 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            🔍 Control
          </button>
          <button onClick={() => { onEdit(i.id); onClose() }}
            className="py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            ✏️ Editar
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function IngredientCard({ ingredient: i, onAdjust, onCheck, onConsume, onEdit, onDelete }: Props) {
  const s = STATUS[i.status]
  const pct = i.stock_min > 0 ? Math.min(100, (i.stock_current / (i.stock_min * 2)) * 100) : 100
  const stockCajon   = (i as any).stock_cajon   ?? 0
  const stockFreezer = (i as any).stock_freezer ?? 0
  const [showDetail, setShowDetail] = useState(false)

  return (
    <>
      {showDetail && (
        <IngredientDetail
          ingredient={i}
          onClose={() => setShowDetail(false)}
          onAdjust={onAdjust}
          onCheck={onCheck}
          onConsume={onConsume}
          onEdit={onEdit}
        />
      )}

      <div
        className={`rounded-xl border ${s.border} bg-white hover:shadow-md transition-all cursor-pointer group relative`}
        onClick={() => setShowDetail(true)}
      >
        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-xl bg-gray-900/0 group-hover:bg-gray-900/5 transition-all pointer-events-none" />

        {/* Hint de click */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-gray-400 bg-white border border-gray-100 rounded-md px-1.5 py-0.5 shadow-sm">
            ver detalle
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                <h3 className="font-medium text-gray-900 text-sm truncate">{i.name}</h3>
              </div>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-semibold text-gray-900 leading-tight">{fmt(i.stock_current)}</p>
              <p className="text-xs text-gray-400">{i.unit}</p>
            </div>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
            <div className={`h-1.5 rounded-full ${s.bar}`} style={{ width: `${pct}%` }} />
          </div>

          {/* Cajón y Freezer en la card */}
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <div className="bg-orange-50 rounded-lg px-2 py-1 flex items-center justify-between">
              <span className="text-xs text-orange-500">📦 Cajón</span>
              <span className="text-xs font-semibold text-orange-700">{fmt(stockCajon)}</span>
            </div>
            <div className="bg-blue-50 rounded-lg px-2 py-1 flex items-center justify-between">
              <span className="text-xs text-blue-500">🧊 Freezer</span>
              <span className="text-xs font-semibold text-blue-700">{fmt(stockFreezer)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400">Mín: {fmt(i.stock_min)} {i.unit}</span>
            <span className="text-xs text-gray-500">{fmtCurrency(i.stock_value)}</span>
          </div>

          {/* Acciones — detienen el click de la card */}
          <div className="flex gap-1.5 mb-1.5" onClick={e => e.stopPropagation()}>
            <button onClick={() => onConsume(i.id)}
              className="flex-1 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              🍽 Consumo
            </button>
            <button onClick={() => onAdjust(i.id)}
              className="flex-1 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
              ⚡ Ajustar
            </button>
            <button onClick={() => onCheck(i.id)}
              className="flex-1 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              🔍 Control
            </button>
          </div>
          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(i.id)}
              className="flex-1 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              ✏️ Editar
            </button>
            <button onClick={() => onDelete(i.id)}
              className="py-1.5 px-3 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              ✕
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
