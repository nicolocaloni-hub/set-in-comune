import test from 'node:test';
import assert from 'node:assert/strict';
import {introEligible,startIntro} from '../src/intro.js';

function fixture({reduced=false,saving=false,rejectPlay=false,unsupported=false}={}){
 const win=new EventTarget(),motion=new EventTarget(),video=new EventTarget(),skip=new EventTarget(),dialog=new EventTarget();
 const timers=new Map();let next=0;
 Object.assign(video,{paused:0,loaded:0,playCalls:0,pause(){this.paused++;},load(){this.loaded++;},removeAttribute(name){delete this[name];},play(){this.playCalls++;return rejectPlay?Promise.reject(new Error('Autoplay blocked')):Promise.resolve();}});
 Object.assign(dialog,{open:false,removed:false,setAttribute(){},querySelector:s=>s==='video'?video:skip,remove(){this.removed=true;},close(){this.open=false;this.dispatchEvent(new Event('close'));},showModal:unsupported?undefined:function(){this.open=true;}});
 motion.matches=reduced;
 Object.assign(win,{location:{pathname:'/',hash:'',search:''},document:{hidden:false,body:{append(el){assert.equal(el,dialog);}},createElement:tag=>{assert.equal(tag,'dialog');return dialog;}},navigator:{connection:{saveData:saving}},matchMedia:()=>motion,setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)});
 return {env:win,dialog,video,skip,motion,timers};
}

test('intro is limited to home entries and skips account callbacks, legal pages and deep links',()=>{
 for(const hash of ['','#','#search'])assert.equal(introEligible({pathname:'/',hash,search:''}),true);
 for(const hash of ['#profile','#messages','#bookings?booking=fixture','#privacy','#terms','#access_token=fixture'])assert.equal(introEligible({pathname:'/',hash,search:''}),false);
 for(const key of ['code','token','token_hash','access_token','refresh_token','error','error_code','type'])assert.equal(introEligible({pathname:'/',hash:'',search:'?'+key+'=fixture'}),false);
 assert.equal(introEligible({pathname:'/other',hash:'',search:''}),false);
});

test('intro respects reduced motion and data saving without requesting a video',()=>{
 for(const options of [{reduced:true},{saving:true},{unsupported:true}]){
  const f=fixture(options),intro=startIntro({env:f.env});intro.ready();intro.dismiss();
  assert.equal(f.video.playCalls,0);assert.equal(f.video.src,undefined);assert.equal(f.timers.size,0);
 }
});

test('home loads in parallel and is revealed only after playback ends',()=>{
 const f=fixture(),intro=startIntro({env:f.env});assert.equal(f.dialog.open,true);assert.equal(f.video.muted,true);assert.equal(f.video.playsInline,true);assert.equal(f.video.src,'/intro.mp4');
 intro.ready();assert.equal(f.dialog.open,true);
 f.video.dispatchEvent(new Event('ended'));assert.equal(f.dialog.removed,true);assert.equal(f.dialog.open,false);assert.equal(f.timers.size,0);assert.equal(f.video.src,undefined);
});

test('playback can finish before the app and the five-second cap still prevents a trap',()=>{
 const f=fixture(),intro=startIntro({env:f.env});f.video.dispatchEvent(new Event('ended'));assert.equal(f.dialog.open,true);intro.ready();assert.equal(f.dialog.removed,true);
 const slow=fixture();startIntro({env:slow.env});const timer=[...slow.timers.values()][0];assert.equal(timer.delay,5000);timer.fn();assert.equal(slow.dialog.removed,true);assert.equal(slow.video.paused,1);
});

test('skip, Escape, deep-link navigation and media errors all release the dialog',()=>{
 for(const action of [f=>f.skip.dispatchEvent(new Event('click')),f=>f.dialog.dispatchEvent(new Event('cancel',{cancelable:true})),f=>f.env.dispatchEvent(new Event('hashchange')),f=>f.video.dispatchEvent(new Event('error')),f=>f.env.dispatchEvent(new Event('pagehide'))]){
  const f=fixture(),intro=startIntro({env:f.env});action(f);intro.dismiss();intro.ready();assert.equal(f.dialog.open,false);assert.equal(f.dialog.removed,true);assert.equal(f.video.paused,1);assert.equal(f.timers.size,0);
 }
});

test('autoplay rejection and changing motion preference leave the app available',async()=>{
 const f=fixture({rejectPlay:true});startIntro({env:f.env});await Promise.resolve();assert.equal(f.dialog.removed,true);
 const motion=fixture();startIntro({env:motion.env});const event=new Event('change');event.matches=true;motion.motion.dispatchEvent(event);assert.equal(motion.dialog.removed,true);
});
