'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createAdjustment } from '@/lib/stock-api'
import { fmt } from '@/lib/utils'
import type { IngredientWithStatus, AdjustmentReason } from '@/lib/types'

const REASONS: AdjustmentReason[] = ['merma', 'error', 'uso_interno', 'ajuste', 'vencimiento', 'otro']

interface Props {
  ingredients: IngredientWithStatus[]
  onClose: () => void
  onSuccess: () => void
  defaultIngredientId?: string
}

export function AdjustModal({ ingredients, onClose, onSuccess, defaultIngredientId }: Props) {
  const [form, setForm] = useState({
    ingredient_id: defaultIngredientId || '',
    type: 'subtract' as 'add' | 'subtract',
    quantity: '',
    reason: 'ajuste' as AdjustmentReason,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected = ingredients.find((i) => i.id === form.ingredient_id)
  const preview =
    selected && form.quantity
      ? Math.max(0, selected.stock_current + (form.type === 'add' ? 1 : -1) * parseFloat(form.quantity))
      : null

  async function handleSubmit() {
    if (!form.ingredient_id || !form.quantity) {
      setError('Completá los campos requeridos')
      return
    }
    setLoading(true)
    setError('')
    try {
      await createAdjustment({
        ingredient_id: form.ingredient_id,
        type: form.type,
        quantity: parseFloat(form.quantity),
        reason: form.reason,
        notes: form.notes || undefined,
      })
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }))

  return (
    <Modal title="⚡ Ajuste Rápido" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ingrediente *</label>
          <select
            className="input-base"
            value={form.ingredient_id}
            onChange={(e) => set('ingredient_id', e.target.value)}
          >
            <option value="">Seleccionar...</option>
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} — {fmt(i.stock_current)} {i.unit}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Tipo de ajuste *</label>
          <div className="grid grid-cols-2 gap-2">
            {(['subtract', 'add'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.type === t
                    ? t === 'subtract'
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-green-50 border-green-300 text-green-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {t === 'subtract' ? '↓ Restar stock' : '↑ Sumar stock'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cantidad {selected ? `(${selected.unit})` : ''} *
            </label>
            <input
              type="number" min="0" step="0.001"
              className="input-base"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo *</label>
            <select
              className="input-base"
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>{r.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {preview !== null && selected && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              form.type === 'subtract' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}
          >
            Stock resultante: <strong>{fmt(preview)} {selected.unit}</strong>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nota (opcional)</label>
          <input
            type="text"
            className="input-base"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Aclaración adicional..."
          />
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Guardando...' : 'Confirmar ajuste'}
        </button>
      </div>
    </Modal>
  )
}
