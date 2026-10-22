import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ error: "네이버 API 인증키가 설정되지 않았습니다. Vercel 환경변수를 확인해 주세요." }, { status: 500 });

  try {
    const body = await request.json();
    const groups = Array.isArray(body.keywordGroups) ? body.keywordGroups.slice(0, 5) : [];
    if (!groups.length) return NextResponse.json({ error: "비교할 검색어를 입력해 주세요." }, { status: 400 });
    const timeUnit = ["date", "week", "month"].includes(body.timeUnit) ? body.timeUnit : "date";
    const response = await fetch("https://naverapihub.apigw.ntruss.com/search-trend/v1/search", {
      method: "POST",
      headers: { "X-NCP-APIGW-API-KEY-ID": clientId, "X-NCP-APIGW-API-KEY": clientSecret, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: body.startDate, endDate: body.endDate, timeUnit, keywordGroups: groups })
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.message || data.error || "네이버 API 요청에 실패했습니다.", detail: data }, { status: response.status });
    return NextResponse.json({ results: data.results || [], note: "네이버 검색 관심도 상대지수입니다. 실제 검색 횟수가 아닙니다." });
  } catch {
    return NextResponse.json({ error: "요청 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
