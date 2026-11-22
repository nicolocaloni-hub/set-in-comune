// Sends one announcement campaign to the people claim_broadcast hands over.
// The database decides who receives it (confirmed, not erased, not opted out, never twice).
// Campaigns come from campaigns.mjs or, when written in the manager panel, from
// private.broadcast_campaigns (io.load).
import {CAMPAIGNS} from './campaigns.mjs';
const UUID=/^[a-f0-9-]{36}$/i,SLUG=/^[a-z0-9-]{3,60}$/;
const OPT_OUT_MARK=/rispondi «NO»/;
const OPT_OUT_HTML='<p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#5d6b64;text-align:center;margin:16px 0;">Ricevi questa email perché hai un account su Rent to a Friend. Se non vuoi ricevere altri aggiornamenti come questo, rispondi «NO» e ti togliamo dalla lista.</p>';
const OPT_OUT_TEXT='Ricevi questa email perché hai un account su Rent to a Friend. Se non vuoi ricevere altri aggiornamenti come questo, rispondi «NO» e ti togliamo dalla lista.';

export function parseRequest(body){
 const campaign=String(body?.campaign||''),mode=String(body?.mode||'');
 if(!SLUG.test(campaign)||!['test','all'].includes(mode))throw new Error('Invalid request');
 return {campaign,mode};
}
export function htmlToText(html){
 return String(html).replace(/<(style|script|head)[\s\S]*?<\/\1>/gi,'').replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,'$2 ($1)')
  .replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|h[1-6]|tr|li|div)>/gi,'\n').replace(/<[^>]+>/g,'')
  .replace(/&nbsp;/g,' ').replace(/&#8226;/g,'•').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  .replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
// Every announcement carries the opt-out line, even if the panel HTML forgot it.
export function prepareCampaign(c){
 if(!c||typeof c.subject!=='string'||typeof c.html!=='string'||c.subject.trim().length<3||c.html.length<20)throw new Error('Invalid campaign');
 let html=c.html,text=typeof c.text==='string'&&c.text.trim()?c.text:htmlToText(c.html);
 if(!OPT_OUT_MARK.test(html))html=/<\/body>/i.test(html)?html.replace(/<\/body>/i,OPT_OUT_HTML+'</body>'):html+OPT_OUT_HTML;
 if(!OPT_OUT_MARK.test(text))text+='\n\n'+OPT_OUT_TEXT;
 return {subject:c.subject.trim(),html,text};
}
export function buildMessage(campaign,to){
 if(!campaign||typeof to!=='string'||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to))throw new Error('Invalid message');
 return {to,subject:campaign.subject,html:campaign.html,text:campaign.text};
}
export async function loadCampaign(slug,io){
 const c=Object.hasOwn(CAMPAIGNS,slug)?CAMPAIGNS[slug]:await io.load(slug);
 if(!c)throw new Error('Unknown campaign');
 return prepareCampaign(c);
}
export async function processBroadcast({campaign,mode},io){
 const content=await loadCampaign(campaign,io);
 const result={sent:0,failed:0};
 const people=await io.claim(campaign,mode);
 for(const p of Array.isArray(people)?people:[]){
  if(!UUID.test(p?.userId)||!UUID.test(p?.lease))continue;
  let ok=false;
  try{await io.send(buildMessage(content,p.email));ok=true;}catch{}
  await io.finish(campaign,mode,p.userId,p.lease,ok);ok?result.sent++:result.failed++;
 }
 return result;
}
