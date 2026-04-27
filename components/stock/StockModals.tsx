'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createPurchase, createAdjustment, createStockCheck, applyStockCheck, createIngredient } from '@/lib/stock-api'
import { fmt, fmtCurrency } from '@/lib/utils'
import type { IngredientWithStatus, AdjustmentReason, StockCheck, Unit } from '@/lib/types'

// ─── COMPRA ──────────────────────────────────────────────────
export function PurchaseModal({ ingredients, onClose, onSuccess }: {
  ingredients: IngredientWithStatus[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({ ingredient_id: '', quantity: '', unit_price: '', supplier: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState<{ name: string; quantity: number; unit: string } | null>(null)

  const selected = ingredients.find(i => i.id === form.ingredient_id)
  const total = form.quantity && form.unit_price
    ? parseFloat(form.quantity) * parseFloat(form.unit_price)
    : null
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.ingredient_id || !form.quantity) { setError('Completá ingrediente y cantidad'); return }
    setLoading(true); setError('')
    try {
      await createPurchase({
        ingredient_id: form.ingredient_id,
        quantity: parseFloat(form.quantity),
        unit_price: parseFloat(form.unit_price) || 0,
        total_cost: total || 0,
        supplier: form.supplier || undefined,
      })
      // Mostrar confirmación con destino
      setConfirmed({
        name: selected!.name,
        quantity: parseFloat(form.quantity),
        unit: selected!.unit,
      })
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Pantalla de confirmación
  if (confirmed) return (
    <Modal title="✅ Compra registrada" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
          <div className="text-4xl mb-3">🧊</div>
          <p className="text-sm font-semibold text-blue-900 mb-1">
            {fmt(confirmed.quantity)} {confirmed.unit} de <strong>{confirmed.name}</strong>
          </p>
          <p className="text-sm text-blue-700">
            fueron agregados al <strong>Freezer</strong>
          </p>
          <p className="text-xs text-blue-500 mt-2">
            Recordá mover al cajón cuando lo necesites
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          💡 <strong>Tip:</strong> Usá "Ajuste" para pasar mercadería del freezer al cajón
        </div>

        <button onClick={onClose}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
          Entendido
        </button>
      </div>
    </Modal>
  )

  return (
    <Modal title="➕ Registrar Compra" onClose={onClose}>
      <div className="space-y-4">
        {/* Aviso destino */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="text-lg">🧊</span>
          <p className="text-xs text-blue-700">Las compras se registran automáticamente en el <strong>Freezer</strong></p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ingrediente *</label>
          <select className="input-base" value={form.ingredient_id} onChange={e => set('ingredient_id', e.target.value)}>
            <option value="">Seleccionar...</option>
            {ingredients.map(i => (
              <option key={i.id} value={i.id}>{i.name} — {fmt(i.stock_current)} {i.unit}</option>
            ))}
          </select>
        </div>

        {/* Stock actual por ubicación */}
        {selected && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-orange-600 mb-0.5">📦 Cajón</p>
              <p className="text-sm font-semibold text-orange-800">{fmt((selected as any).stock_cajon ?? 0)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-blue-600 mb-0.5">🧊 Freezer</p>
              <p className="text-sm font-semibold text-blue-800">{fmt((selected as any).stock_freezer ?? 0)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-gray-500 mb-0.5">Total</p>
              <p className="text-sm font-semibold text-gray-800">{fmt(selected.stock_current)} {selected.unit}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cantidad {selected ? `(${selected.unit})` : ''} *
            </label>
            <input type="number" min="0" step="0.001" className="input-base"
              value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio unitario ($)</label>
            <input type="number" min="0" step="0.01" className="input-base"
              value={form.unit_price} onChange={e => set('unit_price', e.target.value)} placeholder="0.00" />
          </div>
        </div>

        {total !== null && total > 0 && (
          <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700">
            Total: <strong>{fmtCurrency(total)}</strong>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
          <input type="text" className="input-base" value={form.supplier}
            onChange={e => set('supplier', e.target.value)} placeholder="Opcional" />
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
          {loading ? 'Guardando...' : '🧊 Confirmar compra → Freezer'}
        </button>
      </div>
    </Modal>
  )
}

// ─── AJUSTE ──────────────────────────────────────────────────
const REASONS: AdjustmentReason[] = ['merma', 'error', 'uso_interno', 'ajuste', 'vencimiento', 'otro']

export function AdjustModal({ ingredients, onClose, onSuccess, defaultIngredientId }: {
  ingredients: IngredientWithStatus[]
  onClose: () => void
  onSuccess: () => void
  defaultIngredientId?: string
}) {
  const [form, setForm] = useState({
    ingredient_id: defaultIngredientId || '',
    type: 'subtract' as 'add' | 'subtract',
    quantity: '',
    reason: 'ajuste' as AdjustmentReason,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const selected = ingredients.find(i => i.id === form.ingredient_id)
  const preview = selected && form.quantity
    ? Math.max(0, selected.stock_current + (form.type === 'add' ? 1 : -1) * parseFloat(form.quantity))
    : null
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.ingredient_id || !form.quantity) { setError('Completá los campos requeridos'); return }
    setLoading(true); setError('')
    try {
      await createAdjustment({
        ingredient_id: form.ingredient_id,
        type: form.type,
        quantity: parseFloat(form.quantity),
        reason: form.reason,
        notes: form.notes || undefined,
      })
      onSuccess(); onClose()
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <Modal title="⚡ Ajuste Rápido" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ingrediente *</label>
          <select className="input-base" value={form.ingredient_id} onChange={e => set('ingredient_id', e.target.value)}>
            <option value="">Seleccionar...</option>
            {ingredients.map(i => (
              <option key={i.id} value={i.id}>{i.name} — {fmt(i.stock_current)} {i.unit}</option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-orange-600 mb-0.5">📦 Cajón</p>
              <p className="text-sm font-semibold text-orange-800">{fmt((selected as any).stock_cajon ?? 0)} {selected.unit}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-center">
              <p className="text-xs text-blue-600 mb-0.5">🧊 Freezer</p>
              <p className="text-sm font-semibold text-blue-800">{fmt((selected as any).stock_freezer ?? 0)} {selected.unit}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Tipo *</label>
          <div className="grid grid-cols-2 gap-2">
            {(['subtract', 'add'] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.type === t
                    ? t === 'subtract' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-300 text-green-700'
                    : 'border-gray-200 text-gray-500'
                }`}>
                {t === 'subtract' ? '↓ Restar' : '↑ Sumar'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Cantidad {selected ? `(${selected.unit})` : ''} *
            </label>
            <input type="number" min="0" step="0.001" className="input-base"
              value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo *</label>
            <select className="input-base" value={form.reason} onChange={e => set('reason', e.target.value)}>
              {REASONS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        {preview !== null && selected && (
          <div className={`rounded-lg px-4 py-2 text-sm font-medium ${
            form.type === 'subtract' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            Stock resultante: <strong>{fmt(preview)} {selected.unit}</strong>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nota</label>
          <input type="text" className="input-base" value={form.notes}
            onChange={e => set('notes', e.target.value)} placeholder="Opcional" />
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
          {loading ? 'Guardando...' : 'Confirmar ajuste'}
        </button>
      </div>
    </Modal>
  )
}

// ─── CONTROL ─────────────────────────────────────────────────
export function CheckModal({ ingredients, onClose, onSuccess, defaultIngredientId }: {
  ingredients: IngredientWithStatus[]
  onClose: () => void
  onSuccess: () => void
  defaultIngredientId?: string
}) {
  const [form, setForm] = useState({ ingredient_id: defaultIngredientId || '', real_quantity: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<StockCheck | null>(null)
  const selected = ingredients.find(i => i.id === form.ingredient_id)
  const diff = selected && form.real_quantity ? parseFloat(form.real_quantity) - selected.stock_current : null
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.ingredient_id || !form.real_quantity) { setError('Completá los campos'); return }
    setLoading(true); setError('')
    try { setSaved(await createStockCheck(form.ingredient_id, parseFloat(form.real_quantity), form.notes || undefined)) }
    catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  async function handleApply() {
    if (!saved) return
    setApplying(true)
    try { await applyStockCheck(saved.id); onSuccess(); onClose() }
    catch (e: any) { setError(e.message) } finally { setApplying(false) }
  }

  if (saved) return (
    <Modal title="🔍 Control de Stock" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-3">Conteo registrado.</p>
          <div className="grid grid-cols-3 gap-2">
            {([['Sistema', fmt(saved.system_quantity)], ['Real', fmt(saved.real_quantity)], ['Diferencia', (saved.difference >= 0 ? '+' : '') + fmt(saved.difference)]] as [string, string][]).map(([l, v]) => (
              <div key={l} className="bg-white rounded-lg p-3 text-center border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">{l}</p>
                <p className="font-semibold text-sm">{v}</p>
              </div>
            ))}
          </div>
        </div>
        {Math.abs(saved.difference) > 0.001 && (
          <button onClick={handleApply} disabled={applying}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
            {applying ? 'Aplicando...' : '✓ Ajustar stock automáticamente'}
          </button>
        )}
        <button onClick={onClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg py-2.5 text-sm transition-colors">
          Cerrar sin ajustar
        </button>
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>
    </Modal>
  )

  return (
    <Modal title="🔍 Control de Stock" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ingrediente *</label>
          <select className="input-base" value={form.ingredient_id} onChange={e => set('ingredient_id', e.target.value)}>
            <option value="">Seleccionar...</option>
            {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        {selected && (
          <div className="bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
            <span className="text-gray-500">Sistema: </span>
            <strong>{fmt(selected.stock_current)} {selected.unit}</strong>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Cantidad real contada {selected ? `(${selected.unit})` : ''} *
          </label>
          <input type="number" min="0" step="0.001" className="input-base"
            value={form.real_quantity} onChange={e => set('real_quantity', e.target.value)} placeholder="0.00" />
        </div>
        {diff !== null && (
          <div className={`rounded-lg px-4 py-2 text-sm font-medium ${
            Math.abs(diff) < 0.01 ? 'bg-green-50 text-green-700' : diff > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
          }`}>
            Diferencia: {diff > 0 ? '+' : ''}{fmt(diff)} {selected?.unit}{Math.abs(diff) < 0.01 && ' — ¡Exacto!'}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nota</label>
          <input type="text" className="input-base" value={form.notes}
            onChange={e => set('notes', e.target.value)} placeholder="Opcional" />
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
          {loading ? 'Guardando...' : 'Registrar conteo'}
        </button>
      </div>
    </Modal>
  )
}

// ─── NUEVO INGREDIENTE ───────────────────────────────────────
const UNITS: Unit[] = ['kg', 'litro', 'unidad', 'gramo', 'ml']

export function AddIngredientModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', unit: 'kg' as Unit, stock_current: '', stock_min: '', cost_unit: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    if (!form.name) { setError('El nombre es requerido'); return }
    setLoading(true); setError('')
    try {
      await createIngredient({
        name: form.name.trim(),
        unit: form.unit,
        stock_current: parseFloat(form.stock_current) || 0,
        stock_min: parseFloat(form.stock_min) || 0,
        cost_unit: parseFloat(form.cost_unit) || 0,
      })
      onSuccess(); onClose()
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <Modal title="+ Nuevo Ingrediente" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input type="text" className="input-base" value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="Ej: Harina 000" autoFocus />
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
            { k: 'stock_current', l: 'Stock inicial' },
            { k: 'stock_min', l: 'Stock mínimo' },
            { k: 'cost_unit', l: 'Costo/unidad ($)' },
          ]).map(({ k, l }) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
              <input type="number" min="0" step="0.01" className="input-base"
                value={(form as any)[k]} onChange={e => set(k, e.target.value)} placeholder="0" />
            </div>
          ))}
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
          {loading ? 'Creando...' : 'Crear ingrediente'}
        </button>
      </div>
    </Modal>
  )
}
