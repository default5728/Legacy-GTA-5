#!/usr/bin/env python3
"""Run manually as root after reviewing this installer. Never run from the timer."""
from pathlib import Path
import json, os, re, shutil, subprocess

ROOT=Path('/srv/kepler-plov-stage')
STATE=Path('/var/lib/legacy-autodeploy')
CONFIG=Path('/etc/legacy-autodeploy')
AGENT=Path('/opt/legacy-autodeploy')
BACKUPS=Path('/srv/ragemp-updates/legacy-autodeploy')
assert os.geteuid()==0
assert ROOT.is_dir() and (ROOT/'stage.env').is_file()
for path in [STATE,STATE/'home',CONFIG,AGENT,BACKUPS]:
    path.mkdir(parents=True,exist_ok=True,mode=0o700)
    path.chmod(0o700)
source=Path(__file__).resolve().parent
shutil.copyfile(source/'deploy.py',AGENT/'deploy.py')
(AGENT/'deploy.py').chmod(0o700)
shutil.copyfile(source/'known_hosts',CONFIG/'known_hosts')
(CONFIG/'known_hosts').chmod(0o600)
key=CONFIG/'github_readonly'
assert key.is_file() and not key.is_symlink()
key.chmod(0o600)

# The shared source reads SMTP credentials from the private service environment.
env=ROOT/'stage.env'
text=env.read_text(encoding='utf-8')
if not re.search(r'^SMTP_PASSWORD=',text,re.M):
    email=(ROOT/'packages/server/email.js').read_text(encoding='utf-8')
    match=re.search(r'static\s+senderPassword\s*=\s*("(?:[^"\\]|\\.)*")',email)
    if match:
        value=json.loads(match[1])
        assert '\n' not in value and '\r' not in value and len(value)<512
        backup=STATE/'service-environment-before-smtp.env'
        if not backup.exists():
            shutil.copyfile(env,backup);backup.chmod(0o600)
        metadata=env.stat()
        temp=env.with_name('stage.env.autodeploy-tmp')
        temp.write_text(text.rstrip('\n')+'\nSMTP_PASSWORD='+json.dumps(value,ensure_ascii=False)+'\n',encoding='utf-8')
        os.chown(temp,metadata.st_uid,metadata.st_gid)
        temp.chmod(metadata.st_mode&0o777)
        temp.replace(env)
        print('SMTP setting moved to the private service environment (value not displayed).')

Path('/etc/systemd/system/legacy-autodeploy.service').write_text('''[Unit]
Description=Legacy Roleplay checked GitHub deployment
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=root
UMask=0077
ExecStart=/usr/bin/python3 -u /opt/legacy-autodeploy/deploy.py
TimeoutStartSec=15min
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/legacy-autodeploy /srv/kepler-plov-stage /srv/ragemp-updates/legacy-autodeploy
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
''')
Path('/etc/systemd/system/legacy-autodeploy.timer').write_text('''[Unit]
Description=Receive checked Legacy Roleplay releases every minute

[Timer]
OnBootSec=90s
OnUnitInactiveSec=60s
RandomizedDelaySec=5s
AccuracySec=5s
Unit=legacy-autodeploy.service

[Install]
WantedBy=timers.target
''')
subprocess.run(['systemctl','daemon-reload'],check=True)
print('Deployment agent and timer installed; activation waits for the initial dry run.')
