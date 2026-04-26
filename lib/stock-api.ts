import { supabase } from './supabase'
import type {
  Ingredient, IngredientWithStatus, Purchase,
  StockAdjustment, StockCheck, Consumption, Movement,
  DashboardStats, DailySummary, ConsumptionByIngredient, WasteByIngredient,
} from './types'

// ─── INGREDIENTES ────────────────────────────────────────────

export async function getIngredients(): Promise<IngredientWithStatus[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name')
  if (error) throw error

  return (data as Ingredient[]).map(i => ({
    ...i,
    stock_value: Math.round(i.stock_current * i.cost_unit * 100) / 100,
    status: i.stock_current <= i.stock_min
      ? 'critical'
      : i.stock_current <= i.stock_min * 1.5
      ? 'warning'
      : 'ok',
  }))
}

export async function getIngredient(id: string): Promise<Ingredient> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createIngredient(
  payload: Omit<Ingredient, 'id' | 'created_at'>
): Promise<Ingredient> {
  const { data, error } = await supabase
    .from('ingredients')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateIngredient(
  id: string,
  payload: Partial<Omit<Ingredient, 'id' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('ingredients')
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

export async function deleteIngredient(id: string): Promise<void> {
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── COMPRAS ─────────────────────────────────────────────────

export async function createPurchase(
  payload: Omit<Purchase, 'id' | 'created_at'>
): Promise<Purchase> {
  const { data, error } = await supabase
    .from('purchases')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── AJUSTES ─────────────────────────────────────────────────

export async function createAdjustment(
  payload: Omit<StockAdjustment, 'id' | 'created_at'>
): Promise<StockAdjustment> {
  const { data, error } = await supabase
    .from('stock_adjustments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── CONSUMOS ────────────────────────────────────────────────

export async function createConsumption(
  payload: Omit<Consumption, 'id' | 'created_at'>
): Promise<Consumption> {
  const { data, error } = await supabase
    .from('consumptions')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── CONTROL PARCIAL ─────────────────────────────────────────

export async function createStockCheck(
  ingredient_id: string,
  real_quantity: number,
  notes?: string
): Promise<StockCheck> {
  const ingredient = await getIngredient(ingredient_id)
  const { data, error } = await supabase
    .from('stock_checks')
    .insert({
      ingredient_id,
      real_quantity,
      system_quantity: ingredient.stock_current,
      notes,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function applyStockCheck(check_id: string): Promise<void> {
  const { error } = await supabase.rpc('fn_apply_stock_check', { p_check_id: check_id })
  if (error) throw error
}

// ─── MOVIMIENTOS ─────────────────────────────────────────────

export async function getMovements(limit = 50): Promise<Movement[]> {
  const { data, error } = await supabase
    .from('v_movements')
    .select('*')
    .limit(limit)
  if (error) throw error
  return data as Movement[]
}

// ─── DASHBOARD ───────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const [ingredients, movementsRes] = await Promise.all([
    getIngredients(),
    supabase.from('v_movements').select('*').limit(20),
  ])
  if (movementsRes.error) throw movementsRes.error

  return {
    ingredients,
    movements: movementsRes.data as Movement[],
    totalValue: ingredients.reduce((acc, i) => acc + (i.stock_value || 0), 0),
    critical: ingredients.filter(i => i.status === 'critical'),
    warning: ingredients.filter(i => i.status === 'warning'),
    totalIngredients: ingredients.length,
  }
}

// ─── REPORTES ────────────────────────────────────────────────

export async function getReportDailySummary(days = 30): Promise<DailySummary[]> {
  const { data, error } = await supabase
    .from('v_report_daily_summary')
    .select('*')
    .limit(days)
  if (error) throw error
  return data as DailySummary[]
}

export async function getReportConsumptionByIngredient(): Promise<ConsumptionByIngredient[]> {
  const { data, error } = await supabase
    .from('v_report_consumption_by_ingredient')
    .select('*')
  if (error) throw error
  return data as ConsumptionByIngredient[]
}

export async function getReportWaste(): Promise<WasteByIngredient[]> {
  const { data, error } = await supabase
    .from('v_report_waste_by_ingredient')
    .select('*')
  if (error) throw error
  return data as WasteByIngredient[]
}

export async function getReportPurchasesTotal(
  days = 30
): Promise<{ total: number; count: number }> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('purchases')
    .select('total_cost')
    .gte('created_at', since.toISOString())
  if (error) throw error
  const total = (data || []).reduce((acc, r) => acc + (r.total_cost || 0), 0)
  return { total, count: data?.length || 0 }
}
export async function getReportTurno(days = 30): Promise<any[]> {
  const { data, error } = await supabase
    .from('v_report_turno')
    .select('*')
    .limit(days * 2)
  if (error) throw error
  return data || []
}
