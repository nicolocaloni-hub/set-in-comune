// The intro decorates a normal home entry; account links and deep links stay direct.
export function introEligible(location){
 if(location?.pathname!=='/'||!['','#','#search'].includes(location.hash||''))return false;
 const query=new URLSearchParams(location.search||'');
 return !['code','token','token_hash','access_token','refresh_token','error','error_code','type'].some(key=>query.has(key));
}
export function startIntro({env=globalThis}={}){
 const noop={ready(){},dismiss(){}};
 const doc=env.document;
 let motion;
 try{
  motion=env.matchMedia?.('(prefers-reduced-motion: reduce)');
  if(!doc?.body||doc.hidden||!introEligible(env.location)||motion?.matches||env.navigator?.connection?.saveData)return noop;
 }catch{return noop;}
 const dialog=doc.createElement('dialog');
 if(typeof dialog.showModal!=='function')return noop;
 dialog.className='brand-intro';dialog.id='brand-intro';
 dialog.setAttribute('aria-label','Benvenuto in RENT TO A FRIEND');
 dialog.innerHTML='<div class="intro-content"><video id="intro-video" muted playsinline autoplay preload="auto" disablepictureinpicture poster="/intro-poster.webp" width="448" height="796" aria-label="Animazione del logo RENT TO A FRIEND"></video></div><button class="intro-skip" type="button" autofocus>Salta l’intro <span aria-hidden="true">→</span></button>';
 const video=dialog.querySelector('video'),skip=dialog.querySelector('button');
 let closed=false,appReady=false,playbackEnded=false,timer;
 const cleanups=[];
 const listen=(target,type,handler)=>{target?.addEventListener?.(type,handler);cleanups.push(()=>target?.removeEventListener?.(type,handler));};
 function dismiss(){
  if(closed)return;closed=true;
  env.clearTimeout(timer);for(const cleanup of cleanups)cleanup();
  video.pause();video.removeAttribute('src');video.load();
  if(dialog.open)dialog.close();dialog.remove();
 }
 const ready=()=>{appReady=true;if(playbackEnded)dismiss();};
 listen(skip,'click',dismiss);
 listen(dialog,'cancel',event=>{event.preventDefault();dismiss();});
 listen(dialog,'close',dismiss);
 listen(video,'ended',()=>{playbackEnded=true;if(appReady)dismiss();});
 listen(video,'error',dismiss);
 listen(env,'hashchange',dismiss);listen(env,'pagehide',dismiss);
 listen(motion,'change',event=>{if(event.matches)dismiss();});
 doc.body.append(dialog);
 try{
  dialog.showModal();
  // A slow/failed video can never hold the app behind this introduction indefinitely.
  timer=env.setTimeout(dismiss,5000);
  video.muted=true;video.defaultMuted=true;video.playsInline=true;
  video.src='/intro.mp4';
  video.play()?.catch(dismiss);
 }catch{dismiss();}
 return {ready,dismiss};
}

// Loaded directly by the page, before the app and its API dependencies.
// ES module caching gives app.js the same controller without replaying the film.
export const intro=startIntro();
