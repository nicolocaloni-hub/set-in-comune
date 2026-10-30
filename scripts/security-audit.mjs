import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const run=(...args)=>{const r=spawnSync('git',args,{encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw new Error('Cannot inspect local Git objects.');return r.stdout;};
const rules=[
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
 ['github-token',/\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
 ['github-fine-grained-token',/\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
 ['supabase-secret',/\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
 ['provider-secret',/\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}\b/],
 ['aws-access-key',/\bAKIA[A-Z0-9]{16}\b/],
 ['credential-in-url',/postgres(?:ql)?:\/\/[^\s:"']+:[^\s@"']+@/]
];
const findings=[],seen=new Set();let workingFiles=0,historyBlobs=0;
function scan(text,location){
 for(const [rule,pattern] of rules)if(pattern.test(text))findings.push({rule,location});
 for(const token of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g)){
  try{if(JSON.parse(Buffer.from(token[0].split('.')[1],'base64url').toString()).role==='service_role')findings.push({rule:'service-role-jwt',location});}catch{}
 }
}
for(const path of new Set(run('ls-files','--cached','--others','--exclude-standard').trim().split('\n'))){
 if(!path)continue;
 if(/(?:^|\/)(?:\.env(?:\..*)?|[^/]+\.(?:pem|p12|pfx|key|dump))$/.test(path)&&!path.endsWith('.env.example'))findings.push({rule:'private-file',location:path});
 try{const bytes=await readFile(path);if(bytes.length<=2*1024*1024&&!bytes.includes(0)){scan(bytes.toString(),path);workingFiles++;}}catch{}
}
for(const line of run('rev-list','--objects','--all').trim().split('\n')){
 const [sha,...name]=line.split(' ');if(!sha||seen.has(sha))continue;seen.add(sha);
 if(run('cat-file','-t',sha).trim()!=='blob')continue;
 if(Number(run('cat-file','-s',sha))>2*1024*1024)continue;
 const text=run('cat-file','blob',sha);if(!text.includes('\0')){scan(text,'git:'+sha.slice(0,12)+':'+name.join(' '));historyBlobs++;}
}
console.log(JSON.stringify({scope:'working tree and locally available Git history; known credential patterns only',workingFiles,historyBlobs,findings},null,2));
if(findings.length)process.exitCode=1;
