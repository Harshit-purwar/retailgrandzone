
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

-- SEED -------------------------------------------------------------------
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
