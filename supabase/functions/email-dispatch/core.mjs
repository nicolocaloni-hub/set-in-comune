// Builds and sends booking digests and inactive-account notices. No chat text
// ever goes into an email: only what happened, the item's title and a link.
const UUID=/^[a-f0-9-]{36}$/i;
const LINES={
 request:t=>`Nuova richiesta di noleggio per «${t}»`,
 accepted:t=>`La tua richiesta per «${t}» è stata accettata`,
 declined:t=>`La tua richiesta per «${t}» non è stata accettata`,
 cancelled:t=>`Il noleggio di «${t}» è stato annullato`,
 reminder:t=>`Promemoria: domani ritiro o restituzione di «${t}»`,
 message:t=>`Nuovo messaggio su «${t}»`
};
const SUBJECTS={request:'Nuova richiesta di noleggio',accepted:'Richiesta accettata',declined:'Richiesta non accettata',cancelled:'Noleggio annullato',reminder:'Promemoria noleggio',message:'Hai un nuovo messaggio'};
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function eventLink(appUrl,e){
 if(e.kind==='message'&&e.conversationId&&UUID.test(e.conversationId))return `${appUrl}/#messages?conversation=${e.conversationId}`;
 if(e.bookingId&&UUID.test(e.bookingId))return `${appUrl}/#${e.kind==='message'?'messages':'bookings'}?booking=${e.bookingId}`;
 return appUrl+'/';
}
export function buildDigest(appUrl,d){
 if(!/^https:\/\/[a-z0-9.-]+$/.test(appUrl))throw new Error('Invalid app URL');
 const events=(d.events||[]).filter(e=>LINES[e.kind]);
 if(!events.length||typeof d.email!=='string'||!d.email.includes('@'))throw new Error('Nothing to send');
 const items=events.map(e=>({text:LINES[e.kind](String(e.title||'il tuo noleggio').slice(0,120)),url:eventLink(appUrl,e)}));
 const subject=events.length===1?SUBJECTS[events[0].kind]:`Hai ${events.length} novità su Rent to a Friend`;
 const name=String(d.name||'').trim().slice(0,60);
 const hello=name?`Ciao ${name},`:'Ciao,';
 const footer='Ricevi questa email perché hai attività in corso su Rent to a Friend. Per assistenza scrivi a assistenza@rent-to-a-friend.it.';
 const text=[hello,'',...items.map(i=>`• ${i.text}\n  ${i.url}`),'','Apri l’app per rispondere: '+appUrl,'',footer].join('\n');
 const html=`<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1d2a24;max-width:520px">`+
  `<p>${esc(hello)}</p><ul style="padding-left:18px">${items.map(i=>`<li style="margin:8px 0"><a href="${esc(i.url)}" style="color:#1f5d48">${esc(i.text)}</a></li>`).join('')}</ul>`+
  `<p><a href="${esc(appUrl)}" style="display:inline-block;background:#1f5d48;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Apri Rent to a Friend</a></p>`+
  `<p style="font-size:12px;color:#6b756f">${esc(footer)}</p></div>`;
 return {to:d.email,subject,text,html};
}
export async function processEmailWork(work,io){
 const result={digests:0,notices:0,failed:0};
 for(const d of work?.digests||[]){
  if(!UUID.test(d.userId)||!UUID.test(d.lease))continue;
  let ok=false;
  try{await io.sendEmail(buildDigest(work.appUrl,d));ok=true;}catch{}
  await io.finishDigest(d.userId,d.lease,ok);ok?result.digests++:result.failed++;
 }
 for(const n of work?.inactivity||[]){
  if(!UUID.test(n.userId)||!UUID.test(n.lease))continue;
  let ok=false;
  try{if(typeof n.email!=='string'||!n.email.includes('@'))throw new Error('No email');await io.sendMagicLink(n.email,work.appUrl+'/');ok=true;}catch{}
  await io.finishNotice(n.userId,n.lease,ok);ok?result.notices++:result.failed++;
 }
 return result;
}
