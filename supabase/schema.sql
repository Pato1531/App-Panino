-- ============================================================
-- PANINO v2 — Schema completo
-- Correr en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- TABLAS BASE
-- ============================================================
CREATE TABLE IF NOT EXISTS ingredients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL CHECK (unit IN ('kg', 'unidad', 'litro', 'gramo', 'ml')),
  stock_current NUMERIC(10,3) NOT NULL DEFAULT 0,
  stock_min     NUMERIC(10,3) NOT NULL DEFAULT 0,
  cost_unit     NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity      NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,
  supplier      TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TYPE adjustment_type AS ENUM ('add', 'subtract');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE adjustment_reason AS ENUM ('merma', 'error', 'uso_interno', 'ajuste', 'vencimiento', 'otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  type          adjustment_type NOT NULL,
  quantity      NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  reason        adjustment_reason NOT NULL DEFAULT 'ajuste',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  real_quantity   NUMERIC(10,3) NOT NULL,
  system_quantity NUMERIC(10,3) NOT NULL,
  difference      NUMERIC(10,3) GENERATED ALWAYS AS (real_quantity - system_quantity) STORED,
  adjusted        BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NUEVA TABLA: consumos
-- Registra uso real de ingredientes en producción
-- ============================================================
CREATE TABLE IF NOT EXISTS consumptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity      NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION fn_purchase_update_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_current_stock NUMERIC;
  v_current_cost  NUMERIC;
  v_new_cost      NUMERIC;
BEGIN
  SELECT stock_current, cost_unit INTO v_current_stock, v_current_cost
  FROM ingredients WHERE id = NEW.ingredient_id;

  IF NEW.total_cost = 0 AND NEW.unit_price > 0 THEN
    NEW.total_cost := NEW.unit_price * NEW.quantity;
  END IF;

  IF (v_current_stock + NEW.quantity) > 0 THEN
    v_new_cost := (v_current_stock * v_current_cost + NEW.total_cost) / (v_current_stock + NEW.quantity);
  ELSE
    v_new_cost := CASE WHEN NEW.quantity > 0 THEN NEW.total_cost / NEW.quantity ELSE 0 END;
  END IF;

  UPDATE ingredients
  SET stock_current = stock_current + NEW.quantity,
      cost_unit     = ROUND(v_new_cost, 2)
  WHERE id = NEW.ingredient_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_update_stock ON purchases;
CREATE TRIGGER trg_purchase_update_stock
AFTER INSERT ON purchases
FOR EACH ROW EXECUTE FUNCTION fn_purchase_update_stock();

-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_adjustment_update_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'add' THEN
    UPDATE ingredients SET stock_current = stock_current + NEW.quantity WHERE id = NEW.ingredient_id;
  ELSIF NEW.type = 'subtract' THEN
    UPDATE ingredients SET stock_current = GREATEST(stock_current - NEW.quantity, 0) WHERE id = NEW.ingredient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_adjustment_update_stock ON stock_adjustments;
CREATE TRIGGER trg_adjustment_update_stock
AFTER INSERT ON stock_adjustments
FOR EACH ROW EXECUTE FUNCTION fn_adjustment_update_stock();

-- ─────────────────────────────────────────────
-- Trigger: consumo resta stock
CREATE OR REPLACE FUNCTION fn_consumption_update_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ingredients
  SET stock_current = GREATEST(stock_current - NEW.quantity, 0)
  WHERE id = NEW.ingredient_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consumption_update_stock ON consumptions;
CREATE TRIGGER trg_consumption_update_stock
AFTER INSERT ON consumptions
FOR EACH ROW EXECUTE FUNCTION fn_consumption_update_stock();

-- ============================================================
-- FUNCIÓN: Ajuste desde control parcial
-- ============================================================
CREATE OR REPLACE FUNCTION fn_apply_stock_check(p_check_id UUID)
RETURNS VOID AS $$
DECLARE v_check stock_checks%ROWTYPE;
BEGIN
  SELECT * INTO v_check FROM stock_checks WHERE id = p_check_id;
  IF v_check.adjusted THEN RAISE EXCEPTION 'Este conteo ya fue ajustado.'; END IF;

  UPDATE ingredients SET stock_current = v_check.real_quantity WHERE id = v_check.ingredient_id;
  UPDATE stock_checks SET adjusted = TRUE WHERE id = p_check_id;

  INSERT INTO stock_adjustments (ingredient_id, type, quantity, reason, notes)
  VALUES (
    v_check.ingredient_id,
    CASE WHEN v_check.difference >= 0 THEN 'add' ELSE 'subtract' END,
    ABS(v_check.difference), 'ajuste',
    'Ajuste automático desde control parcial #' || p_check_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VISTAS
-- ============================================================

-- Stock con semáforo
CREATE OR REPLACE VIEW v_stock_status AS
SELECT
  id, name, unit, stock_current, stock_min, cost_unit,
  ROUND(stock_current * cost_unit, 2) AS stock_value,
  CASE
    WHEN stock_current <= stock_min THEN 'critical'
    WHEN stock_current <= stock_min * 1.5 THEN 'warning'
    ELSE 'ok'
  END AS status,
  created_at
FROM ingredients
ORDER BY
  CASE WHEN stock_current <= stock_min THEN 0 WHEN stock_current <= stock_min * 1.5 THEN 1 ELSE 2 END, name;

-- Historial unificado de movimientos
CREATE OR REPLACE VIEW v_movements AS
SELECT 'purchase' AS movement_type, p.id, p.ingredient_id,
       i.name AS ingredient_name, i.unit, p.quantity,
       p.total_cost, NULL::TEXT AS reason, p.created_at
FROM purchases p JOIN ingredients i ON i.id = p.ingredient_id
UNION ALL
SELECT 'adjustment', a.id, a.ingredient_id,
       i.name, i.unit,
       CASE WHEN a.type = 'subtract' THEN -a.quantity ELSE a.quantity END,
       NULL, a.reason::TEXT, a.created_at
FROM stock_adjustments a JOIN ingredients i ON i.id = a.ingredient_id
UNION ALL
SELECT 'consumption', c.id, c.ingredient_id,
       i.name, i.unit, -c.quantity,
       ROUND(c.quantity * i.cost_unit, 2), 'consumo', c.created_at
FROM consumptions c JOIN ingredients i ON i.id = c.ingredient_id
ORDER BY created_at DESC;

-- ============================================================
-- VISTAS DE REPORTES
-- ============================================================

-- Reporte: compras por período (agrupado por día)
CREATE OR REPLACE VIEW v_report_purchases_daily AS
SELECT
  DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') AS day,
  COUNT(*) AS purchase_count,
  SUM(total_cost) AS total_spent,
  SUM(quantity) AS total_units
FROM purchases
GROUP BY 1 ORDER BY 1 DESC;

-- Reporte: consumos por ingrediente (últimos 30 días)
CREATE OR REPLACE VIEW v_report_consumption_by_ingredient AS
SELECT
  i.id, i.name, i.unit,
  COALESCE(SUM(c.quantity), 0) AS total_consumed,
  COALESCE(SUM(c.quantity * i.cost_unit), 0) AS total_cost,
  COUNT(c.id) AS movement_count
FROM ingredients i
LEFT JOIN consumptions c ON c.ingredient_id = i.id
  AND c.created_at > NOW() - INTERVAL '30 days'
GROUP BY i.id, i.name, i.unit
ORDER BY total_consumed DESC;

-- Reporte: mermas por ingrediente (últimos 30 días)
CREATE OR REPLACE VIEW v_report_waste_by_ingredient AS
SELECT
  i.id, i.name, i.unit,
  COALESCE(SUM(a.quantity), 0) AS total_waste,
  COALESCE(SUM(a.quantity * i.cost_unit), 0) AS waste_cost,
  COUNT(a.id) AS adjustment_count
FROM ingredients i
LEFT JOIN stock_adjustments a ON a.ingredient_id = i.id
  AND a.type = 'subtract'
  AND a.reason IN ('merma', 'vencimiento')
  AND a.created_at > NOW() - INTERVAL '30 days'
GROUP BY i.id, i.name, i.unit
ORDER BY waste_cost DESC;

-- Reporte: movimientos diarios agrupados
CREATE OR REPLACE VIEW v_report_daily_summary AS
SELECT
  DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') AS day,
  SUM(CASE WHEN movement_type = 'purchase' THEN total_cost ELSE 0 END) AS purchased,
  SUM(CASE WHEN movement_type = 'consumption' THEN ABS(total_cost) ELSE 0 END) AS consumed_cost,
  SUM(CASE WHEN movement_type = 'adjustment' AND quantity < 0 THEN 1 ELSE 0 END) AS adjustments_count,
  COUNT(*) AS total_movements
FROM v_movements
GROUP BY 1 ORDER BY 1 DESC;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE ingredients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_checks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumptions     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "authenticated_all" ON ingredients      FOR ALL TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated_all" ON purchases        FOR ALL TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated_all" ON stock_adjustments FOR ALL TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated_all" ON stock_checks     FOR ALL TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "authenticated_all" ON consumptions     FOR ALL TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SEED
-- ============================================================
INSERT INTO ingredients (name, unit, stock_current, stock_min, cost_unit) VALUES
  ('Harina 000',       'kg',      25.5,  10.0,  850.00),
  ('Harina 0000',      'kg',      18.0,   8.0,  920.00),
  ('Tomate triturado', 'litro',    8.5,   5.0,  450.00),
  ('Mozzarella',       'kg',       2.8,   3.0, 3200.00),
  ('Aceite de oliva',  'litro',    3.2,   2.0, 1800.00),
  ('Levadura seca',    'kg',       0.6,   0.5, 2100.00),
  ('Sal',              'kg',       5.0,   1.0,  120.00),
  ('Oregano',          'kg',       0.35,  0.2,  850.00),
  ('Jamon cocido',     'kg',       1.9,   2.0, 2800.00),
  ('Gaseosas 500ml',   'unidad',  24.0,  12.0,  350.00)
ON CONFLICT DO NOTHING;
