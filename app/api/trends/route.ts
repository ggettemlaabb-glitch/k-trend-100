
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "네이버 API 인증키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const body: {
      terms?: string[];
      period?: string;
      startDate?: string;
      endDate?: string;
    } = await request.json();

    const terms = Array.isArray(body.terms) ? body.terms : [];
    const keywords = Array.from(
      new Set(terms.map((x) => String(x).trim()).filter(Boolean))
    ).slice(0, 5);

    if (!keywords.length) {
      return NextResponse.json(
        { error: "검색어를 입력해 주세요." },
        { status: 400 }
      );
    }

    const period = ["date", "week", "month"].includes(body.period || "")
      ? body.period!
      : "date";

    const response = await fetch(
      "https://naverapihub.apigw.ntruss.com/search-trend/v1/search",
      {
        method: "POST",
        headers: {
          "X-NCP-APIGW-API-KEY-ID": clientId,
          "X-NCP-APIGW-API-KEY": clientSecret,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          startDate: body.startDate,
          endDate: body.endDate,
          timeUnit: period,
          keywordGroups: keywords.map((term) => ({
            groupName: term,
            keywords: [term]
          }))
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "네이버 API 오류" },
        { status: response.status }
      );
    }

    const rows = (data.results || []).map((item: any) => ({
      keyword: item.title,
      series: item.data || [],
      latest: item.data?.at(-1)?.ratio || 0
    })).sort((a: any, b: any) => b.latest - a.latest);

    return NextResponse.json({
      rows,
      note: "네이버 검색 상대지수입니다. 실제 검색 횟수가 아닙니다."
    });
  } catch {
    return NextResponse.json(
      { error: "데이터 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
