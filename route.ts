import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) {
    return NextResponse.json({ error: "서버에 네이버 API 인증 정보가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { terms, period, startDate, endDate } = body as {
      terms: string[]; period: "date" | "week" | "month"; startDate: string; endDate: string;
    };

    const cleanTerms = [...new Set((terms || []).map((x) => String(x).trim()).filter(Boolean))].slice(0, 5);
    if (!cleanTerms.length) return NextResponse.json({ error: "검색어를 한 개 이상 입력해 주세요." }, { status: 400 });
    if (!["date", "week", "month"].includes(period)) return NextResponse.json({ error: "기간 단위가 올바르지 않습니다." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
      return NextResponse.json({ error: "조회 날짜를 확인해 주세요." }, { status: 400 });
    }

    const response = await fetch("https://naverapihub.apigw.ntruss.com/search-trend/v1/search", {
      method: "POST",
      headers: {
        "X-NCP-APIGW-API-KEY-ID": id,
        "X-NCP-APIGW-API-KEY": secret,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startDate, endDate, timeUnit: period,
        keywordGroups: cleanTerms.map((term) => ({ groupName: term, keywords: [term] }))
      }),
      cache: "no-store"
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.message || data?.error?.message || `네이버 API 오류 (${response.status})` }, { status: response.status });
    }

    const rows = (data.results || []).map((r: any) => {
      const series = (r.data || []).map((d: any) => ({ date: d.period, ratio: Number(d.ratio) }));
      const latest = series.length ? series[series.length - 1].ratio : 0;
      return { keyword: r.title, latest, series };
    }).sort((a: any, b: any) => b.latest - a.latest);

    return NextResponse.json({
      rows, startDate, endDate, period,
      note: "네이버 통합검색 상대지수입니다. 절대 검색 횟수가 아닙니다."
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "요청을 처리하지 못했습니다. 입력값과 API 설정을 확인해 주세요." }, { status: 500 });
  }
}
