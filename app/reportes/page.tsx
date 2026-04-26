'use client'

import { useState, useEffect } from 'react'
import { getReportDailySummary, getReportConsumptionByIngredient, getReportWaste, getReportPurchasesTotal } from '@/lib/stock-api'
import { fmt, fmtCurrency, fmtDateShort } from '@/lib/utils'
import type { DailySummary, ConsumptionByIngredient, WasteByIngredient } from '@/lib/types'

type Period = '7' | '30' | '90'

export default function ReportesPage() {
  const [period, setPeriod] = useState<Period>('30')
  const [daily, setDaily] = useState<DailySummary[]>([])
  const [consumption, setConsumption] = useState<ConsumptionByIngredient[]>([])
  const [waste, setWaste] = useState<WasteByIngredient[]>([])
  const [purchases, setPurchases] = useState<{ total: number; count: number }>({ total: 0, count: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [d, c, w, p] = await Promise.all([
          getReportDailySummary(parseInt(period)),
          getReportConsumptionByIngredient(),
          getReportWaste(),
          getReportPurchasesTotal(parseInt(period)),
        ])
        setDaily(d)
        setConsumption(c)
        setWaste(w)
        setPurchases(p)
      } finally { setLoading(false) }
    }
    load()
  }, [period])

  // Calcular totales del período
  const totalConsumedCost = daily.slice(0, parseInt(period)).reduce((a, d) => a + (d.consumed_cost || 0), 0)
  const totalMovements    = daily.slice(0, parseInt(period)).reduce((a, d) => a + (d.total_movements || 0), 0)
  const totalWasteCost    = waste.reduce((a, w) => a + (w.waste_cost || 0), 0)
  const avgDailyPurchase  = purchases.total / Math.max(daily.length, 1)

  const PERIOD_LABEL: Record<Period, string> = { '7': 'últimos 7 días', '30': 'últimos 30 días', '90': 'últimos 90 días' }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-100 rounded w-48 animate-pulse" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-400 mt-0.5">{PERIOD_LABEL[period]}</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['7', '30', '90'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p === '7' ? '7 días' : p === '30' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Invertido en compras', value: fmtCurrency(purchases.total), sub: `${purchases.count} compras`, icon: '🛒', color: 'text-blue-600' },
          { label: 'Costo de consumos', value: fmtCurrency(totalConsumedCost), sub: 'uso en producción', icon: '🍽', color: 'text-green-600' },
          { label: 'Pérdida por merma', value: fmtCurrency(totalWasteCost), sub: 'merma + vencimiento', icon: '⚠️', color: 'text-red-600' },
          { label: 'Total movimientos', value: String(totalMovements), sub: 'en el período', icon: '📋', color: 'text-gray-900' },
        ].map(({ label, value, sub, icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{icon}</span>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
            <p className={`text-xl font-semibold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Actividad diaria */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Actividad diaria</h2>
        {daily.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin datos en este período</p>
        ) : (
          <>
            {/* Gráfico de barras simple */}
            <div className="mb-4">
              {(() => {
                const maxVal = Math.max(...daily.slice(0, parseInt(period)).map(d => Math.max(d.purchased || 0, d.consumed_cost || 0)), 1)
                return (
                  <div className="flex items-end gap-1 h-24 overflow-x-auto pb-2">
                    {daily.slice(0, parseInt(period)).reverse().map((d, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5 flex-shrink-0" style={{ minWidth: period === '7' ? '10%' : period === '30' ? 28 : 16 }}>
                        <div className="flex items-end gap-0.5 h-20">
                          <div className="w-2 bg-blue-400 rounded-t transition-all" style={{ height: `${Math.max(4, ((d.purchased || 0) / maxVal) * 100)}%` }} title={`Compras: ${fmtCurrency(d.purchased)}`} />
                          <div className="w-2 bg-green-400 rounded-t transition-all" style={{ height: `${Math.max(4, ((d.consumed_cost || 0) / maxVal) * 100)}%` }} title={`Consumos: ${fmtCurrency(d.consumed_cost)}`} />
                        </div>
                        {(parseInt(period) <= 30) && <span className="text-[9px] text-gray-300 rotate-45 origin-left">{fmtDateShort(d.day)}</span>}
                      </div>
                    ))}
                  </div>
                )
              })()}
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-400 rounded" /><span className="text-xs text-gray-500">Compras</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-400 rounded" /><span className="text-xs text-gray-500">Consumos</span></div>
              </div>
            </div>

            {/* Tabla resumida */}
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Fecha</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Compras</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Consumos</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Ajustes</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Movimientos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {daily.slice(0, parseInt(period)).map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-gray-600">{fmtDateShort(d.day)}</td>
                      <td className="px-4 py-2.5 text-xs text-right text-blue-600 font-medium">{d.purchased > 0 ? fmtCurrency(d.purchased) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-right text-green-600 font-medium">{d.consumed_cost > 0 ? fmtCurrency(d.consumed_cost) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-right text-orange-600">{d.adjustments_count > 0 ? d.adjustments_count : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-right text-gray-500">{d.total_movements}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Consumos por ingrediente */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Consumo por ingrediente <span className="text-gray-400 font-normal">(últimos 30 días)</span></h2>
        <p className="text-xs text-gray-400 mb-4">Los ingredientes que más se usan en producción</p>
        {consumption.filter(c => c.total_consumed > 0).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin consumos registrados</p>
        ) : (
          <div className="space-y-3">
            {(() => {
              const maxC = Math.max(...consumption.map(c => c.total_consumed), 1)
              return consumption.filter(c => c.total_consumed > 0).slice(0, 10).map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{fmt(c.total_consumed)} {c.unit}</p>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full" style={{ width: `${(c.total_consumed / maxC) * 100}%` }} />
                  </div>
                  <div className="w-24 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-900">{fmtCurrency(c.total_cost)}</p>
                    <p className="text-xs text-gray-400">{c.movement_count} mov.</p>
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>

      {/* Mermas */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Mermas y pérdidas <span className="text-gray-400 font-normal">(últimos 30 días)</span></h2>
        <p className="text-xs text-gray-400 mb-4">Ingredientes con mayor pérdida por merma o vencimiento</p>
        {waste.filter(w => w.total_waste > 0).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin mermas registradas 🎉</p>
        ) : (
          <div className="space-y-3">
            {(() => {
              const maxW = Math.max(...waste.map(w => w.waste_cost), 1)
              return waste.filter(w => w.total_waste > 0).slice(0, 10).map(w => (
                <div key={w.id} className="flex items-center gap-3">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{w.name}</p>
                    <p className="text-xs text-gray-400">{fmt(w.total_waste)} {w.unit}</p>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-red-400 h-2 rounded-full" style={{ width: `${(w.waste_cost / maxW) * 100}%` }} />
                  </div>
                  <div className="w-24 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-red-600">{fmtCurrency(w.waste_cost)}</p>
                    <p className="text-xs text-gray-400">{w.adjustment_count} ajustes</p>
                  </div>
                </div>
              ))
            })()}
          </div>
        )}
      </div>

      {/* Promedio diario */}
      {purchases.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Promedios del período</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Gasto diario promedio', value: fmtCurrency(avgDailyPurchase), sub: 'en compras' },
              { label: 'Compras totales', value: String(purchases.count), sub: `en ${PERIOD_LABEL[period]}` },
              { label: 'Merma total', value: fmtCurrency(totalWasteCost), sub: 'pérdida evitable' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-lg font-semibold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
