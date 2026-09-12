#!/usr/bin/env python3
"""적용 체계별 심층분석 페이지 생성 → docs/deepdive/{index,launch,satellite,satellite-apps,aviation}

데이터: analysis/bq_summary_by_field.json (BigQuery 실측 집계만 사용).
분류: 사이트 9개 기술분야를 적용 체계 4종으로 재그룹 + 우주탐사(별도 분류, ../exploration/).
디자인: exploration 페이지와 동일한 사이트 토큰.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
F = json.load(open(ROOT / 'analysis/bq_summary_by_field.json', encoding='utf-8'))
AS_OF = json.load(open(ROOT / 'analysis/bq_collection_summary.json', encoding='utf-8')).get('collectedAt', '')[:10] or '2026-09-01'

CATS = [
    {'slug': 'launch', 'name': '발사체', 'desc': '발사체 추진·회수 기술',
     'fields': ['space_launch_propulsion_recovery']},
    {'slug': 'satellite', 'name': '위성', 'desc': '위성 플랫폼·열·전력, GNC·랑데부·서비스, 우주재료·TPS·코팅',
     'fields': ['space_satellite_bus_thermal_power', 'space_gnc_rendezvous_servicing', 'space_materials_tps_coatings']},
    {'slug': 'satellite-apps', 'name': '위성활용', 'desc': '위성통신·LEO 네트워크, 원격탐사·탑재체',
     'fields': ['space_comm_leo_network', 'space_remote_sensing_payload']},
    {'slug': 'aviation', 'name': '항공', 'desc': '지속가능 추진, 구조·공력·복합재, 항공전자·비행제어·자율운항',
     'fields': ['aviation_propulsion_sustainable', 'aviation_structures_aero_composites',
                'aviation_avionics_flight_control_autonomy']},
]

CSS = '''
:root{--black:#000;--panel:#07090ea3;--border:#efece31f;--border-s:#8fabd466;--text:#efece3;
--muted:#efece399;--dim:#efece35c;--accent:#8fabd4;--deep:#4a70a9;--cream:#efece3}
*{box-sizing:border-box}body{margin:0;background:var(--black);color:var(--text);
font-family:"Pretendard Variable",Pretendard,system-ui,sans-serif;-webkit-font-smoothing:antialiased;
background-image:radial-gradient(1200px 820px at 82% -12%,#8fabd41a,#0000 58%),radial-gradient(1000px 760px at -8% 8%,#4a70a914,#0000 56%);background-attachment:fixed;min-height:100vh;overflow-x:hidden;word-break:keep-all}
.wrap{max-width:1080px;margin:0 auto;padding:44px 22px 72px}
a{color:var(--accent)}
.kicker{font-size:13px;letter-spacing:.14em;color:var(--accent);font-weight:700}
h1{font-size:clamp(26px,4.5vw,40px);margin:.35em 0 .3em;font-weight:800}
.sub{color:var(--muted);font-size:14.5px;max-width:760px;line-height:1.6}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:14px;margin:30px 0}
.kpi{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:18px 20px;backdrop-filter:blur(20px) saturate(130%)}
.kpi b{display:block;font-size:29px;font-weight:800;color:var(--cream);white-space:nowrap}
.kpi.hot b{color:var(--accent)}
.kpi span{color:var(--muted);font-size:12.5px}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:24px 26px;margin:20px 0;backdrop-filter:blur(20px) saturate(130%)}
.panel h2{margin:0 0 6px;font-size:18px}
.panel .note{color:var(--muted);font-size:12.5px;margin:0 0 16px;line-height:1.55}
.row{display:grid;grid-template-columns:minmax(96px,170px) minmax(0,1fr) minmax(88px,118px);gap:10px;align-items:center;margin:7px 0}
.lbl{font-size:12.5px;color:var(--muted);text-align:right}
.track{background:#efece30d;border-radius:5px;height:15px;overflow:hidden}
.fill{height:100%;background:var(--deep);border-radius:5px}
.fill.accent{background:var(--accent)}
.val{font-size:12.5px;font-weight:700;white-space:nowrap}.val em{color:var(--dim);font-style:normal;font-weight:400}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:860px){.grid2{grid-template-columns:1fr}}
table{width:100%;border-collapse:collapse;font-size:13px}
td,th{padding:8px 6px;border-top:1px solid var(--border);text-align:left}
td.num{text-align:right;font-weight:800;color:var(--accent);white-space:nowrap}
th{color:var(--muted);font-weight:600;border-top:none;font-size:12px}
.foot{color:var(--dim);font-size:11.5px;line-height:1.7;margin-top:26px}
.back{display:inline-block;margin-bottom:24px;font-size:13px;text-decoration:none;border:1px solid var(--border-s);border-radius:999px;padding:7px 15px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px;margin-top:26px}
.card{display:block;background:var(--panel);border:1px solid var(--border);border-radius:18px;padding:22px 24px;text-decoration:none;color:var(--text);backdrop-filter:blur(20px) saturate(130%)}
.card:hover{border-color:var(--border-s)}
.card h3{margin:0 0 4px;font-size:18px}
.card .d{color:var(--muted);font-size:12.5px;line-height:1.5;margin-bottom:12px}
.card .n{font-size:24px;font-weight:800;color:var(--accent)}
.card .n small{font-size:12px;color:var(--dim);font-weight:400}
'''

def page(title, body):
    return f'''<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — AEROPATENT</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>{CSS}</style></head><body><div class="wrap">
{body}
</div></body></html>'''

FOOT = f'''<p class="foot">데이터: Google Patents Public Datasets (BigQuery) · CPC 후보군 기준(접두어 일치, 텍스트 검증 전) · 기준일 {AS_OF}<br>
집계 단위: DOCDB 패밀리 · 공개 관할은 공보 발행 관청 기준(출원인 소재국 아님) · 상위 출원인 명칭은 원자료 표기(정규화 전)<br>
분류 정의: <a href="https://github.com/AgentBridge-Lab/aeropatent-research/blob/main/config/bigquery_aerospace_aviation_taxonomy.json">config/bigquery_aerospace_aviation_taxonomy.json</a> — 분류 정의에 따라 수치가 달라질 수 있음</p>'''

def bars(rows, accent_first=False):
    mx = max(v for _, v in rows) or 1
    out = []
    for i, (label, v) in enumerate(rows):
        cls = 'accent' if (accent_first and i == 0) else ''
        out.append(f'''<div class="row"><span class="lbl">{label}</span>
<div class="track"><div class="fill {cls}" style="width:{max(v/mx*100,0.8):.1f}%"></div></div>
<span class="val">{v:,}</span></div>''')
    return '\n'.join(out)

# ── 카테고리 페이지 ────────────────────────────────────────────────────
for cat in CATS:
    fs = [F[k] for k in cat['fields']]
    fam = sum(e['familyCount'] for e in fs)
    pub = sum(e['publicationCount'] for e in fs)
    r5 = sum(e['recent5FamilyCount'] for e in fs)
    cc = {}
    for e in fs:
        for c, n in e['countryFamilyCounts'].items():
            cc[c] = cc.get(c, 0) + n
    top_cc = sorted(cc.items(), key=lambda x: -x[1])[:8]
    kr = cc.get('KR', 0)
    multi = len(cat['fields']) > 1
    dup_note = ' 기술분야 간 중복 패밀리가 포함될 수 있어 합계는 상한값.' if multi else ''

    field_bars = bars([(e['labelKo'], e['familyCount']) for e in sorted(fs, key=lambda e: -e['familyCount'])])
    cc_bars = bars(top_cc)

    app_rows = []
    for e in fs:
        for a in e['topApplicants'][:5]:
            app_rows.append(f"<tr><td>{a['key']}</td><td>{e['labelKo']}</td><td class='num'>{a['count']:,}</td></tr>")
    cpc_rows = []
    for e in fs:
        for c in e['topCpcCodes'][:4]:
            cpc_rows.append(f"<tr><td>{c['key']}</td><td>{e['labelKo']}</td><td class='num'>{c['count']:,}</td></tr>")

    body = f'''<a class="back" href="../">← 분야별 심층 분석</a>
<div class="kicker">DEEP DIVE · {cat['name']}</div>
<h1>{cat['name']} 특허출원 현황 분석</h1>
<p class="sub">{cat['desc']} — 구성 기술분야 {len(cat['fields'])}개의 BigQuery 실측 집계.{dup_note}</p>
<div class="kpis">
<div class="kpi"><b>{fam:,}</b><span>특허패밀리 (전체 기간{', 분야 합산' if multi else ''})</span></div>
<div class="kpi"><b>{r5/fam*100:.0f}%</b><span>최근 5년 패밀리 비중</span></div>
<div class="kpi hot"><b>{kr:,}</b><span>KR 공개 관할 패밀리 ({kr/fam*100:.1f}%)</span></div>
</div>
<div class="panel"><h2>구성 기술분야별 규모</h2>
<p class="note">패밀리 수 기준. 공보 수 합계 {pub:,}건.</p>
{field_bars}</div>
<div class="panel"><h2>공개 관할 분포</h2>
<p class="note">공보 발행 관청 기준 상위 8개 — 출원인 소재국이나 국가 경쟁력 순위가 아님.</p>
{cc_bars}</div>
<div class="grid2">
<div class="panel"><h2>상위 출원인</h2>
<p class="note">기술분야별 상위 5 (원자료 조화 명칭, 분야 간 합산 없음).</p>
<table><tr><th>출원인</th><th>기술분야</th><th style="text-align:right">패밀리</th></tr>
{''.join(app_rows)}</table></div>
<div class="panel"><h2>상위 CPC 코드</h2>
<p class="note">기술분야별 상위 4 — 코드 정의는 분류 정의 파일 참조.</p>
<table><tr><th>CPC</th><th>기술분야</th><th style="text-align:right">건수</th></tr>
{''.join(cpc_rows)}</table></div>
</div>
{FOOT}'''
    out = ROOT / f"docs/deepdive/{cat['slug']}/index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page(f"{cat['name']} 특허출원 현황 분석", body), encoding='utf-8')
    print('생성:', out)

# ── 허브 페이지 ────────────────────────────────────────────────────────
cards = []
for cat in CATS:
    fs = [F[k] for k in cat['fields']]
    fam = sum(e['familyCount'] for e in fs)
    multi = len(cat['fields']) > 1
    cards.append(f'''<a class="card" href="{cat['slug']}/"><h3>{cat['name']}</h3>
<div class="d">{cat['desc']}</div>
<div class="n">{fam:,}<small> 패밀리{' (분야 합산)' if multi else ''}</small></div></a>''')
cards.append('''<a class="card" href="../exploration/"><h3>우주탐사</h3>
<div class="d">달·행성탐사, 추진, 통신·항법, EDL, 생명유지, 탑재체, 탐사 로봇 — KR 보유 패밀리 별도 정밀 분류</div>
<div class="n">983<small> 패밀리 (KR 보유 · 2010–2020 · 별도 분류 정의)</small></div></a>''')

hub_body = f'''<a class="back" href="../">← AEROPATENT 대시보드</a>
<div class="kicker">DEEP DIVES</div>
<h1>분야별 심층 분석</h1>
<p class="sub">항공우주 특허를 적용 체계 기준 5개 분야로 나눠 각 분야의 출원 규모·관할 분포·주요 출원인·핵심 분류코드를 분석. 전 수치 Google Patents Public Datasets(BigQuery) 실측 집계.</p>
<div class="cards">
{''.join(cards)}
</div>
{FOOT}'''
(ROOT / 'docs/deepdive/index.html').write_text(page('분야별 심층 분석', hub_body), encoding='utf-8')
print('생성: docs/deepdive/index.html')
