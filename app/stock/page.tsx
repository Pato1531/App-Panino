'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getDashboardStats, deleteIngredient } from '@/lib/stock-api'
import { fmt, fmtCurrency, fmtDate } from '@/lib/utils'
import type { IngredientWithStatus, Movement } from '@/lib/types'

import { IngredientCard } from '@/components/stock/IngredientCard'
import { ConsumptionModal } from '@/components/stock/ConsumptionModal'
import { EditIngredientModal } from '@/components/stock/EditIngredientModal'
import { TransferModal } from '@/components/stock/TransferModal'
import { PurchaseModal, AdjustModal, CheckModal, AddIngredientModal } from '@/components/stock/StockModals'
import { ToastContainer, showToast } from '@/components/ui/Toast'

type ModalType = 'purchase' | 'adjust' | 'check' | 'consume' | 'transfer' | 'add' | 'edit' | null
type FilterStatus = 'all' | 'critical' | 'warning' | 'ok'

const MOVEMENT_META: Record<string, { label: string; color: string; icon: string }> = {
  purchase:  { label: 'Compra → Freezer', color: 'bg-blue-100 text-blue-600',   icon: '🧊' },
  adjustment:{ label: 'Ajuste',           color: 'bg-orange-100 text-orange-600', icon: '⚡' },
  consumption:{ label: 'Consumo',         color: 'bg-green-100 text-green-600',  icon: '🍽' },
  transfer:  { label: 'Pase Freezer→Cajón', color: 'bg-purple-100 text-purple-600', icon: '🔄' },
}

export default function StockPage() {
  const [ingredients, setIngredients] = useState<IngredientWithStatus[]>([])
  const [movements,   setMovements]   = useState<Movement[]>([])
  const [totalValue,  setTotalValue]  = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState<ModalType>(null)
  const [selectedId,  setSelectedId]  = useState<string | undefined>()
  const [filter,      setFilter]      = useState<FilterStatus>('all')
  const [search,      setSearch]      = useState('')
  const [activeTab,   setActiveTab]   = useState<'stock' | 'historial'>('stock')
  const [mvFilter,    setMvFilter]    = useState<'all' | 'purchase' | 'adjustment' | 'consumption' | 'transfer'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const stats = await getDashboardStats()
      setIngredients(stats.ingredients)
      setMovements(stats.movements)
      setTotalValue(stats.totalValue)
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel('panino-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_adjustments' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'purchases' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'consumptions' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_transfers' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const openModal = (type: ModalType, id?: string) => { setSelectedId(id); setModal(type) }
  const closeModal = () => setModal(null)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este ingrediente? No se puede deshacer.')) return
    try { await deleteIngredient(id); showToast('Ingrediente eliminado'); load() }
    catch (e: any) { showToast(e.message, 'error') }
  }

  const filtered = ingredients
    .filter(i => filter === 'all' || i.status === filter)
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  const filteredMovements = movements.filter(m => mvFilter === 'all' || m.movement_type === mvFilter)
  const critical = ingredients.filter(i => i.status === 'critical').length
  const warning  = ingredients.filter(i => i.status === 'warning').length
  const editIngredient = ingredients.find(i => i.id === selectedId)

  return (
    <>
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Control de Stock</h1>
        <div className="flex gap-2">
          <button onClick={() => openModal('add')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            + Ingrediente
          </button>
          <button onClick={() => openModal('purchase')} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium">
            ➕ Compra
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total mercadería', value: fmtCurrency(totalValue) },
          { label: 'Ingredientes',     value: String(ingredients.length), sub: 'registrados' },
          { label: 'Stock crítico',    value: String(critical), sub: 'reponer urgente', red: critical > 0 },
          { label: 'Stock bajo',       value: String(warning),  sub: 'en vigilancia',  amber: warning > 0 },
        ].map(({ label, value, sub, red, amber }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-semibold ${red ? 'text-red-600' : amber ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { icon: '➕', label: 'Compra',  sub: '→ Freezer',        border: 'border-blue-200 hover:bg-blue-50',   action: () => openModal('purchase') },
          { icon: '🔄', label: 'Pase',    sub: 'Freezer → Cajón',   border: 'border-green-200 hover:bg-green-50', action: () => openModal('transfer') },
          { icon: '🍽', label: 'Consumo', sub: 'Desde Cajón',       border: 'border-orange-200 hover:bg-orange-50', action: () => openModal('consume') },
          { icon: '⚡', label: 'Ajuste',  sub: 'Merma / corrección', border: 'border-red-200 hover:bg-red-50',    action: () => openModal('adjust') },
        ].map(({ icon, label, sub, border, action }) => (
          <button key={label} onClick={action} className={`bg-white border rounded-xl p-4 text-left transition-all ${border}`}>
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </button>
        ))}
      </div>

      {/* Flujo visual */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 mb-6 flex items-center gap-3">
        <span className="text-xs text-gray-400">Flujo:</span>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-medium">➕ Compra</span>
          <span className="text-gray-300">→</span>
          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">🧊 Freezer</span>
          <span className="text-gray-300">→</span>
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-medium">🔄 Pase</span>
          <span className="text-gray-300">→</span>
          <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md">📦 Cajón</span>
          <span className="text-gray-300">→</span>
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">🍽 Consumo</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
        {(['stock', 'historial'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'stock' ? 'Ingredientes' : 'Historial'}
          </button>
        ))}
      </div>

      {/* TAB: STOCK */}
      {activeTab === 'stock' && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <input type="text" placeholder="Buscar..."
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              value={search} onChange={e => setSearch(e.target.value)} />
            {([
              { k: 'all',      l: 'Todos',            cls: 'bg-gray-200 text-gray-700 border-gray-300' },
              { k: 'critical', l: `Crítico (${critical})`, cls: 'bg-red-100 text-red-700 border-red-300' },
              { k: 'warning',  l: `Bajo (${warning})`,     cls: 'bg-amber-100 text-amber-700 border-amber-300' },
              { k: 'ok',       l: 'OK',               cls: 'bg-green-100 text-green-700 border-green-300' },
            ] as { k: FilterStatus; l: string; cls: string }[]).map(({ k, l, cls }) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${filter === k ? cls : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-48" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><p className="text-3xl mb-2">📦</p><p className="text-sm">No hay ingredientes</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(ingredient => (
                <IngredientCard key={ingredient.id} ingredient={ingredient}
                  onAdjust={id   => openModal('adjust', id)}
                  onCheck={id    => openModal('check', id)}
                  onConsume={id  => openModal('consume', id)}
                  onTransfer={id => openModal('transfer', id)}
                  onEdit={id     => openModal('edit', id)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB: HISTORIAL */}
      {activeTab === 'historial' && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {([
              { k: 'all',         l: 'Todos' },
              { k: 'purchase',    l: '🧊 Compras' },
              { k: 'transfer',    l: '🔄 Pases' },
              { k: 'consumption', l: '🍽 Consumos' },
              { k: 'adjustment',  l: '⚡ Ajustes' },
            ] as { k: typeof mvFilter; l: string }[]).map(({ k, l }) => (
              <button key={k} onClick={() => setMvFilter(k)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${mvFilter === k ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {filteredMovements.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No hay movimientos</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredMovements.map(m => {
                  const meta = MOVEMENT_META[m.movement_type] || MOVEMENT_META.adjustment
                  const turno = (m as any).turno
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${meta.color}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{m.ingredient_name}</p>
                        <p className="text-xs text-gray-400">
                          {meta.label}
                          {turno && turno !== 'null' ? ` · ${turno === 'mediodia' ? '☀️ Mediodía' : '🌙 Noche'}` : ''}
                          {m.reason && !['consumo', 'freezer → cajón'].includes(m.reason) ? ` — ${m.reason.replace('_', ' ')}` : ''}
                          {m.total_cost ? ` — ${fmtCurrency(m.total_cost)}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${m.quantity >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {m.quantity >= 0 ? '+' : ''}{fmt(m.quantity)} {m.unit}
                        </p>
                        <p className="text-xs text-gray-400">{fmtDate(m.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modales */}
      {modal === 'purchase'  && <PurchaseModal ingredients={ingredients} onClose={closeModal} onSuccess={() => { load(); showToast('🧊 Compra guardada en el Freezer') }} />}
      {modal === 'transfer'  && <TransferModal ingredients={ingredients} onClose={closeModal} onSuccess={() => { load(); showToast('🔄 Pase Freezer → Cajón registrado') }} defaultIngredientId={selectedId} />}
      {modal === 'consume'   && <ConsumptionModal ingredients={ingredients} onClose={closeModal} onSuccess={() => { load(); showToast('🍽 Consumo registrado desde el Cajón') }} defaultIngredientId={selectedId} />}
      {modal === 'adjust'    && <AdjustModal ingredients={ingredients} onClose={closeModal} onSuccess={() => { load(); showToast('Ajuste aplicado') }} defaultIngredientId={selectedId} />}
      {modal === 'check'     && <CheckModal ingredients={ingredients} onClose={closeModal} onSuccess={() => { load(); showToast('Stock ajustado') }} defaultIngredientId={selectedId} />}
      {modal === 'add'       && <AddIngredientModal onClose={closeModal} onSuccess={() => { load(); showToast('Ingrediente creado') }} />}
      {modal === 'edit' && editIngredient && <EditIngredientModal ingredient={editIngredient} onClose={closeModal} onSuccess={async () => { setModal(null); await load(); showToast('Ingrediente actualizado') }} />}
    </>
  )
}
