'use client'
import type { IngredientWithStatus } from '@/lib/types'
import { fmt, fmtCurrency } from '@/lib/utils'

const STATUS = {
  critical: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700', border: 'border-red-200', bar: 'bg-red-400', label: 'Crítico' },
  warning:  { dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200', bar: 'bg-amber-400', label: 'Stock bajo' },
  ok:       { dot: 'bg-green-500', badge: 'bg-green-100 text-green-700', border: 'border-green-200', bar: 'bg-green-400', label: 'OK' },
}

interface Props {
  ingredient: IngredientWithStatus
  onAdjust: (id: string) => void
  onCheck: (id: string) => void
  onConsume: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function IngredientCard({ ingredient: i, onAdjust, onCheck, onConsume, onEdit, onDelete }: Props) {
  const s = STATUS[i.status]
  const pct = i.stock_min > 0 ? Math.min(100, (i.stock_current / (i.stock_min * 2)) * 100) : 100

  return (
    <div className={`rounded-xl border ${s.border} bg-white p-4 hover:shadow-sm transition-shadow`}>
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

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">Mín: {fmt(i.stock_min)} {i.unit}</span>
        <span className="text-xs text-gray-500">{fmtCurrency(i.stock_value)}</span>
      </div>

      {/* Fila 1: acciones operativas */}
      <div className="flex gap-1.5 mb-1.5">
        <button onClick={() => onConsume(i.id)} className="flex-1 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">🍽 Consumo</button>
        <button onClick={() => onAdjust(i.id)}  className="flex-1 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">⚡ Ajustar</button>
        <button onClick={() => onCheck(i.id)}   className="flex-1 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">🔍 Control</button>
      </div>

      {/* Fila 2: editar / eliminar */}
      <div className="flex gap-1.5">
        <button onClick={() => onEdit(i.id)} className="flex-1 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">✏️ Editar</button>
        <button onClick={() => onDelete(i.id)} className="py-1.5 px-3 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">✕</button>
      </div>
    </div>
  )
}
