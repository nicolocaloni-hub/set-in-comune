import test from 'node:test';
import assert from 'node:assert/strict';
import {assertTrackingFree} from '../scripts/assets.mjs';

test('the no-tracking build rejects optional tracking even when served from our origin',()=>{
 for(const text of ['gtag("config", "fixture")','fbq("init", "fixture")','fetch("/_vercel/insights/view")','import {inject} from "@vercel/analytics"']){
  assert.throws(()=>assertTrackingFree([{name:'app.js',text}]),/Revisione privacy/);
 }
});
test('external executable embeds and remote module imports cannot silently enter the build',()=>{
 for(const text of ['<script src="https://external.example/sdk.js"></script>','<iframe src="//external.example/widget"></iframe>','import "https://external.example/module.js"','export {sdk} from "https://external.example/module.js"','import("https://external.example/module.js")']){
  assert.throws(()=>assertTrackingFree([{name:'fixture.html',text}]),/Revisione privacy/);
 }
});
test('deferred advertising cannot enter through dynamic script, pixel or local ad bootstrap',()=>{
 for(const text of [
  'script.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"',
  '<img src="https://googleads.g.doubleclick.net/pagead/viewthroughconversion/fixture">',
  'fetch("https://www.googleadservices.com/pagead/conversion/fixture")',
  'script.src="https://fundingchoicesmessages.google.com/i/fixture"',
  'adsbygoogle.push({})','googletag.cmd.push(function(){})'
 ])assert.throws(()=>assertTrackingFree([{name:'app.js',text}]),/Revisione privacy/);
});
test('local app modules, consent explanations and required backend requests remain allowed',()=>{
 assert.doesNotThrow(()=>assertTrackingFree([{name:'index.html',text:'<script type="module" src="/app.js"></script>'},{name:'api.js',text:'import config from "./config.js"; fetch(config.url+"/auth/v1/token");'},{name:'privacy.js',text:'Nessun Google Analytics o Meta Pixel. La profilazione richiederà consenso.'}]));
});
