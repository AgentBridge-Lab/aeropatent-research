#!/usr/bin/env python3
"""적용 체계별 심층분석 페이지 생성 → docs/deepdive/{index,launch,satellite,satellite-apps,aviation}

데이터: analysis/bq_summary_by_field.json (BigQuery 실측 집계만 사용).
분류: 사이트 9개 기술분야를 적용 체계 4종으로 재그룹 + 우주탐사(별도 분류, ../exploration/).
디자인: exploration 페이지와 동일한 사이트 토큰.
"""
import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
F = json.load(open(ROOT / 'analysis/bq_summary_by_field.json', encoding='utf-8'))
SUMMARY = json.loads((ROOT / 'analysis/bq_collection_summary.json').read_text(encoding='utf-8'))
def date_label(value):
    value = str(value)
    if not re.fullmatch(r'\d{8}', value):
        raise ValueError(f'집계 기준일 형식 오류: {value}')
    return f'{value[:4]}-{value[4:6]}-{value[6:]}'

AS_OF = date_label(SUMMARY['analysisDate'])
RECENT3 = date_label(SUMMARY['recent3StartDate'])
RECENT5 = date_label(SUMMARY['recent5StartDate'])
ENRICH = json.loads((ROOT / 'analysis/deepdive_enrichment.json').read_text(encoding='utf-8'))
E = ENRICH['fields']

REGION_KO = {'EAST_ASIA': '동아시아', 'NORTH_AMERICA': '북미', 'EUROPE': '유럽(EP 포함)', 'INTERNATIONAL': '국제공개(WO)',
             'OTHER_WORLD': '기타', 'MIDDLE_EAST': '중동', 'OCEANIA': '오세아니아', 'LATIN_AMERICA': '중남미',
             'AFRICA': '아프리카', 'SOUTH_ASIA': '남아시아'}

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
background-image:radial-gradient(1200px 820px at 82% -12%,#8fabd41a,#0000 58%),radial-gradient(1000px 760px at -8% 8%,#4a70a914,#0000 56%);background-attachment:fixed;min-height:100vh;word-break:keep-all;overflow-wrap:anywhere}
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
.lbl{font-size:12.5px;color:var(--muted);text-align:left}
.track{background:#efece314;border-radius:5px;height:15px;overflow:hidden}
.fill{height:100%;background:var(--deep);border-radius:5px}
.fill.accent{background:var(--accent)}
.val{font-size:12.5px;font-weight:700;white-space:nowrap}.val em{color:var(--dim);font-style:normal;font-weight:400}
.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.panel,.row>*,.card{min-width:0}
.table-scroll{max-width:100%;overflow-x:auto}
.table-scroll table{min-width:380px}
.table-scroll:focus-visible{outline:2px solid var(--accent)}
.scroll-hint{display:none;color:var(--muted);font-size:11.5px}
@media(max-width:560px){.scroll-hint{display:block}}
@media(max-width:860px){.grid2{grid-template-columns:1fr}}
@media(max-width:560px){.row{grid-template-columns:minmax(72px,96px) minmax(0,1fr) auto;gap:8px}.lbl{font-size:11px}.val{font-size:11.5px}.panel{padding:18px 16px}}
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
    # Preserve wide numeric tables in a keyboard-accessible local scroll region.
    body = body.replace('<table>', '<p class="scroll-hint">표를 좌우로 움직이면 나머지 열을 확인할 수 있습니다.</p><div class="table-scroll" tabindex="0" role="region" aria-label="표 가로 스크롤"><table>')
    body = body.replace('</table>', '</table></div>')
    return f'''<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — AEROPATENT</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>{CSS}</style></head><body><div class="wrap">
{body}
</div></body></html>'''

ENRICH_AS_OF = ENRICH['as_of_query']

SOURCE_FILES = ['analysis/bq_summary_by_field.json', 'analysis/bq_collection_summary.json',
                'analysis/deepdive_enrichment.json', 'config/bigquery_aerospace_aviation_taxonomy.json',
                'config/country_region_strategy.json', 'sql/07_deepdive_enrichment_queries.sql',
                'sql/01a_candidate_10y_cpc_first_production.sql',
                'scripts/build_bq_landscape_from_candidates.mjs', 'scripts/build_deepdive_enrichment.mjs']
provenance_path = ROOT / 'analysis/site_data_provenance.json'
PROVENANCE = json.loads(provenance_path.read_text(encoding='utf-8')) if provenance_path.exists() else {}
if provenance_path.exists():
    SOURCE_FILES.append('analysis/site_data_provenance.json')
COLLECTION_STATUS = ('실제 수집일: ' + escape(str(PROVENANCE['source_collection_date']))) if PROVENANCE.get('source_collection_date') else '실제 수집일은 현재 보관 자료만으로 확인되지 않습니다.'
source_dir = ROOT / 'docs/deepdive/sources'
source_dir.mkdir(parents=True, exist_ok=True)
for relative in SOURCE_FILES:
    (source_dir / Path(relative).name).write_bytes((ROOT / relative).read_bytes())

def source_links(prefix):
    return '<div class="panel"><h2>원자료와 계산 근거</h2><p class="note">이 페이지 생성에 사용한 로컬 집계와 분류·계산 코드입니다. 집계 기준일은 원자료 재수집일을 뜻하지 않습니다. ' + COLLECTION_STATUS + ' 모바일에서는 표를 좌우로 움직여 확인할 수 있습니다.</p><ul>' + ''.join(
        f'<li><a href="{prefix}sources/{Path(s).name}">{escape(s)}</a></li>' for s in SOURCE_FILES) + '</ul></div>'

FOOT = f'''<p class="foot">데이터: Google Patents Public Datasets (BigQuery) · CPC 후보군 기준(접두어 일치, 텍스트 검증 전) · 집계 기준일 {AS_OF} (연도 추세·KR 출원인·피인용은 {ENRICH_AS_OF} 쿼리)<br>
집계 단위: DOCDB 패밀리 · 공개 관할은 공보 발행 관청 기준(출원인 소재국 아님) · 상위 출원인 명칭은 원자료 표기(정규화 전)<br>
분류 정의: <a href="https://github.com/AgentBridge-Lab/aeropatent-research/blob/main/config/bigquery_aerospace_aviation_taxonomy.json">config/bigquery_aerospace_aviation_taxonomy.json</a> — 분류 정의에 따라 수치가 달라질 수 있음</p>'''

def bars(rows, accent_first=False):
    mx = max((v for _, v in rows), default=0) or 1
    out = []
    for i, (label, v) in enumerate(rows):
        cls = 'accent' if (accent_first and i == 0) else ''
        out.append(f'''<div class="row"><span class="lbl">{escape(str(label))}</span>
<div class="track"><div class="fill {cls}" style="width:{v/mx*100:.3f}%"></div></div>
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
            app_rows.append(f"<tr><td>{escape(a['key'])}</td><td>{escape(e['labelKo'])}</td><td class='num'>{a['count']:,}</td></tr>")
    cpc_rows = []
    for e in fs:
        for c in e['topCpcCodes'][:4]:
            cpc_rows.append(f"<tr><td>{c['key']}</td><td>{e['labelKo']}</td><td class='num'>{c['count']:,}</td></tr>")

    # ── 연구 참고 지표 (기술분야별, 분야 간 합산 없음) ──
    met_rows = []
    for e in fs:
        en = E[e['id']]
        cr5 = sum(a['count'] for a in e['topApplicants'][:5]) / e['familyCount']
        met_rows.append(f"<tr><td>{e['labelKo']}</td><td class='num'>{e['recentMomentum']*100:.1f}%</td>"
                        f"<td class='num'>{cr5*100:.1f}%</td>"
                        f"<td class='num'>{e['koreaPublicationGapOpportunityScore']:.3f}</td>"
                        f"<td class='num'>{e['koreaAssigneeGapOpportunityScore']:.3f}</td></tr>")

    # ── 연도별 출원 추세 (기술분야별 차트) ──
    yr_charts = []
    for e in fs:
        yy = E[e['id']]['yearly_families']
        rows = [(str(y), yy.get(str(y), 0)) for y in range(ENRICH['priority_window'][0], ENRICH['priority_window'][1] + 1)]
        yr_charts.append(f"<div><h3 style='margin:0 0 8px;font-size:14px;color:var(--muted)'>{e['labelKo']}</h3>{bars(rows)}</div>")
    yr_grid = f"<div class='grid2'>{''.join(yr_charts)}</div>" if multi else yr_charts[0]

    # ── 지역 분포 (카테고리 합산) ──
    rg = {}
    for e in fs:
        for r, n in e['regionFamilyCounts'].items():
            rg[r] = rg.get(r, 0) + n
    rg_bars = bars([(REGION_KO.get(r, r), n) for r, n in sorted(rg.items(), key=lambda x: -x[1])])

    # ── KR 상위 출원인 (기술분야별) ──
    kr_rows = []
    for e in fs:
        for a in E[e['id']]['kr_top_applicants'][:5 if multi else 8]:
            kr_rows.append(f"<tr><td>{escape(a['name'])}</td><td>{escape(e['labelKo'])}</td><td class='num'>{a['families']:,}</td></tr>")

    # ── 피인용 상위 특허 (기술분야별) ──
    cit_rows = []
    for e in fs:
        for t in E[e['id']]['top_cited']:
            title = escape(t['title_en'] or '(영문 제목 없음)')
            cit_rows.append(f"<tr><td><a href='{escape(t['gp_url'], quote=True)}' target='_blank' rel='noopener'>{escape(t['rep_pub'])}</a>"
                            f"<div style='color:var(--muted);font-size:11.5px;line-height:1.4;margin-top:2px'>{title}</div></td>"
                            f"<td>{e['labelKo']}</td><td class='num'>{t['citing_families']:,}</td></tr>")

    body = f'''<a class="back" href="../">← 분야별 심층 분석</a>
<div class="kicker">DEEP DIVE · {cat['name']}</div>
<h1>{cat['name']} 특허출원 현황 분석</h1>
<p class="sub">{cat['desc']} — 구성 기술분야 {len(cat['fields'])}개의 BigQuery 실측 집계.{dup_note}</p>
<div class="kpis">
<div class="kpi"><b>{fam:,}</b><span>특허패밀리 (최근 10년 수집 프레임{', 분야 합산' if multi else ''})</span></div>
<div class="kpi"><b>{r5/fam*100:.0f}%</b><span>최근 5년 패밀리 비중</span></div>
<div class="kpi hot"><b>{kr:,}</b><span>KR 공개 관할 패밀리 ({kr/fam*100:.1f}%)</span></div>
</div>
<div class="panel"><h2>구성 기술분야별 규모</h2>
<p class="note">패밀리 수 기준. 공보 수 합계 {pub:,}건. 최근 5년은 우선일 {RECENT5} 이후 관측치이며, 위 비중의 분모는 같은 구성 분야의 전체 집계 패밀리 수입니다.{dup_note}</p>
{field_bars}</div>
<div class="panel"><h2>공개 관할 분포</h2>
<p class="note">공보 발행 관청 기준 상위 8개입니다. 같은 패밀리가 여러 관할에 포함될 수 있으므로 막대의 합은 전체 패밀리 수와 다릅니다. KR 비중의 분모는 위 전체 집계이며, 출원인 소재국이나 국가 경쟁력 순위가 아닙니다.</p>
{cc_bars}</div>
<div class="panel"><h2>연도별 출원 추세 (2016–2025)</h2>
<p class="note">우선일 연도별 패밀리 수입니다. 이 보강 쿼리는 2016–2025년 고정 구간으로 위 최근 10년 수집 프레임과 다릅니다. 동일 패밀리의 공보가 서로 다른 우선연도에 속하면 연도 간 중복될 수 있습니다. 최근 연도는 공개 지연과 관측 시점의 영향을 받으므로 감소만으로 활동 축소를 확정할 수 없습니다.</p>
{yr_grid}</div>
<div class="panel"><h2>지역별 분포</h2>
<p class="note">공보 발행 관청의 지역 그룹 기준{', 분야 합산(중복 패밀리 포함 가능)' if multi else ''}입니다. EP는 유럽, WO는 국제공개로 분류합니다. 지역 내 패밀리는 중복 제거하지만 지역 간에는 겹칠 수 있습니다.</p>
{rg_bars}</div>
<div class="panel"><h2>연구 참고 지표</h2>
<p class="note">최근 비중(기존 모멘텀) = 우선일 {RECENT3} 이후 패밀리 수 ÷ 해당 분야 전체 집계 패밀리 수입니다. 기간 간 증가율이나 성장률은 아닙니다.<br>
CR5* (명칭별 중복 허용) = 상위 5개 조화 명칭별 패밀리 수의 합 ÷ 해당 분야 전체 패밀리 수입니다. 공동출원 패밀리는 명칭별로 중복되므로 독점적 시장점유율이나 5개 실체의 합집합 비중과 다릅니다.<br>
한국 격차 점수 = 최근 비중 × (1 − KR 최근 5년 비중)입니다. KR 비중은 우선일 {RECENT5} 이후 패밀리를 분모로 KR 공보 보유 또는 KR 소재국 코드 출원인 보유를 각각 계산합니다. 공개 관할과 출원인 소재국은 별개이며, 두 기간을 조합한 참고 점수만으로 성장·기술력·투자 기회를 확정할 수 없습니다.</p>
<table><tr><th>기술분야</th><th style="text-align:right">최근 3년 비중</th><th style="text-align:right">CR5*</th><th style="text-align:right">격차점수<br>(공개 관할)</th><th style="text-align:right">격차점수<br>(KR 출원인)</th></tr>
{''.join(met_rows)}</table></div>
<div class="grid2">
<div class="panel"><h2>KR 상위 출원인</h2>
<p class="note">2016–2025년 우선일의 KR 공개 공보 기준 기술분야별 상위 {'5' if multi else '8'}개 명칭입니다(원자료 조화 명칭). KR 공보 조건은 출원인 국적 조건과 다릅니다. CPC 후보군 기준이라 범용 코드(예: G05D1)를 통해 타 산업 기업이 포함될 수 있습니다.</p>
<table><tr><th>출원인</th><th>기술분야</th><th style="text-align:right">패밀리</th></tr>
{''.join(kr_rows)}</table></div>
<div class="panel"><h2>피인용 상위 특허</h2>
<p class="note">기술분야별 상위 5개 패밀리입니다. 2016–2025년 우선일·CPC 조건에 맞는 공보를 인용한 서로 다른 패밀리 수이며, 인용한 쪽의 기간은 제한하지 않고 같은 패밀리의 인용은 제외합니다. 패밀리의 모든 공보에 대한 총인용과는 다를 수 있습니다. 링크는 조건에 맞는 대표 공보의 Google Patents 원문입니다.</p>
<table><tr><th>대표 공보</th><th>기술분야</th><th style="text-align:right">피인용</th></tr>
{''.join(cit_rows)}</table></div>
</div>
<div class="grid2">
<div class="panel"><h2>상위 출원인</h2>
<p class="note">기술분야별 상위 5 (원자료 조화 명칭, 분야 간 합산 없음).</p>
<table><tr><th>출원인</th><th>기술분야</th><th style="text-align:right">패밀리</th></tr>
{''.join(app_rows)}</table></div>
<div class="panel"><h2>상위 CPC 코드</h2>
<p class="note">기술분야별 상위 4개입니다. 공보 행의 CPC를 슬래시 앞 그룹으로 묶은 출현 횟수로, 서로 다른 공보 수나 패밀리 수가 아닙니다. 한 공보의 여러 세부 코드가 같은 그룹에 누적될 수 있습니다.</p>
<table><tr><th>CPC</th><th>기술분야</th><th style="text-align:right">건수</th></tr>
{''.join(cpc_rows)}</table></div>
</div>
{source_links('../')}
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
exploration_total = json.loads((ROOT / 'analysis/exploration_deepdive.json').read_text(encoding='utf-8'))['population_total']
cards.append(f'''<a class="card" href="../exploration/"><h3>우주탐사</h3>
<div class="d">달·행성탐사, 추진, 통신·항법, EDL, 생명유지, 탑재체, 탐사 로봇 — KR 보유 패밀리 별도 정밀 분류</div>
<div class="n">{exploration_total:,}<small> 패밀리 (KR 보유 · 2010–2020 · 별도 분류 정의)</small></div></a>''')

hub_body = f'''<a class="back" href="../">← AEROPATENT 대시보드</a>
<div class="kicker">DEEP DIVES</div>
<h1>분야별 심층 분석</h1>
<p class="sub">항공우주 특허를 적용 체계 기준 5개 분야로 나눠 각 분야의 출원 규모·관할 분포·주요 출원인·핵심 분류코드를 분석. 전 수치 Google Patents Public Datasets(BigQuery) 실측 집계.</p>
<div class="cards">
{''.join(cards)}
</div>
{source_links('')}
{FOOT}'''
(ROOT / 'docs/deepdive/index.html').write_text(page('분야별 심층 분석', hub_body), encoding='utf-8')
print('생성: docs/deepdive/index.html')
