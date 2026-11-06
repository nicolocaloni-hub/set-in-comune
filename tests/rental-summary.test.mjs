import test from 'node:test';
import assert from 'node:assert/strict';
import {rentalSummaryMarkup,summaryFileName} from '../src/rental-summary.js';

const booking={id:'11111111-1111-4111-8111-111111111111',title:'Sony FX3 <script>alert(1)</script>',owner_id:'owner',renter_id:'renter',renter_name:'Bruno',start_date:'2026-12-12',end_date:'2026-12-15',total:260,deposit:500,status:'completed',accessories:'Cage, 2 batterie',conditions:'Ritiro a San Lorenzo',insurance:'Nessuna copertura inclusa.',note:'Corto <b>notturno</b>'};
const entries=[
 {stage:'collected',created_at:'2026-12-12T09:00:00Z',actor_id:'owner',note:'Graffio sul display',photos:['a.jpg','unknown.jpg'],checklist:{equipment:true,accessories:true,condition:true}},
 {stage:'returned',created_at:'2026-12-15T18:00:00Z',actor_id:'renter',note:'',photos:[],checklist:{}}
];

test('summary shows agreement, amounts, parties and the handoff log',()=>{
 const html=rentalSummaryMarkup(booking,entries,{people:{owner:{display_name:'Alice'},renter:{display_name:'Bruno'}},photos:new Map([['a.jpg','https://x.supabase.co/a.jpg']]),generatedAt:'2026-12-16T10:00:00Z'});
 for(const text of ['Alice','Bruno','4 giorni','260,00','500,00','Cage, 2 batterie','Ritiro a San Lorenzo','Graffio sul display','Ritiro','Restituzione','Concluso','registrato da Alice','registrato da Bruno'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/✓/g)||[]).length,3,'three ticked checks for pickup only');
 assert.ok(html.includes('src="https://x.supabase.co/a.jpg"'));
 assert.ok(!html.includes('unknown.jpg'),'photos without a validated URL are left out');
 assert.ok(html.includes('Nessuna nota.'));
 assert.ok(html.includes('non sono una firma elettronica'));
});

test('every user-provided value is escaped',()=>{
 const html=rentalSummaryMarkup(booking,[],{people:{owner:{display_name:'<img onerror=x>'}}});
 assert.ok(!html.includes('<script>')&&!html.includes('<b>notturno')&&!html.includes('<img onerror'));
 assert.ok(html.includes('&lt;script&gt;')&&html.includes('&lt;img onerror=x&gt;'));
 assert.ok(html.includes('Nessun ritiro o restituzione registrati finora.'));
});

test('file name is a safe slug with the pickup date',()=>{
 assert.equal(summaryFileName(booking),'rent-to-a-friend-sony-fx3-script-alert-1-script-2026-12-12');
 assert.equal(summaryFileName({title:'Città ✨',start_date:'2026-01-02'}),'rent-to-a-friend-citta-2026-01-02');
 assert.equal(summaryFileName({title:'',start_date:'2026-01-02'}),'rent-to-a-friend-noleggio-2026-01-02');
});
