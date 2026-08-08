-- =====================================================================
-- Migration: addresses table, order coordinates, banner product_ids,
--            realtime for orders
-- Safe to run from the Supabase SQL editor (idempotent).
-- =====================================================================

-- ADDRESSES ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address_line text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  pincode text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "addresses own read" ON public.addresses;
DROP POLICY IF EXISTS "addresses own insert" ON public.addresses;
DROP POLICY IF EXISTS "addresses own update" ON public.addresses;
DROP POLICY IF EXISTS "addresses own delete" ON public.addresses;
CREATE POLICY "addresses own read" ON public.addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "addresses own insert" ON public.addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses own update" ON public.addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses own delete" ON public.addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ORDER COORDINATES -----------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS longitude double precision;

-- BANNERS: multiple linked products -------------------------------------
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS product_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

-- REALTIME: live order updates to the admin panel -----------------------
ALTER TABLE public.orders REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END
$$;

-- STOCK: auto-decrement product stock when order items are inserted ------
CREATE OR REPLACE FUNCTION public.decrement_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, stock - NEW.quantity)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_decrement_stock ON public.order_items;
CREATE TRIGGER order_items_decrement_stock
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_product_stock();
