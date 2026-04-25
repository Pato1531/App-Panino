'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createIngredient } from '@/lib/stock-api'
import type { Unit } from '@/lib/types'

const UNITS: Unit[] = ['kg', 'litro', 'unidad', 'gramo', 'ml']

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export function AddIngredientModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    name: '',
    unit: 'kg' as Unit,
    stock_current: '',
    stock_min: '',
    cost_unit: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!form.name || !form.unit) {
      setError('Nombre y unidad son requeridos')
      return
    }
    setLoading(true)
    setError('')
    try {
      await createIngredient({
        name: form.name.trim(),
        unit: form.unit,
        stock_current: parseFloat(form.stock_current) || 0,
        stock_min: parseFloat(form.stock_min) || 0,
        cost_unit: parseFloat(form.cost_unit) || 0,
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
    <Modal title="+ Nuevo Ingrediente" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input
              type="text"
              className="input-base"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Harina 000"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidad *</label>
            <select
              className="input-base"
              value={form.unit}
              onChange={(e) => set('unit', e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {([
            { key: 'stock_current', label: 'Stock inicial', placeholder: '0.00' },
            { key: 'stock_min', label: 'Stock mínimo', placeholder: '0.00' },
            { key: 'cost_unit', label: 'Costo/unidad ($)', placeholder: '0.00' },
          ] as { key: keyof typeof form; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type="number" min="0" step="0.01"
                className="input-base"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? 'Creando...' : 'Crear ingrediente'}
        </button>
      </div>
    </Modal>
  )
}
