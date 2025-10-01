// データベース型定義

export type UserRole = 'admin' | 'staff';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type InventoryStatus = 'available' | 'reserved' | 'repair' | 'display' | 'sold';
export type InventoryCondition = 'new' | 'used' | 'display';

export interface Inventory {
  id: string;
  category: string;
  product_name: string;
  manufacturer: string | null;
  model_number: string | null;
  color: string | null;
  serial_number: string | null;
  retail_price: number | null;
  purchase_price: number | null;
  purchase_discount_rate: number | null;
  purchase_date: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  status: InventoryStatus;
  condition: InventoryCondition | null;
  condition_notes: string | null;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AIStatus = 'success' | 'needs_review' | 'failed' | 'manual';

export interface PurchaseHistory {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  invoice_pdf_url: string | null;
  supplier_id: string | null;
  supplier_name: string;
  inventory_id: string | null;
  product_name: string;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  color: string | null;
  purchase_price: number;
  purchase_discount_rate: number | null;
  retail_price: number | null;
  ai_confidence: number | null;
  ai_status: AIStatus | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceProcessingStatus = 'pending' | 'processing' | 'completed' | 'needs_review' | 'failed';

export interface Invoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  supplier_id: string | null;
  supplier_name: string;
  pdf_url: string;
  pdf_file_name: string;
  pdf_file_size: number | null;
  processing_status: InvoiceProcessingStatus;
  total_items: number;
  successful_reads: number;
  needs_review_count: number;
  failed_reads: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}