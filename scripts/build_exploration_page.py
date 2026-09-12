#!/usr/bin/env python3
"""우주탐사 특허 심층 현황 페이지 생성 → docs/exploration/index.html

데이터: analysis/exploration_deepdive.json (BigQuery Google Patents Public Datasets 유래만 사용).
디자인: 기존 사이트 토큰(--black/--panel-solid/--accent #8fabd4/--cream #efece3, Pretendard).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = json.load(open(ROOT / 'analysis/exploration_deepdive.json', encoding='utf-8'))

NAMES = {'DS-1': '달탐사', 'DS-2': '행성탐사', 'DS-3': '우주 추진', 'DS-4': '통신·항법',
         'DS-5': 'EDL·샘플귀환', 'DS-6': '생명유지·방사선', 'DS-7': '과학탑재체', 'DS-8': '탐사 로봇'}
KO_APP = {'KOREA AEROSPACE RES INST': '한국항공우주연구원', 'BOEING CO': '보잉',
          'AGENCY DEFENSE DEV': '국방과학연구소', 'SAMSUNG THALES CO LTD': '삼성탈레스(現 한화시스템)',
          'KOREA ELECTRONICS TELECOMM': '한국전자통신연구원', 'THALES SA': '탈레스',
          'UNIV SOGANG IND UNIV COOP FOUN': '서강대 산학협력단', 'SAMSUNG ELECTRONICS CO LTD': '삼성전자'}
EXPLORE_ONLY = {'DS-1', 'DS-2', 'DS-8'}

groups = sorted(D['groups'], key=lambda g: -sum(g['pop']))
pop_max = max(sum(g['pop']) for g in groups)

def bar_rows():
    out = []
    for g in groups:
        total = sum(g['pop'])
        pct = total / D['population_total'] * 100
        cls = 'accent' if g['id'] in EXPLORE_ONLY else ''
        w = max(total / pop_max * 100, 0.6)
        out.append(f'''<div class="row"><span class="lbl">{g["id"]} {NAMES[g["id"]]}</span>
<div class="track"><div class="fill {cls}" style="width:{w:.1f}%"></div></div>
<span class="val">{total}<em> ({pct:.1f}%)</em></span></div>''')
    return '\n'.join(out)

def heat_cells():
    out = []
    for g in sorted(D['groups'], key=lambda g: g['id']):
        out.append(f'<div class="h-lbl">{g["id"]} {NAMES[g["id"]]}</div>')
        for v in g['pop']:
            a = 0 if v == 0 else 0.18 + 0.72 * min(v, 200) / 200
            out.append(f'<div class="h-cell" style="background:rgba(143,171,212,{a:.2f})">{v or ""}</div>')
    return '\n'.join(out)

def app_rows():
    mx = D['top_applicants'][0][1]
    out = []
    for i, (name, n) in enumerate(D['top_applicants']):
        cls = 'accent' if i == 0 else ''
        out.append(f'''<div class="row"><span class="lbl">{KO_APP.get(name, name)}</span>
<div class="track"><div class="fill {cls}" style="width:{n/mx*100:.0f}%"></div></div><span class="val">{n}</span></div>''')
    return '\n'.join(out)

def cited_rows():
    return '\n'.join(
        f'<tr><td>{t["title"]}</td><td class="num">{t["cites"]}</td></tr>' for t in D['top_cited'])

explore_total = sum(sum(g['pop']) for g in D['groups'] if g['id'] in EXPLORE_ONLY)
big2 = sum(sum(g['pop']) for g in D['groups'] if g['id'] in ('DS-3', 'DS-4'))
big2_pct = big2 / D['population_total'] * 100
explore_pct = explore_total / D['population_total'] * 100
html = f'''<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>우주탐사 특허 심층 현황 — AEROPATENT</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
:root{{--black:#000;--panel:#07090ea3;--border:#efece31f;--border-s:#8fabd466;--text:#efece3;
--muted:#efece399;--dim:#efece35c;--accent:#8fabd4;--deep:#4a70a9;--cream:#efece3}}
*{{box-sizing:border-box}}html,body{{max-width:100%;overflow-x:hidden}}body{{margin:0;background:var(--black);color:var(--text);overflow-wrap:anywhere;
font-family:"Pretendard Variable",Pretendard,system-ui,sans-serif;-webkit-font-smoothing:antialiased;
background-image:radial-gradient(1200px 820px at 82% -12%,#8fabd41a,#0000 58%),radial-gradient(1000px 760px at -8% 8%,#4a70a914,#0000 56%);background-attachment:fixed;min-height:100vh}}
.wrap{{max-width:1080px;margin:0 auto;padding:48px 24px 80px}}
a{{color:var(--accent)}}
.kicker{{font-size:13px;letter-spacing:.14em;color:var(--accent);font-weight:700}}
h1{{font-size:clamp(28px,4.5vw,42px);margin:.35em 0 .3em;font-weight:800}}
.sub{{color:var(--muted);font-size:15px;max-width:760px;line-height:1.6}}
.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:14px;margin:34px 0}}
.kpi,.panel,.row>*{{min-width:0}}
.kpi{{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:20px 22px;backdrop-filter:blur(20px) saturate(130%)}}
.kpi b{{display:block;font-size:32px;font-weight:800;color:var(--cream)}}
.kpi.hot b{{color:var(--accent)}}
.kpi span{{color:var(--muted);font-size:12.5px}}
.panel{{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:26px 28px;margin:22px 0;backdrop-filter:blur(20px) saturate(130%)}}
.panel h2{{margin:0 0 6px;font-size:19px}}
.panel .caption{{margin:0 0 10px;font-size:12px;color:var(--dim);line-height:1.5;word-break:keep-all}}
.panel .note{{color:var(--muted);font-size:13px;margin:0 0 18px;line-height:1.55}}
.row{{display:grid;grid-template-columns:172px minmax(0,1fr) 118px;gap:12px;align-items:center;margin:7px 0}}
.lbl{{font-size:13px;color:var(--muted);text-align:left}}
.track{{background:#efece30d;border-radius:5px;height:16px;overflow:hidden}}
.fill{{height:100%;background:var(--deep);border-radius:5px}}
.fill.accent{{background:var(--accent)}}
.val{{font-size:13px;font-weight:700}}.val em{{color:var(--dim);font-style:normal;font-weight:400}}
.heat-scroll{{max-width:100%;overflow-x:auto}}
.heat{{display:grid;min-width:303px;grid-template-columns:minmax(120px,168px) repeat(3,minmax(56px,1fr));gap:5px;margin-top:6px;text-align:center}}
.h-lbl{{font-size:12.5px;color:var(--muted);align-self:center;text-align:center;word-break:keep-all}}
.h-cell{{border:1px solid var(--border);border-radius:7px;min-height:34px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}}
.h-head{{font-size:12px;color:var(--dim);text-align:center;padding-bottom:2px;white-space:nowrap}}
.grid2{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}}
@media(max-width:860px){{.grid2{{grid-template-columns:minmax(0,1fr)}}.row{{grid-template-columns:120px minmax(0,1fr) 96px}}}}
@media(max-width:480px){{
.wrap{{padding:32px 16px 60px}}
.panel{{padding:22px 14px}}
.heat{{min-width:288px;grid-template-columns:108px repeat(3,minmax(56px,1fr));gap:4px}}
.h-lbl{{font-size:11px}}.h-head{{font-size:11px}}
.row{{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) 82px;gap:8px}}
.lbl,.val{{font-size:12px}}
}}
table{{width:100%;border-collapse:collapse;font-size:13.5px}}
td{{padding:9px 6px;border-top:1px solid var(--border)}}td.num{{text-align:right;font-weight:800;color:var(--accent);white-space:nowrap}}
.foot{{color:var(--dim);font-size:12px;line-height:1.7;margin-top:30px}}
.back{{display:inline-block;margin-bottom:26px;font-size:13.5px;text-decoration:none;border:1px solid var(--border-s);border-radius:999px;padding:7px 16px}}
</style></head><body><div class="wrap">
<a class="back" href="../">← AEROPATENT 대시보드</a>
<div class="kicker">DEEP DIVE · 우주탐사</div>
<h1>우주탐사 특허출원 현황 분석</h1>
<p class="sub">KR 출원을 보유한 우주탐사 특허패밀리(우선일 2010–2020) 적격 모집단 {D["population_total"]}건의 기술군 분포와,
층화표본 {D["sample_total"]}건의 출원 주체·국제화·영향력 심층 분석. 전 수치는 Google Patents Public Datasets(BigQuery) 기반.</p>
<div class="kpis">
<div class="kpi"><b>{D["population_total"]}</b><span>적격 특허패밀리 (KR 보유 · 2010–2020)</span></div>
<div class="kpi"><b>{big2_pct:.0f}%</b><span>우주 추진 + 통신·항법 비중 — 위성·발사체 범용 기술 집중</span></div>
<div class="kpi hot"><b>{explore_total}건 <em style="font-size:16px">({explore_pct:.1f}%)</em></b><span>달·행성·로봇으로 분류된 패밀리 (본 분류 정의·KR 보유 조건 기준)</span></div>
</div>
<div class="panel"><h2>기술군별 적격 패밀리</h2>
<p class="note">밝은 막대 = 탐사 고유 3개 기술군. 본 검색·분류 정의와 KR 보유·우선일 2010–2020 조건에서 달·행성·탐사 로봇으로 분류된 패밀리는 7건(0.7%). 분류 정의를 달리하면 수치가 달라질 수 있음.</p>
{bar_rows()}</div>
<div class="panel"><h2>기술군 × 우선연도 구간</h2>
<p class="note">적격 모집단 기준. 빈 칸 = 해당 구간 출원 없음.</p>
<div class="heat-scroll" tabindex="0" role="region" aria-label="기술군별 우선연도 히트맵"><div class="heat"><div></div><div class="h-head">2010–13</div><div class="h-head">2014–17</div><div class="h-head">2018–20</div>
{heat_cells()}</div></div></div>
<div class="grid2">
<div class="panel"><h2>표본 {D["sample_total"]}건의 출원 주체 <em style="font-size:12px;color:var(--dim);font-style:normal">— 67건 표본 내부 통계 (모집단 점유율 아님)</em></h2>
<p class="note">층화표본(기술군×기간, 결정적 추출) 기준 · 명칭은 BigQuery 조화 명칭. 한국항공우주연구원이 21건(31%)으로 최다.</p>
{app_rows()}</div>
<div class="panel"><h2>국제화와 영향력</h2>
<p class="caption">67건 표본 내부 통계 · 관할=공보 발행 관청(WO·EP 포함)</p>
<p class="note">표본 67개 패밀리 각각이 공보를 발행한 특허청 수(WO·EP 포함)를 센 값. 절반은 2개청 이하(중앙값 2), 최대 26개청. 49%는 KR에만 출원 — 국내 전용과 글로벌 확장으로 나뉨.</p>
<table><tr><td style="color:var(--muted)">피인용 상위 (후속 인용 패밀리 수)</td><td></td></tr>
{cited_rows()}</table></div>
</div>
<p class="foot">데이터: Google Patents Public Datasets (BigQuery, patents-public-data.patents.publications) · 기준일 {D["as_of"]}<br>
분류 정의: 우주탐사 8개 기술군 IPC/CPC 코드 목록(<a href="https://github.com/AgentBridge-Lab/aeropatent-research/blob/main/config/exploration_ds_taxonomy.json">config/exploration_ds_taxonomy.json</a>) — 분류 정의에 따라 수치가 달라질 수 있음<br>
표본 설계·다중 출처 검증 방법론: 항공우주시스템공학회 발표 (2026. 9. 18)</p>
</div></body></html>'''

out = ROOT / 'docs/exploration/index.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding='utf-8')
print('생성:', out, len(html), 'bytes')
