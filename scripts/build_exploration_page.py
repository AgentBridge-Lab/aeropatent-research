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
html = f'''<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>우주탐사 특허 심층 현황 — AEROPATENT</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
:root{{--black:#000;--panel:#07090ea3;--border:#efece31f;--border-s:#8fabd466;--text:#efece3;
--muted:#efece399;--dim:#efece35c;--accent:#8fabd4;--deep:#4a70a9;--cream:#efece3}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--black);color:var(--text);
font-family:"Pretendard Variable",Pretendard,system-ui,sans-serif;-webkit-font-smoothing:antialiased;
background-image:radial-gradient(1200px 820px at 82% -12%,#8fabd41a,#0000 58%),radial-gradient(1000px 760px at -8% 8%,#4a70a914,#0000 56%);background-attachment:fixed;min-height:100vh}}
.wrap{{max-width:1080px;margin:0 auto;padding:48px 24px 80px}}
a{{color:var(--accent)}}
.kicker{{font-size:13px;letter-spacing:.14em;color:var(--accent);font-weight:700}}
h1{{font-size:clamp(28px,4.5vw,42px);margin:.35em 0 .3em;font-weight:800}}
.sub{{color:var(--muted);font-size:15px;max-width:760px;line-height:1.6}}
.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin:34px 0}}
.kpi{{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:20px 22px;backdrop-filter:blur(20px) saturate(130%)}}
.kpi b{{display:block;font-size:32px;font-weight:800;color:var(--cream)}}
.kpi.hot b{{color:var(--accent)}}
.kpi span{{color:var(--muted);font-size:12.5px}}
.panel{{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:26px 28px;margin:22px 0;backdrop-filter:blur(20px) saturate(130%)}}
.panel h2{{margin:0 0 6px;font-size:19px}}
.panel .note{{color:var(--muted);font-size:13px;margin:0 0 18px;line-height:1.55}}
.row{{display:grid;grid-template-columns:172px 1fr 118px;gap:12px;align-items:center;margin:7px 0}}
.lbl{{font-size:13px;color:var(--muted);text-align:right}}
.track{{background:#efece30d;border-radius:5px;height:16px;overflow:hidden}}
.fill{{height:100%;background:var(--deep);border-radius:5px}}
.fill.accent{{background:var(--accent)}}
.val{{font-size:13px;font-weight:700}}.val em{{color:var(--dim);font-style:normal;font-weight:400}}
.heat{{display:grid;grid-template-columns:168px repeat(3,1fr);gap:5px;margin-top:6px}}
.h-lbl{{font-size:12.5px;color:var(--muted);align-self:center;text-align:right;padding-right:8px}}
.h-cell{{border:1px solid var(--border);border-radius:7px;min-height:34px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}}
.h-head{{font-size:12px;color:var(--dim);text-align:center;padding-bottom:2px}}
.grid2{{display:grid;grid-template-columns:1fr 1fr;gap:22px}}
@media(max-width:860px){{.grid2{{grid-template-columns:1fr}}.row{{grid-template-columns:120px 1fr 96px}}}}
table{{width:100%;border-collapse:collapse;font-size:13.5px}}
td{{padding:9px 6px;border-top:1px solid var(--border)}}td.num{{text-align:right;font-weight:800;color:var(--accent)}}
.foot{{color:var(--dim);font-size:12px;line-height:1.7;margin-top:30px}}
.back{{display:inline-block;margin-bottom:26px;font-size:13.5px;text-decoration:none;border:1px solid var(--border-s);border-radius:999px;padding:7px 16px}}
</style></head><body><div class="wrap">
<a class="back" href="../">← AEROPATENT 대시보드</a>
<div class="kicker">DEEP DIVE · 우주탐사</div>
<h1>우주탐사 특허, 어디에 몰려 있나</h1>
<p class="sub">KR 출원을 보유한 우주탐사 특허패밀리(우선일 2010–2020) 적격 모집단 {D["population_total"]}건의 기술군 분포와,
층화표본 {D["sample_total"]}건의 출원 주체·국제화·영향력 심층 분석. 전 수치는 Google Patents Public Datasets(BigQuery) 기반.</p>
<div class="kpis">
<div class="kpi"><b>{D["population_total"]}</b><span>적격 특허패밀리 (KR 보유 · 2010–2020)</span></div>
<div class="kpi"><b>91%</b><span>우주 추진 + 통신·항법 비중 — 위성·발사체 범용 기술 집중</span></div>
<div class="kpi hot"><b>{explore_total}건 <em style="font-size:16px">(0.7%)</em></b><span>탐사 고유 기술(달·행성·로봇) — 사실상 공백</span></div>
</div>
<div class="panel"><h2>기술군별 적격 패밀리</h2>
<p class="note">밝은 막대 = 탐사 고유 3개 기술군. 달탐사 2 · 행성탐사 1 · 탐사 로봇 4건으로, 탐사 임무에만 고유한 기술의 국내 관련 출원은 정량적 공백 상태.</p>
{bar_rows()}</div>
<div class="panel"><h2>기술군 × 우선연도 구간</h2>
<p class="note">적격 모집단 기준. 빈 칸 = 해당 구간 출원 없음.</p>
<div class="heat"><div></div><div class="h-head">2010–13</div><div class="h-head">2014–17</div><div class="h-head">2018–20</div>
{heat_cells()}</div></div>
<div class="grid2">
<div class="panel"><h2>표본 {D["sample_total"]}건의 출원 주체</h2>
<p class="note">층화표본(기술군×기간, 결정적 추출) 기준 · 명칭은 BigQuery 조화 명칭. 한국항공우주연구원이 21건(31%)으로 최다.</p>
{app_rows()}</div>
<div class="panel"><h2>국제화와 영향력</h2>
<p class="note">패밀리당 공보 발행 관할: 중앙값 {D["nj_median"]} · 최대 {D["nj_max"]} — KR 단독 {D["kr_only_pct"]}%와 글로벌 패밀리의 양극단.</p>
<table><tr><td style="color:var(--muted)">피인용 상위 (후속 인용 패밀리 수)</td><td></td></tr>
{cited_rows()}</table></div>
</div>
<p class="foot">데이터: Google Patents Public Datasets (BigQuery, patents-public-data.patents.publications) · 기준일 {D["as_of"]}<br>
분류 정의: 우주탐사 8개 기술군 IPC/CPC 코드 목록(<a href="https://github.com/AgentBridge-Lab/aeropatent-research/blob/main/config/">config/</a>) — 분류 정의에 따라 수치가 달라질 수 있음<br>
표본 설계·다중 출처 검증 방법론: 항공우주시스템공학회 발표 (2026. 9. 18)</p>
</div></body></html>'''

out = ROOT / 'docs/exploration/index.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding='utf-8')
print('생성:', out, len(html), 'bytes')
