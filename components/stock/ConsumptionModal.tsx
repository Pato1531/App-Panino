'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createConsumption } from '@/lib/stock-api'
import { fmt } from '@/lib/utils'
import type { IngredientWithStatus } from '@/lib/types'

interface Props {
  ingredients: IngredientWithStatus[]
  onClose: () => void
  onSuccess: () => void
  defaultIngredientId?: string
}

export function ConsumptionModal({ ingredients, onClose, onSuccess, defaultIngredientId }: Props) {
  const [form, setForm] = useState({ ingredient_id: defaultIngredientId || '', quantity: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected = ingredients.find(i => i.id === form.ingredient_id)
  const preview = selected && form.quantity
    ? Math.max(0, selected.stock_current - parseFloat(form.quantity))
    : null

  async function handleSubmit() {
    if (!form.ingredient_id || !form.quantity) { setError('Completá los campos requeridos'); return }
    const qty = parseFloat(form.quantity)
    if (selected && qty > selected.stock_current) { setError('La cantidad supera el stock disponible'); return }
    setLoading(true); setError('')
    try {
      await createConsumption({ ingredient_id: form.ingredient_id, quantity: qty, notes: form.notes || undefined })
      onSuccess(); onClose()
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <Modal title="🍽 Registrar Consumo" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ingrediente *</label>
          <select className="input-base" value={form.ingredient_id} onChange={e => setForm(f => ({ ...f, ingredient_id: e.target.value }))}>
            <option value="">Seleccionar...</option>
            {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} — {fmt(i.stock_current)} {i.unit}</option>)}
          </select>
        </div>

        {selected && (
          <div className="bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
            <span className="text-gray-500">Stock disponible: </span>
            <strong className="text-gray-900">{fmt(selected.stock_current)} {selected.unit}</strong>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad consumida {selected ? `(${selected.unit})` : ''} *</label>
          <input type="number" min="0" step="0.001" className="input-base" value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0.00" />
        </div>

        {preview !== null && selected && (
          <div className={`rounded-lg px-4 py-2 text-sm font-medium ${preview <= selected.stock_min ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            Stock resultante: <strong>{fmt(preview)} {selected.unit}</strong>
            {preview <= selected.stock_min && ' ⚠️ Quedará en mínimo'}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nota (opcional)</label>
          <input type="text" className="input-base" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ej: para el servicio del mediodía" />
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
          {loading ? 'Guardando...' : 'Registrar consumo'}
        </button>
      </div>
    </Modal>
  )
}
