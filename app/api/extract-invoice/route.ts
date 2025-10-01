import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });
    }

    // ファイルタイプチェック - 画像のみサポート
    const isImage = file.type.startsWith('image/');

    if (!isImage) {
      return NextResponse.json(
        { error: '現在は画像ファイル（JPEG、PNG、WebP）のみ対応しています。PDFの場合は、スクリーンショットや写真として保存してアップロードしてください。' },
        { status: 400 }
      );
    }

    // 画像をBase64に変換
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;

    // OpenAI Vision APIで画像解析
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `これは楽器店の請求書または納品書の画像です。以下の情報を抽出してJSON形式で返してください：

商品ごとに以下の情報を抽出：
- category: 商品カテゴリ（エレキギター、ベース、アンプ、アコギ、エフェクター、弦、ピック、ケーブル等）
- product_name: 商品名
- manufacturer: メーカー名
- model_number: 型番（あれば）
- color: 色（あれば）
- retail_price: 販売価格（数値のみ）
- purchase_price: 仕入価格（数値のみ）
- quantity: 数量（デフォルト1）
- purchase_date: 仕入日（YYYY-MM-DD形式、画像から推測）
- supplier_name: 仕入先名

レスポンスは必ず以下のJSON形式で：
{
  "items": [
    {
      "category": "エレキギター",
      "product_name": "ST-62",
      "manufacturer": "フェンダー",
      "model_number": "ST62-VS",
      "color": "サンバースト",
      "retail_price": 100000,
      "purchase_price": 80000,
      "quantity": 1,
      "purchase_date": "2025-09-30",
      "supplier_name": "ヤマハ"
    }
  ]
}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('AIからのレスポンスが空です');
    }

    // JSONを抽出（マークダウンコードブロックを除去）
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const result = JSON.parse(jsonStr);

    return NextResponse.json({
      success: true,
      items: result.items || [],
      message: 'AI解析が完了しました',
    });
  } catch (error: any) {
    console.error('Extract invoice error:', error);
    return NextResponse.json(
      { error: 'ファイルの処理に失敗しました: ' + error.message },
      { status: 500 }
    );
  }
}