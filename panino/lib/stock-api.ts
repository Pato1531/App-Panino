import { supabase } from './supabase'
import type {
  Ingredient,
  IngredientWithStatus,
  Purchase,
  StockAdjustment,
  StockCheck,
  Movement,
  DashboardStats,
} from './types'

// ─── INGREDIENTES ────────────────────────────────────────────

export async function getIngredients(): Promise<IngredientWithStatus[]> {
  const { data, error } = await supabase
    .from('v_stock_status')
    .select('*')
  if (error) throw error
  return data as IngredientWithStatus[]
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
): Promise<Ingredient> {
  const { data, error } = await supabase
    .from('ingredients')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
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

export async function getPurchases(limit = 50): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, ingredients(name, unit)')
    .order('created_at', { ascending: false })
    .limit(limit)
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
  const { error } = await supabase.rpc('fn_apply_stock_check', {
    p_check_id: check_id,
  })
  if (error) throw error
}

// ─── MOVIMIENTOS ─────────────────────────────────────────────

export async function getMovements(limit = 30): Promise<Movement[]> {
  const { data, error } = await supabase
    .from('v_movements')
    .select('*')
    .limit(limit)
  if (error) throw error
  return data as Movement[]
}

// ─── DASHBOARD ───────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const [ingredientsRes, movementsRes] = await Promise.all([
    supabase.from('v_stock_status').select('*'),
    supabase.from('v_movements').select('*').limit(15),
  ])
  if (ingredientsRes.error) throw ingredientsRes.error
  if (movementsRes.error) throw movementsRes.error

  const ingredients = ingredientsRes.data as IngredientWithStatus[]
  const totalValue = ingredients.reduce(
    (acc, i) => acc + (i.stock_value || 0),
    0
  )

  return {
    ingredients,
    movements: movementsRes.data as Movement[],
    totalValue,
    critical: ingredients.filter((i) => i.status === 'critical'),
    warning: ingredients.filter((i) => i.status === 'warning'),
    totalIngredients: ingredients.length,
  }
}
