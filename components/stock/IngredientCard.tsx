-- Al registrar una compra, suma al stock_freezer automáticamente
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

  -- Suma al freezer Y al stock_current
  UPDATE ingredients
  SET stock_freezer = stock_freezer + NEW.quantity,
      stock_current = stock_current + NEW.quantity,
      cost_unit     = ROUND(v_new_cost, 2)
  WHERE id = NEW.ingredient_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
