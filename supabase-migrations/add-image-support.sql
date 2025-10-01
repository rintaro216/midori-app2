-- Add image_url column to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for product images (run this in Supabase SQL Editor or Dashboard)
-- Note: Storage buckets are created via Supabase Dashboard or API, not SQL
-- This is a documentation file for reference

/*
Supabase Dashboard での手順:
1. Storage > Create Bucket
2. Bucket name: product-images
3. Public bucket: Yes (商品画像は公開)
4. File size limit: 5MB
5. Allowed MIME types: image/jpeg, image/png, image/webp
*/

-- RLS policy for product-images bucket (if needed)
-- CREATE POLICY "Allow authenticated users to upload product images"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'product-images');

-- CREATE POLICY "Allow public read access to product images"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'product-images');
