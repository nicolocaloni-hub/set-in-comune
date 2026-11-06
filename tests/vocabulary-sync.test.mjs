import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {zones,categories} from '../src/domain.js';
import {mounts,conditions,accessoryTags,reportReasons} from '../src/marketplace.js';

// The client validates fixed vocabularies (zones, categories, mounts, ...) and the
// database enforces the same lists in CHECK constraints and RPCs. They are written
// twice, so a value added on one side only makes saves fail for real users.
// This test reads every SQL file and requires each SQL list to match the client list.

const sqlFiles=async()=>{
 const root=new URL('../supabase/',import.meta.url),files=[];
 for(const dir of ['','migrations/','launch/']){
  for(const name of (await readdir(new URL(dir,root))).filter(n=>n.endsWith('.sql')).sort())
   files.push({name:dir+name,text:await readFile(new URL(dir+name,root),'utf8')});
 }
 return files;
};
const quoted=list=>[...list.matchAll(/'((?:[^']|'')*)'/g)].map(m=>m[1].replaceAll("''","'"));
// Finds `<column> in (...)` / `<column> not in (...)` and `<column> <@ array[...]` lists.
function sqlLists(files,column,kind='in'){
 const pattern=kind==='array'
  ?new RegExp(`\\b${column}\\s*<@\\s*array\\[([^\\]]*)\\]`,'gi')
  :new RegExp(`\\b${column}\\s+(?:not\\s+)?in\\s*\\(([^)]*)\\)`,'gi');
 return files.flatMap(({name,text})=>[...text.matchAll(pattern)].map(m=>({where:name,values:quoted(m[1])})));
}
function assertSame(found,expected,label){
 assert.ok(found.length>0,`Nessuna lista SQL trovata per ${label}: aggiorna questo test se lo schema è cambiato.`);
 assert.equal(new Set(expected).size,expected.length,`${label}: valori duplicati nel client.`);
 for(const {where,values} of found)
  assert.deepEqual([...values].sort(),[...expected].sort(),`${label}: la lista in ${where} non coincide con quella del client.`);
}

test('client and database share the same fixed vocabularies',async()=>{
 const files=await sqlFiles();
 const zoneLists=sqlLists(files,'zone');
 assert.ok(zoneLists.length>=2,'Attese liste quartieri per profiles e listings.');
 assertSame(zoneLists,Object.keys(zones),'quartieri');
 assertSame(sqlLists(files,'category'),categories.slice(1),'categorie');
 // Optional technical fields also accept the empty string in SQL.
 assertSame(sqlLists(files,'lens_mount'),['',...mounts],'attacchi obiettivo');
 assertSame(sqlLists(files,'equipment_condition'),['',...conditions],'condizioni');
 assertSame(sqlLists(files,'included_tags','array'),accessoryTags,'accessori inclusi');
 assertSame(sqlLists(files,'p_reason'),reportReasons,'motivi di segnalazione');
});

test('every zone has valid Rome coordinates for distance filters',()=>{
 for(const [name,[lat,lng]] of Object.entries(zones)){
  assert.ok(lat>41.7&&lat<42.1&&lng>12.3&&lng<12.7,`Coordinate fuori Roma per ${name}.`);
 }
 assert.equal(categories[0],'Tutto','La prima categoria deve restare il filtro "Tutto".');
});
