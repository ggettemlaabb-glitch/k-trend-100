import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "K-TREND 100 | 검색 트렌드",
  description: "한국어 검색어 관심도 트렌드 대시보드"
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
