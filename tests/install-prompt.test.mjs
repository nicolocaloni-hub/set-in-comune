import test from 'node:test';
import assert from 'node:assert/strict';
import {nextInstallState,countInstallOpen,markInstalled,installGuideMarkup,INSTALL_KEY} from '../src/install-prompt.js';

test('the guide shows on the first open, then after 10 more, and never after "Già fatto" or once installed',()=>{
 let record=null;const shown=[];
 for(let open=1;open<=23;open++){const r=nextInstallState(record);record=r.record;if(r.show)shown.push(open);}
 assert.deepEqual(shown,[1,11,21]);
 assert.equal(nextInstallState({...record,done:true}).show,false);
 assert.equal(nextInstallState(null,{installed:true}).show,false);
 assert.equal(nextInstallState(null,{mobile:false}).show,false);
});

test('counting uses local storage and "Già fatto" stops it',()=>{
 const m=new Map();const env={navigator:{userAgent:'iPhone'},matchMedia:()=>({matches:false}),localStorage:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
 assert.equal(countInstallOpen(env),true);
 assert.equal(countInstallOpen(env),false);
 markInstalled(env);
 assert.equal(JSON.parse(m.get(INSTALL_KEY)).done,true);
 for(let i=0;i<12;i++)assert.equal(countInstallOpen(env),false);
});

test('the guide has illustrated steps for both phones and the "Già fatto" button',()=>{
 const html=installGuideMarkup('android',{canPrompt:true});
 assert.match(html,/data-install-platform="ios" hidden/);
 assert.equal((html.match(/<svg class="install-shot"/g)||[]).length,6);
 assert.match(html,/data-action="install-done">Già fatto/);
 assert.match(html,/data-action="install-now"/);
 assert.doesNotMatch(installGuideMarkup('ios'),/install-now/);
});
