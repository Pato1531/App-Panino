'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createStockCheck, applyStockCheck } from '@/lib/stock-api'
import { fmt } from '@/lib/utils'
import type { IngredientWithStatus, StockCheck } from '@/lib/types'

interface Props {
  ingredients: IngredientWithStatus[]
  onClose: () => void
  onSuccess: () => void
  defaultIngredientId?: string
}

export function CheckModal({ ingredients, onClose, onSuccess, defaultIngredientId }: Props) {
  const [form, setForm] = useState({
    ingredient_id: defaultIngredientId || '',
    real_quantity: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [savedCheck, setSavedCheck] = useState<StockCheck | null>(null)

  const selected = ingredients.find((i) => i.id === form.ingredient_id)
  const diff =
    selected && form.real_quantity
      ? parseFloat(form.real_quantity) - selected.stock_current
      : null

  async function handleSubmit() {
    if (!form.ingredient_id || !form.real_quantity) {
      setError('Completá los campos requeridos')
      return
    }
    setLoading(true)
    setError('')
    try {
      const check = await createStockCheck(
        form.ingredient_id,
        parseFloat(form.real_quantity),
        form.notes || undefined
      )
      setSavedCheck(check)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleApply() {
    if (!savedCheck) return
    setApplying(true)
    try {
      await applyStockCheck(savedCheck.id)
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setApplying(false)
    }
  }

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }))

  if (savedCheck) {
    return (
      <Modal title="🔍 Control de Stock" onClose={onClose}>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-3">Conteo registrado correctamente.</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['Sistema', fmt(savedCheck.system_quantity)],
                ['Real', fmt(savedCheck.real_quantity)],
                ['Diferencia', (savedCheck.difference >= 0 ? '+' : '') + fmt(savedCheck.difference)],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="bg-white rounded-lg p-3 text-center border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className="font-semibold text-sm text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {Math.abs(savedCheck.difference) > 0.001 && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {applying ? 'Aplicando...' : '✓ Ajustar stock automáticamente'}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            Cerrar sin ajustar
          </button>

          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="🔍 Control de Stock" onClose={onClose}>
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
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
            <span className="text-gray-500">Stock en sistema: </span>
            <strong className="text-gray-900">{fmt(selected.stock_current)} {selected.unit}</strong>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Cantidad real contada {selected ? `(${selected.unit})` : ''} *
          </label>
          <input
            type="number" min="0" step="0.001"
            className="input-base"
            value={form.real_quantity}
            onChange={(e) => set('real_quantity', e.target.value)}
            placeholder="0.00"
          />
        </div>

        {diff !== null && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              Math.abs(diff) < 0.01
                ? 'bg-green-50 text-green-700'
                : diff > 0
                ? 'bg-blue-50 text-blue-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            Diferencia: {diff > 0 ? '+' : ''}{fmt(diff)} {selected?.unit}
            {Math.abs(diff) < 0.01 && ' — ¡Stock exacto!'}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nota (opcional)</label>
          <input
            type="text"
            className="input-base"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Observaciones..."
          />
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Guardando...' : 'Registrar conteo'}
        </button>
      </div>
    </Modal>
  )
}
