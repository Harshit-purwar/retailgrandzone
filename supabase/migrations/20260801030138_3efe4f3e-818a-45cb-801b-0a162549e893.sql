
CREATE POLICY "orders admin insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "order items admin insert" ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.is_admin());
