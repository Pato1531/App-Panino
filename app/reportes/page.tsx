'use client'

import { useState, useEffect } from 'react'
import {
  getReportDailySummary,
  getReportConsumptionByIngredient,
  getReportWaste,
  getReportPurchasesTotal,
  getReportTurno,
} from '@/lib/stock-api'
import { fmt, fmtCurrency, fmtDateShort } from '@/lib/utils'
import type { DailySummary, ConsumptionByIngredient, WasteByIngredient } from '@/lib/types'

type Period = '7' | '30' | '90'

interface TurnoRow {
  day: string
  turno: 'mediodia' | 'noche'
  movimientos: number
  total_cantidad: number
  costo_total: number
}

interface TurnoDaySummary {
  day: string
  mediodia: number
  noche: number
  total: number
}

export default function ReportesPage() {
  const [period, setPeriod] = useState<Period>('30')
  const [daily, setDaily] = useState<DailySummary[]>([])
  const [consumption, setConsumption] = useState<ConsumptionByIngredient[]>([])
  const [waste, setWaste] = useState<WasteByIngredient[]>([])
  const [purchases, setPurchases] = useState<{ total: number; count: number }>({ total: 0, count: 0 })
  const [turnoData, setTurnoData] = useState<TurnoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'resumen' | 'turno' | 'consumos' | 'mermas'>('resumen')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [d, c, w, p, t] = await Promise.all([
          getReportDailySummary(parseInt(period)),
          getReportConsumptionByIngredient(),
          getReportWaste(),
          getReportPurchasesTotal(parseInt(period)),
          getReportTurno(parseInt(period)),
        ])
        setDaily(d)
        setConsumption(c)
        setWaste(w)
        setPurchases(p)
        setTurnoData(t)
      } finally { setLoading(false) }
    }
    load()
  }, [period])

  // Totales
  const totalConsumedCost = daily.reduce((a, d) => a + (d.consumed_cost || 0), 0)
  const totalMovements    = daily.reduce((a, d) => a + (d.total_movements || 0), 0)
  const totalWasteCost    = waste.reduce((a, w) => a + (w.waste_cost || 0), 0)
  const avgDailyPurchase  = purchases.total / Math.max(daily.length, 1)

  // Procesar datos de turno
  const turnoPorDia: TurnoDaySummary[] = Object.values(
    turnoData.reduce((acc, row) => {
      if (!acc[row.day]) acc[row.day] = { day: row.day, mediodia: 0, noche: 0, total: 0 }
      acc[row.day][row.turno] = row.costo_total || 0
      acc[row.day].total += row.costo_total || 0
      return acc
    }, {} as Record<string, TurnoDaySummary>)
  ).sort((a, b) => b.day.localeCompare(a.day))

  const totalMediodia = turnoData.filter(r => r.turno === 'mediodia').reduce((a, r) => a + (r.costo_total || 0), 0)
  const totalNoche    = turnoData.filter(r => r.turno === 'noche').reduce((a, r) => a + (r.costo_total || 0), 0)
  const totalTurno    = totalMediodia + totalNoche
  const pctMediodia   = totalTurno > 0 ? (totalMediodia / totalTurno) * 100 : 50
  const pctNoche      = totalTurno > 0 ? (totalNoche / totalTurno) * 100 : 50
  const maxTurno      = Math.max(...turnoPorDia.map(d => d.total), 1)

  const PERIOD_LABEL: Record<Period, string> = {
    '7': 'últimos 7 días',
    '30': 'últimos 30 días',
    '90': 'últimos 90 días',
  }

  const SECTIONS = [
    { k: 'resumen', l: '📊 Resumen' },
    { k: 'turno',   l: '☀️🌙 Por turno' },
    { k: 'consumos',l: '🍽 Consumos' },
    { k: 'mermas',  l: '⚠️ Mermas' },
  ] as const

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-100 rounded w-48 animate-pulse" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">

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

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Invertido en compras', value: fmtCurrency(purchases.total), sub: `${purchases.count} compras`, color: 'text-blue-600', icon: '🛒' },
          { label: 'Costo de consumos',    value: fmtCurrency(totalConsumedCost), sub: 'uso en producción', color: 'text-green-600', icon: '🍽' },
          { label: 'Pérdida por merma',    value: fmtCurrency(totalWasteCost), sub: 'merma + vencimiento', color: 'text-red-600', icon: '⚠️' },
          { label: 'Total movimientos',    value: String(totalMovements), sub: 'en el período', color: 'text-gray-900', icon: '📋' },
        ].map(({ label, value, sub, color, icon }) => (
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

      {/* Navegación de secciones */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {SECTIONS.map(({ k, l }) => (
          <button key={k} onClick={() => setActiveSection(k)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${activeSection === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── SECCIÓN: RESUMEN ── */}
      {activeSection === 'resumen' && (
        <div className="space-y-6">

          {/* Gráfico actividad diaria */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Actividad diaria</h2>
            {daily.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin datos en este período</p>
            ) : (
              <>
                <div className="flex items-end gap-1 h-24 overflow-x-auto pb-2 mb-3">
                  {[...daily].reverse().map((d, i) => {
                    const maxVal = Math.max(...daily.map(d => Math.max(d.purchased || 0, d.consumed_cost || 0)), 1)
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5 flex-shrink-0" style={{ minWidth: 28 }}>
                        <div className="flex items-end gap-0.5 h-20">
                          <div className="w-2.5 bg-blue-400 rounded-t" style={{ height: `${Math.max(4, ((d.purchased || 0) / maxVal) * 100)}%` }} title={`Compras: ${fmtCurrency(d.purchased)}`} />
                          <div className="w-2.5 bg-green-400 rounded-t" style={{ height: `${Math.max(4, ((d.consumed_cost || 0) / maxVal) * 100)}%` }} title={`Consumos: ${fmtCurrency(d.consumed_cost)}`} />
                        </div>
                        <span className="text-[9px] text-gray-300">{fmtDateShort(d.day)}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-400 rounded" /><span className="text-xs text-gray-500">Compras</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-400 rounded" /><span className="text-xs text-gray-500">Consumos</span></div>
                </div>
              </>
            )}
          </div>

          {/* Tabla diaria */}
          {daily.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Detalle por día</h2>
              </div>
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
                  {daily.map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-gray-600">{fmtDateShort(d.day)}</td>
                      <td className="px-4 py-2.5 text-xs text-right text-blue-600 font-medium">{d.purchased > 0 ? fmtCurrency(d.purchased) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-right text-green-600 font-medium">{d.consumed_cost > 0 ? fmtCurrency(d.consumed_cost) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-right text-orange-500">{d.adjustments_count > 0 ? d.adjustments_count : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-right text-gray-500">{d.total_movements}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Promedios */}
          {purchases.total > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Promedios del período</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Gasto diario promedio', value: fmtCurrency(avgDailyPurchase), sub: 'en compras' },
                  { label: 'Compras totales', value: String(purchases.count), sub: PERIOD_LABEL[period] },
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
      )}

      {/* ── SECCIÓN: TURNO ── */}
      {activeSection === 'turno' && (
        <div className="space-y-6">

          {/* Totales por turno */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">☀️</span>
                <div>
                  <p className="text-xs font-medium text-amber-700">Mediodía</p>
                  <p className="text-xs text-amber-500">{PERIOD_LABEL[period]}</p>
                </div>
              </div>
              <p className="text-2xl font-semibold text-amber-800">{fmtCurrency(totalMediodia)}</p>
              <p className="text-xs text-amber-600 mt-1">{pctMediodia.toFixed(0)}% del total</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🌙</span>
                <div>
                  <p className="text-xs font-medium text-indigo-700">Noche</p>
                  <p className="text-xs text-indigo-500">{PERIOD_LABEL[period]}</p>
                </div>
              </div>
              <p className="text-2xl font-semibold text-indigo-800">{fmtCurrency(totalNoche)}</p>
              <p className="text-xs text-indigo-600 mt-1">{pctNoche.toFixed(0)}% del total</p>
            </div>
          </div>

          {/* Barra comparativa */}
          {totalTurno > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Distribución de costo</h2>
              <div className="flex rounded-full overflow-hidden h-4 mb-3">
                <div className="bg-amber-400 transition-all" style={{ width: `${pctMediodia}%` }} title={`Mediodía: ${pctMediodia.toFixed(0)}%`} />
                <div className="bg-indigo-400 transition-all" style={{ width: `${pctNoche}%` }} title={`Noche: ${pctNoche.toFixed(0)}%`} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />☀️ Mediodía {pctMediodia.toFixed(0)}%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />🌙 Noche {pctNoche.toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* Tabla día por día */}
          {turnoPorDia.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              Sin consumos registrados en este período
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-900">Costo por día y turno</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Fecha</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-amber-600">☀️ Mediodía</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-indigo-600">🌙 Noche</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Total día</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-400 w-32">Proporción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {turnoPorDia.map((d, i) => {
                    const pctM = d.total > 0 ? (d.mediodia / d.total) * 100 : 0
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-600 font-medium">{fmtDateShort(d.day)}</td>
                        <td className="px-4 py-3 text-xs text-right text-amber-600 font-medium">{d.mediodia > 0 ? fmtCurrency(d.mediodia) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-right text-indigo-600 font-medium">{d.noche > 0 ? fmtCurrency(d.noche) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-right text-gray-900 font-semibold">{fmtCurrency(d.total)}</td>
                        <td className="px-4 py-3">
                          <div className="flex rounded-full overflow-hidden h-2 bg-gray-100">
                            <div className="bg-amber-400" style={{ width: `${pctM}%` }} />
                            <div className="bg-indigo-400" style={{ width: `${100 - pctM}%` }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-3 text-xs text-gray-700">Total período</td>
                    <td className="px-4 py-3 text-xs text-right text-amber-700">{fmtCurrency(totalMediodia)}</td>
                    <td className="px-4 py-3 text-xs text-right text-indigo-700">{fmtCurrency(totalNoche)}</td>
                    <td className="px-4 py-3 text-xs text-right text-gray-900">{fmtCurrency(totalTurno)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SECCIÓN: CONSUMOS ── */}
      {activeSection === 'consumos' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Consumo por ingrediente <span className="text-gray-400 font-normal">(últimos 30 días)</span></h2>
          <p className="text-xs text-gray-400 mb-4">Los ingredientes que más se usan en producción</p>
          {consumption.filter(c => c.total_consumed > 0).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin consumos registrados</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const maxC = Math.max(...consumption.map(c => c.total_consumed), 1)
                return consumption.filter(c => c.total_consumed > 0).map(c => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-36 flex-shrink-0">
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
      )}

      {/* ── SECCIÓN: MERMAS ── */}
      {activeSection === 'mermas' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Mermas y pérdidas <span className="text-gray-400 font-normal">(últimos 30 días)</span></h2>
          <p className="text-xs text-gray-400 mb-4">Ingredientes con mayor pérdida por merma o vencimiento</p>
          {waste.filter(w => w.total_waste > 0).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin mermas registradas 🎉</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const maxW = Math.max(...waste.map(w => w.waste_cost), 1)
                return waste.filter(w => w.total_waste > 0).map(w => (
                  <div key={w.id} className="flex items-center gap-3">
                    <div className="w-36 flex-shrink-0">
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
      )}

    </div>
  )
}
