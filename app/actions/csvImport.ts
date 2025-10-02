'use server'

import { createClient } from '@/lib/supabase-server'
import type { CSVProduct } from '@/lib/csvParser'

export interface BulkImportResult {
  success: boolean
  imported: number
  errors: string[]
  details?: unknown
}

/**
 * CSV商品データを一括登録
 */
export async function bulkImportProducts(
  products: CSVProduct[]
): Promise<BulkImportResult> {
  try {
    const supabase = await createClient()

    // データベースに挿入するデータを準備
    const inventoryData = products.map(product => ({
      category: product.category || 'その他',
      product_name: product.product_name,
      manufacturer: product.manufacturer || '',
      model_number: product.model_number || '',
      color: product.color || '',
      serial_number: product.serial_number || null,
      condition: product.condition || '新品',
      price: product.price ? parseFloat(product.price) : 0,
      supplier: product.supplier || null,
      list_price: product.list_price ? parseFloat(product.list_price) : null,
      wholesale_price: product.wholesale_price ? parseFloat(product.wholesale_price) : null,
      wholesale_rate: product.wholesale_rate ? parseFloat(product.wholesale_rate) : null,
      gross_margin: product.gross_margin ? parseFloat(product.gross_margin) : null,
      notes: product.notes || null,
      status: product.status || '販売中',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // データベースに一括挿入
    const { data, error } = await supabase
      .from('inventory')
      .insert(inventoryData)
      .select()

    if (error) {
      console.error('Bulk import error:', error)
      return {
        success: false,
        imported: 0,
        errors: [error.message],
        details: error
      }
    }

    // 仕入履歴テーブルにも記録（purchase_dateが指定されている場合）
    const purchaseHistoryData = products
      .filter(p => p.purchase_date && p.wholesale_price)
      .map((product, index) => ({
        product_id: data?.[index]?.id,
        product_name: product.product_name,
        model_number: product.model_number || null,
        serial_number: product.serial_number || null,
        supplier: product.supplier || null,
        purchase_date: product.purchase_date,
        wholesale_price: parseFloat(product.wholesale_price!),
        wholesale_rate: product.wholesale_rate ? parseFloat(product.wholesale_rate) : null,
        quantity: 1,
        notes: product.notes || null,
        created_at: new Date().toISOString()
      }))
      .filter(item => item.product_id)

    if (purchaseHistoryData.length > 0) {
      const { error: historyError } = await supabase
        .from('purchase_history')
        .insert(purchaseHistoryData)

      if (historyError) {
        console.warn('Purchase history insert warning:', historyError)
        // 仕入履歴の登録失敗は警告のみ（商品登録は成功している）
      }
    }

    return {
      success: true,
      imported: data?.length || 0,
      errors: []
    }
  } catch (error) {
    console.error('Bulk import exception:', error)
    return {
      success: false,
      imported: 0,
      errors: ['一括登録処理中にエラーが発生しました'],
      details: error
    }
  }
}
