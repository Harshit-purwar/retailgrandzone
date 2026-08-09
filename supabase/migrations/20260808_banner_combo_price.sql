-- =====================================================================
-- Migration: banners combo price
-- The banner combo offer price (when set with product_ids, the banner
-- renders its selected products as a combo at this price).
-- Safe to run from the Supabase SQL editor (idempotent).
-- =====================================================================

ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0;
