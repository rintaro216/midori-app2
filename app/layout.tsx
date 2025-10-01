import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "みどり楽器 商品整理アプリ",
  description: "在庫管理・請求書管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}