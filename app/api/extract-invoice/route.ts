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

    // OpenAI Vision APIで画像解析（構造化出力）
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは楽器店の請求書・納品書を解析する専門AIです。
画像から商品情報を正確に抽出し、JSON形式で返してください。

# 抽出ルール
1. 商品名、メーカー、型番は可能な限り正確に抽出
2. 価格は数値のみ（カンマや円記号は除く）
3. カテゴリは以下から最適なものを選択：
   - エレキギター、アコースティックギター、ベース、アンプ、エフェクター
   - ドラム、キーボード・ピアノ、弦、ピック、ケーブル、その他
4. 不明な項目はnullを設定
5. 各項目の信頼度（0.0-1.0）も返す

# 信頼度の基準
- 1.0: 明確に読み取れる
- 0.7-0.9: ほぼ確実だが一部不明瞭
- 0.5-0.6: 推測を含む
- 0.3-0.4: 大部分が推測
- 0.0-0.2: 全く不明`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `この請求書・納品書から**全ての商品行**を抽出してください。

# 重要な指示
1. 請求書の表形式データから**全ての行を必ず抽出**してください
2. 見落としがないよう、上から下まで全ての商品を確認してください
3. 1つの行が1つの商品です
4. 仕入先名は請求書の上部に記載されています
5. 日付は伝票日付または請求日付を使用してください

# 抽出例
請求書に以下のような行がある場合：
- ハワード オレンジオイル / 単価780 → これも商品として抽出
- ライブライン ストラップ LS2000 BC / 単価1,200 → これも商品として抽出
- カナレ 2芯ケーブル L-2T2S 100m BK / 単価10,360 → これも商品として抽出
（表に記載されている全ての商品を抽出してください）

# レスポンス形式
必ず以下のJSON形式で、**全ての商品**を返してください：
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
      "supplier_name": "ヤマハ",
      "confidence": {
        "category": 0.9,
        "product_name": 1.0,
        "manufacturer": 1.0,
        "model_number": 0.8,
        "color": 0.7,
        "retail_price": 1.0,
        "purchase_price": 1.0
      }
    },
    // ... 他の全ての商品
  ]
}

重要:
- JSON以外の文字は含めないでください
- 表に記載されている商品は**全て**抽出してください（一部だけではなく全部）
- 見逃しがないよう慎重に確認してください`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high', // 高解像度モードで詳細分析
              },
            },
          ],
        },
      ],
      max_tokens: 8000, // 多数の商品にも対応
      temperature: 0.1, // 低温度で一貫性のある出力
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