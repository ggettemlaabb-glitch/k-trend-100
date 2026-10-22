import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "K-TREND 100",
  description: "대한민국 검색 트렌드 대시보드"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
