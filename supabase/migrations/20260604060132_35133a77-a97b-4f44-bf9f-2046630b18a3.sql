CREATE POLICY "Lecturers manage own course files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'notes' AND public.owns_course(auth.uid(), ((storage.foldername(name))[1])::uuid))
WITH CHECK (bucket_id = 'notes' AND public.owns_course(auth.uid(), ((storage.foldername(name))[1])::uuid));

CREATE POLICY "Enrolled students read course files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'notes' AND public.is_enrolled_approved(auth.uid(), ((storage.foldername(name))[1])::uuid));