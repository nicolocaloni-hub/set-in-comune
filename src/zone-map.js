import {zones,escapeHtml as esc} from './domain.js';
import {FRAME,basemap,parkLabels} from './rome-basemap.js';

// Neighbourhood map of Rome: a stylised base map (river, parks, main roads, walls)
// drawn once from OpenStreetMap data by scripts/build-rome-basemap.mjs, with one
// circle per neighbourhood centre on top. It never shows addresses or owner
// locations, loads no external tiles or services and stays within the CSP.

const W=FRAME.W,H=FRAME.H;
const kx=Math.cos(((FRAME.minLat+FRAME.maxLat)/2)*Math.PI/180); // keeps east-west distances proportional
const scale=W/((FRAME.maxLng-FRAME.minLng)*kx);
export function project([lat,lng]){
 return [Math.round((lng-FRAME.minLng)*kx*scale*10)/10,Math.round((FRAME.maxLat-lat)*scale*10)/10];
}
// Label side per neighbourhood, chosen so close centres do not overlap.
const labelSide={Prati:'left',Flaminio:'right','San Lorenzo':'top',Pigneto:'right',Nomentano:'right',Trastevere:'right',Monteverde:'left',Ostiense:'bottom',Tuscolano:'right',EUR:'right'};
function labelAt(x,y,r,side='bottom'){
 if(side==='left')return {x:x-r-7,y:y+5,anchor:'end'};
 if(side==='right')return {x:x+r+7,y:y+5,anchor:'start'};
 if(side==='top')return {x,y:y-r-8,anchor:'middle'};
 return {x,y:y+r+18,anchor:'middle'};
}

export function countByZone(listings){
 const counts=Object.fromEntries(Object.keys(zones).map(z=>[z,0]));
 for(const l of listings)if(Object.hasOwn(counts,l.zone))counts[l.zone]++;
 return counts;
}

// Layer order follows printed city maps: water and parks under the roads, walls on top.
function baseLayers(){
 const layer=(name,cls)=>basemap[name]?`<path class="${cls}" d="${basemap[name]}"></path>`:'';
 return `<g class="map-base" aria-hidden="true"><rect class="map-land" width="${W}" height="${H}"></rect>${layer('park','map-park')}${layer('water','map-water')}${layer('river','map-river')}${layer('rail','map-rail')}${layer('secondary','map-road map-road-secondary')}${layer('primary','map-road map-road-primary')}${layer('major','map-road map-road-major')}${layer('walls','map-walls')}${parkLabels.map(p=>{const half=p.name.length*3.4;return `<text class="map-park-label" x="${Math.round(Math.min(Math.max(p.x,half+8),W-half-8))}" y="${p.y}">${esc(p.name)}</text>`;}).join('')}</g>`;
}

export function zoneMapMarkup(counts,selected=''){
 const max=Math.max(1,...Object.values(counts));
 const dots=Object.entries(zones).map(([name,coords])=>{
  const [x,y]=project(coords),n=Number(counts[name])||0,r=n?Math.round(13+13*Math.sqrt(n/max)):9,active=name===selected,label=labelAt(x,y,r,labelSide[name]);
  return `<g class="map-zone${active?' selected':''}${n?'':' empty'}" data-action="map-zone" data-value="${esc(name)}"><circle cx="${x}" cy="${y}" r="${r}"></circle>${n?`<text class="map-count" x="${x}" y="${y+5}">${n}</text>`:''}<text class="map-label" x="${label.x}" y="${label.y}" text-anchor="${label.anchor}">${esc(name)}</text></g>`;
 }).join('');
 const total=Object.values(counts).reduce((a,b)=>a+(Number(b)||0),0);
 return `<section class="zone-map panel" aria-labelledby="zone-map-title"><div class="zone-map-heading"><h3 id="zone-map-title">Attrezzatura per quartiere</h3><p class="fineprint">I cerchi indicano il centro del quartiere, non l’indirizzo. L’indirizzo si concorda in chat dopo l’accettazione.</p></div><figure class="zone-map-figure"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mappa di Roma con ${total} annunci divisi per quartiere">${baseLayers()}${dots}</svg><figcaption class="map-credit">Mappa © contributori OpenStreetMap</figcaption></figure><div class="zone-map-list" role="group" aria-label="Filtra per quartiere"><button type="button" data-action="map-zone" data-value="" aria-pressed="${!selected}" class="${!selected?'selected':''}">Tutta Roma · ${total}</button>${Object.keys(zones).map(z=>`<button type="button" data-action="map-zone" data-value="${esc(z)}" aria-pressed="${z===selected}" class="${z===selected?'selected':''}">${esc(z)} · ${Number(counts[z])||0}</button>`).join('')}</div></section>`;
}
