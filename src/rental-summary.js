import {escapeHtml as esc,euro,labels,rentalDays} from './domain.js';
import {handoffItems} from './marketplace.js';

// Printable summary of one rental: what was agreed and what both parties recorded
// at pickup and return. It is a copy of data already visible to the participants,
// not a contract, a signature or a statement by the platform.

const stageNames={accepted:'Accettazione',collected:'Ritiro',returned:'Restituzione',completed:'Chiusura',declined:'Rifiuto',cancelled:'Annullamento'};
const longDate=d=>new Date(d+'T12:00:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const stamp=v=>new Date(v).toLocaleString('it-IT',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});

export function summaryFileName(booking){
 const slug=String(booking.title||'noleggio').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'noleggio';
 return `rent-to-a-friend-${slug}-${booking.start_date}`;
}

// people: {owner:{display_name}, renter:{display_name}}; photos: Map(path => already validated URL)
export function rentalSummaryMarkup(booking,entries=[],{people={},photos=new Map(),generatedAt=new Date().toISOString(),demo=false}={}){
 const days=rentalDays(booking.start_date,booking.end_date);
 const owner=people.owner?.display_name||'Proprietario',renter=people.renter?.display_name||booking.renter_name||'Chi noleggia';
 const actor=id=>id===booking.owner_id?owner:id===booking.renter_id?renter:'Partecipante';
 const log=entries.length?entries.map(x=>{
  const checks=x.checklist&&Object.keys(handoffItems).some(k=>x.checklist[k]===true)
   ?`<ul class="summary-checks">${Object.entries(handoffItems).map(([k,label])=>`<li>${x.checklist[k]===true?'✓':'—'} ${esc(label)}</li>`).join('')}</ul>`:'';
  const imgs=(x.photos||[]).map(p=>photos.get(p)).filter(Boolean);
  return `<article class="summary-entry"><h3>${esc(stageNames[x.stage]||labels[x.stage]||x.stage)}</h3><p class="summary-meta">${esc(stamp(x.created_at))}${x.actor_id?' · registrato da '+esc(actor(x.actor_id)):''}</p><p>${esc(x.note||'Nessuna nota.')}</p>${checks}${imgs.length?`<div class="summary-photos">${imgs.map((src,i)=>`<img src="${esc(src)}" alt="Foto ${i+1} · ${esc(stageNames[x.stage]||x.stage)}">`).join('')}</div>`:''}</article>`;
 }).join(''):'<p>Nessun ritiro o restituzione registrati finora.</p>';
 return `<article class="rental-summary">
<header class="summary-header"><img src="/logo-mark.webp" width="56" height="56" alt=""><div><p class="summary-eyebrow">RENT TO A FRIEND · Riepilogo del noleggio${demo?' · DEMO':''}</p><h1>${esc(booking.title)}</h1><p class="summary-meta">Riferimento ${esc(booking.id)} · Stato: ${esc(labels[booking.status]||booking.status)}</p></div></header>
<section><h2>Le parti</h2><dl class="summary-grid"><div><dt>Proprietario</dt><dd>${esc(owner)}</dd></div><div><dt>Chi noleggia</dt><dd>${esc(renter)}</dd></div></dl></section>
<section><h2>Periodo e importi</h2><dl class="summary-grid"><div><dt>Ritiro</dt><dd>${esc(longDate(booking.start_date))}</dd></div><div><dt>Restituzione</dt><dd>${esc(longDate(booking.end_date))}</dd></div><div><dt>Durata</dt><dd>${days} ${days===1?'giorno':'giorni'} (inclusi ritiro e restituzione)</dd></div><div><dt>Noleggio concordato</dt><dd>${esc(euro(booking.total))}</dd></div><div><dt>Cauzione separata</dt><dd>${esc(euro(booking.deposit))}</dd></div></dl><p class="summary-note">Pagamento e cauzione sono gestiti direttamente tra le parti, fuori dall’app.</p></section>
<section><h2>Accordo salvato con la richiesta</h2><h3>Accessori inclusi</h3><p>${esc(booking.accessories)}</p><h3>Condizioni di noleggio</h3><p>${esc(booking.conditions)}</p><h3>Copertura assicurativa dichiarata</h3><p>${esc(booking.insurance)}</p>${booking.note?`<h3>Nota della richiesta</h3><p>${esc(booking.note)}</p>`:''}</section>
<section><h2>Registro di ritiro e restituzione</h2>${log}</section>
<footer class="summary-footer"><p>Documento generato il ${esc(stamp(generatedAt))} dai dati registrati nell’app e visibili ai partecipanti. Le conferme sono dichiarazioni di chi le ha registrate: non sono una firma elettronica, una perizia o una garanzia della piattaforma, che non è parte del noleggio.</p></footer>
</article>`;
}
