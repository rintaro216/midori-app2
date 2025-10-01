-- Create storage bucket for invoice PDFs and images
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-pdfs', 'invoice-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for invoice-pdfs bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload invoice files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoice-pdfs');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated users to read invoice files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'invoice-pdfs');

-- Allow public read access (since bucket is public)
CREATE POLICY "Allow public read access to invoice files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'invoice-pdfs');
