'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import type { IngredientWithStatus } from '@/lib/types'

interface Props {
  ingredients: IngredientWithStatus[]
  onClose: () => void
  onSuccess: () => void
  defaultIngredientId?: string
}

type Ubicacion = 'cajon' | 'freezer' | 'ambos'
type Turno = 'mediodia' | 'noche'

export function ConsumptionModal({ ingredients, onClose, onSuccess, defaultIngredientId }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    ingredient_id: defaultIngredientId || '',
    quantity:      '',
    ubicacion:     'cajon' as Ubicacion,
    turno:         'mediodia' as Turno,
    fecha:         today,
    notes:         '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const selected  = ingredients.find(i => i.id === form.ingredient_id)
  const stockCajon   = (selected as any)?.stock_cajon   ?? 0
  const stockFreezer = (selected as any)?.stock_freezer ?? 0

  const preview = selected && form.quantity
    ? Math.max(0, selected.stock_current - parseFloat(form.quantity))
    : null

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.ingredient_id || !form.quantity) {
      setError('Completá los campos requeridos'); return
    }
    const qty = parseFloat(form.quantity)
    if (selected && qty > selected.stock_current) {
      setError('La cantidad supera el stock total disponible'); return
    }
    setLoading(true); setError('')
    try {
      const fechaHora = new Date(`${form.fecha}T${new Date().toTimeString().slice(0, 8)}`)
      const { error: err } = await supabase
        .from('consumptions')
        .insert({
          ingredient_id: form.ingredient_id,
          quantity:      qty,
          ubicacion:     form.ubicacion,
          turno:         form.turno,
          notes:         form.notes || null,
          created_at:    fechaHora.toISOString(),
        })
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
    <Modal title="🍽 Registrar Consumo" onClose={onClose}>
      <div className="space-y-4">

        {/* Ingrediente */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ingrediente *</label>
          <select className="input-base" value={form.ingredient_id}
            onChange={e => set('ingredient_id', e.target.value)}>
            <option value="">Seleccionar...</option>
            {ingredients.map(i => (
              <option key={i.id} value={i.id}>{i.name} — {fmt(i.stock_current)} {i.unit}</option>
            ))}
          </select>
        </div>

        {/* Stock disponible por ubicación */}
        {selected && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-orange-600 font-medium mb-0.5">📦 Cajón</p>
              <p className="text-sm font-semibold text-orange-800">{fmt(stockCajon)} <span className="text-xs font-normal">{selected.unit}</span></p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-blue-600 font-medium mb-0.5">🧊 Freezer</p>
              <p className="text-sm font-semibold text-blue-800">{fmt(stockFreezer)} <span className="text-xs font-normal">{selected.unit}</span></p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-gray-500 font-medium mb-0.5">📊 Total</p>
              <p className="text-sm font-semibold text-gray-800">{fmt(selected.stock_current)} <span className="text-xs font-normal">{selected.unit}</span></p>
            </div>
          </div>
        )}

        {/* Cantidad + Fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cantidad {selected ? `(${selected.unit})` : ''} *
            </label>
            <input type="number" min="0" step="0.001" className="input-base"
              value={form.quantity}
              onChange={e => set('quantity', e.target.value)}
              placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
            <input type="date" className="input-base"
              value={form.fecha}
              onChange={e => set('fecha', e.target.value)}
              max={today} />
          </div>
        </div>

        {/* Ubicación */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Origen del consumo *</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { k: 'cajon',   label: '📦 Cajón',  active: 'bg-orange-50 border-orange-300 text-orange-700' },
              { k: 'freezer', label: '🧊 Freezer', active: 'bg-blue-50 border-blue-300 text-blue-700' },
              { k: 'ambos',   label: '↔️ Ambos',   active: 'bg-purple-50 border-purple-300 text-purple-700' },
            ] as { k: Ubicacion; label: string; active: string }[]).map(({ k, label, active }) => (
              <button key={k} type="button"
                onClick={() => setForm(f => ({ ...f, ubicacion: k }))}
                className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                  form.ubicacion === k ? active : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Turno */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Turno *</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { k: 'mediodia', label: '☀️ Mediodía', active: 'bg-amber-50 border-amber-300 text-amber-700' },
              { k: 'noche',    label: '🌙 Noche',    active: 'bg-indigo-50 border-indigo-300 text-indigo-700' },
            ] as { k: Turno; label: string; active: string }[]).map(({ k, label, active }) => (
              <button key={k} type="button"
                onClick={() => setForm(f => ({ ...f, turno: k }))}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  form.turno === k ? active : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview stock resultante */}
        {preview !== null && selected && (
          <div className={`rounded-lg px-4 py-2 text-sm font-medium ${
            preview <= selected.stock_min ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
          }`}>
            Stock total resultante: <strong>{fmt(preview)} {selected.unit}</strong>
            {preview <= selected.stock_min && ' ⚠️ Quedará en mínimo'}
          </div>
        )}

        {/* Nota */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nota (opcional)</label>
          <input type="text" className="input-base" value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Ej: para el servicio del mediodía" />
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
