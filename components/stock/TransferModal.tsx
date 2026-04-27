'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createTransfer } from '@/lib/stock-api'
import { fmt } from '@/lib/utils'
import type { IngredientWithStatus } from '@/lib/types'

interface Props {
  ingredients: IngredientWithStatus[]
  onClose: () => void
  onSuccess: () => void
  defaultIngredientId?: string
}

export function TransferModal({ ingredients, onClose, onSuccess, defaultIngredientId }: Props) {
  const [form, setForm] = useState({
    ingredient_id: defaultIngredientId || '',
    quantity: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState<{ name: string; quantity: number; unit: string } | null>(null)

  const selected = ingredients.find(i => i.id === form.ingredient_id)
  const stockFreezer = (selected as any)?.stock_freezer ?? 0
  const stockCajon   = (selected as any)?.stock_cajon   ?? 0
  const qty = parseFloat(form.quantity) || 0

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.ingredient_id || !form.quantity) { setError('Completá los campos requeridos'); return }
    if (qty <= 0) { setError('La cantidad debe ser mayor a cero'); return }
    if (qty > stockFreezer) { setError(`No hay suficiente en el freezer (disponible: ${fmt(stockFreezer)} ${selected?.unit})`); return }
    setLoading(true); setError('')
    try {
      await createTransfer(form.ingredient_id, qty, form.notes || undefined)
      setConfirmed({ name: selected!.name, quantity: qty, unit: selected!.unit })
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Pantalla de confirmación
  if (confirmed) return (
    <Modal title="✅ Pase registrado" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <div className="flex items-center justify-center gap-3 text-3xl mb-3">
            <span>🧊</span>
            <span className="text-gray-400 text-xl">→</span>
            <span>📦</span>
          </div>
          <p className="text-sm font-semibold text-green-900 mb-1">
            {fmt(confirmed.quantity)} {confirmed.unit} de <strong>{confirmed.name}</strong>
          </p>
          <p className="text-sm text-green-700">
            pasaron del <strong>Freezer</strong> al <strong>Cajón</strong>
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          💡 El stock del cajón está listo para consumo
        </div>

        <button onClick={onClose}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
          Entendido
        </button>
      </div>
    </Modal>
  )

  return (
    <Modal title="🔄 Pasar Freezer → Cajón" onClose={onClose}>
      <div className="space-y-4">

        {/* Explicación */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-600 leading-relaxed">
          Registrá el pase de mercadería del freezer al cajón. El stock total no cambia, solo cambia la ubicación.
        </div>

        {/* Ingrediente */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ingrediente *</label>
          <select className="input-base" value={form.ingredient_id} onChange={e => set('ingredient_id', e.target.value)}>
            <option value="">Seleccionar...</option>
            {ingredients.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>

        {/* Stock actual por ubicación */}
        {selected && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">🧊 Freezer (origen)</p>
              <p className="text-lg font-semibold text-blue-900">{fmt(stockFreezer)}</p>
              <p className="text-xs text-blue-400">{selected.unit} disponibles</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
              <p className="text-xs text-orange-600 font-medium mb-1">📦 Cajón (destino)</p>
              <p className="text-lg font-semibold text-orange-900">{fmt(stockCajon)}</p>
              <p className="text-xs text-orange-400">{selected.unit} actuales</p>
            </div>
          </div>
        )}

        {/* Cantidad */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Cantidad a pasar {selected ? `(${selected.unit})` : ''} *
          </label>
          <input type="number" min="0" step="0.001" className="input-base"
            value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0.00" />
        </div>

        {/* Preview */}
        {qty > 0 && selected && qty <= stockFreezer && (
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-medium text-gray-500 mb-2">Resultado después del pase</p>
            <div className="flex justify-between text-xs">
              <span className="text-blue-600">🧊 Freezer quedará:</span>
              <strong className="text-blue-800">{fmt(stockFreezer - qty)} {selected.unit}</strong>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-orange-600">📦 Cajón quedará:</span>
              <strong className="text-orange-800">{fmt(stockCajon + qty)} {selected.unit}</strong>
            </div>
          </div>
        )}

        {qty > stockFreezer && qty > 0 && selected && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs text-red-700">
            ⚠️ Cantidad mayor al stock en freezer ({fmt(stockFreezer)} {selected.unit})
          </div>
        )}

        {/* Nota */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nota (opcional)</label>
          <input type="text" className="input-base" value={form.notes}
            onChange={e => set('notes', e.target.value)} placeholder="Ej: preparación del mediodía" />
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button onClick={handleSubmit} disabled={loading || qty > stockFreezer}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
          {loading ? 'Guardando...' : '🔄 Confirmar pase'}
        </button>
      </div>
    </Modal>
  )
}
