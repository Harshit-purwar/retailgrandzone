-- =====================================================================
-- SwiftCart Express — full database setup (idempotent-ish reset)
-- Safe to run on a fresh OR partially-set-up Supabase project.
-- Drops the app's own tables first (previous/grocery schema) then
-- recreates everything the app needs. Image hosting is Cloudinary,
-- so the legacy Supabase storage policies are removed and NOT re-created.
-- =====================================================================

-- Drop legacy storage policies (images now go to Cloudinary)
DROP POLICY IF EXISTS "Public can view store images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload store images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update store images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete store images" ON storage.objects;

-- Drop app tables (child → parent to satisfy FK constraints)
DROP TABLE IF EXISTS public.help_requests CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.banners CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.store_settings CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop app functions & types so re-runs stay clean
DROP FUNCTION IF EXISTS public.is_admin CASCADE;
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- =====================================================================
-- BASE SCHEMA (products, banners, orders, profiles, admin check)
-- =====================================================================

-- ADMIN CHECK ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'purwarharshit3@gmail.com';
$$;

-- PROFILES ---------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- PRODUCTS ---------------------------------------------------------------
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE,
  brand text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  mrp numeric NOT NULL DEFAULT 0,
  image_url text NOT NULL DEFAULT '',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  rating numeric NOT NULL DEFAULT 4.2,
  rating_count integer NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 100,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products admin write" ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- BANNERS ----------------------------------------------------------------
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  cta_text text NOT NULL DEFAULT 'Shop now',
  image_url text NOT NULL DEFAULT '',
  placement text NOT NULL DEFAULT 'hero',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  link_category text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners public read" ON public.banners FOR SELECT USING (true);
CREATE POLICY "banners admin write" ON public.banners FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ORDERS -----------------------------------------------------------------
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address_line text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  payment_status text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'Ordered',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders own read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "orders own insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders update" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin())));
CREATE POLICY "order items insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- =====================================================================
-- STORE SETTINGS, COUPONS, ADMIN ROLES, CATEGORIES, HELP, STORES
-- =====================================================================

CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_fee_enabled boolean NOT NULL DEFAULT true,
  delivery_fee numeric NOT NULL DEFAULT 40,
  free_delivery_above numeric NOT NULL DEFAULT 500,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store settings are viewable by everyone" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admin manages store settings" ON public.store_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.store_settings (delivery_fee_enabled, delivery_fee, free_delivery_above) VALUES (true, 40, 500);

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  max_discount numeric NOT NULL DEFAULT 0,
  free_delivery boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active coupons are viewable by everyone" ON public.coupons FOR SELECT USING (active = true);
CREATE POLICY "Admin manages coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

DROP POLICY IF EXISTS "user_roles admin read" ON public.user_roles;
CREATE POLICY "user_roles admin read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "user_roles admin write" ON public.user_roles;
CREATE POLICY "user_roles admin write" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE lower(email) = 'purwarharshit3@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS delivery_estimate text;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS delivery_estimate text NOT NULL DEFAULT '2-4 Days',
  ADD COLUMN IF NOT EXISTS support_phone text NOT NULL DEFAULT '6392480868';

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (active OR public.is_admin());
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  issue_category text NOT NULL DEFAULT 'Other',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'Open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.help_requests TO authenticated;
GRANT ALL ON public.help_requests TO service_role;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "help own read" ON public.help_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "help own insert" ON public.help_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "help admin update" ON public.help_requests FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_help_requests_updated_at ON public.help_requests;
CREATE TRIGGER update_help_requests_updated_at BEFORE UPDATE ON public.help_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categories (name, sort_order)
SELECT DISTINCT p.category, 0 FROM public.products p
WHERE p.category IS NOT NULL AND p.category <> ''
ON CONFLICT (name) DO NOTHING;

CREATE POLICY "orders admin insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "order items admin insert" ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.is_admin());
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

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

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gift_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS warranty text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS combo_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_keywords text NOT NULL DEFAULT '';

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS cancellation_fee_percent numeric NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS admin_whatsapp text NOT NULL DEFAULT '6392480868';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_gstin text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seller_gstin text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gst_percent numeric NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0;

-- ADDRESSES -------------------------------------------------------------
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
-- Handles both normal lines (product_id) and combo lines (combo_items).
CREATE OR REPLACE FUNCTION public.decrement_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry jsonb;
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET stock = GREATEST(0, stock - NEW.quantity)
    WHERE id = NEW.product_id;
  END IF;
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
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_product_stock();

-- COMBOS: bundle existing products into a discounted combo offer ---------
CREATE TABLE IF NOT EXISTS public.combos (
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
CREATE POLICY "combos public read" ON public.combos FOR SELECT USING (active OR public.is_admin());
CREATE POLICY "combos admin write" ON public.combos FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE INDEX IF NOT EXISTS combos_store_id_idx ON public.combos(store_id);
DROP TRIGGER IF EXISTS update_combos_updated_at ON public.combos;
CREATE TRIGGER update_combos_updated_at BEFORE UPDATE ON public.combos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS combo_id uuid REFERENCES public.combos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS banners_combo_id_idx ON public.banners(combo_id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS combo_id uuid REFERENCES public.combos(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS combo_items jsonb NOT NULL DEFAULT '[]'::jsonb;

-- =====================================================================
-- SEED DATA
-- =====================================================================

INSERT INTO public.products (title, slug, brand, category, description, price, mrp, image_url, rating, rating_count, stock, highlights, specs) VALUES
('Nova Z9 5G (Midnight Blue, 128 GB)', 'nova-z9-5g', 'Nova', 'Mobiles', 'Nova Z9 5G packs a 50MP AI triple camera, a 6.7 inch 120Hz AMOLED display and a 5000mAh battery with 67W fast charging. Built for people who want flagship feel without the flagship price.', 15999, 24999, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80', 4.4, 18420, 50, '["6.7 inch 120Hz AMOLED display","50MP AI triple camera","5000mAh battery with 67W fast charging","8 GB RAM | 128 GB storage"]', '{"Display":"6.7 inch FHD+ AMOLED, 120Hz","Processor":"Octa core 5G, 2.4 GHz","RAM":"8 GB","Storage":"128 GB expandable","Rear Camera":"50MP + 8MP + 2MP","Front Camera":"16MP","Battery":"5000 mAh","Warranty":"1 year brand warranty"}'),
('Pulse Buds Pro Wireless Earbuds', 'pulse-buds-pro', 'Pulse', 'Audio', 'True wireless earbuds with active noise cancellation, 40 hours total playback and low latency gaming mode.', 1799, 4999, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80', 4.2, 9321, 120, '["Active noise cancellation up to 32dB","40 hours total playtime","Low latency gaming mode","IPX5 sweat resistant"]', '{"Type":"True Wireless","Driver":"13mm dynamic","Battery":"40 hours with case","Charging":"USB Type-C, fast charge","Bluetooth":"5.3","Warranty":"1 year"}'),
('AeroBook 14 Thin Laptop (i5, 16GB, 512GB SSD)', 'aerobook-14', 'Aero', 'Laptops', 'Ultra light 1.2 kg magnesium body laptop with a 14 inch 2.8K display, 12th gen processor and all day battery.', 54990, 74990, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80', 4.5, 2140, 25, '["14 inch 2.8K IPS display","Intel Core i5 12th gen","16 GB RAM | 512 GB SSD","1.2 kg ultra light body"]', '{"Processor":"Intel Core i5 12th gen","RAM":"16 GB DDR4","Storage":"512 GB NVMe SSD","Display":"14 inch 2.8K","OS":"Windows 11 Home","Weight":"1.2 kg","Warranty":"1 year onsite"}'),
('Zenith Smart Watch 2', 'zenith-smart-watch-2', 'Zenith', 'Wearables', '1.85 inch AMOLED smartwatch with Bluetooth calling, 120 sports modes, SpO2 and 7 day battery life.', 1999, 6999, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', 4.1, 15220, 200, '["1.85 inch AMOLED always on display","Bluetooth calling with mic","120+ sports modes","7 day battery life"]', '{"Display":"1.85 inch AMOLED","Battery":"7 days typical use","Water Resistance":"IP68","Sensors":"Heart rate, SpO2, sleep","Compatibility":"Android and iOS","Warranty":"1 year"}'),
('Cottonique Men Regular Fit Casual Shirt', 'cottonique-casual-shirt', 'Cottonique', 'Fashion', 'Breathable 100% cotton regular fit shirt with a soft washed finish. Perfect for office days and weekend outings.', 799, 2199, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80', 4.0, 5310, 300, '["100% cotton fabric","Regular fit, full sleeve","Machine washable","Available in multiple sizes"]', '{"Fabric":"100% Cotton","Fit":"Regular","Sleeve":"Full sleeve","Pattern":"Solid","Care":"Machine wash cold","Country of Origin":"India"}'),
('StrideMax Running Shoes', 'stridemax-running-shoes', 'StrideMax', 'Footwear', 'Lightweight running shoes with a cushioned EVA midsole and breathable knit upper for daily runs and gym sessions.', 1299, 3999, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 4.3, 8712, 150, '["Cushioned EVA midsole","Breathable knit upper","Anti-skid rubber outsole","Weighs only 240g"]', '{"Material":"Knit mesh","Sole":"EVA + rubber","Closure":"Lace up","Ideal For":"Running, gym, walking","Warranty":"3 months manufacturing"}'),
('FreshCool 1.5 Ton 5 Star Inverter AC', 'freshcool-inverter-ac', 'FreshCool', 'Appliances', 'Energy efficient 5 star inverter split AC with copper condenser, turbo cool and self diagnosis.', 32990, 52990, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80', 4.2, 3120, 15, '["1.5 ton capacity for medium rooms","5 star energy rating","100% copper condenser","Turbo cool mode"]', '{"Capacity":"1.5 Ton","Energy Rating":"5 Star","Condenser":"Copper","Noise Level":"34 dB","Warranty":"1 year product, 10 years compressor"}'),
('LumenVision 43 inch 4K Smart TV', 'lumenvision-43-4k-tv', 'LumenVision', 'Televisions', '43 inch 4K Ultra HD LED smart TV with HDR10, 30W Dolby audio and built in apps.', 24999, 44999, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80', 4.1, 6440, 30, '["4K Ultra HD 3840x2160 resolution","HDR10 support","30W Dolby audio output","Built in streaming apps"]', '{"Screen Size":"43 inch","Resolution":"4K Ultra HD","Refresh Rate":"60 Hz","Sound":"30W output","Connectivity":"3 HDMI, 2 USB, WiFi","Warranty":"1 year"}'),
('BrewMate Automatic Coffee Maker', 'brewmate-coffee-maker', 'BrewMate', 'Kitchen', 'Drip coffee maker with a 1.2 litre glass carafe, reusable filter and keep warm plate.', 2499, 4999, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80', 4.0, 1890, 80, '["1.2 litre glass carafe","Reusable permanent filter","Keep warm hot plate","Anti drip valve"]', '{"Capacity":"1.2 litre","Power":"800 W","Filter":"Reusable mesh","Material":"Glass and plastic","Warranty":"1 year"}'),
('TrailPack 45L Travel Backpack', 'trailpack-45l-backpack', 'TrailPack', 'Bags', 'Water resistant 45 litre travel backpack with laptop sleeve, rain cover and padded shoulder straps.', 1499, 3499, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 4.4, 4210, 90, '["45 litre spacious capacity","Dedicated 15.6 inch laptop sleeve","Water resistant fabric with rain cover","Padded ergonomic straps"]', '{"Capacity":"45 litres","Material":"Polyester","Laptop Compartment":"Up to 15.6 inch","Weight":"900 g","Warranty":"6 months"}');

INSERT INTO public.banners (title, subtitle, cta_text, image_url, placement, product_id, sort_order)
SELECT 'Nova Z9 5G is here', 'Flagship camera. Mid range price. Starting at Rs 15,999', 'Shop the Nova Z9', 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=1600&q=80', 'hero', id, 1 FROM public.products WHERE slug = 'nova-z9-5g';
INSERT INTO public.banners (title, subtitle, cta_text, image_url, placement, product_id, sort_order)
SELECT 'Big savings on laptops', 'AeroBook 14 at Rs 54,990. Light body, heavy performance.', 'View deal', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600&q=80', 'hero', id, 2 FROM public.products WHERE slug = 'aerobook-14';
INSERT INTO public.banners (title, subtitle, cta_text, image_url, placement, product_id, sort_order)
SELECT 'Audio fest', 'Pulse Buds Pro at 64% off', 'Grab now', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80', 'promo', id, 1 FROM public.products WHERE slug = 'pulse-buds-pro';
INSERT INTO public.banners (title, subtitle, cta_text, image_url, placement, product_id, sort_order)
SELECT 'Step out in style', 'StrideMax running shoes from Rs 1,299', 'Explore', 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1200&q=80', 'promo', id, 2 FROM public.products WHERE slug = 'stridemax-running-shoes';
