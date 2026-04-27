'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import type { IngredientWithStatus } from '@/lib/types'

type Turno = 'mediodia' | 'noche'

interface Props {
  ingredients: IngredientWithStatus[]
  onClose: () => void
  onSuccess: () => void
  defaultIngredientId?: string
}

export function ConsumptionModal({ ingredients, onClose, onSuccess, defaultIngredientId }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    ingredient_id: defaultIngredientId || '',
    quantity: '',
    turno: 'mediodia' as Turno,
    fecha: today,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState<{
    name: string; quantity: number; unit: string; turno: Turno; cajonRestante: number
  } | null>(null)

  const selected    = ingredients.find(i => i.id === form.ingredient_id)
  const stockCajon  = (selected as any)?.stock_cajon   ?? 0
  const stockFreezer = (selected as any)?.stock_freezer ?? 0
  const qty         = parseFloat(form.quantity) || 0
  const preview     = Math.max(0, stockCajon - qty)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.ingredient_id || !form.quantity) { setError('Completá los campos requeridos'); return }
    if (qty <= 0) { setError('La cantidad debe ser mayor a cero'); return }
    if (qty > stockCajon) {
      setError(`No hay suficiente en el cajón (disponible: ${fmt(stockCajon)} ${selected?.unit}). Pasá mercadería del freezer primero.`)
      return
    }
    setLoading(true); setError('')
    try {
      const fechaHora = new Date(`${form.fecha}T${new Date().toTimeString().slice(0, 8)}`)
      const { error: err } = await supabase
        .from('consumptions')
        .insert({
          ingredient_id: form.ingredient_id,
          quantity: qty,
          turno: form.turno,
          notes: form.notes || null,
          created_at: fechaHora.toISOString(),
        })
      if (err) throw err
      setConfirmed({
        name: selected!.name,
        quantity: qty,
        unit: selected!.unit,
        turno: form.turno,
        cajonRestante: preview,
      })
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Confirmación
  if (confirmed) return (
    <Modal title="✅ Consumo registrado" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <div className="text-3xl mb-2">📦</div>
          <p className="text-sm font-semibold text-green-900 mb-1">
            {fmt(confirmed.quantity)} {confirmed.unit} de <strong>{confirmed.name}</strong>
          </p>
          <p className="text-sm text-green-700 mb-2">
            consumidos del <strong>Cajón</strong> · turno {confirmed.turno === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche'}
          </p>
          <div className="bg-white border border-green-200 rounded-lg px-4 py-2 text-sm">
            <span className="text-gray-500">Cajón restante: </span>
            <strong className={confirmed.cajonRestante <= 0 ? 'text-red-600' : 'text-gray-900'}>
              {fmt(confirmed.cajonRestante)} {confirmed.unit}
            </strong>
          </div>
        </div>

        {confirmed.cajonRestante <= 0 && stockFreezer > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            ⚠️ El cajón quedó vacío. Hay <strong>{fmt(stockFreezer)} {confirmed.unit}</strong> en el freezer — recordá hacer el pase.
          </div>
        )}

        {confirmed.cajonRestante <= 0 && stockFreezer <= 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
            🚨 Sin stock en cajón ni freezer. Necesitás reponer <strong>{confirmed.name}</strong>.
          </div>
        )}

        <button onClick={onClose}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
          Entendido
        </button>
      </div>
    </Modal>
  )

  return (
    <Modal title="🍽 Registrar Consumo" onClose={onClose}>
      <div className="space-y-4">

        {/* Info de flujo */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 text-xs text-orange-700 leading-relaxed">
          📦 El consumo descuenta del <strong>Cajón</strong>. Si el cajón está vacío, primero hacé un pase desde el Freezer.
        </div>

        {/* Ingrediente */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ingrediente *</label>
          <select className="input-base" value={form.ingredient_id} onChange={e => set('ingredient_id', e.target.value)}>
            <option value="">Seleccionar...</option>
            {ingredients.map(i => (
              <option key={i.id} value={i.id}>{i.name} — cajón: {fmt((i as any).stock_cajon ?? 0)} {i.unit}</option>
            ))}
          </select>
        </div>

        {/* Stock por ubicación */}
        {selected && (
          <div className="grid grid-cols-2 gap-2">
            <div className={`border rounded-xl p-3 text-center ${stockCajon > 0 ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-medium mb-1 ${stockCajon > 0 ? 'text-orange-700' : 'text-red-600'}`}>📦 Cajón</p>
              <p className={`text-lg font-semibold ${stockCajon > 0 ? 'text-orange-900' : 'text-red-700'}`}>{fmt(stockCajon)}</p>
              <p className={`text-xs ${stockCajon > 0 ? 'text-orange-400' : 'text-red-400'}`}>{selected.unit}</p>
              {stockCajon <= 0 && <p className="text-xs text-red-600 font-medium mt-1">Sin stock</p>}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">🧊 Freezer</p>
              <p className="text-lg font-semibold text-blue-900">{fmt(stockFreezer)}</p>
              <p className="text-xs text-blue-400">{selected.unit}</p>
            </div>
          </div>
        )}

        {/* Alerta cajón vacío */}
        {selected && stockCajon <= 0 && stockFreezer > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
            ⚠️ Cajón vacío — hay {fmt(stockFreezer)} {selected.unit} en el freezer. Hacé un <strong>Pase</strong> antes de consumir.
          </div>
        )}

        {/* Cantidad + Fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cantidad {selected ? `(${selected.unit})` : ''} *
            </label>
            <input type="number" min="0" step="0.001" className="input-base"
              value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
            <input type="date" className="input-base" value={form.fecha}
              onChange={e => set('fecha', e.target.value)} max={today} />
          </div>
        </div>

        {/* Preview cajón */}
        {qty > 0 && selected && qty <= stockCajon && (
          <div className="bg-gray-50 rounded-lg px-4 py-2.5 flex justify-between items-center text-sm">
            <span className="text-gray-500">Cajón quedará:</span>
            <strong className={preview <= 0 ? 'text-red-600' : 'text-gray-900'}>
              {fmt(preview)} {selected.unit}
            </strong>
          </div>
        )}

        {/* Turno */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Turno *</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { k: 'mediodia', label: '☀️ Mediodía', active: 'bg-amber-50 border-amber-300 text-amber-700' },
              { k: 'noche',    label: '🌙 Noche',    active: 'bg-indigo-50 border-indigo-300 text-indigo-700' },
            ] as { k: Turno; label: string; active: string }[]).map(({ k, label, active }) => (
              <button key={k} type="button" onClick={() => setForm(f => ({ ...f, turno: k }))}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${form.turno === k ? active : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Nota */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nota (opcional)</label>
          <input type="text" className="input-base" value={form.notes}
            onChange={e => set('notes', e.target.value)} placeholder="Ej: para el servicio del mediodía" />
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button onClick={handleSubmit} disabled={loading || (!!selected && stockCajon <= 0)}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
          {loading ? 'Guardando...' : 'Registrar consumo'}
        </button>
      </div>
    </Modal>
  )
}
