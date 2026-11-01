import base64,hashlib,json,os,pathlib,shutil,subprocess,time
root=pathlib.Path('/srv/kepler-plov-stage/client_packages/game_resources/dlcpacks')
base=pathlib.Path('/srv/ragemp-updates/clothing-original-order-20261031')
records=json.loads((base/'patch.json').read_text())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for b in iter(lambda:f.read(4*1024*1024),b''):h.update(b)
 return h.hexdigest()
assert {r['pack']for r in records}=={'clothes2','clothes4'}
prepared=[]
for r in records:
 p=root/r['pack']/'dlc.rpf';assert p.parent.parent.resolve()==root.resolve() and p.is_file() and not p.is_symlink()
 assert digest(p)==r['sha256Before'],'Unexpected current pack: '+r['pack']
 target=base/'prepared'/r['pack']/'dlc.rpf';target.parent.mkdir(parents=True,exist_ok=True)
 shutil.copy2(p,target)
 before,after=base64.b64decode(r['before']),base64.b64decode(r['after']);assert len(before)==len(after)<1000
 with target.open('r+b')as f:
  f.seek(r['offset']);assert f.read(len(before))==before;f.seek(r['offset']);f.write(after);f.flush();os.fsync(f.fileno())
 assert digest(target)==r['sha256After'];st=p.stat();os.chown(target,st.st_uid,st.st_gid);os.chmod(target,st.st_mode&0o777)
 prepared.append((p,target,r['pack']))
print('Verified two metadata-only patches. Model and texture bytes are unchanged.',flush=True)
subprocess.run(['systemctl','stop','legacy-autodeploy.timer'],check=True)
moved=[]
try:
 subprocess.run(['systemctl','stop','ragemp.service'],check=True)
 for live,new,name in prepared:
  old=base/'before'/name/'dlc.rpf';old.parent.mkdir(parents=True,exist_ok=True);assert not old.exists()
  os.replace(live,old);moved.append((live,old));os.replace(new,live)
 subprocess.run(['systemctl','start','ragemp.service'],check=True)
 subprocess.run(['systemctl','is-active','ragemp.service'],check=True)
 (base/'installed.json').write_text(json.dumps({'packs':records,'installedAt':time.time()},indent=2))
 print('Restored order installed: clothes, clothes4, clotches3, clothes2.',flush=True)
except Exception:
 subprocess.run(['systemctl','stop','ragemp.service'],check=True)
 for live,old in reversed(moved):os.replace(old,live)
 subprocess.run(['systemctl','start','ragemp.service'],check=True)
 raise
finally:subprocess.run(['systemctl','start','legacy-autodeploy.timer'],check=True)
