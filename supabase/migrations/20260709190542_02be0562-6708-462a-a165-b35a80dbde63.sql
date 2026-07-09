
CREATE POLICY "own vendor logos read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'vendor-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "own vendor logos insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vendor-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "own vendor logos update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vendor-logos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'vendor-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "own vendor logos delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vendor-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
