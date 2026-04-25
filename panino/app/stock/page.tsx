'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getDashboardStats, deleteIngredient } from '@/lib/stock-api'
import { fmt, fmtCurrency, fmtDate } from '@/lib/utils'
import type { IngredientWithStatus, Movement } from '@/lib/types'

import { IngredientCard } from '@/components/stock/IngredientCard'
import { PurchaseModal } from '@/components/stock/PurchaseModal'
import { AdjustModal } from '@/components/stock/AdjustModal'
import { CheckModal } from '@/components/stock/CheckModal'
import { AddIngredientModal } from '@/components/stock/AddIngredientModal'
import { ToastContainer, showToast } from '@/components/ui/Toast'

type ModalType = 'purchase' | 'adjust' | 'check' | 'addIngredient' | null
type FilterStatus = 'all' | 'critical' | 'warning' | 'ok'

export default function StockPage() {
  const [ingredients, setIngredients] = useState<IngredientWithStatus[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalType>(null)
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const stats = await getDashboardStats()
      setIngredients(stats.ingredients)
      setMovements(stats.movements)
      setTotalValue(stats.totalValue)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Real-time Supabase
  useEffect(() => {
    const channel = supabase
      .channel('panino-stock')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_adjustments' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'purchases' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const openModal = (type: ModalType, id?: string) => {
    setSelectedId(id)
    setModal(type)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este ingrediente? Esta acción no se puede deshacer.')) return
    try {
      await deleteIngredient(id)
      showToast('Ingrediente eliminado')
      load()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const filtered = ingredients
    .filter((i) => filter === 'all' || i.status === filter)
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))

  const critical = ingredients.filter((i) => i.status === 'critical').length
  const warning = ingredients.filter((i) => i.status === 'warning').length

  const FILTER_CHIPS = [
    { key: 'all', label: 'Todos', activeClass: 'bg-gray-200 text-gray-700 border-gray-300' },
    { key: 'critical', label: `Crítico (${critical})`, activeClass: 'bg-red-100 text-red-700 border-red-300' },
    { key: 'warning', label: `Bajo (${warning})`, activeClass: 'bg-amber-100 text-amber-700 border-amber-300' },
    { key: 'ok', label: 'OK', activeClass: 'bg-green-100 text-green-700 border-green-300' },
  ] as const

  return (
    <>
      <ToastContainer />

      {/* Header acciones */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Control de Stock</h1>
        <div className="flex gap-2">
          <button onClick={() => openModal('addIngredient')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
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
          { label: 'Ingredientes', value: String(ingredients.length), sub: 'registrados' },
          { label: 'Stock crítico', value: String(critical), sub: 'necesitan reposición', accent: critical > 0 },
          { label: 'Stock bajo', value: String(warning), sub: 'en vigilancia', warn: warning > 0 },
        ].map(({ label, value, sub, accent, warn }) => (
          <div key={label} className="card">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-semibold ${accent ? 'text-red-600' : warn ? 'text-amber-600' : 'text-gray-900'}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: '➕', label: 'Registrar Compra', sub: 'Suma al stock', border: 'border-blue-200 hover:border-blue-300 hover:bg-blue-50', action: () => openModal('purchase') },
          { icon: '⚡', label: 'Ajustar Stock', sub: 'Merma o corrección', border: 'border-orange-200 hover:border-orange-300 hover:bg-orange-50', action: () => openModal('adjust') },
          { icon: '🔍', label: 'Controlar Stock', sub: 'Conteo parcial', border: 'border-purple-200 hover:border-purple-300 hover:bg-purple-50', action: () => openModal('check') },
        ].map(({ icon, label, sub, border, action }) => (
          <button key={label} onClick={action} className={`bg-white border rounded-xl p-4 text-left transition-all ${border}`}>
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
        {(['stock', 'movements'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'stock' ? 'Ingredientes' : 'Movimientos'}
          </button>
        ))}
      </div>

      {activeTab === 'stock' && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="Buscar ingrediente..."
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {FILTER_CHIPS.map(({ key, label, activeClass }) => (
              <button
                key={key}
                onClick={() => setFilter(key as FilterStatus)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  filter === key ? activeClass : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
                  <div className="h-1.5 bg-gray-100 rounded mb-4" />
                  <div className="flex gap-2">
                    <div className="h-7 bg-gray-100 rounded-lg flex-1" />
                    <div className="h-7 bg-gray-100 rounded-lg flex-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sm">No se encontraron ingredientes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((ingredient) => (
                <IngredientCard
                  key={ingredient.id}
                  ingredient={ingredient}
                  onAdjust={(id) => openModal('adjust', id)}
                  onCheck={(id) => openModal('check', id)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {movements.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No hay movimientos registrados</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {movements.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${m.movement_type === 'purchase' ? 'bg-blue-100' : 'bg-orange-100'}`}>
                    {m.movement_type === 'purchase' ? '➕' : '⚡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.ingredient_name}</p>
                    <p className="text-xs text-gray-400">
                      {m.movement_type === 'purchase' ? 'Compra' : m.reason?.replace('_', ' ')}
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {modal === 'purchase' && (
        <PurchaseModal ingredients={ingredients} onClose={() => setModal(null)} onSuccess={() => { load(); showToast('Compra registrada — stock actualizado') }} />
      )}
      {modal === 'adjust' && (
        <AdjustModal ingredients={ingredients} onClose={() => setModal(null)} onSuccess={() => { load(); showToast('Ajuste aplicado correctamente') }} defaultIngredientId={selectedId} />
      )}
      {modal === 'check' && (
        <CheckModal ingredients={ingredients} onClose={() => setModal(null)} onSuccess={() => { load(); showToast('Stock ajustado al valor real') }} defaultIngredientId={selectedId} />
      )}
      {modal === 'addIngredient' && (
        <AddIngredientModal onClose={() => setModal(null)} onSuccess={() => { load(); showToast('Ingrediente creado') }} />
      )}
    </>
  )
}
