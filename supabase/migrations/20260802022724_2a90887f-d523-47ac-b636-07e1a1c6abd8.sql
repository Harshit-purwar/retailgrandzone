CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_km double precision NOT NULL DEFAULT 8,
  delivery_estimate text NOT NULL DEFAULT '10 minutes',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active stores" ON public.stores FOR SELECT USING (active OR public.is_admin());
CREATE POLICY "Admins manage stores" ON public.stores FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_store_id_idx ON public.products(store_id);
CREATE INDEX IF NOT EXISTS banners_store_id_idx ON public.banners(store_id);

INSERT INTO public.stores (name, city, address, latitude, longitude, radius_km, delivery_estimate, sort_order)
VALUES
  ('The Grand Zone — Kanpur', 'Kanpur', 'Kanpur, Uttar Pradesh', 26.4499, 80.3319, 12, '10 minutes', 1),
  ('The Grand Zone — Kalpi', 'Kalpi', 'Kalpi, Uttar Pradesh', 26.1167, 79.7333, 10, '20 minutes', 2);