import test from 'node:test';import assert from 'node:assert/strict';
import {validateTechnical,matchesTechnical,profileCompleteness,calendarMonth,chooseCalendarDate,validateReview,validateChecklist} from '../src/marketplace.js';
import {today} from '../src/domain.js';
test('technical filters combine mount, power, accessories and neighborhood radius',()=>{
 const camera={brand:'Sony',lens_mount:'Sony E',included_tags:['Batterie'],zone:'Prati'};
 assert.equal(matchesTechnical(camera,{brand:'sony',mount:'Sony E',accessory:'Batterie',zone:'Prati',radius:1}),true);
 assert.equal(matchesTechnical(camera,{mount:'Canon RF'}),false);
 assert.equal(matchesTechnical(camera,{zone:'EUR',radius:1}),false);
 assert.equal(matchesTechnical({light_power_w:200},{power:600}),false);
 assert.equal(matchesTechnical({light_power_w:200},{power:120}),true);
});
test('technical validation rejects unsupported tags, negative power and oversized models',()=>{
 assert.equal(validateTechnical({brand:' Sony ',light_power_w:'200',included_tags:['Batterie','Batterie']}).included_tags.length,1);
 for(const row of [{lens_mount:'Injected'},{light_power_w:-1},{light_power_w:1.2},{model:'x'.repeat(61)},{included_tags:['Private data']}])assert.throws(()=>validateTechnical(row));
});
test('profile completeness describes supplied information without granting verification',()=>{assert.equal(profileCompleteness({display_name:'Nico',zone:'Prati'}).percent,50);assert.deepEqual(profileCompleteness({display_name:'Nico',zone:'Prati'}).missing,['Foto profilo','Bio']);});
test('visual calendar aligns Monday first, leap years and inclusive blocked periods',()=>{
 const m=calendarMonth({blocked:[{start_date:'2028-02-10',end_date:'2028-02-12'}]},0,'2028-02-11','2028-02-14','2028-02-01');
 assert.equal(m.padding,1);assert.equal(m.days.length,29);assert.equal(m.days.find(d=>d.day===12).blocked,true);assert.equal(m.days.find(d=>d.day===14).selected,true);
});
test('date picking cannot cross occupied days or exceed sixty days',()=>{
 const y=Number(today().slice(0,4))+2;
 const item={blocked:[{start_date:y+'-01-05',end_date:y+'-01-07'}]};
 assert.deepEqual(chooseCalendarDate(item,y+'-01-03'),{start:y+'-01-03',end:''});
 assert.throws(()=>chooseCalendarDate(item,y+'-01-08',y+'-01-03',''),/occupati/);
 assert.throws(()=>chooseCalendarDate(item,y+'-04-01',y+'-01-08',''),/60/);
 assert.deepEqual(chooseCalendarDate(item,y+'-01-03',y+'-01-03',''),{start:y+'-01-03',end:y+'-01-03'});
});
test('checklists need booleans and reviews need a bounded rating and meaningful text',()=>{assert.throws(()=>validateChecklist({equipment:'true',accessories:true,condition:true}));assert.throws(()=>validateReview(6,'Ottima esperienza'));assert.throws(()=>validateReview(5,'ok'));assert.equal(validateReview('5','  Tutto in ordine e puntuale  ').rating,5);});
