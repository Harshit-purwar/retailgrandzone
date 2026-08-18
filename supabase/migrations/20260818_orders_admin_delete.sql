-- Allow admins to delete orders so old orders can be cleaned up from the admin
-- panel (order_items cascade on delete; reviews / help requests / coin ledger
-- rows reference orders with ON DELETE SET NULL, so deletion is safe).
CREATE POLICY "orders admin delete" ON public.orders
  FOR DELETE TO authenticated
  USING (public.is_admin());
