import {zones,escapeHtml as esc} from './domain.js';

// Schematic map of Rome built from neighbourhood centres only. It never shows
// addresses or owner locations, loads no external tiles and stays within the CSP.

const W=400,H=330,PAD=18;
// Frame fitted to the neighbourhood centres, with room for labels.
const lats=Object.values(zones).map(z=>z[0]),lngs=Object.values(zones).map(z=>z[1]);
const bounds={minLat:Math.min(...lats)-0.012,maxLat:Math.max(...lats)+0.012,minLng:Math.min(...lngs)-0.03,maxLng:Math.max(...lngs)+0.03};
const kx=Math.cos(41.88*Math.PI/180); // keeps east-west distances proportional
const scale=Math.min((W-2*PAD)/((bounds.maxLng-bounds.minLng)*kx),(H-2*PAD)/(bounds.maxLat-bounds.minLat));
const offsetX=(W-(bounds.maxLng-bounds.minLng)*kx*scale)/2;
export function project([lat,lng]){
 return [Math.round((offsetX+(lng-bounds.minLng)*kx*scale)*10)/10,Math.round((H-PAD-(lat-bounds.minLat)*scale)*10)/10];
}
// Label side per neighbourhood, chosen so close centres do not overlap.
const labelSide={Prati:'left',Flaminio:'right','San Lorenzo':'top',Pigneto:'right',Nomentano:'right',Trastevere:'right',Monteverde:'left',Ostiense:'bottom',Tuscolano:'right',EUR:'right'};
function labelAt(x,y,r,side='bottom'){
 if(side==='left')return {x:x-r-5,y:y+4,anchor:'end'};
 if(side==='right')return {x:x+r+5,y:y+4,anchor:'start'};
 if(side==='top')return {x,y:y-r-6,anchor:'middle'};
 return {x,y:y+r+13,anchor:'middle'};
}
// Simplified course of the Tiber, for orientation only.
const tiber=[[41.945,12.458],[41.935,12.467],[41.925,12.472],[41.912,12.474],[41.903,12.466],[41.896,12.470],[41.890,12.477],[41.880,12.475],[41.868,12.472],[41.858,12.466],[41.845,12.460],[41.825,12.452]];

export function countByZone(listings){
 const counts=Object.fromEntries(Object.keys(zones).map(z=>[z,0]));
 for(const l of listings)if(Object.hasOwn(counts,l.zone))counts[l.zone]++;
 return counts;
}

export function zoneMapMarkup(counts,selected=''){
 const max=Math.max(1,...Object.values(counts));
 const river='M'+tiber.map(p=>project(p).join(' ')).join(' L');
 const dots=Object.entries(zones).map(([name,coords])=>{
  const [x,y]=project(coords),n=Number(counts[name])||0,r=n?Math.round(9+9*Math.sqrt(n/max)):6,active=name===selected,label=labelAt(x,y,r,labelSide[name]);
  return `<g class="map-zone${active?' selected':''}${n?'':' empty'}" data-action="map-zone" data-value="${esc(name)}"><circle cx="${x}" cy="${y}" r="${r}"></circle>${n?`<text class="map-count" x="${x}" y="${y+4}">${n}</text>`:''}<text class="map-label" x="${label.x}" y="${label.y}" text-anchor="${label.anchor}">${esc(name)}</text></g>`;
 }).join('');
 const total=Object.values(counts).reduce((a,b)=>a+(Number(b)||0),0);
 return `<section class="zone-map panel" aria-labelledby="zone-map-title"><div class="zone-map-heading"><h3 id="zone-map-title">Attrezzatura per quartiere</h3><p class="fineprint">Schema indicativo: i cerchi indicano il centro del quartiere, non l’indirizzo. L’indirizzo si concorda in chat dopo l’accettazione.</p></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mappa schematica di Roma con ${total} annunci divisi per quartiere"><path class="map-river" d="${river}"></path>${dots}</svg><div class="zone-map-list" role="group" aria-label="Filtra per quartiere"><button type="button" data-action="map-zone" data-value="" aria-pressed="${!selected}" class="${!selected?'selected':''}">Tutta Roma · ${total}</button>${Object.keys(zones).map(z=>`<button type="button" data-action="map-zone" data-value="${esc(z)}" aria-pressed="${z===selected}" class="${z===selected?'selected':''}">${esc(z)} · ${Number(counts[z])||0}</button>`).join('')}</div></section>`;
}
