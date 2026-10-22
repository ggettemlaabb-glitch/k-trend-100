 "use client";

import { useMemo, useState } from "react";

type Row = { keyword: string; latest: number; series: { date: string; ratio: number }[] };
const today = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const ago = (n: number) => { const d = new Date(); d.setDate(d.getDate()-n); return iso(d); };

export default function Home() {
  const [terms, setTerms] = useState("아이폰, 갤럭시, 다이소, 쿠팡, 올리브영");
  const [period, setPeriod] = useState<"date"|"week"|"month">("date");
  const [startDate, setStartDate] = useState(ago(29));
  const [endDate, setEndDate] = useState(iso(today));
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");

  const max = Math.max(1, ...rows.flatMap(r => r.series.map(p => p.ratio)));
  const csv = useMemo(() => {
    const lines = [["순위","검색어","최근 상대지수"], ...rows.map((r,i)=>[String(i+1),r.keyword,String(r.latest)])];
    return "\uFEFF" + lines.map(x=>x.map(v=>`"${v.replaceAll('"','""')}"`).join(",")).join("\n");
  }, [rows]);

  async function load() {
    setBusy(true); setError("");
    try {
      const list = terms.split(/[,，\n]/).map(x=>x.trim()).filter(Boolean);
      if (!list.length) throw new Error("검색어를 입력해 주세요.");
      if (list.length > 5) throw new Error("현재 네이버 API 비교는 한 번에 최대 5개 검색어까지 지원합니다. 5개 이하로 입력해 주세요.");
      const res = await fetch("/api/trends", {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ terms:list, period, startDate, endDate })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "데이터를 불러오지 못했습니다.");
      setRows(json.rows || []);
      setUpdated(new Date().toLocaleString("ko-KR"));
    } catch (e) { setError(e instanceof Error ? e.message : "오류가 발생했습니다."); }
    finally { setBusy(false); }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    const a = document.createElement("a"); a.href=url; a.download="k-trend-results.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <main className="shell">
    <header className="top"><div className="brand"><span className="mark">K</span><div><b>K-TREND 100</b><small>KOREA SEARCH TREND DASHBOARD</small></div></div><span className="live">● NAVER DATA LAB 연결형 MVP</span></header>
    <section className="hero"><div><p className="eyebrow">KOREAN SEARCH INSIGHTS</p><h1>한국 검색 트렌드를<br/><em>한눈에.</em></h1><p className="sub">관심 키워드의 일간·주간·월간 검색 추이를 비교하세요.</p></div><div className="heroStat"><small>DATA SOURCE</small><strong>NAVER</strong><span>Search Trend API</span></div></section>
    <section className="panel">
      <div className="panelHead"><div><span className="eyebrow">01 / SEARCH</span><h2>검색어 비교</h2></div><span className="hint">최대 5개 동시 비교</span></div>
      <label>비교할 검색어 <small>쉼표 또는 줄바꿈으로 구분</small></label>
      <textarea value={terms} onChange={e=>setTerms(e.target.value)} rows={2} placeholder="예: 아이폰, 갤럭시, 다이소"/>
      <div className="filters">
        <div><label>조회 단위</label><div className="seg">{(["date","week","month"] as const).map((p)=><button key={p} className={period===p?"selected":""} onClick={()=>setPeriod(p)}>{p==="date"?"일간":p==="week"?"주간":"월간"}</button>)}</div></div>
        <div><label>시작일</label><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>
        <div><label>종료일</label><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>
        <button className="primary" onClick={load} disabled={busy}>{busy?"불러오는 중...":"트렌드 조회 →"}</button>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
    <section className="panel results">
      <div className="panelHead"><div><span className="eyebrow">02 / RANKING</span><h2>관심도 순위</h2></div><div className="resultActions">{updated&&<small>업데이트 {updated}</small>}<button className="outline" onClick={download} disabled={!rows.length}>CSV 다운로드 ↓</button></div></div>
      {!rows.length ? <div className="empty"><div className="emptyIcon">↗</div><b>아직 조회된 데이터가 없습니다</b><span>검색어를 입력하고 트렌드 조회를 눌러주세요.</span></div> :
      <><div className="tableHead"><span>RANK / KEYWORD</span><span>최근 상대지수</span></div>{rows.map((r,i)=><div className="rankRow" key={r.keyword}><div className="rankName"><b className={i<3?"topRank":""}>{String(i+1).padStart(2,"0")}</b><strong>{r.keyword}</strong></div><div className="barWrap"><div className="bar"><i style={{width:`${Math.max(1,r.latest/max*100)}%`}}/></div><b>{r.latest.toFixed(1)}</b></div></div>)}</>}
    </section>
    <section className="notice"><b>데이터 해석 안내</b><p>이 화면의 값은 네이버 통합검색의 상대 검색지수이며 실제 검색 횟수가 아닙니다. 네이버 API는 입력한 검색어만 비교하며, 인터넷 전체의 모든 검색어를 자동 수집해 TOP100을 반환하지 않습니다. 현재 버전은 최대 5개 검색어를 같은 요청 안에서 비교하는 MVP입니다.</p></section>
    <footer> K-TREND 100 <span>Built for Korean search insights</span></footer>
  </main>;
}
