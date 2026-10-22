import { NextResponse } from "next/server";

function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function tag(xml: string, name: string) {
  const match = xml.match(new RegExp("<(?:[\\w.-]+:)?"+name+"[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?"+name+">", "i"));
  return match ? decodeXml(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim()) : "";
}
export async function GET() {
  try {
    const response = await fetch("https://trends.google.com/trending/rss?geo=KR", {
      headers: { "User-Agent": "Mozilla/5.0 K-TREND100/1.0" },
      next: { revalidate: 900 }
    });
    if (!response.ok) return NextResponse.json({ error: "Google Trends 피드를 가져오지 못했습니다." }, { status: 502 });
    const xml = await response.text();
    const items: { title: string; traffic: string; published: string; source: string }[] = [];
    const itemPattern = /<item>([\\s\\S]*?)<\\/item>/gi;
    let match: RegExpExecArray | null;
    while ((match = itemPattern.exec(xml)) !== null) {
      const item = {
        title: tag(match[1], "title"),
        traffic: tag(match[1], "approx_traffic"),
        published: tag(match[1], "pubDate"),
        source: "Google Trends KR"
      };
      if (item.title) items.push(item);
    }
    return NextResponse.json({
      items,
      note: "Google Trends 대한민국 공개 RSS의 급상승 검색어입니다. 공개 피드가 제공하는 일부 항목만 표시하며 전체 검색량 TOP100이 아닙니다.",
      fetchedAt: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({ error: "트렌드 피드 연결 중 오류가 발생했습니다." }, { status: 502 });
  }
}
