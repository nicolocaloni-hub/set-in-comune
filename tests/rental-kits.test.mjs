import test from 'node:test';
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const {kitAdd,kitRemove,kitQuote,kitGroups,KIT_MAX}=await import('../src/marketplace.js');
const {api}=await import('../src/api.js');

const L=(id,owner,extra={})=>({id,owner_id:owner,price:20,deposit:100,blocked:[],booked:[],...extra});

test('kit helpers keep one owner, a size limit and per-item prices',()=>{
 let r=kitAdd(null,L('a','o1'));assert.deepEqual(r.kit,{owner_id:'o1',ids:['a']});assert.equal(r.replaced,false);
 r=kitAdd(r.kit,L('b','o1'));assert.deepEqual(r.kit.ids,['a','b']);
 assert.equal(kitAdd(r.kit,L('b','o1')).changed,false,'no duplicates');
 const other=kitAdd(r.kit,L('c','o2'));assert.equal(other.replaced,true);assert.deepEqual(other.kit,{owner_id:'o2',ids:['c']});
 let full={owner_id:'o1',ids:Array.from({length:KIT_MAX},(_,i)=>'x'+i)};
 assert.throws(()=>kitAdd(full,L('y','o1')),/fino a 8/);
 assert.equal(kitRemove({owner_id:'o1',ids:['a']},'a'),null);
 const q=kitQuote([L('a','o1'),L('b','o1',{weekly_discount_pct:10,deposit:50})],'2090-01-02','2090-01-08');
 assert.equal(q.total,140+126);assert.equal(q.deposit,150);assert.equal(q.available,true);
});

test('bookings of the same kit are grouped without reordering the rest',()=>{
 const g=kitGroups([{id:1},{id:2,bundle_id:'k'},{id:3},{id:4,bundle_id:'k'}]);
 assert.deepEqual(g.map(x=>x.items.map(b=>b.id)),[[1],[2,4],[3]]);
});

test('demo kits are all-or-nothing and answered together',async()=>{
 const all=await api.listings(),byOwner=Object.groupBy(all,l=>l.owner_id);
 const [owner,items]=Object.entries(byOwner).find(([,v])=>v.length>=2),loner=all.find(l=>l.owner_id!==owner);
 await assert.rejects(api.createBundle([items[0],loner],'2090-03-01','2090-03-02',''),/stesso proprietario/);
 await assert.rejects(api.createBundle([items[0]],'2090-03-01','2090-03-02',''),/da 2 a 8/);
 const bundle=await api.createBundle(items.slice(0,2),'2090-03-01','2090-03-03','Spot in esterni');
 let mine=(await api.bookings()).filter(b=>b.bundle_id===bundle);
 assert.equal(mine.length,2);assert.ok(mine.every(b=>b.status==='requested'&&b.note==='Spot in esterni'));
 assert.equal((await api.transitionBundle(bundle,'cancelled','')),2);
 mine=(await api.bookings()).filter(b=>b.bundle_id===bundle);assert.ok(mine.every(b=>b.status==='cancelled'));
 await assert.rejects(api.transitionBundle(bundle,'collected'),/attrezzo per attrezzo/);
 // A failing item leaves no partial kit behind.
 const before=(await api.bookings()).length;
 await api.createBooking(items[1],'2090-04-01','2090-04-02','');await api.demoAccept((await api.bookings())[0].id);
 await assert.rejects(api.createBundle(items.slice(0,2),'2090-04-01','2090-04-02',''),/impegnata/);
 assert.equal((await api.bookings()).length,before+1);
});
