#!/usr/bin/env node
// Builds src/rome-basemap.js, the stylised Rome base map behind the neighbourhood
// map, from an OpenStreetMap PBF extract (for example lazio-latest.osm.pbf from
// download.openstreetmap.fr). Data © OpenStreetMap contributors, ODbL: the map
// in the app shows the attribution.
//
//   node --max-old-space-size=4096 scripts/build-rome-basemap.mjs <extract.osm.pbf> [src/rome-basemap.js]
//
// No dependencies: a minimal PBF reader (protobuf + zlib) is included below.
// Three passes over the file: relations, then ways, then only the nodes needed.
import fs from 'node:fs';
import zlib from 'node:zlib';

const [input, output = 'src/rome-basemap.js'] = process.argv.slice(2);
if (!input) { console.error('Usage: build-rome-basemap.mjs <extract.osm.pbf> [output.js]'); process.exit(1); }

// Map frame: all neighbourhoods in src/domain.js with some margin. W is the SVG width.
const FRAME = { minLat: 41.815, maxLat: 41.94, minLng: 12.415, maxLng: 12.58, W: 600 };
const KX = Math.cos(((FRAME.minLat + FRAME.maxLat) / 2) * Math.PI / 180);
const SCALE = FRAME.W / ((FRAME.maxLng - FRAME.minLng) * KX);
const H = Math.round((FRAME.maxLat - FRAME.minLat) * SCALE);
const project = (lat, lng) => [(lng - FRAME.minLng) * KX * SCALE, (FRAME.maxLat - lat) * SCALE];
const MARGIN = 0.02; // degrees kept around the frame so clipped shapes stay whole at the edges

// ---- Minimal protobuf reader ------------------------------------------------
class Reader {
  constructor(buf, start = 0, end = buf.length) { this.b = buf; this.p = start; this.e = end; }
  varint() { let r = 0, s = 1, x; do { x = this.b[this.p++]; r += (x & 0x7f) * s; s *= 128; } while (x & 0x80); return r; }
  svarint() { const n = this.varint(); return n % 2 ? -(n + 1) / 2 : n / 2; }
  span() { const l = this.varint(), s = this.p; this.p += l; return [s, this.p]; }
  skip(wt) { if (wt === 0) this.varint(); else if (wt === 1) this.p += 8; else if (wt === 2) { const length = this.varint(); this.p += length; } else if (wt === 5) this.p += 4; else throw new Error('Unsupported wire type ' + wt); }
  each(handle) { while (this.p < this.e) { const key = this.varint(), field = Math.floor(key / 8), wt = key % 8; if (!handle(field, wt)) this.skip(wt); } }
  packed(fn) { const [s, e] = this.span(), r = new Reader(this.b, s, e), out = []; while (r.p < r.e) out.push(fn(r)); return out; }
}
const uv = r => r.varint(), sv = r => r.svarint();
const delta = list => { let acc = 0; return list.map(v => (acc += v)); };

function* blocks(buf) {
  let p = 0;
  while (p < buf.length) {
    const headerLength = buf.readUInt32BE(p); p += 4;
    const header = new Reader(buf, p, p + headerLength); let type = '', size = 0;
    header.each((f) => { if (f === 1) { const [s, e] = header.span(); type = buf.toString('utf8', s, e); return true; } if (f === 3) { size = header.varint(); return true; } return false; });
    p += headerLength;
    const blob = new Reader(buf, p, p + size); let data = null;
    blob.each((f) => { if (f === 1) { const [s, e] = blob.span(); data = buf.subarray(s, e); return true; } if (f === 3) { const [s, e] = blob.span(); data = zlib.inflateSync(buf.subarray(s, e)); return true; } return false; });
    p += size;
    if (type === 'OSMData' && data) yield data;
  }
}

// Calls onNodes(ids, lats, lngs), onWay(id, tags, refs), onRelation(id, tags, members).
function readBlock(data, { onNodes, onWay, onRelation }) {
  const block = new Reader(data); const strings = []; const groups = []; let gran = 100, latOff = 0, lonOff = 0;
  block.each((f) => {
    if (f === 1) { const [s, e] = block.span(); const st = new Reader(data, s, e); st.each((g) => { if (g === 1) { const [a, b] = st.span(); strings.push(data.toString('utf8', a, b)); return true; } return false; }); return true; }
    if (f === 2) { groups.push(block.span()); return true; }
    if (f === 17) { gran = block.varint(); return true; }
    if (f === 19) { latOff = block.varint(); return true; }
    if (f === 20) { lonOff = block.varint(); return true; }
    return false;
  });
  const tagsOf = (keys, vals) => { const t = {}; keys.forEach((k, i) => { t[strings[k]] = strings[vals[i]]; }); return t; };
  for (const [s, e] of groups) {
    const g = new Reader(data, s, e);
    g.each((f) => {
      if (f === 2 && onNodes) {
        const [a, b] = g.span(); const d = new Reader(data, a, b); let ids = [], lats = [], lons = [];
        d.each((h) => { if (h === 1) { ids = delta(d.packed(sv)); return true; } if (h === 8) { lats = delta(d.packed(sv)); return true; } if (h === 9) { lons = delta(d.packed(sv)); return true; } return false; });
        onNodes(ids, lats.map(v => 1e-9 * (latOff + gran * v)), lons.map(v => 1e-9 * (lonOff + gran * v)));
        return true;
      }
      if (f === 1 && onNodes) {
        const [a, b] = g.span(); const n = new Reader(data, a, b); let id = 0, lat = 0, lon = 0;
        n.each((h) => { if (h === 1) { id = n.svarint(); return true; } if (h === 8) { lat = n.svarint(); return true; } if (h === 9) { lon = n.svarint(); return true; } return false; });
        onNodes([id], [1e-9 * (latOff + gran * lat)], [1e-9 * (lonOff + gran * lon)]);
        return true;
      }
      if (f === 3 && onWay) {
        const [a, b] = g.span(); const w = new Reader(data, a, b); let id = 0, keys = [], vals = [], refs = [];
        w.each((h) => { if (h === 1) { id = w.varint(); return true; } if (h === 2) { keys = w.packed(uv); return true; } if (h === 3) { vals = w.packed(uv); return true; } if (h === 8) { refs = delta(w.packed(sv)); return true; } return false; });
        onWay(id, tagsOf(keys, vals), refs);
        return true;
      }
      if (f === 4 && onRelation) {
        const [a, b] = g.span(); const r = new Reader(data, a, b); let id = 0, keys = [], vals = [], roles = [], mem = [], types = [];
        r.each((h) => { if (h === 1) { id = r.varint(); return true; } if (h === 2) { keys = r.packed(uv); return true; } if (h === 3) { vals = r.packed(uv); return true; } if (h === 8) { roles = r.packed(uv); return true; } if (h === 9) { mem = delta(r.packed(sv)); return true; } if (h === 10) { types = r.packed(uv); return true; } return false; });
        onRelation(id, tagsOf(keys, vals), mem.map((ref, i) => ({ ref, type: types[i], role: strings[roles[i]] })));
        return true;
      }
      return false;
    });
  }
}

// ---- What goes on the map --------------------------------------------------
const AREA = { park: 60, water: 12 };
function lineLayer(t) {
  if (t.tunnel && t.tunnel !== 'no') return null;
  if (t.waterway === 'river') return 'river';
  if (t.historic === 'citywalls') return 'walls';
  if (t.highway === 'motorway' || t.highway === 'trunk') return 'major';
  if (t.highway === 'primary') return 'primary';
  if (t.highway === 'secondary') return 'secondary';
  if (t.railway === 'rail' && !t.service && t.usage !== 'industrial') return 'rail';
  return null;
}
function areaLayer(t) {
  if (t.leisure === 'park' || t.leisure === 'nature_reserve' || t.landuse === 'forest' || t.natural === 'wood' || t.landuse === 'recreation_ground') return 'park';
  if (t.natural === 'water' && ['river', 'lake', 'pond', 'reservoir', 'basin', 'canal'].includes(t.water || 'lake')) return 'water';
  if (t.waterway === 'riverbank') return 'water';
  return null;
}

const buf = fs.readFileSync(input);
// Pass 1: multipolygon relations for parks and water; their outer ways.
const relations = []; const wantedWays = new Map();
for (const data of blocks(buf)) readBlock(data, { onRelation(id, tags, members) {
  if (tags.type !== 'multipolygon') return; const layer = areaLayer(tags); if (!layer) return;
  const outer = members.filter(m => m.type === 1 && m.role !== 'inner').map(m => m.ref);
  relations.push({ id, layer, name: tags.name || '', outer }); for (const w of outer) wantedWays.set(w, null);
} });
// Pass 2: ways (tagged features and relation members).
const ways = []; const wantedNodes = new Set();
for (const data of blocks(buf)) readBlock(data, { onWay(id, tags, refs) {
  const line = lineLayer(tags), area = refs.length > 3 && refs[0] === refs[refs.length - 1] ? areaLayer(tags) : null;
  if (wantedWays.has(id)) wantedWays.set(id, refs);
  if (!line && !area && !wantedWays.has(id)) return;
  if (line || area) ways.push({ id, layer: line || area, kind: line ? 'line' : 'area', name: tags.name || '', refs });
  for (const r of refs) wantedNodes.add(r);
} });
// Pass 3: coordinates of the needed nodes only.
const coords = new Map();
for (const data of blocks(buf)) readBlock(data, { onNodes(ids, lats, lons) {
  for (let i = 0; i < ids.length; i++) if (wantedNodes.has(ids[i])) coords.set(ids[i], [lats[i], lons[i]]);
} });

// ---- Geometry helpers ----------------------------------------------------------
const inFrame = ([lat, lng]) => lat > FRAME.minLat - MARGIN && lat < FRAME.maxLat + MARGIN && lng > FRAME.minLng - MARGIN && lng < FRAME.maxLng + MARGIN;
function simplify(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length); keep[0] = keep[points.length - 1] = 1; const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); const [ax, ay] = points[a], [bx, by] = points[b]; const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1; let max = 0, at = -1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len; if (d > max) { max = d; at = i; } }
    if (max > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return points.filter((_, i) => keep[i]);
}
// Closed rings start and end on the same point, which would collapse them:
// simplify the two halves split at the point farthest from the start.
function simplifyRing(points, tol) {
  const ring = points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1] ? points.slice(0, -1) : points;
  if (ring.length < 4) return ring;
  let far = 1, max = 0;
  ring.forEach(([x, y], i) => { const d = Math.hypot(x - ring[0][0], y - ring[0][1]); if (d > max) { max = d; far = i; } });
  return [...simplify(ring.slice(0, far + 1), tol).slice(0, -1), ...simplify([...ring.slice(far), ring[0]], tol).slice(0, -1)];
}
// Splits a polyline into the runs that touch the frame.
function clipRuns(latlngs) {
  const runs = []; let run = [];
  latlngs.forEach((p, i) => { const near = inFrame(p) || (i > 0 && inFrame(latlngs[i - 1])) || (i < latlngs.length - 1 && inFrame(latlngs[i + 1])); if (near) run.push(p); else if (run.length) { runs.push(run); run = []; } });
  if (run.length) runs.push(run); return runs.filter(r => r.length > 1);
}
const area = pts => Math.abs(pts.reduce((s, [x, y], i) => { const [nx, ny] = pts[(i + 1) % pts.length]; return s + x * ny - nx * y; }, 0) / 2);
const fmt = n => (Math.round(n * 2) / 2).toString();
function pathOf(points, closed) {
  let out = `M${fmt(points[0][0])} ${fmt(points[0][1])}`, [px, py] = points[0].map(v => Math.round(v * 2) / 2);
  for (const [x, y] of points.slice(1)) { const rx = Math.round(x * 2) / 2, ry = Math.round(y * 2) / 2; if (rx === px && ry === py) continue; out += `l${fmt(rx - px)} ${fmt(ry - py)}`; px = rx; py = ry; }
  return out.replace(/ -/g, '-') + (closed ? 'z' : '');
}
// Joins way node lists that share end nodes (rings of multipolygons, chains of roads).
function chain(lists) {
  const pool = lists.map(l => [...l]); const out = [];
  while (pool.length) {
    let cur = pool.pop(), grown = true;
    while (grown && cur[0] !== cur[cur.length - 1]) {
      grown = false;
      for (let i = 0; i < pool.length; i++) {
        const o = pool[i], s = cur[0], e = cur[cur.length - 1];
        if (o[0] === e) cur = cur.concat(o.slice(1)); else if (o[o.length - 1] === e) cur = cur.concat(o.slice(0, -1).reverse());
        else if (o[o.length - 1] === s) cur = o.concat(cur.slice(1)); else if (o[0] === s) cur = o.slice(1).reverse().concat(cur); else continue;
        pool.splice(i, 1); grown = true; break;
      }
    }
    out.push(cur);
  }
  return out;
}
const toLatLng = refs => refs.map(r => coords.get(r)).filter(Boolean);

const layers = { water: [], park: [], river: [], rail: [], secondary: [], primary: [], major: [], walls: [] };
const labels = [];
function addArea(layer, refsList, name) {
  for (const ring of chain(refsList)) {
    const ll = toLatLng(ring); if (ll.length < 4 || !ll.some(inFrame)) continue;
    const pts = simplifyRing(ll.map(p => project(...p)), layer === 'park' ? 1 : 0.6); const a = area(pts);
    if (pts.length < 3 || a < AREA[layer]) continue;
    layers[layer].push(pathOf(pts, true));
    if (layer === 'park' && name) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); labels.push({ name, a, x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }); }
  }
}
for (const r of relations) addArea(r.layer, r.outer.map(w => wantedWays.get(w)).filter(Boolean), r.name);
for (const w of ways.filter(w => w.kind === 'area')) addArea(w.layer, [w.refs], w.name);
const lineGroups = {};
for (const w of ways.filter(w => w.kind === 'line')) (lineGroups[w.layer] ||= []).push(w.refs);
const TOL = { river: 0.6, walls: 0.5, rail: 0.8, secondary: 0.8, primary: 0.7, major: 0.7 };
for (const [layer, list] of Object.entries(lineGroups)) for (const refs of chain(list)) for (const run of clipRuns(toLatLng(refs))) {
  const pts = simplify(run.map(p => project(...p)), TOL[layer]); if (pts.length > 1) layers[layer].push(pathOf(pts, false));
}
// Biggest named green areas inside the frame get a label (no duplicates by name).
const seen = new Set();
const parkLabels = labels.filter(l => l.x > 30 && l.x < FRAME.W - 30 && l.y > 20 && l.y < H - 20).sort((a, b) => b.a - a.a)
  .filter(l => !seen.has(l.name) && seen.add(l.name)).slice(0, 7).map(({ name, x, y }) => ({ name, x: Math.round(x), y: Math.round(y) }));

const body = `// Generated by scripts/build-rome-basemap.mjs from OpenStreetMap data
// (© OpenStreetMap contributors, ODbL 1.0). Do not edit by hand: rerun the script.
export const FRAME=${JSON.stringify({ ...FRAME, H })};
export const basemap=${JSON.stringify(Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.join('')])))};
export const parkLabels=${JSON.stringify(parkLabels)};
`;
fs.writeFileSync(output, body);
console.log(`Wrote ${output}: ${(body.length / 1024).toFixed(1)} KB`, Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length])), parkLabels.map(l => l.name));
