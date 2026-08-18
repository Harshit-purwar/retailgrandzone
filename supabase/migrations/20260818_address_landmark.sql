-- Add a landmark field to saved addresses (Flipkart-style delivery form).
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS landmark text NOT NULL DEFAULT '';
-- Record the landmark on placed orders too so it appears on the order/invoice.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS landmark text NOT NULL DEFAULT '';
