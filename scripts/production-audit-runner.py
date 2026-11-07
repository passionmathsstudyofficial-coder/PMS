"""Supply the existing application's environment without printing its secrets."""
import os
import pathlib
import subprocess
import sys

root = pathlib.Path('/home/u583042336/domains/passionmathstudy.in/hbuilds/current/nodejs').resolve()
environment = None
for process in pathlib.Path('/proc').iterdir():
    if not process.name.isdigit():
        continue
    try:
        if process.stat().st_uid != os.getuid() or 'node' not in (process / 'comm').read_text():
            continue
        if (process / 'cwd').resolve() != root:
            continue
        candidate = dict(item.split('=', 1) for item in (process / 'environ').read_bytes().decode().split('\0') if '=' in item)
        if candidate.get('MONGODB_URI'):
            environment = candidate
            break
    except (OSError, ValueError):
        continue
if environment is None:
    raise SystemExit('No matching production Node process; refusing to guess credentials or database')
environment = {key: value for key, value in environment.items() if not key.startswith('LSNODE_')}
environment['PMS_APP_ROOT'] = str(root)
environment['PMS_AUDIT_DIR'] = '/home/u583042336/.codex-production-audit'
result = subprocess.run(['/opt/alt/alt-nodejs22/root/bin/node', *sys.argv[1:]], cwd=root, env=environment)
raise SystemExit(result.returncode)
