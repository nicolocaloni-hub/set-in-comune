export const sampleListings = [
  {id:'demo-camera',owner_id:'demo-owner-1',owner_name:'Giulia M.',title:'Sony FX3 · Cinema Line',category:'Camere',zone:'San Lorenzo',price:65,deposit:500,description:'Una camera compatta per raccontare in grande. Corpo Sony FX3 con cage, impugnatura XLR e due batterie. Perfetta per cortometraggi e documentari.',accessories:'Corpo FX3, cage SmallRig, impugnatura XLR, 2 batterie, caricatore, borsa.',conditions:'Ritiro e restituzione da concordare. Porta la tua scheda di memoria.',insurance:'Nessuna copertura inclusa. Eventuale polizza da concordare con il proprietario.',art:'camera',color:'sage',blocked:[],images:[],active:true},
  {id:'demo-light',owner_id:'demo-owner-2',owner_name:'Marco R.',title:'Amaran 200x S + softbox',category:'Luci',zone:'Pigneto',price:22,deposit:100,description:'Luce LED bicolore con softbox da 90 cm. Un kit leggero per interviste, piccoli set e ritratti.',accessories:'Faro, alimentatore, softbox, stativo e borsa.',conditions:'Da utilizzare al coperto, lontano da acqua e umidità.',insurance:'Nessuna copertura inclusa.',art:'light',color:'sand',blocked:[],images:[],active:true},
  {id:'demo-lens',owner_id:'demo-owner-3',owner_name:'Alessia P.',title:'Sigma 24–70 mm f/2.8',category:'Obiettivi',zone:'Prati',price:25,deposit:250,description:'Zoom luminoso con attacco Sony E. Un solo obiettivo per tanti punti di vista.',accessories:'Obiettivo, tappi, paraluce e custodia.',conditions:'Controlliamo insieme lenti e attacco al ritiro.',insurance:'Nessuna copertura inclusa.',art:'lens',color:'rose',blocked:[],images:[],active:true},
  {id:'demo-audio',owner_id:'demo-owner-4',owner_name:'Davide L.',title:'Zoom H6 · Kit audio',category:'Audio',zone:'Ostiense',price:18,deposit:100,description:'Registratore portatile a sei tracce per dialoghi e suoni di ambiente.',accessories:'Zoom H6, capsula XY, antivento, cavo e custodia.',conditions:'Batterie e scheda SD non incluse.',insurance:'Nessuna copertura inclusa.',art:'audio',color:'blue',blocked:[],images:[],active:true},
  {id:'demo-tripod',owner_id:'demo-owner-1',owner_name:'Giulia M.',title:'Manfrotto · Treppiede video',category:'Supporti',zone:'San Lorenzo',price:12,deposit:80,description:'Treppiede con testa fluida e piastra rapida per riprese stabili.',accessories:'Gambe, testa fluida, piastra e borsa.',conditions:'Verifica il peso della tua configurazione prima di prenotare.',insurance:'Nessuna copertura inclusa.',art:'tripod',color:'lavender',blocked:[],images:[],active:true},
  {id:'demo-reflector',owner_id:'demo-owner-5',owner_name:'Luca F.',title:'Pannello riflettente 5 in 1',category:'Accessori',zone:'Monteverde',price:0,deposit:20,description:'Un piccolo aiuto per il tuo prossimo corto. Lo presto volentieri a chi sta iniziando.',accessories:'Pannello da 110 cm, cinque superfici e custodia.',conditions:'Prestito gratuito. Riportalo pulito e asciutto.',insurance:'Nessuna copertura inclusa.',art:'reflector',color:'sand',blocked:[],images:[],active:true}
];

// Fictional profiles for the local demo. Email is never included in public profiles.
export const sampleProfiles = [
 {id:'demo-owner-1',display_name:'Giulia M.',zone:'San Lorenzo',bio:'Profilo di esempio. Mi occupo di fotografia e piccoli set indipendenti. Condivido la mia attrezzatura tra un progetto e l’altro.',avatar_url:'',email_verified:false},
 {id:'demo-owner-2',display_name:'Marco R.',zone:'Pigneto',bio:'Profilo di esempio. Lavoro con la luce: interviste, videoclip e cortometraggi. Ritiro e restituzione da concordare in chat.',avatar_url:'',email_verified:false},
 {id:'demo-owner-3',display_name:'Alessia P.',zone:'Prati',bio:'Profilo di esempio. Filmmaker a Roma, appassionata di documentario e racconti di quartiere.',avatar_url:'',email_verified:false},
 {id:'demo-owner-4',display_name:'Davide L.',zone:'Ostiense',bio:'',avatar_url:'',email_verified:false},
 {id:'demo-owner-5',display_name:'Luca F.',zone:'Monteverde',bio:'Profilo di esempio. Sto iniziando a girare i miei primi corti e presto volentieri gli accessori che non uso.',avatar_url:'',email_verified:false}
];

// Structured technical details are example data, never reputation or identity claims.
const sampleTechnical=[
 {brand:'Sony',model:'FX3',lens_mount:'Sony E',equipment_condition:'Ottime',included_tags:['Batterie','Caricatore','Custodia']},
 {brand:'Amaran',model:'200x S',light_power_w:200,equipment_condition:'Buone',included_tags:['Stativo','Softbox','Custodia']},
 {brand:'Sigma',model:'24–70 mm f/2.8',lens_mount:'Sony E',equipment_condition:'Ottime',included_tags:['Custodia']},
 {brand:'Zoom',model:'H6',equipment_condition:'Buone',included_tags:['Microfono','Custodia']},
 {brand:'Manfrotto',model:'Treppiede video',equipment_condition:'Buone',included_tags:['Custodia']},
 {brand:'',model:'Riflettente 5 in 1',equipment_condition:'Buone',included_tags:['Custodia']}
];
sampleListings.forEach((l,i)=>Object.assign(l,sampleTechnical[i]));
