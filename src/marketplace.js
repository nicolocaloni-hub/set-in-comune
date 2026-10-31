import {today,available,distance,zones,rentalDays} from './domain.js';
export const mounts=['Sony E','Canon RF','Canon EF','Nikon Z','Nikon F','Micro 4/3','L-Mount','PL','Altro'];
export const accessoryTags=['Batterie','Caricatore','Custodia','Stativo','Softbox','Scheda memoria','Microfono','Monitor'];
export const conditions=['Ottime','Buone','Segni di utilizzo'];
export const reportReasons=['Comportamento inappropriato','Annuncio sospetto','Informazioni non corrette','Spam','Problema durante il noleggio','Altro'];
export const handoffItems={equipment:'Ho controllato il funzionamento dell’attrezzatura.',accessories:'Ho verificato tutti gli accessori inclusi.',condition:'Ho annotato condizioni, differenze o danni nelle note.'};
export function profileCompleteness(profile={}){const items=[['Nome',Boolean(profile.display_name?.trim())],['Quartiere',Boolean(profile.zone)],['Foto profilo',Boolean(profile.avatar_url)],['Bio',Boolean(profile.bio?.trim())]];return {percent:Math.round(items.filter(x=>x[1]).length/items.length*100),missing:items.filter(x=>!x[1]).map(x=>x[0])};}
export function validateTechnical(data={}){
 const out={};for(const [key,max] of [['brand',40],['model',60]]){out[key]=String(data[key]||'').trim();if(out[key].length>max)throw new Error('Marca o modello troppo lunghi.');}
 out.lens_mount=String(data.lens_mount||'');if(out.lens_mount&&!mounts.includes(out.lens_mount))throw new Error('Attacco non valido.');
 out.equipment_condition=String(data.equipment_condition||'');if(out.equipment_condition&&!conditions.includes(out.equipment_condition))throw new Error('Condizioni non valide.');
 out.light_power_w=data.light_power_w===''||data.light_power_w==null?null:Number(data.light_power_w);if(out.light_power_w!==null&&(!Number.isInteger(out.light_power_w)||out.light_power_w<1||out.light_power_w>20000))throw new Error('Inserisci una potenza intera da 1 a 20000 W.');
 if(data.included_tags!==undefined&&!Array.isArray(data.included_tags))throw new Error('Accessori non validi.');out.included_tags=[...new Set(data.included_tags||[])];if(out.included_tags.length>8||out.included_tags.some(t=>!accessoryTags.includes(t)))throw new Error('Accessori non validi.');return out;
}
export function matchesTechnical(item,filters={}){return (!filters.brand||item.brand?.toLowerCase()===filters.brand.toLowerCase())&&(!filters.mount||item.lens_mount===filters.mount)&&(!filters.power||Number(item.light_power_w)>=Number(filters.power))&&(!filters.accessory||item.included_tags?.includes(filters.accessory))&&(!filters.condition||item.equipment_condition===filters.condition)&&(!filters.zone||distance(zones[filters.zone],zones[item.zone]||zones.Prati)<=Number(filters.radius||10));}
export function validateReview(rating,body){rating=Number(rating);body=String(body||'').trim();if(!Number.isInteger(rating)||rating<1||rating>5||body.length<10||body.length>1000)throw new Error('Scegli da 1 a 5 stelle e scrivi una recensione tra 10 e 1000 caratteri.');return {rating,body};}
export function validateChecklist(value,required=true){const clean=Object.fromEntries(Object.keys(handoffItems).map(k=>[k,value?.[k]===true]));if(required&&Object.values(clean).some(v=>!v))throw new Error('Completa tutti i controlli della consegna o restituzione.');return clean;}
export function calendarMonth(item,offset=0,start='',end='',now=today()){
 const current=new Date(now+'T12:00:00'),first=new Date(current.getFullYear(),current.getMonth()+offset,1,12);const prefix=`${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,'0')}-`;
 const count=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();return {title:first.toLocaleDateString('it-IT',{month:'long',year:'numeric'}),padding:(first.getDay()+6)%7,days:Array.from({length:count},(_,i)=>{const date=prefix+String(i+1).padStart(2,'0');return {date,day:i+1,past:date<now,blocked:!available(item,date,date),selected:date===start||date===end,inRange:Boolean(start&&end&&date>=start&&date<=end)};})};
}
export function chooseCalendarDate(item,date,start='',end=''){
 if(date<today()||!available(item,date,date))throw new Error('Questo giorno non è disponibile.');
 if(!start||end||date<start)return {start:date,end:''};
 if(rentalDays(start,date)>60)throw new Error('Puoi prenotare al massimo 60 giorni.');
 if(!available(item,start,date))throw new Error('Il periodo comprende giorni già occupati. Scegli un’altra restituzione.');
 return {start,end:date};
}
