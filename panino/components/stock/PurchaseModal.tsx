'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createPurchase } from '@/lib/stock-api'
import { fmt, fmtCurrency } from '@/lib/utils'
import type { IngredientWithStatus } from '@/lib/types'

interface Props {
  ingredients: IngredientWithStatus[]
  onClose: () => void
  onSuccess: () => void
}

export function PurchaseModal({ ingredients, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    ingredient_id: '',
    quantity: '',
    unit_price: '',
    supplier: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected = ingredients.find((i) => i.id === form.ingredient_id)
  const total =
    form.quantity && form.unit_price
      ? parseFloat(form.quantity) * parseFloat(form.unit_price)
      : null

  async function handleSubmit() {
    if (!form.ingredient_id || !form.quantity) {
      setError('Completá ingrediente y cantidad')
      return
    }
    setLoading(true)
    setError('')
    try {
      await createPurchase({
        ingredient_id: form.ingredient_id,
        quantity: parseFloat(form.quantity),
        unit_price: parseFloat(form.unit_price) || 0,
        total_cost: total || 0,
        supplier: form.supplier || undefined,
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
    <Modal title="➕ Registrar Compra" onClose={onClose}>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio unitario ($)</label>
            <input
              type="number" min="0" step="0.01"
              className="input-base"
              value={form.unit_price}
              onChange={(e) => set('unit_price', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        {total !== null && total > 0 && (
          <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700">
            Total: <strong>{fmtCurrency(total)}</strong>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
          <input
            type="text"
            className="input-base"
            value={form.supplier}
            onChange={(e) => set('supplier', e.target.value)}
            placeholder="Opcional"
          />
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Guardando...' : 'Confirmar compra'}
        </button>
      </div>
    </Modal>
  )
}
