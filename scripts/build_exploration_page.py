#!/usr/bin/env python3
"""우주탐사 특허 심층 현황 페이지 생성 → docs/exploration/index.html

데이터: analysis/exploration_deepdive.json (BigQuery Google Patents Public Datasets 유래만 사용).
디자인: 기존 사이트 토큰(--black/--panel-solid/--accent #8fabd4/--cream #efece3, Pretendard).
"""
import json
import hashlib
from html import escape, unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = json.load(open(ROOT / 'analysis/exploration_deepdive.json', encoding='utf-8'))
METHOD = json.loads((ROOT / 'config/exploration_ds_taxonomy.json').read_text(encoding='utf-8'))
for source in METHOD['sources']:
    if hashlib.sha256(source['content'].encode('utf-8')).hexdigest() != source['sha256']:
        raise ValueError(f"분류 원문 해시 불일치: {source['relative_path']}")
MEMBERSHIP = METHOD['sample_membership_evidence']
if D['as_of'] != METHOD['data_as_of'] or D['sample_total'] != MEMBERSHIP['sample_n']:
    raise ValueError('심층 데이터 기준일·표본 수와 방법론 근거가 다릅니다. 근거를 함께 갱신하십시오.')

NAMES = {'DS-1': '달탐사', 'DS-2': '행성탐사', 'DS-3': '우주 추진', 'DS-4': '통신·항법',
         'DS-5': 'EDL·샘플귀환', 'DS-6': '생명유지·방사선', 'DS-7': '과학탑재체', 'DS-8': '탐사 로봇'}
KO_APP = {'KOREA AEROSPACE RES INST': '한국항공우주연구원', 'BOEING CO': '보잉',
          'AGENCY DEFENSE DEV': '국방과학연구소', 'SAMSUNG THALES CO LTD': '삼성탈레스',
          'KOREA ELECTRONICS TELECOMM': '한국전자통신연구원', 'THALES SA': '탈레스',
          'UNIV SOGANG IND UNIV COOP FOUN': '서강대 산학협력단', 'SAMSUNG ELECTRONICS CO LTD': '삼성전자'}
EXPLORE_ONLY = {'DS-1', 'DS-2', 'DS-8'}

groups = sorted(D['groups'], key=lambda g: -sum(g['pop']))
pop_max = max(sum(g['pop']) for g in groups)
if sum(sum(g['pop']) for g in groups) != D['population_total'] or sum(sum(g['sample']) for g in groups) != D['sample_total']:
    raise ValueError('주층·기간 합계와 모집단·표본 크기가 일치하지 않습니다.')
if sum(sum(g['sample']) for g in groups if g['id'] in EXPLORE_ONLY) != MEMBERSHIP['primary_n']:
    raise ValueError('탐사 주층 표본 수와 다중 소속 근거가 일치하지 않습니다.')

def bar_rows():
    out = []
    for g in groups:
        total = sum(g['pop'])
        pct = total / D['population_total'] * 100
        cls = 'accent' if g['id'] in EXPLORE_ONLY else ''
        w = total / pop_max * 100
        out.append(f'''<div class="row"><span class="lbl">{g["id"]} {NAMES[g["id"]]}</span>
<div class="track"><div class="fill {cls}" style="width:{w:.3f}%"></div></div>
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
        out.append(f'''<div class="row"><span class="lbl">{escape(KO_APP.get(name, name))}</span>
<div class="track"><div class="fill {cls}" style="width:{n/mx*100:.0f}%"></div></div><span class="val">{n}</span></div>''')
    return '\n'.join(out)

def cited_rows():
    return '\n'.join(
        f'<tr><td>{escape(unescape(t["title"]))}<br><small>패밀리 {escape(str(t["family_id"]))}</small></td><td class="num">{t["cites"]}</td></tr>' for t in D['top_cited'])

def source_details():
    return '\n'.join(
        f'<details><summary>{escape(source["relative_path"])} 원문</summary>'
        f'<p class="caption">SHA-256: {source["sha256"]}</p>'
        f'<pre>{escape(source["content"])}</pre></details>' for source in METHOD['sources'])

explore_total = sum(sum(g['pop']) for g in D['groups'] if g['id'] in EXPLORE_ONLY)
big2 = sum(sum(g['pop']) for g in D['groups'] if g['id'] in ('DS-3', 'DS-4'))
big2_pct = big2 / D['population_total'] * 100
explore_pct = explore_total / D['population_total'] * 100
group_totals = {g['id']: sum(g['pop']) for g in groups}
kari_n = dict(D['top_applicants']).get('KOREA AEROSPACE RES INST', 0)
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
details{{margin:16px 0}}summary{{cursor:pointer;color:var(--accent);font-size:13px}}
pre{{max-width:100%;overflow:auto;padding:16px;background:#0007;border:1px solid var(--border);font-size:11px;line-height:1.6}}
</style></head><body><div class="wrap">
<a class="back" href="../">← AEROPATENT 대시보드</a>
<div class="kicker">DEEP DIVE · 우주탐사</div>
<h1>우주탐사 특허출원 현황 분석</h1>
<p class="sub">우주탐사 관련 코드·제목 조건과 KR 공보 보유 조건으로 선별한 패밀리(우선연도 2010–2020) {D["population_total"]}건의 주층 분포와,
층화표본 {D["sample_total"]}건의 출원 주체·관할·피인용 현황입니다. 주층은 여러 기술군 중 표집을 위해 배정한 하나의 기술군입니다. 수치는 Google Patents Public Datasets(BigQuery)에 기반합니다.</p>
<div class="kpis">
<div class="kpi"><b>{D["population_total"]}</b><span>적격 특허패밀리 (KR 보유 · 2010–2020)</span></div>
<div class="kpi"><b>{big2_pct:.0f}%</b><span>추진 {group_totals['DS-3']} + 통신·항법 {group_totals['DS-4']} — 표집 주층 배정 기준</span></div>
<div class="kpi hot"><b>{explore_total}건 <em style="font-size:16px">({explore_pct:.1f}%)</em></b><span>달·행성·로봇 주층 배정 합계 · 전체 기술 소속의 합집합이 아님</span></div>
</div>
<div class="panel"><h2>주층별 적격 패밀리</h2>
<p class="note">여러 기술군에 속하면 ID의 사전식 순서에서 첫 기술군을 주층으로 배정합니다. 밝은 막대는 DS-1·DS-2·DS-8 주층입니다.
이 세 주층의 합은 {explore_total}건({explore_pct:.1f}%)이며, 추진·통신 비중도 같은 주층 기준입니다. 모집단 {D["population_total"]}건의 전체 기술 소속 합집합은 아직 계산하지 않았습니다.</p>
<p class="note">표본 {MEMBERSHIP["sample_n"]}건에서는 세 주층에 배정된 패밀리가 {MEMBERSHIP["primary_n"]}건이고, 세 기술군 중 하나라도 속하는 패밀리의 합집합은 {MEMBERSHIP["all_membership_union_n"]}건입니다.
패밀리 54366552가 DS-7 주층과 DS-8 소속을 함께 가지기 때문입니다. 이는 종자처리 분야의 혼입 사례로, 8건을 검증된 우주탐사 발명의 수로 해석하지 않습니다.</p>
{bar_rows()}</div>
<div class="panel"><h2>주층 × 우선연도 구간</h2>
<p class="note">적격 모집단의 주층 배정 건수입니다. 빈 칸은 이 검색·기간·KR 공보 조건에서 해당 주층에 배정된 건수가 0이라는 뜻이며, 관련 기관 활동이나 기술역량의 부재를 뜻하지 않습니다.</p>
<div class="heat-scroll" tabindex="0" role="region" aria-label="기술군별 우선연도 히트맵"><div class="heat"><div></div><div class="h-head">2010–13</div><div class="h-head">2014–17</div><div class="h-head">2018–20</div>
{heat_cells()}</div></div></div>
<div class="grid2">
<div class="panel"><h2>표본 {D["sample_total"]}건의 출원 주체 <em style="font-size:12px;color:var(--dim);font-style:normal">— 67건 표본 내부 통계 (모집단 점유율 아님)</em></h2>
<p class="note">주층×기간별 층화표본의 비가중 집계이며 모집단 순위 추정이 아닙니다. 명칭은 BigQuery 조화 명칭을 사용하며, 공동출원 패밀리는 명칭별로 겹칠 수 있습니다. 표본에서 한국항공우주연구원은 {kari_n}건({kari_n / D['sample_total'] * 100:.0f}%)입니다. 시점이 다른 명칭을 현재 기관명으로 일괄 통합하지 않습니다.</p>
{app_rows()}</div>
<div class="panel"><h2>공보 관할과 피인용</h2>
<p class="caption">67건 표본 내부 통계 · 관할=공보 발행 관청(WO·EP 포함)</p>
<p class="note">표본 {D['sample_total']}개 패밀리 각각의 공보 발행 관청 수(WO·EP 포함)는 중앙값 {D['nj_median']}, 최대 {D['nj_max']}입니다. {D['kr_only_pct']}%는 관측된 공보 발행 관청이 KR뿐입니다. KR 공보 보유는 출원인의 국적 조건이 아니며, 이 비가중 표본만으로 전체 모집단의 국제화 수준을 추정하지 않습니다. 피인용도 표본 안의 기술통계이며 발명의 우수성이나 경제적 가치를 직접 뜻하지 않습니다.</p>
<table><tr><td style="color:var(--muted)">피인용 상위 (후속 인용 패밀리 수)</td><td></td></tr>
{cited_rows()}</table></div>
</div>
<div class="panel" id="taxonomy-source"><h2>분류 정의와 해석 범위</h2>
<p class="note">원래 코드 선별 표본 67건은 경계 의심 7건을 포함한 상태로 유지합니다. 제목·분류 검토에서 표시한 후보이며 확정 오분류나 표본 순도, 분야 전체의 검색 정확도를 뜻하지 않습니다.
공보가 관측되지 않는 이유에는 검색 규칙, 출원 관할, 비특허 연구활동 등이 있으므로 출원 건수를 기술역량이나 기관 활동의 유무로 바꾸어 해석하지 않습니다.</p>
<p class="note">단순 코드 목록 대신 제목 조건·동시 분류·제외 규칙과 주층 배정이 포함된 원문을 보존합니다. YAML 설정의 설명과 실제 실행 SQL을 함께 확인할 수 있습니다.
<a href="https://github.com/AgentBridge-Lab/aeropatent-research/blob/main/config/exploration_ds_taxonomy.json">원문과 SHA-256을 담은 JSON</a></p>
{source_details()}</div>
<div class="panel"><h2>집계 원자료</h2><p class="note"><a href="sources/exploration_deepdive.json">주층·표본 집계 JSON</a> · <a href="sources/exploration_ds_taxonomy.json">분류·표본 소속과 원문 해시 JSON</a>. 피인용 표의 패밀리 ID로 원자료 항목을 대조할 수 있습니다. 원공보 링크가 없는 표제는 집계 원자료의 표기를 제시합니다.</p></div>
<p class="foot">데이터: Google Patents Public Datasets (BigQuery, patents-public-data.patents.publications) · 데이터 기준일 {D["as_of"]} · 방법론 설명 수정일 {METHOD["methodology_revised_at"]}<br>
분류 정의: <a href="#taxonomy-source">페이지 내 YAML·후보 추출 SQL·표집 SQL 원문</a> — 데이터 재수집 없이 해석과 근거를 보완했습니다.<br>
표본 설계·다중 출처 검증 방법론: 항공우주시스템공학회 발표 (2026. 9. 18)</p>
</div></body></html>'''

out = ROOT / 'docs/exploration/index.html'
out.parent.mkdir(parents=True, exist_ok=True)
source_dir = out.parent / 'sources'
source_dir.mkdir(parents=True, exist_ok=True)
for relative in ['analysis/exploration_deepdive.json', 'config/exploration_ds_taxonomy.json']:
    (source_dir / Path(relative).name).write_bytes((ROOT / relative).read_bytes())
out.write_text(html, encoding='utf-8')
print('생성:', out, len(html), 'bytes')
