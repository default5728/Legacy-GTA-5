const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const vm=require('node:vm');
const fragments=new Set(['client_packages/f10-reticle-kit/hud/script-crosshair-vue.js']);
const root=path.resolve(__dirname,'..');const files=cp.execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(n=>n.endsWith('.js')&&/^(packages\/server\/|client_packages\/)/.test(n));
let cursor=0,failed=false;
async function worker(){while(cursor<files.length){const name=files[cursor++];if(fragments.has(name)){try{new vm.Script('({'+fs.readFileSync(path.join(root,name),'utf8')+'})');}catch(e){failed=true;console.error(name+': '+e.message);}continue;}await new Promise(resolve=>{const child=cp.spawn(process.execPath,['--check',path.join(root,name)],{stdio:['ignore','ignore','pipe']});let output='';child.stderr.on('data',d=>output+=d);child.on('error',e=>{failed=true;console.error(name+': '+e.message);resolve();});child.on('close',code=>{if(code){failed=true;console.error(name+'\n'+output.slice(0,1800));}resolve();});});}}
Promise.all([worker(),worker()]).then(()=>{if(failed)process.exitCode=1;else console.log('Syntax check passed: '+files.length+' JavaScript files.');});
