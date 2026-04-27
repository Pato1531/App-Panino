'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import type { IngredientWithStatus, Unit } from '@/lib/types'

const UNITS: Unit[] = ['kg', 'litro', 'unidad', 'gramo', 'ml']

interface Props {
  ingredient: IngredientWithStatus
  onClose: () => void
  onSuccess: () => void
}

export function EditIngredientModal({ ingredient, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    name:          ingredient.name,
    unit:          ingredient.unit,
    stock_cajon:   String((ingredient as any).stock_cajon   ?? 0),
    stock_freezer: String((ingredient as any).stock_freezer ?? 0),
    stock_min:     String(ingredient.stock_min),
    cost_unit:     String(ingredient.cost_unit),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const cajon   = parseFloat(form.stock_cajon)   || 0
  const freezer = parseFloat(form.stock_freezer) || 0
  const total   = cajon + freezer

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.name) { setError('El nombre es requerido'); return }
    setLoading(true); setError('')
    try {
      const { error: err } = await supabase
        .from('ingredients')
        .update({
          name:          form.name.trim(),
          unit:          form.unit as Unit,
          stock_cajon:   cajon,
          stock_freezer: freezer,
          stock_min:     parseFloat(form.stock_min)  || 0,
          cost_unit:     parseFloat(form.cost_unit)  || 0,
        })
        .eq('id', ingredient.id)
      if (err) throw err
      onSuccess()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="✏️ Editar Ingrediente" onClose={onClose}>
      <div className="space-y-4">

        {/* Nombre + Unidad */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input type="text" className="input-base" value={form.name}
              onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidad *</label>
            <select className="input-base" value={form.unit} onChange={e => set('unit', e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Stock por ubicación */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Ubicación del stock</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <label className="block text-xs font-medium text-orange-700 mb-1.5">📦 Stock Cajón</label>
              <input type="number" min="0" step="0.001"
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                value={form.stock_cajon}
                onChange={e => set('stock_cajon', e.target.value)}
                placeholder="0" />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <label className="block text-xs font-medium text-blue-700 mb-1.5">🧊 Stock Freezer</label>
              <input type="number" min="0" step="0.001"
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                value={form.stock_freezer}
                onChange={e => set('stock_freezer', e.target.value)}
                placeholder="0" />
            </div>
          </div>
        </div>

        {/* Total automático */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Stock total (cajón + freezer)</p>
            <p className="text-xs text-gray-400 mt-0.5">{cajon} + {freezer} = <strong className="text-gray-700">{total}</strong></p>
          </div>
          <span className="text-xl font-semibold text-gray-900">
            {total % 1 === 0 ? total : total.toFixed(3)} <span className="text-sm font-normal text-gray-400">{form.unit}</span>
          </span>
        </div>

        {/* Stock mínimo + costo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stock mínimo</label>
            <input type="number" min="0" step="0.01" className="input-base"
              value={form.stock_min} onChange={e => set('stock_min', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Costo/unidad ($)</label>
            <input type="number" min="0" step="0.01" className="input-base"
              value={form.cost_unit} onChange={e => set('cost_unit', e.target.value)} />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </Modal>
  )
}
