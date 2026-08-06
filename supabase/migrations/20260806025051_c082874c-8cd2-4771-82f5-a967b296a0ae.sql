ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_gstin text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seller_gstin text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gst_percent numeric NOT NULL DEFAULT 0;