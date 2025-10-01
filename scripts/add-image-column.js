const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function addImageColumn() {
  console.log('Adding image_url column to inventory table...');

  // Note: Direct table alteration requires service_role key, not anon key
  // This script is for reference. Run SQL directly in Supabase SQL Editor instead:
  // ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT;

  console.log('Please run this SQL in Supabase SQL Editor:');
  console.log('ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT;');
}

addImageColumn();
