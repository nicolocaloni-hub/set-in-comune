// Sends one announcement campaign to the people claim_broadcast hands over.
// The database decides who receives it (confirmed, not erased, not opted out, never twice).
import {CAMPAIGNS} from './campaigns.mjs';
const UUID=/^[a-f0-9-]{36}$/i;
export function parseRequest(body){
 const campaign=String(body?.campaign||''),mode=String(body?.mode||'');
 if(!Object.hasOwn(CAMPAIGNS,campaign)||!['test','all'].includes(mode))throw new Error('Invalid request');
 return {campaign,mode};
}
export function buildMessage(campaign,to){
 const c=CAMPAIGNS[campaign];
 if(!c||typeof to!=='string'||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to))throw new Error('Invalid message');
 return {to,subject:c.subject,html:c.html,text:c.text};
}
export async function processBroadcast({campaign,mode},io){
 const result={sent:0,failed:0};
 const people=await io.claim(campaign,mode);
 for(const p of Array.isArray(people)?people:[]){
  if(!UUID.test(p?.userId)||!UUID.test(p?.lease))continue;
  let ok=false;
  try{await io.send(buildMessage(campaign,p.email));ok=true;}catch{}
  await io.finish(campaign,mode,p.userId,p.lease,ok);ok?result.sent++:result.failed++;
 }
 return result;
}
