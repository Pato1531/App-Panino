// ============================================================
// TIPOS DE STOCK
// ============================================================
export type Unit = 'kg' | 'unidad' | 'litro' | 'gramo' | 'ml'
export type StockStatus = 'critical' | 'warning' | 'ok'
export type AdjustmentType = 'add' | 'subtract'
export type AdjustmentReason =
  | 'merma'
  | 'error'
  | 'uso_interno'
  | 'ajuste'
  | 'vencimiento'
  | 'otro'

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

export interface Movement {
  movement_type: 'purchase' | 'adjustment'
  id: string
  ingredient_id: string
  ingredient_name: string
  unit: Unit
  quantity: number
  total_cost?: number
  reason?: string
  created_at: string
}

// ============================================================
// TIPOS DE CONTENIDO SOCIAL (extraído de libretos_redes_panino)
// ============================================================
export type ContentFormat =
  | 'hook'       // Gancho de barrio
  | 'detras'     // Detrás del mostrador
  | 'social'     // Prueba social / testimonios
  | 'producto'   // Producto con contexto

export interface ContentScript {
  id: string
  format: ContentFormat
  title: string
  duration: string      // "30 seg", "45 seg", etc.
  script: string        // El libreto completo
  tip: string           // El tip de por qué funciona
  scheduled_day?: 'lunes' | 'miercoles' | 'viernes'
}

export interface DashboardStats {
  ingredients: IngredientWithStatus[]
  movements: Movement[]
  totalValue: number
  critical: IngredientWithStatus[]
  warning: IngredientWithStatus[]
  totalIngredients: number
}
