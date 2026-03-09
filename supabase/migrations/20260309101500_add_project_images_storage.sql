-- Create a public bucket for project images used in admin uploads.
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for project images.
CREATE POLICY "Public can read project images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'project-images');

-- Admin-only upload/update/delete for project images.
CREATE POLICY "Admins can upload project images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-images'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update project images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-images'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete project images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-images'
  AND public.has_role(auth.uid(), 'admin')
);
