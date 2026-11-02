import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {handoffGuidance,handoffItems} from '../src/marketplace.js';

const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
function fixture({saveError=false,pending=false}={}){
 const calls={uploads:0,transitions:[],closed:0},draft={photos:[{url:'blob:fixture',file:{name:'fixture.jpg'}}]};
 const initial={dataset:{},disabled:false},confirm={dataset:{handoffConfirm:'true'},disabled:false};
 const firstField={focus(){},scrollIntoView(){}},fields={hidden:false,querySelector:()=>firstField};
 const review={hidden:true,focus(){},scrollIntoView(){}},err={textContent:''};
 const values=new Map([['note',' Segno già presente sul corpo. '],...Object.keys(handoffItems).map(k=>['check_'+k,'on'])]);
 const form={id:'transition-form',classList:{contains:()=>false},dataset:{id:'booking-fixture',status:'returned'},values,querySelector(selector){
  if(selector==='[data-handoff-review]')return review;
  if(selector==='[data-handoff-fields]')return fields;
  if(selector==='.form-error')return err;
  return initial;
 }};
 let handler,release;
 const wait=pending?new Promise(resolve=>release=resolve):Promise.resolve();
 const context={document:{addEventListener(type,fn){if(type==='submit')handler=fn;}},
  FormData:class{constructor(f){this.values=f.values;}get(k){return this.values.get(k);}has(k){return this.values.has(k);}},
  state:{photoDraft:draft},handoffItems,
  api:{async transition(...args){calls.transitions.push(args);}},
  async saveWithPhotos(actual,id,save){calls.uploads++;assert.equal(actual,draft);assert.equal(id,'booking-fixture');await wait;if(saveError)throw new Error('Errore temporaneo di caricamento');await save(['private/fixture.jpg']);},
  close(){calls.closed++;},reload:async()=>{},bookingsPage:async()=>{},toast(){},error(e){throw e;}
 };
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function showHandoffReview('),source.indexOf('function demoHandoffDialog(')),context);
 vm.runInContext(source.slice(source.indexOf("document.addEventListener('submit'"),source.indexOf("window.addEventListener('hashchange'")),context);
 return {calls,draft,form,fields,review,err,initial,confirm,release,
  submit:submitter=>handler({target:form,submitter,preventDefault(){}}),
  back:()=>context.showHandoffReview(form,false)};
}

test('handoff guidance addresses each role at pickup and return without implying defect-free equipment',()=>{
 assert.match(handoffGuidance('collected',true).message,/corrispondano all’annuncio/);
 assert.match(handoffGuidance('collected',false).message,/problemi prima di portarla via/);
 assert.match(handoffGuidance('returned',false).message,/registro del ritiro/);
 assert.match(handoffGuidance('completed',true).message,/condizioni registrate al ritiro/);
 assert.throws(()=>handoffGuidance('accepted',true));
});
test('review, back and implicit submissions retain notes and photos without uploading or changing the booking',async()=>{
 const f=fixture();await f.submit(f.initial);
 assert.equal(f.review.hidden,false);assert.equal(f.fields.hidden,true);assert.equal(f.calls.uploads,0);
 f.back();assert.equal(f.fields.hidden,false);assert.equal(f.review.hidden,true);
 assert.equal(f.form.values.get('note'),' Segno già presente sul corpo. ');assert.equal(f.draft.photos[0].file.name,'fixture.jpg');
 // A stale final button or Enter from the draft cannot bypass review.
 await f.submit(f.confirm);assert.equal(f.calls.uploads,0);
 await f.submit(undefined);assert.equal(f.calls.uploads,0);
 await f.submit(f.confirm);
 assert.equal(f.calls.uploads,1);assert.equal(f.calls.transitions.length,1);assert.equal(f.calls.closed,1);
 const [id,status,note,photos,checks]=f.calls.transitions[0];
 assert.equal(id,'booking-fixture');assert.equal(status,'returned');assert.equal(note,'Segno già presente sul corpo.');
 assert.deepEqual(photos,['private/fixture.jpg']);assert.ok(Object.values(checks).every(v=>v===true));
});
test('a second tap while saving cannot upload or record the exchange twice',async()=>{
 const f=fixture({pending:true});await f.submit(f.initial);const saving=f.submit(f.confirm);
 assert.equal(f.confirm.disabled,true);await f.submit(f.confirm);assert.equal(f.calls.uploads,1);
 f.release();await saving;assert.equal(f.calls.transitions.length,1);assert.equal(f.confirm.disabled,false);
});
test('failed upload keeps the review and draft available for correction instead of recording the exchange',async()=>{
 const f=fixture({saveError:true});await f.submit(f.initial);await f.submit(f.confirm);
 assert.match(f.err.textContent,/temporaneo/);assert.equal(f.calls.transitions.length,0);assert.equal(f.calls.closed,0);
 assert.equal(f.confirm.disabled,false);assert.equal(f.review.hidden,false);assert.equal(f.form.dataset.submitting,'false');
 f.back();assert.equal(f.fields.hidden,false);assert.equal(f.draft.photos.length,1);
});
