'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { parseCSV, generateSampleCSV, productsToCSV, type CSVProduct, type ValidationError } from '@/lib/csvParser'
import { bulkImportProducts } from '@/app/actions/csvImport'
import CSVConfirmationTable from '@/components/CSVConfirmationTable'

type Step = 'upload' | 'confirm' | 'complete'

export default function CSVImportPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [parsedProducts, setParsedProducts] = useState<CSVProduct[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // CSVファイル選択
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setMessage(null)
    setErrorMessage(null)
    setValidationErrors([])

    try {
      const result = await parseCSV(file)

      if (result.errors.length > 0) {
        setValidationErrors(result.errors)
        setErrorMessage(`${result.errors.length}件のエラーが見つかりました`)
      }

      if (result.products.length > 0) {
        setParsedProducts(result.products)
        setCurrentStep('confirm')
        setMessage(`${result.products.length}件の商品データを読み込みました`)
      } else {
        setErrorMessage('有効な商品データが見つかりませんでした')
      }
    } catch (error) {
      console.error('CSV parse error:', error)
      setErrorMessage('CSVファイルの解析中にエラーが発生しました')
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 一括登録実行
  const handleRegister = async () => {
    if (parsedProducts.length === 0) {
      setErrorMessage('登録する商品がありません')
      return
    }

    setIsRegistering(true)
    setMessage(null)
    setErrorMessage(null)

    try {
      const result = await bulkImportProducts(parsedProducts)

      if (result.success) {
        setMessage(`${result.imported}件の商品を登録しました！`)
        setCurrentStep('complete')
        setTimeout(() => {
          router.push('/inventory')
        }, 2000)
      } else {
        setErrorMessage(result.errors.join(', '))
      }
    } catch (error) {
      console.error('Bulk import error:', error)
      setErrorMessage('一括登録中にエラーが発生しました')
    } finally {
      setIsRegistering(false)
    }
  }

  // サンプルCSVダウンロード
  const handleDownloadSample = () => {
    const csv = generateSampleCSV()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'みどり楽器_在庫登録サンプル.csv'
    link.click()
  }

  // 確認済みデータをCSVダウンロード
  const handleDownloadConfirmedCSV = () => {
    const csv = productsToCSV(parsedProducts)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'みどり楽器_在庫登録データ_確認済み.csv'
    link.click()
  }

  // リセット
  const handleReset = () => {
    setParsedProducts([])
    setValidationErrors([])
    setMessage(null)
    setErrorMessage(null)
    setCurrentStep('upload')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 sm:py-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                📊 CSV一括登録
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                CSVファイルから商品を一括登録
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="ml-4 px-3 py-2 sm:px-4 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md"
            >
              ダッシュボードに戻る
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        {/* ステップインジケーター */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-center space-x-4 sm:space-x-8">
            <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : currentStep === 'confirm' || currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${
                currentStep === 'upload' ? 'border-blue-600 bg-blue-50' : currentStep === 'confirm' || currentStep === 'complete' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-gray-50'
              }`}>
                {currentStep === 'confirm' || currentStep === 'complete' ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">1</span>
                )}
              </div>
              <span className="ml-2 sm:ml-3 text-sm sm:text-base font-medium hidden sm:inline">CSVアップロード</span>
              <span className="ml-2 text-xs font-medium sm:hidden">アップロード</span>
            </div>

            <div className={`w-8 sm:w-16 h-1 ${currentStep === 'confirm' || currentStep === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`}></div>

            <div className={`flex items-center ${currentStep === 'confirm' ? 'text-blue-600' : currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${
                currentStep === 'confirm' ? 'border-blue-600 bg-blue-50' : currentStep === 'complete' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-gray-50'
              }`}>
                {currentStep === 'complete' ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">2</span>
                )}
              </div>
              <span className="ml-2 sm:ml-3 text-sm sm:text-base font-medium hidden sm:inline">確認・編集</span>
              <span className="ml-2 text-xs font-medium sm:hidden">確認</span>
            </div>

            <div className={`w-8 sm:w-16 h-1 ${currentStep === 'complete' ? 'bg-green-600' : 'bg-gray-300'}`}></div>

            <div className={`flex items-center ${currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${
                currentStep === 'complete' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-gray-50'
              }`}>
                {currentStep === 'complete' ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">3</span>
                )}
              </div>
              <span className="ml-2 sm:ml-3 text-sm sm:text-base font-medium hidden sm:inline">登録完了</span>
              <span className="ml-2 text-xs font-medium sm:hidden">完了</span>
            </div>
          </div>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-green-100 border border-green-400 text-green-700 text-sm sm:text-base">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-red-100 border border-red-400 text-red-700 text-sm sm:text-base">
            {errorMessage}
          </div>
        )}

        {/* バリデーションエラー表示 */}
        {validationErrors.length > 0 && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-yellow-50 border border-yellow-400">
            <h4 className="text-sm sm:text-base font-medium text-yellow-800 mb-2">
              ⚠️ 検証エラー ({validationErrors.length}件)
            </h4>
            <div className="max-h-40 sm:max-h-60 overflow-y-auto">
              <ul className="space-y-1 text-xs sm:text-sm text-yellow-700">
                {validationErrors.slice(0, 10).map((error, index) => (
                  <li key={index}>
                    行{error.row}: {error.field} - {error.message}
                  </li>
                ))}
                {validationErrors.length > 10 && (
                  <li className="text-yellow-600">...他{validationErrors.length - 10}件</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* コンテンツエリア */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          {/* ステップ1: アップロード */}
          {currentStep === 'upload' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  CSVファイルをアップロード
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  商品データが入ったCSVファイルを選択してください
                </p>
              </div>

              {/* ファイルアップロードエリア */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8">
                <div className="text-center">
                  <svg
                    className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={isProcessing}
                    className="hidden"
                  />

                  <div className="mt-4 space-y-3 sm:space-y-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {isProcessing ? '読み込み中...' : 'CSVファイルを選択'}
                    </button>

                    <button
                      onClick={handleDownloadSample}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-sm sm:text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      サンプルCSVをダウンロード
                    </button>
                  </div>
                </div>
              </div>

              {/* 使い方ガイド */}
              <div className="mt-6 sm:mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-medium text-blue-800 mb-3">💡 使い方</h3>
                <div className="text-xs sm:text-sm text-blue-700 space-y-2">
                  <p><strong>1.</strong> サンプルCSVをダウンロードして、フォーマットを確認</p>
                  <p><strong>2.</strong> Excelなどで商品データを入力・編集</p>
                  <p><strong>3.</strong> CSV形式で保存してアップロード</p>
                  <p><strong>4.</strong> 内容を確認して一括登録</p>
                  <p className="mt-3 text-blue-900 font-medium">
                    📝 必須項目: 商品名
                  </p>
                </div>
              </div>

              {/* フィールド説明 */}
              <div className="mt-6 text-left">
                <h4 className="text-sm sm:text-base font-medium text-gray-900 mb-3">📋 フィールド説明</h4>
                <div className="text-xs sm:text-sm text-gray-600 space-y-1 grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-1">
                  <div className="space-y-1">
                    <p>• <strong>category</strong>: カテゴリ</p>
                    <p>• <strong>product_name</strong>: 商品名（必須）</p>
                    <p>• <strong>manufacturer</strong>: メーカー</p>
                    <p>• <strong>model_number</strong>: 品番</p>
                    <p>• <strong>color</strong>: カラー</p>
                    <p>• <strong>serial_number</strong>: シリアル番号</p>
                    <p>• <strong>condition</strong>: 状態</p>
                    <p>• <strong>price</strong>: 販売価格</p>
                  </div>
                  <div className="space-y-1">
                    <p>• <strong>supplier</strong>: 仕入先</p>
                    <p>• <strong>list_price</strong>: 定価</p>
                    <p>• <strong>wholesale_price</strong>: 仕入値</p>
                    <p>• <strong>wholesale_rate</strong>: 仕入掛け率(%)</p>
                    <p>• <strong>purchase_date</strong>: 仕入日(YYYY-MM-DD)</p>
                    <p>• <strong>gross_margin</strong>: 粗利</p>
                    <p>• <strong>notes</strong>: 備考</p>
                    <p>• <strong>status</strong>: ステータス</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ステップ2: 確認・編集 */}
          {currentStep === 'confirm' && (
            <div>
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  別のCSVをアップロード
                </button>

                <button
                  onClick={handleDownloadConfirmedCSV}
                  className="inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  確認済みデータをCSV出力
                </button>
              </div>

              <CSVConfirmationTable
                products={parsedProducts}
                onProductsChange={setParsedProducts}
                onRegister={handleRegister}
                onCancel={handleReset}
                isRegistering={isRegistering}
              />
            </div>
          )}

          {/* ステップ3: 完了 */}
          {currentStep === 'complete' && (
            <div className="text-center py-8 sm:py-12">
              <div className="mx-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-green-100 mb-4">
                <svg className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                登録完了！
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                商品データをデータベースに登録しました
              </p>
              <button
                onClick={() => router.push('/inventory')}
                className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-md text-sm sm:text-base font-medium hover:bg-blue-700"
              >
                在庫一覧を見る
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
