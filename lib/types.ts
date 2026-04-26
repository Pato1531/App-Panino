export type Unit = 'kg' | 'unidad' | 'litro' | 'gramo' | 'ml'
export type StockStatus = 'critical' | 'warning' | 'ok'
export type AdjustmentType = 'add' | 'subtract'
export type AdjustmentReason = 'merma' | 'error' | 'uso_interno' | 'ajuste' | 'vencimiento' | 'otro'
export type MovementType = 'purchase' | 'adjustment' | 'consumption'

export interface Ingredient {
  id: string
  name: string
  unit: Unit
  stock_current: number
  stock_min: number
  cost_unit: number
  created_at: string
}

export interface IngredientWithStatus extends Ingredient {
  stock_value: number
  status: StockStatus
}

export interface Purchase {
  id: string
  ingredient_id: string
  quantity: number
  unit_price: number
  total_cost: number
  supplier?: string
  notes?: string
  created_at: string
}

export interface StockAdjustment {
  id: string
  ingredient_id: string
  type: AdjustmentType
  quantity: number
  reason: AdjustmentReason
  notes?: string
  created_at: string
}

export interface StockCheck {
  id: string
  ingredient_id: string
  real_quantity: number
  system_quantity: number
  difference: number
  adjusted: boolean
  notes?: string
  created_at: string
}

export interface Consumption {
  id: string
  ingredient_id: string
  quantity: number
  notes?: string
  created_at: string
}

export interface Movement {
  movement_type: MovementType
  id: string
  ingredient_id: string
  ingredient_name: string
  unit: Unit
  quantity: number
  total_cost?: number
  reason?: string
  created_at: string
}

// Reportes
export interface DailySummary {
  day: string
  purchased: number
  consumed_cost: number
  adjustments_count: number
  total_movements: number
}

export interface ConsumptionByIngredient {
  id: string
  name: string
  unit: Unit
  total_consumed: number
  total_cost: number
  movement_count: number
}

export interface WasteByIngredient {
  id: string
  name: string
  unit: Unit
  total_waste: number
  waste_cost: number
  adjustment_count: number
}

export interface DashboardStats {
  ingredients: IngredientWithStatus[]
  movements: Movement[]
  totalValue: number
  critical: IngredientWithStatus[]
  warning: IngredientWithStatus[]
  totalIngredients: number
}
