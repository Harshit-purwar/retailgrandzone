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
