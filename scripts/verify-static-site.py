#!/usr/bin/env python3
"""Check every exported HTML page and its local URL references without network access."""
import argparse,json,sys
import xml.etree.ElementTree as ET
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlsplit,unquote
class Page(HTMLParser):
 def __init__(self):super().__init__();self.refs=[];self.titles=0;self.lang=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='html':self.lang=a.get('lang')
  if tag=='title':self.titles+=1
  for key in ('href','src','poster'):
   if a.get(key):self.refs.append((tag,key,a[key]))
  if a.get('srcset'):
   for v in a['srcset'].split(','):
    if v.strip():self.refs.append((tag,'srcset',v.strip().split()[0]))
def audit(root, require_sitemap=False):
 if not root.is_dir() or not (root/'index.html').is_file():
  raise ValueError(f'Site root must be a directory containing index.html: {root}')
 base='https://agentbridge-lab.github.io/aeropatent-research/'
 pages=sorted(root.rglob('*.html'));broken=[];external=set();local=set();meta=[]
 for path in pages:
  p=Page();p.feed(path.read_text(encoding='utf8'))
  rel=path.relative_to(root).as_posix();pageurl=urljoin(base,rel)
  if p.lang!='ko' or p.titles!=1:meta.append({'page':rel,'lang':p.lang,'title_count':p.titles})
  for tag,attr,ref in p.refs:
   if ref.startswith(('data:','mailto:','tel:','javascript:','#')):continue
   u=urlsplit(urljoin(pageurl,ref))
   if u.scheme not in ('http','https'):continue
   if u.netloc!='agentbridge-lab.github.io':external.add(u.scheme+'://'+u.netloc+u.path);continue
   if not u.path.startswith('/aeropatent-research/'):
    broken.append({'page':rel,'tag':tag,'attribute':attr,'url':ref,'reason':'outside_project_base_path'});continue
   target=unquote(u.path.removeprefix('/aeropatent-research/'));dest=root/target
   candidates=[dest/'index.html'] if not dest.suffix or u.path.endswith('/') else [dest]
   # IDs often contain dots (e.g. /reports/field.foo/) and are directories.
   if dest.is_dir():candidates=[dest/'index.html']
   if not any(x.is_file() for x in candidates):broken.append({'page':rel,'tag':tag,'attribute':attr,'url':ref,'target':target,'reason':'missing_local_target'})
   local.add(target)
 route_issues=[];sitemap_n=0
 sitemap=root/'sitemap.xml'
 if require_sitemap or sitemap.exists():
  if not sitemap.is_file():route_issues.append({'reason':'missing_sitemap'})
  else:
   try:
    urls=[e.text or '' for e in ET.parse(sitemap).getroot().iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    sitemap_n=len(urls)
    expected={unquote(urljoin(base,p.relative_to(root).as_posix().removesuffix('index.html'))) for p in pages if p.name=='index.html' and p.relative_to(root).as_posix() not in ('404/index.html','_not-found/index.html')}
    actual={unquote(u) for u in urls}
    route_issues.extend({'reason':'missing_sitemap_route','url':u} for u in sorted(expected-actual))
    route_issues.extend({'reason':'unexpected_sitemap_route','url':u} for u in sorted(actual-expected))
    if len(urls)!=len(actual):route_issues.append({'reason':'duplicate_sitemap_routes'})
   except ET.ParseError as error:route_issues.append({'reason':'invalid_sitemap_xml','error':str(error)})
 return {'html_pages_n':len(pages),'local_targets_n':len(local),'external_urls_n':len(external),'broken_references_n':len(broken),'metadata_issues_n':len(meta),'sitemap_routes_n':sitemap_n,'route_issues_n':len(route_issues),'broken_references':broken,'metadata_issues':meta,'route_issues':route_issues,'external_urls':sorted(external),'scope':'Every HTML page, href/src/poster/srcset targets and complete sitemap coverage. External service contents and runtime JS interactions are checked separately.'}
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--root',default='docs');ap.add_argument('--output');args=ap.parse_args()
 try:r=audit(Path(args.root).resolve(),require_sitemap=True)
 except ValueError as error:
  print(json.dumps({'status':'FAIL','error':str(error)},ensure_ascii=False));sys.exit(1)
 if args.output:Path(args.output).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:v for k,v in r.items() if not isinstance(v,list)},ensure_ascii=False));sys.exit(1 if r['broken_references_n'] or r['metadata_issues_n'] or r['route_issues_n'] else 0)
