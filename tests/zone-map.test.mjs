import test from 'node:test';
import assert from 'node:assert/strict';
import {zones} from '../src/domain.js';
import {project,countByZone,zoneMapMarkup} from '../src/zone-map.js';

test('every neighbourhood lands inside the map and keeps its geography',()=>{
 for(const [name,coords] of Object.entries(zones)){
  const [x,y]=project(coords);
  assert.ok(x>0&&x<400&&y>0&&y<340,`${name} fuori dalla mappa: ${x},${y}`);
 }
 const [flaminioX,flaminioY]=project(zones.Flaminio),[eurX,eurY]=project(zones.EUR),[tuscolanoX]=project(zones.Tuscolano),[monteverdeX]=project(zones.Monteverde);
 assert.ok(flaminioY<eurY,'Flaminio è a nord dell’EUR');
 assert.ok(tuscolanoX>monteverdeX,'Tuscolano è a est di Monteverde');
 assert.ok(Math.abs(flaminioX-eurX)<40);
});

test('counts ignore unknown zones and default to zero',()=>{
 const counts=countByZone([{zone:'Prati'},{zone:'Prati'},{zone:'Pigneto'},{zone:'Atlantide'}]);
 assert.equal(counts.Prati,2);assert.equal(counts.Pigneto,1);assert.equal(counts.EUR,0);
 assert.equal(Object.keys(counts).length,Object.keys(zones).length);
});

test('markup marks the selected zone, totals listings and links every zone',()=>{
 const counts=countByZone([{zone:'Prati'},{zone:'Ostiense'}]);
 const html=zoneMapMarkup(counts,'Prati');
 assert.ok(html.includes('Tutta Roma · 2'));
 assert.ok(html.includes('class="map-zone selected" data-action="map-zone" data-value="Prati"'));
 assert.ok(html.includes('aria-pressed="true" class="selected">Prati · 1'));
 for(const z of Object.keys(zones))assert.ok(html.includes(`data-value="${z}"`),z);
 assert.ok(!/https?:\/\//.test(html.replace('http://www.w3.org','')),'no external resources');
 assert.ok(html.includes('non l’indirizzo'));
});
