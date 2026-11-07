import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDigest,processEmailWork,eventLink} from '../supabase/functions/email-dispatch/core.mjs';

const U='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',L='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',K='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const app='https://rent-to-a-friend.it';

test('one event: specific subject, link to the booking, title escaped in HTML',()=>{
 const m=buildDigest(app,{email:'x@example.test',name:'Giulia',events:[{kind:'request',title:'Sony <b>A7</b>',bookingId:K}]});
 assert.equal(m.subject,'Nuova richiesta di noleggio');
 assert.match(m.text,/Ciao Giulia,/);
 assert.match(m.text,new RegExp(`/#bookings\\?booking=${K}`));
 assert.ok(m.html.includes('Sony &lt;b&gt;A7&lt;/b&gt;'));
 assert.ok(!m.html.includes('<b>A7'));
});

test('several events become one digest; chat links open the conversation',()=>{
 const m=buildDigest(app,{email:'x@example.test',name:'',events:[{kind:'accepted',title:'Luce',bookingId:K},{kind:'message',title:'Treppiede',conversationId:K}]});
 assert.equal(m.subject,'Hai 2 novità su Rent to a Friend');
 assert.match(m.text,/^Ciao,/);
 assert.equal(eventLink(app,{kind:'message',conversationId:K}),`${app}/#messages?conversation=${K}`);
 assert.equal(eventLink(app,{kind:'message',bookingId:'../x'}),app+'/');
});

test('unknown kinds or a missing email are not sent',()=>{
 assert.throws(()=>buildDigest(app,{email:'x@example.test',events:[{kind:'search',title:'x'}]}));
 assert.throws(()=>buildDigest(app,{email:'',events:[{kind:'request',title:'x'}]}));
 assert.throws(()=>buildDigest('http://evil.example',{email:'x@example.test',events:[{kind:'request',title:'x'}]}));
});

test('worker finishes every claimed item, retrying failures and never sending chat text',async()=>{
 const sent=[],done=[];
 const io={sendEmail:async m=>{if(m.to==='fail@example.test')throw new Error('down');sent.push(m);},sendMagicLink:async(e,r)=>sent.push({magic:e,r}),
  finishDigest:async(u,l,ok)=>done.push(['d',ok]),finishNotice:async(u,l,ok)=>done.push(['n',ok])};
 const out=await processEmailWork({appUrl:app,digests:[{userId:U,lease:L,email:'ok@example.test',events:[{kind:'message',title:'Luce',bookingId:K,body:'segreto'}]},{userId:U,lease:L,email:'fail@example.test',events:[{kind:'request',title:'x',bookingId:K}]},{userId:'bad',lease:L}],inactivity:[{userId:U,lease:L,email:'old@example.test'}]},io);
 assert.deepEqual(out,{digests:1,notices:1,failed:1});
 assert.deepEqual(done,[['d',true],['d',false],['n',true]]);
 assert.ok(!JSON.stringify(sent).includes('segreto'));
 assert.deepEqual(sent.at(-1),{magic:'old@example.test',r:app+'/'});
});
