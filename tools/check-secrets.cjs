const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');const files=cp.execFileSync('git',['ls-files','--cached','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const patterns=[/ghp_[A-Za-z0-9]{20,}/,/github_pat_[A-Za-z0-9_]{20,}/,/-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----/,/https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+/,/\b(?:password|pass|token|clientSecret)\s*[:=]\s*["'][^"'\r\n]{12,}["']/i];
let failed=false;for(const file of files){if(!/\.(?:js|json|ps1|env|ini|xml)$/.test(file))continue;const full=path.join(root,file);if(!fs.existsSync(full))continue;const data=fs.readFileSync(full,'utf8');if(patterns.some(p=>p.test(data))){console.error('Check possible credential in '+file);failed=true;}}
if(failed)process.exit(1);console.log('Credential pattern check passed.');
