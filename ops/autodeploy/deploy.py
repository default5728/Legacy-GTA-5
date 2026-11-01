#!/usr/bin/env python3
"""Root-owned deployment agent. Repository code is never executed as root."""
from pathlib import Path, PurePosixPath
from concurrent.futures import ThreadPoolExecutor
import argparse, datetime, hashlib, json, os, re, shutil, subprocess, time

ROOT = Path('/srv/kepler-plov-stage')
STATE = Path('/var/lib/legacy-autodeploy')
CHECKOUT = STATE / 'repo'
BACKUPS = Path('/srv/ragemp-updates/legacy-autodeploy')
REPOSITORY = 'git@github.com:talipovtimur347-cpu/legacy-roleplay.git'
BRANCH = 'deploy-ready'
FRAGMENT = 'client_packages/f10-reticle-kit/hud/script-crosshair-vue.js'
PROTECTED = {'packages/server/discord_admin/config.json'}
SECRET_PATTERNS = [re.compile(p) for p in [
 r'ghp_[A-Za-z0-9]{20,}', r'github_pat_[A-Za-z0-9_]{20,}',
 r'-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----',
 r'https://(?:discord\.com|discordapp\.com)/api/webhooks/\d+/[\w-]+',
 r'''(?i)\b(?:password|pass|token|clientSecret)\s*[:=]\s*["'][^"'\r\n]{12,}["']''']]


def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, text=True, timeout=120, **kwargs)


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.chmod(0o600)
    temp.replace(path)


def read_json(path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def report(status, sha='', **fields):
    value = {'status': status, 'commit': sha, 'time': datetime.datetime.now(datetime.timezone.utc).isoformat(), **fields}
    atomic_json(STATE / 'status.json', value)
    print(json.dumps(value, ensure_ascii=False), flush=True)


def git(*args, cwd=CHECKOUT, timeout=300):
    env = dict(os.environ, HOME=str(STATE / 'home'), GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL='/dev/null',
               GIT_TERMINAL_PROMPT='0', GIT_SSH_COMMAND='ssh -F /dev/null -i /etc/legacy-autodeploy/github_readonly -p 443 -o HostName=ssh.github.com -o HostKeyAlias=github.com -o IdentitiesOnly=yes -o IdentityAgent=none -o IPQoS=none -o KexAlgorithms=curve25519-sha256 -o ServerAliveInterval=15 -o ServerAliveCountMax=2 -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/etc/legacy-autodeploy/known_hosts -o ConnectTimeout=15')
    env.pop('SSH_AUTH_SOCK', None)
    return subprocess.run(['git', '-c', 'core.hooksPath=/dev/null', '-C', str(cwd), *args], env=env,
                          check=True, capture_output=True, timeout=timeout).stdout


def configure_checkout():
    # Deploy exact Git blobs. Do not run CRLF clean/smudge filters in the Linux checkout.
    info = CHECKOUT / '.git' / 'info'
    info.mkdir(parents=True, exist_ok=True)
    attributes = info / 'attributes'
    if attributes.is_symlink():
        raise ValueError('Unsafe internal Git attributes path')
    attributes.write_text('* -text\n', encoding='utf-8')
    attributes.chmod(0o600)


def fetch_release():
    (STATE / 'home').mkdir(exist_ok=True, mode=0o700)
    if not CHECKOUT.exists():
        CHECKOUT.mkdir(mode=0o700)
        git('init', '--quiet')
        git('remote', 'add', 'origin', REPOSITORY)
    configure_checkout()
    refs = git('ls-remote', '--heads', 'origin', 'refs/heads/' + BRANCH).decode().strip()
    if not refs:
        report('waiting_for_checked_commit')
        return None
    sha = refs.split()[0]
    if not re.fullmatch(r'[a-f0-9]{40}', sha):
        raise ValueError('Invalid remote commit')
    state = read_json(STATE / 'installed.json', {'commit': '', 'files': {}})
    if state.get('commit') == sha:
        return None
    print('Fetching checked release ' + sha, flush=True)
    git('fetch', '--quiet', '--depth=1', 'origin', 'refs/heads/' + BRANCH)
    if git('rev-parse', 'FETCH_HEAD').decode().strip() != sha:
        raise RuntimeError('Release advanced during fetch; retry on next timer tick')
    if git('status', '--porcelain').strip():
        raise RuntimeError('Managed deployment checkout has local edits')
    git('checkout', '--quiet', '--detach', sha)
    return sha


def eligible_name(name):
    p = PurePosixPath(name)
    return (not p.is_absolute() and '..' not in p.parts and '\\' not in name and ':' not in name
            and name.startswith(('packages/server/', 'client_packages/'))
            and not name.startswith('client_packages/game_resources/')
            and not any(part in {'node_modules', '.git', 'data', 'logs', 'backups'} for part in p.parts)
            and not p.name.startswith('.env') and p.name != 'stage.env'
            and name not in PROTECTED
            and p.suffix.lower() not in {'.rpf', '.exe', '.dll', '.so', '.key', '.pem', '.db', '.sqlite', '.sqlite3', '.log'})


def source_files():
    result = {}
    for entry in git('ls-tree', '-r', '-z', '--full-tree', 'HEAD').split(b'\0'):
        if not entry:
            continue
        metadata, raw_name = entry.split(b'\t', 1)
        name = raw_name.decode('utf-8')
        if not eligible_name(name):
            continue
        if metadata.split()[0] not in {b'100644', b'100755'}:
            raise ValueError('Symlinks/submodules cannot be deployed: ' + name)
        path = CHECKOUT / name
        if path.is_symlink() or not path.resolve().is_relative_to(CHECKOUT.resolve()):
            raise ValueError('Unsafe source: ' + name)
        result[name] = digest(path)
    if 'packages/server/index.js' not in result or 'client_packages/index.js' not in result:
        raise ValueError('Missing game entry points')
    return result


def target_path(name):
    if not eligible_name(name):
        raise ValueError('Refusing protected path: ' + name)
    path = ROOT / name
    if not path.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError('Destination escapes live root: ' + name)
    if path.is_symlink():
        raise ValueError('Destination is a symlink: ' + name)
    return path


def validate(files):
    cache = set(read_json(STATE / 'syntax-cache.json', []))
    jobs = []
    for name, value in files.items():
        path = CHECKOUT / name
        if path.suffix.lower() in {'.js', '.json', '.xml', '.ini'}:
            text = path.read_text(encoding='utf-8-sig')
            if any(pattern.search(text) for pattern in SECRET_PATTERNS):
                raise ValueError('Possible embedded credential: ' + name)
        if name.endswith('.js') and value not in cache:
            jobs.append((name, value))
    def check(job):
        name, value = job
        path = CHECKOUT / name
        if name == FRAGMENT:
            run(['node', '-e', "new(require('node:vm').Script)('({'+require('node:fs').readFileSync(process.argv[1],'utf8')+'})')", str(path)])
        else:
            try:
                run(['node', '--check', str(path)])
            except subprocess.CalledProcessError as error:
                raise ValueError('JavaScript syntax error: ' + name + '\n' + error.stderr[:1500]) from error
        return value
    with ThreadPoolExecutor(max_workers=2) as pool:
        cache.update(pool.map(check, jobs))
    atomic_json(STATE / 'syntax-cache.json', sorted(cache))
    print('Syntax and credential checks passed: ' + str(len(jobs)) + ' changed/new JS blobs.', flush=True)


def same_text(source, target):
    if source.suffix.lower() not in {'.js', '.json', '.css', '.html', '.svg', '.map', '.txt', '.md', '.xml', '.sql'}:
        return False
    return source.read_bytes().replace(b'\r\n', b'\n') == target.read_bytes().replace(b'\r\n', b'\n')


def live_manifest(files):
    return {name: digest(target_path(name)) for name in files}


def plan(files, previous):
    changes, deletes = [], []
    for name, old_hash in previous.items():
        target = target_path(name)
        if not target.is_file() or digest(target) != old_hash:
            raise ValueError('Live file edited outside Git; reconcile before deployment: ' + name)
    for name, value in files.items():
        target = target_path(name)
        if not target.is_file() or (digest(target) != value and not same_text(CHECKOUT / name, target)):
            changes.append(name)
    for name in previous:
        if name not in files:
            deletes.append(name)
    return changes, deletes


def copy_live(source, target):
    import pwd
    user = pwd.getpwnam('ragemp')
    target.parent.mkdir(parents=True, exist_ok=True)
    parent = target.parent
    while parent != ROOT:
        os.chown(parent, user.pw_uid, user.pw_gid)
        parent.chmod(0o750)
        parent = parent.parent
    temp = target.with_name(target.name + '.legacy-deploy-tmp')
    shutil.copyfile(source, temp)
    os.chown(temp, user.pw_uid, user.pw_gid)
    temp.chmod(0o640)
    temp.replace(target)


def service(action):
    run(['systemctl', action, 'ragemp.service'])


def healthy(timeout=100):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        pid = run(['systemctl', 'show', 'ragemp.service', '-p', 'MainPID', '--value']).stdout.strip()
        if pid != '0':
            log = run(['journalctl', '_SYSTEMD_UNIT=ragemp.service', '_PID=' + pid, '-o', 'cat', '--no-pager']).stdout
            if all(marker in log for marker in ['The server is ready to accept connections.', '[db] MySQL connected', '[LEGACY COMMANDS]']):
                return True
        time.sleep(2)
    return False


def make_backup(sha, names, installed):
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('r%Y%m%d-%H%M%S-') + sha[:12]
    backup = BACKUPS / stamp
    backup.mkdir(parents=True, mode=0o700)
    existed = []
    for name in names:
        target = target_path(name)
        if target.is_file():
            dest = backup / 'files' / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, dest)
            existed.append(name)
    atomic_json(backup / 'installed-before.json', installed)
    atomic_json(backup / 'restore.json', {'names': names, 'existed': existed})
    return backup, set(existed)


def restore_backup(backup, names, existed):
    for name in names:
        target = target_path(name)
        if name in existed:
            copy_live(backup / 'files' / name, target)
        elif target.exists():
            target.unlink()


def database_backup(backup):
    database = 'plov_migration_stage'
    with (backup / 'database-before.sql').open('wb') as output:
        subprocess.run(['mariadb-dump', '--single-transaction', database], stdout=output, stderr=subprocess.PIPE, check=True, timeout=90)


def prune_backups():
    dirs = sorted(p for p in BACKUPS.iterdir() if p.is_dir() and re.fullmatch(r'r\d{8}-\d{6}-[a-f0-9]{12}', p.name))
    for path in dirs[:-5]:
        if not path.is_symlink() and path.resolve().is_relative_to(BACKUPS.resolve()):
            shutil.rmtree(path)


def install(sha, files, dry_run=False):
    installed = read_json(STATE / 'installed.json', {'commit': '', 'files': {}})
    changes, deletes = plan(files, installed['files'])
    print('Planned files: update=' + str(len(changes)) + ', delete=' + str(len(deletes)), flush=True)
    if dry_run:
        report('dry_run_passed', sha, updates=changes, deletes=deletes)
        return
    if not changes and not deletes:
        atomic_json(STATE / 'installed.json', {'commit': sha, 'files': live_manifest(files)})
        report('installed_without_restart', sha)
        return
    needed = sum((CHECKOUT / n).stat().st_size for n in changes) + 512 * 1024**2
    if shutil.disk_usage(ROOT).free < needed:
        raise RuntimeError('Not enough free disk space for a backed-up deployment')
    names = sorted(set(changes + deletes))
    backup, existed = make_backup(sha, names, installed)
    try:
        service('stop')
        database_backup(backup)
        for name in changes:
            copy_live(CHECKOUT / name, target_path(name))
        for name in deletes:
            target_path(name).unlink()
        service('start')
        if not healthy():
            raise RuntimeError('Updated game mode did not reach native/database/admin readiness')
    except Exception:
        service('stop')
        restore_backup(backup, names, existed)
        service('start')
        recovered = healthy()
        report('rolled_back' if recovered else 'rollback_needs_attention', sha, backup=str(backup))
        raise
    atomic_json(STATE / 'installed.json', {'commit': sha, 'files': live_manifest(files)})
    report('installed', sha, updates=len(changes), deleted=len(deletes), backup=str(backup))
    prune_backups()


def main():
    import fcntl
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--retry', action='store_true')
    args = parser.parse_args()
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    BACKUPS.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (STATE / 'lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        sha = ''
        try:
            sha = fetch_release()
            if not sha:
                return
            if read_json(STATE / 'failed.json', {}).get('commit') == sha and not args.retry:
                return
            files = source_files()
            validate(files)
            install(sha, files, args.dry_run)
        except Exception as error:
            previous = read_json(STATE / 'status.json', {})
            status = previous.get('status') if previous.get('commit') == sha and previous.get('status') in {'rolled_back', 'rollback_needs_attention'} else 'rejected'
            report(status, sha, error=str(error)[:1800])
            if sha and not args.dry_run:
                atomic_json(STATE / 'failed.json', {'commit': sha})
            raise SystemExit(1)


if __name__ == '__main__':
    main()
