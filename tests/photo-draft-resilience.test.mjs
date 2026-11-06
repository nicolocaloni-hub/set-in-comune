import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const functionSource=name=>source.split('\n').find(l=>l.startsWith('async function '+name+'('));
test('an unreadable replacement keeps the previous avatar in the draft',async()=>{
 const old={url:'https://example.test/old.jpg'},draft={formId:'avatar-form',max:1,photos:[old],busy:false};
 const button={disabled:false},form={querySelector:()=>button};const input={files:[{type:'image/jpeg',size:120}],value:'',closest:()=>form};
 const ctx={state:{photoDraft:draft},URL:{revokeObjectURL(){}},validatePhotoBatch(){},renderPhotoDraft(){},preparePhoto:async()=>{throw new Error('Foto non leggibile');}};
 vm.createContext(ctx);vm.runInContext(functionSource('addPhotos'),ctx);await assert.rejects(ctx.addPhotos(input),/leggibile/);assert.equal(draft.photos.length,1);assert.equal(draft.photos[0],old);assert.equal(draft.busy,false);assert.equal(button.disabled,false);
});
test('photo saving locks the draft until the record is saved and unlocks it on failure',async()=>{
 let resolve,uploads=0;const wait=new Promise(r=>resolve=r),draft={formId:'publish-form',max:4,photos:[{file:{name:'fixture.jpg'},url:'blob:fixture'}],busy:false};
 const ctx={state:{photoDraft:draft},renderPhotoDraft(){},api:{async upload(){uploads++;await wait;return 'fixture-upload';},async removeUploads(){}}};
 vm.createContext(ctx);vm.runInContext(functionSource('saveWithPhotos'),ctx);
 const saving=ctx.saveWithPhotos(draft,null,async()=>{throw new Error('Salvataggio non riuscito');});const rejected=assert.rejects(saving,/Salvataggio/);
 assert.equal(draft.busy,true);await assert.rejects(ctx.saveWithPhotos(draft,null,async()=>{}),/Attendi/);assert.equal(uploads,1);
 resolve();await rejected;assert.equal(draft.busy,false);assert.equal(draft.photos.length,1);
});
test('an in-flight message locks its fields and restores its text after failure',async()=>{
 let handler,reject;
 const wait=new Promise((_resolve,r)=>reject=r),field={disabled:false,value:'Messaggio da conservare'},button={disabled:false},err={textContent:''};
 const form={id:'message-form',dataset:{id:'fixture',kind:'booking'},classList:{contains:()=>false},querySelector:s=>s==='.form-error'?err:button,querySelectorAll:()=>[field,button],reset(){field.value='';}};
 const ctx={document:{addEventListener(type,fn){if(type==='submit')handler=fn;}},FormData:class{get(){return field.value;}},api:{send:()=>wait},loadMessages:async()=>{},error(e){throw e;}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf("document.addEventListener('submit'"),source.indexOf("window.addEventListener('hashchange'")),ctx);
 const saving=handler({target:form,submitter:button,preventDefault(){}});assert.equal(field.disabled,true);assert.equal(button.disabled,true);
 reject(new Error('Connessione interrotta'));await saving;assert.equal(field.value,'Messaggio da conservare');assert.equal(field.disabled,false);assert.equal(button.disabled,false);assert.match(err.textContent,/Connessione/);
});
test('session removal clears private screen data immediately even before a new request',()=>{
 let rendered=false,closed=false;const state={bookings:[{id:'private-booking'}],threads:[{id:'private-chat'}],reviewed:['private-review'],legal:{accepted:true},currentChat:'private-chat',mobileChatOpen:true,safety:{moderator:true},counts:{messages:5,requests:2}};
 let printCleared=false;const printRoot={replaceChildren(){printCleared=true;}};
 const ctx={state,location:{hash:'profile'},document:{querySelector:s=>s==='#print-root'?printRoot:null},close(force){closed=force;},searchPage(){rendered=true;}};
 vm.createContext(ctx);vm.runInContext(source.split('\n').find(l=>l.startsWith('function clearPrivateState(')),ctx);ctx.clearPrivateState();
 assert.equal(state.bookings.length,0);assert.equal(state.threads.length,0);assert.equal(state.reviewed.length,0);assert.equal(state.currentChat,null);assert.equal(state.legal,null);assert.equal(state.safety.moderator,false);assert.equal(state.counts.messages,0);assert.equal(ctx.location.hash,'search');assert(closed&&rendered);assert(printCleared,'a printed rental summary must not survive logout');
});
