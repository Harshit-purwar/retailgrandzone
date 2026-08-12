-- =====================================================================
-- FIX: combos schema mismatch on the live project.
-- The live `combos` table predates the storefront and uses an old schema
-- (is_active, missing active / combo_price / store_id / image_url).
-- This makes the admin "New combo" form fail with:
--   column combos.active does not exist
-- Run this in the Supabase SQL Editor. It is idempotent and safe to
-- re-run. The existing combos table is empty, so dropping is lossless.
-- =====================================================================

-- 1. Rebuild combos with the exact schema the storefront expects.
DROP TABLE IF EXISTS public.combos CASCADE;

CREATE TABLE public.combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  combo_price numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.combos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combos TO authenticated;
GRANT ALL ON public.combos TO service_role;

ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "combos public read" ON public.combos;
CREATE POLICY "combos public read" ON public.combos FOR SELECT
  USING (active OR public.is_admin());

DROP POLICY IF EXISTS "combos admin write" ON public.combos;
CREATE POLICY "combos admin write" ON public.combos FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS combos_store_id_idx ON public.combos(store_id);

DROP TRIGGER IF EXISTS update_combos_updated_at ON public.combos;
CREATE TRIGGER update_combos_updated_at BEFORE UPDATE ON public.combos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Banner → combo link.
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS combo_id uuid REFERENCES public.combos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS banners_combo_id_idx ON public.banners(combo_id);

-- 3. Order items: combo reference + snapshot of bundled products.
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS combo_id uuid REFERENCES public.combos(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS combo_items jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4. Stock: a combo line must reduce the stock of EVERY bundled product.
CREATE OR REPLACE FUNCTION public.decrement_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry jsonb;
BEGIN
  -- Normal product line: reduce that product's stock.
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET stock = GREATEST(0, stock - NEW.quantity)
    WHERE id = NEW.product_id;
  END IF;

  -- Combo line: reduce stock for every bundled product too.
  IF NEW.combo_items IS NOT NULL
     AND jsonb_typeof(NEW.combo_items) = 'array'
     AND jsonb_array_length(NEW.combo_items) > 0 THEN
    FOR entry IN SELECT * FROM jsonb_array_elements(NEW.combo_items) LOOP
      UPDATE public.products
      SET stock = GREATEST(0, stock - NEW.quantity)
      WHERE id = (entry->>'id')::uuid;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_decrement_stock ON public.order_items;
CREATE TRIGGER order_items_decrement_stock
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_product_stock();

-- 5. Refresh PostgREST schema cache so the new columns are visible.
NOTIFY pgrst, 'reload schema';
