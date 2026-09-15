#!/usr/bin/env python3
"""Assemble all Next and standalone pages locally; restore the old export if validation fails."""
from pathlib import Path
from datetime import datetime,timezone
import shutil,subprocess,sys,zipfile
ROOT=Path(__file__).resolve().parent.parent
out=ROOT/'web/out';docs=ROOT/'docs'
if not (out/'index.html').is_file():raise SystemExit('Build web/out first with npm run build:pages.')
if docs.is_symlink() or out.is_symlink():raise SystemExit('Refusing a symlinked export directory.')
backup_dir=ROOT/'.cache/site-export-backups';backup_dir.mkdir(parents=True,exist_ok=True)
backup=None
if docs.exists():
 stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
 backup=shutil.make_archive(str(backup_dir/stamp),'zip',root_dir=ROOT,base_dir='docs')
try:
 if docs.exists():shutil.rmtree(docs)
 shutil.copytree(out,docs)
 (docs/'.nojekyll').touch()
 for script in ['build_deepdive_pages.py','build_exploration_page.py','verify-static-site.py']:
  subprocess.run([sys.executable,str(ROOT/'scripts'/script)],cwd=ROOT,check=True)
except Exception:
 if docs.exists():shutil.rmtree(docs)
 if backup:
  with zipfile.ZipFile(backup) as z:z.extractall(ROOT)
 raise
print('PASS: complete static site assembled and checked. No deployment performed.')
