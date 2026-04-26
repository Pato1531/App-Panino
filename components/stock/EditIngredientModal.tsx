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
    name: ingredient.name,
    unit: ingredient.unit,
    stock_current: String(ingredient.stock_current),
    stock_min: String(ingredient.stock_min),
    cost_unit: String(ingredient.cost_unit),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!form.name) { setError('El nombre es requerido'); return }
    setLoading(true); setError('')
    try {
      const { error: err } = await supabase
        .from('ingredients')
        .update({
          name: form.name.trim(),
          unit: form.unit as Unit,
          stock_current: parseFloat(form.stock_current) || 0,
          stock_min: parseFloat(form.stock_min) || 0,
          cost_unit: parseFloat(form.cost_unit) || 0,
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

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal title="✏️ Editar Ingrediente" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input type="text" className="input-base" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidad *</label>
            <select className="input-base" value={form.unit} onChange={e => set('unit', e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {([
            { k: 'stock_current', l: 'Stock actual' },
            { k: 'stock_min',     l: 'Stock mínimo' },
            { k: 'cost_unit',     l: 'Costo/unidad ($)' },
          ] as { k: keyof typeof form; l: string }[]).map(({ k, l }) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
              <input type="number" min="0" step="0.01" className="input-base"
                value={form[k]} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
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
