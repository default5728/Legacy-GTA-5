"""Preserve DLC payloads while making folder names match setup2.xml nameHash."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path('/srv/kepler-plov-stage/client_packages/game_resources/dlcpacks')
BACKUP = Path('/srv/ragemp-updates/legacy-content-identities-20261031')
RENAMES = {'legacy_98clk': '98clk', 'legacy_samara': '200613',
           'legacy_tesroad20': 'tesroad20', 'zz_legacy26_styles': 'legacy26'}


def run(*args):
    subprocess.run(args, check=True, timeout=300)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--commit', required=True)
    args = parser.parse_args()
    assert re.fullmatch('[a-f0-9]{40}', args.commit)
    manifest = json.loads(Path(__file__).with_name('manifest.json').read_text())
    expected = {row['pack']: row for row in manifest}
    plan = []
    for old, new in RENAMES.items():
        source, target = ROOT / old, ROOT / new
        assert source.parent.resolve() == ROOT.resolve() == target.parent.resolve()
        assert not (source.exists() and target.exists()), 'Duplicate DLC: ' + new
        current = source if source.exists() else target
        assert current.is_dir() and not current.is_symlink(), 'Missing DLC: ' + new
        payload = current / 'dlc.rpf'
        assert payload.stat().st_size == expected[new]['bytes']
        assert hashlib.sha256(payload.read_bytes()).hexdigest() == expected[new]['sha256']
        if current == source:
            plan.append((source, target))
    BACKUP.mkdir(mode=0o700, exist_ok=True)
    (BACKUP / 'rename-plan.json').write_text(json.dumps({
        'commit': args.commit, 'moves': [[str(a), str(b)] for a, b in plan],
        'manifest': manifest}, indent=2))
    run('systemctl', 'stop', 'legacy-autodeploy.timer')
    moved = []
    try:
        run('systemctl', 'stop', 'ragemp.service')
        for source, target in plan:
            os.rename(source, target)
            moved.append((source, target))
        run('systemctl', 'start', 'legacy-autodeploy.service')
        state = json.loads(Path('/var/lib/legacy-autodeploy/status.json').read_text())
        assert state['status'] in ('installed', 'installed_without_restart'), state
        assert state['commit'] == args.commit, state
        run('systemctl', 'start', 'ragemp.service')
        run('systemctl', 'is-active', 'ragemp.service')
        (BACKUP / 'installed.json').write_text(json.dumps(state, indent=2))
        print('Verified DLC names and deployed', args.commit, flush=True)
    except Exception:
        run('systemctl', 'stop', 'ragemp.service')
        for source, target in reversed(moved):
            os.rename(target, source)
        run('systemctl', 'start', 'ragemp.service')
        raise
    finally:
        run('systemctl', 'start', 'legacy-autodeploy.timer')


if __name__ == '__main__':
    main()
