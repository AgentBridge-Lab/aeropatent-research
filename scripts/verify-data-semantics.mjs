// Offline regression checks. Reads cached sources; writes fixtures/results only under logs/.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from '../web/node_modules/typescript/lib/typescript.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const json = (p) => JSON.parse(read(p));
const code = ts.transpileModule(read('web/app/lib/data.ts'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const d = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const raw = read('normalized/patents.jsonl').trim().split('\n').map(JSON.parse);
const site = json('exports/agentbridge/agentbridge_patent_landscape_snapshot.json');
let checks=0; const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
eq(d.PATENTS.length,raw.filter(r=>d.COUNTRY_ORDER.includes(r.authority)).length);
eq(d.LANDSCAPE_SUMMARY.family_count,site.summary.familyCount);
eq(d.LANDSCAPE_SUMMARY.publication_count,site.summary.publicationCount);
eq(d.LANDSCAPE_SUMMARY.row_count,site.summary.rowCount);
for(const p of d.PATENTS){
  const r=raw.find(x=>x.publication_number===p.publication_number);
  eq(p.filing_year,r.filing_date?Number(r.filing_date.slice(0,4)):Number(r.publication_year));
  eq(p.keywords,[...new Set(r.matched_terms)].slice(0,5));
  eq(p.date_basis,r.filing_date?'filing_date':'publication_year');
}
for(const f of d.FIELDS){
  const r=site.fields.find(x=>x.id===f.id);eq(f.family_count,r.familyCount);
  eq(f.recent_momentum,Number((r.recent3FamilyCount/r.familyCount).toFixed(4)));
  const a=d.getFieldAnalysis(f.id);const sum=Object.values(f.country_family_counts).reduce((a,b)=>a+b,0);
  eq(a.country_distribution.map(x=>x.share),a.country_distribution.map(x=>x.count/(sum||1)));
}
for(const a of d.APPLICANTS)eq(a.country,undefined);
const fixtureDir=fs.mkdtempSync(path.join(root,'logs/data-semantics-fixture-'));
const field='space_launch_propulsion_recovery';
const row=(pub,family,office,date,field_id=field)=>({publication_number:pub,family_id:family,publication_country_code:office,priority_date:date,field_id,assignees:[{name:'Example'}],assignee_country_codes:[],cpc_codes:['B64G1/10']});
const fixture=[row('US-A',1,'US',20160912),row('US-A',1,'US',20160912,'space_gnc_rendezvous_servicing'),row('CN-B',1,'CN',20240912),row('KR-C','0','KR',20250912),row('KR-D',null,'KR',20250912)];
const input=path.join(fixtureDir,'input.jsonl');fs.writeFileSync(input,fixture.map(JSON.stringify).join('\n')+'\n');
const output=path.join(fixtureDir,'landscape.json');
const args=['scripts/build_bq_landscape_from_candidates.mjs','--input',input,'--site-output',output,'--analysis-dir',path.join(fixtureDir,'analysis'),'--reports-dir',path.join(fixtureDir,'reports'),'--analysis-date','2026-09-12'];
execFileSync(process.execPath,args,{cwd:root,stdio:'pipe'});
const result=JSON.parse(fs.readFileSync(output,'utf8'));
eq(result.summary.familyCount,3);eq(result.summary.publicationCount,4);eq(result.summary.rowCount,5);
eq(result.summary.analysisDate,20260912);eq(result.summary.recent5StartDate,20210912);eq(result.summary.recent3StartDate,20230912);
eq(result.source.collectionDate,null);eq(result.fields.find(f=>f.id===field).familyCount,3);
eq(result.fields.find(f=>f.id===field).recentMomentum,1);
const invalid=spawnSync(process.execPath,[...args.slice(0,-1),'2026-02-30'],{cwd:root,encoding:'utf8'});eq(invalid.status,1);
const report={status:'PASS',checks,seed_publications:d.PATENTS.length,date_basis_counts:d.PATENTS.reduce((a,p)=>(a[p.date_basis]=(a[p.date_basis]||0)+1,a),{}),seed_date_quality_records:d.PATENTS.filter(p=>p.date_quality_notes.length).length,fixture_directory:path.relative(root,fixtureDir),raw_aggregate_recomputation:'NOT VERIFIED: raw input absent; aggregate-to-web consistency checked'};
fs.writeFileSync(path.join(root,'logs/data_semantics_verification_20260916.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
