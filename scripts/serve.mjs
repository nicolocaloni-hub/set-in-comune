import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {publicAssets,securityHeaders} from './assets.mjs';
const allowed=new Set([...publicAssets,'config.js']);
const config=(await import(pathToFileURL(resolve('dist/config.js')).href)).default;
const headers=securityHeaders(config.url);
const server=createServer(async(req,res)=>{
  for(const [k,v] of Object.entries(headers))res.setHeader(k,v);
  res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const name=path==='/'?'index.html':path.slice(1);
    if(!allowed.has(name))throw new Error();
    const body=await readFile('dist/'+name);
    res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.png')?'image/png':name.endsWith('.webmanifest')?'application/manifest+json':'image/svg+xml');
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.APP_DEV_PORT??4173),'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port));
