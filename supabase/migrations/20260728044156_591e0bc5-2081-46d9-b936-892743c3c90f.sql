CREATE POLICY "Public can view store images" ON storage.objects FOR SELECT USING (bucket_id = 'store-images');
CREATE POLICY "Admin can upload store images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store-images' AND public.is_admin());
CREATE POLICY "Admin can update store images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'store-images' AND public.is_admin());
CREATE POLICY "Admin can delete store images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'store-images' AND public.is_admin());