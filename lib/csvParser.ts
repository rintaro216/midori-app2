import Papa from 'papaparse'

export interface CSVProduct {
  category: string
  product_name: string
  manufacturer: string
  model_number: string
  color?: string
  serial_number?: string
  condition?: string
  price?: string
  wholesale_price?: string
  wholesale_rate?: string
  purchase_date?: string
  supplier?: string
  list_price?: string
  gross_margin?: string
  notes?: string
  status?: string
}

export interface ValidationError {
  row: number
  field: string
  message: string
}

export interface ParseResult {
  success: boolean
  products: CSVProduct[]
  errors: ValidationError[]
  totalRows: number
}

const REQUIRED_FIELDS = ['product_name']
const OPTIONAL_FIELDS = [
  'category',
  'manufacturer',
  'model_number',
  'color',
  'serial_number',
  'condition',
  'price',
  'wholesale_price',
  'wholesale_rate',
  'purchase_date',
  'supplier',
  'list_price',
  'gross_margin',
  'notes',
  'status'
]

const VALID_CATEGORIES = [
  'ギター',
  'ベース',
  'ドラム',
  'キーボード・ピアノ',
  'エフェクター',
  'アンプ',
  'その他'
]

const VALID_CONDITIONS = ['新品', '中古', '展示品', 'ジャンク']

/**
 * CSVファイルをパースして商品データを抽出
 */
export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const errors: ValidationError[] = []
    const validProducts: CSVProduct[] = []

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const data = results.data as Record<string, string>[]

        // ヘッダー検証
        const headers = results.meta.fields || []
        const missingRequired = REQUIRED_FIELDS.filter(field => !headers.includes(field))

        if (missingRequired.length > 0) {
          errors.push({
            row: 0,
            field: 'header',
            message: `必須フィールドが不足しています: ${missingRequired.join(', ')}`
          })
        }

        // 各行を検証
        data.forEach((row, index) => {
          const rowNumber = index + 2 // ヘッダー + 0-index補正
          const rowErrors = validateRow(row, rowNumber)
          errors.push(...rowErrors)

          // エラーがない、または軽微なエラーの場合は商品として追加
          if (rowErrors.length === 0 || rowErrors.every(e => e.field !== 'product_name')) {
            validProducts.push(normalizeProduct(row))
          }
        })

        resolve({
          success: errors.length === 0,
          products: validProducts,
          errors,
          totalRows: data.length
        })
      },
      error: (error) => {
        resolve({
          success: false,
          products: [],
          errors: [{
            row: 0,
            field: 'file',
            message: `CSVファイルの読み込みエラー: ${error.message}`
          }],
          totalRows: 0
        })
      }
    })
  })
}

/**
 * 行のバリデーション
 */
function validateRow(row: Record<string, string>, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = []

  // 必須フィールドチェック
  REQUIRED_FIELDS.forEach(field => {
    const value = row[field]?.trim()
    if (!value) {
      errors.push({
        row: rowNumber,
        field,
        message: `${field}は必須項目です`
      })
    }
  })

  // カテゴリの値チェック（値がある場合のみ）
  if (row.category && !VALID_CATEGORIES.includes(row.category.trim())) {
    errors.push({
      row: rowNumber,
      field: 'category',
      message: `無効なカテゴリです。有効な値: ${VALID_CATEGORIES.join(', ')}`
    })
  }

  // 状態の値チェック（値がある場合のみ）
  if (row.condition && !VALID_CONDITIONS.includes(row.condition.trim())) {
    errors.push({
      row: rowNumber,
      field: 'condition',
      message: `無効な状態です。有効な値: ${VALID_CONDITIONS.join(', ')}`
    })
  }

  // 数値フィールドのチェック（値がある場合のみ）
  const numericFields = ['price', 'wholesale_price', 'list_price', 'gross_margin']
  numericFields.forEach(field => {
    const value = row[field]?.trim()
    if (value && isNaN(Number(value))) {
      errors.push({
        row: rowNumber,
        field,
        message: `${field}は数値で入力してください`
      })
    }
  })

  // パーセンテージフィールドのチェック（値がある場合のみ）
  if (row.wholesale_rate) {
    const rate = Number(row.wholesale_rate.trim())
    if (isNaN(rate) || rate < 0 || rate > 100) {
      errors.push({
        row: rowNumber,
        field: 'wholesale_rate',
        message: 'wholesale_rateは0-100の数値で入力してください'
      })
    }
  }

  // 日付フィールドのチェック（値がある場合のみ、YYYY-MM-DD形式）
  if (row.purchase_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(row.purchase_date.trim())) {
      errors.push({
        row: rowNumber,
        field: 'purchase_date',
        message: 'purchase_dateはYYYY-MM-DD形式で入力してください'
      })
    }
  }

  return errors
}

/**
 * 商品データの正規化
 */
function normalizeProduct(row: Record<string, string>): CSVProduct {
  return {
    category: row.category?.trim() || 'その他',
    product_name: row.product_name?.trim() || '',
    manufacturer: row.manufacturer?.trim() || '',
    model_number: row.model_number?.trim() || '',
    color: row.color?.trim(),
    serial_number: row.serial_number?.trim(),
    condition: row.condition?.trim() || '新品',
    price: row.price?.trim(),
    wholesale_price: row.wholesale_price?.trim(),
    wholesale_rate: row.wholesale_rate?.trim(),
    purchase_date: row.purchase_date?.trim(),
    supplier: row.supplier?.trim(),
    list_price: row.list_price?.trim(),
    gross_margin: row.gross_margin?.trim(),
    notes: row.notes?.trim(),
    status: row.status?.trim() || '販売中'
  }
}

/**
 * サンプルCSVの生成
 */
export function generateSampleCSV(): string {
  const headers = [
    'category',
    'product_name',
    'manufacturer',
    'model_number',
    'color',
    'serial_number',
    'condition',
    'price',
    'wholesale_price',
    'wholesale_rate',
    'purchase_date',
    'supplier',
    'list_price',
    'gross_margin',
    'notes',
    'status'
  ]

  const sampleData = [
    [
      'ギター',
      'Stratocaster',
      'Fender',
      'ST-62',
      'ヴィンテージサンバースト',
      'V123456',
      '中古',
      '85000',
      '60000',
      '50.0',
      '2024-01-15',
      '楽器商事',
      '120000',
      '25000',
      'ソフトケース付き',
      '販売中'
    ],
    [
      'ベース',
      'Jazz Bass',
      'Fender',
      'JB-62',
      'ブラック',
      '',
      '新品',
      '120000',
      '90000',
      '50.0',
      '2024-02-01',
      '島村楽器',
      '180000',
      '30000',
      '',
      '販売中'
    ],
    [
      'ドラム',
      'Stage Custom',
      'YAMAHA',
      'SBP2F5',
      'ナチュラル',
      '',
      '中古',
      '75000',
      '50000',
      '50.0',
      '2024-01-20',
      'ヤマハ',
      '100000',
      '25000',
      'シンバル別売',
      '販売中'
    ],
    [
      'キーボード・ピアノ',
      'Clavinova',
      'YAMAHA',
      'CLP-735',
      'ホワイト',
      '',
      '展示品',
      '180000',
      '125000',
      '50.0',
      '2024-01-10',
      'ヤマハ',
      '250000',
      '55000',
      '椅子付き',
      '展示中'
    ]
  ]

  const csv = [
    headers.join(','),
    ...sampleData.map(row =>
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n')

  return csv
}

/**
 * 商品データをCSV形式に変換
 */
export function productsToCSV(products: CSVProduct[]): string {
  const headers = [
    'category',
    'product_name',
    'manufacturer',
    'model_number',
    'color',
    'serial_number',
    'condition',
    'price',
    'wholesale_price',
    'wholesale_rate',
    'purchase_date',
    'supplier',
    'list_price',
    'gross_margin',
    'notes',
    'status'
  ]

  const rows = products.map(product => {
    return headers.map(header => {
      const value = product[header as keyof CSVProduct] || ''
      return `"${value.toString().replace(/"/g, '""')}"`
    }).join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}
