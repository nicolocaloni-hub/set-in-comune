export const zones = {
  'Prati': [41.912,12.459], 'San Lorenzo':[41.898,12.514], 'Pigneto':[41.889,12.529],
  'Ostiense':[41.869,12.478], 'Monteverde':[41.871,12.451], 'Flaminio':[41.927,12.468],
  'Trastevere':[41.885,12.470], 'Nomentano':[41.916,12.524], 'Tuscolano':[41.870,12.547], 'EUR':[41.830,12.470]
};
export const categories = ['Tutto', 'Camere', 'Obiettivi', 'Luci', 'Audio', 'Supporti', 'Accessori'];
export const labels = { requested:'In attesa', accepted:'Confermato', collected:'In corso', returned:'Restituito', completed:'Concluso', declined:'Rifiutato', cancelled:'Annullato' };
export const euro = value => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(value));
export function rentalDays(start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return 0;
  const a = Date.parse(start + 'T00:00:00Z'), b = Date.parse(end + 'T00:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b) || new Date(a).toISOString().slice(0,10) !== start || new Date(b).toISOString().slice(0,10) !== end) return 0;
  return b < a ? 0 : Math.round((b-a)/86400000)+1;
}
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function distance(a,b) {
  const rad = v => v*Math.PI/180;
  const h = Math.sin(rad(b[0]-a[0])/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(rad(b[1]-a[1])/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
export function available(item, start, end, bookings=[]) {
  if (!start || !end) return true;
  return ![...(item.blocked || []), ...bookings.filter(b=>b.listing_id===item.id && ['accepted','collected','returned'].includes(b.status))].some(b=>b.start_date<=end && b.end_date>=start);
}
export function validateRental(start,end) {
  const days = rentalDays(start,end);
  if (!days) throw new Error('Scegli date valide: la restituzione non può precedere il ritiro.');
  if (start < today()) throw new Error('Il ritiro non può essere nel passato.');
  if (days > 60) throw new Error('Per ogni richiesta puoi prenotare fino a 60 giorni.');
  return days;
}
export function nextActions(status, owner) {
  if (status==='requested') return owner ? ['accepted','declined'] : ['cancelled'];
  if (status==='accepted') return owner ? ['collected','cancelled'] : ['cancelled'];
  if (status==='collected') return owner ? [] : ['returned'];
  if (status==='returned') return owner ? ['completed'] : [];
  return [];
}
export function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

export function validateListing(data) {
  const fields = [['title',5,90,'titolo'],['description',20,2000,'descrizione'],['accessories',1,1500,'accessori'],['conditions',1,1500,'condizioni'],['insurance',1,1000,'assicurazione']];
  const clean = {};
  for (const [key,min,max,label] of fields) {
    clean[key] = String(data[key] ?? '').trim();
    if (clean[key].length < min || clean[key].length > max) throw new Error(`Controlla ${label}: da ${min} a ${max} caratteri.`);
  }
  if (!categories.slice(1).includes(data.category) || !zones[data.zone]) throw new Error('Scegli categoria e quartiere validi.');
  clean.category = data.category; clean.zone = data.zone;
  for (const [key,max] of [['price',10000],['deposit',100000]]) {
    const value = Number(data[key]);
    if (data[key] === '' || data[key] == null || !Number.isFinite(value) || value < 0 || value > max || Math.abs(value*100-Math.round(value*100)) > 0.000001) throw new Error('Prezzo e cauzione devono essere importi validi, con massimo due decimali.');
    clean[key] = Math.round(value*100)/100;
  }
  const weekend = data.weekend_price;
  if (weekend === '' || weekend == null) clean.weekend_price = null;
  else {
    const value = Number(weekend);
    if (!Number.isFinite(value) || value < 0 || value > 10000 || Math.abs(value*100-Math.round(value*100)) > 0.000001) throw new Error('Il prezzo weekend deve essere un importo valido, con massimo due decimali.');
    clean.weekend_price = Math.round(value*100)/100;
  }
  const pct = data.weekly_discount_pct === '' || data.weekly_discount_pct == null ? 0 : Number(data.weekly_discount_pct);
  if (!Number.isInteger(pct) || pct < 0 || pct > 50) throw new Error('Lo sconto settimanale deve essere un numero intero da 0 a 50.');
  clean.weekly_discount_pct = pct;
  if (!Array.isArray(data.images) || data.images.length > 4 || data.images.some(x=>typeof x !== 'string')) throw new Error('Puoi aggiungere al massimo quattro foto.');
  clean.images = [...data.images];
  return clean;
}
// Duration pricing, identical to private.duration_quote in SQL. Amounts in euros.
export const priceRuleLabels = {daily:'Tariffa giornaliera', weekly:'Sconto settimanale', weekend:'Tariffa weekend'};
export function isWeekendRental(start, end) {
  const days = rentalDays(start, end);
  const from = new Date(start+'T12:00:00Z').getUTCDay(), to = new Date(end+'T12:00:00Z').getUTCDay();
  return days >= 2 && days <= 4 && [5,6].includes(from) && [0,1].includes(to);
}
export function quoteRental(listing, start, end) {
  const days = rentalDays(start, end);
  if (!days) return {days:0, total:0, standard:0, rule:'daily'};
  const standard = Math.round(Number(listing.price)*100)*days;
  let total = standard, rule = 'daily';
  const pct = Number(listing.weekly_discount_pct) || 0;
  if (days >= 7 && pct > 0) { total = Math.round(standard*(100-pct)/100); rule = 'weekly'; }
  const weekend = listing.weekend_price === '' || listing.weekend_price == null ? null : Math.round(Number(listing.weekend_price)*100);
  if (weekend !== null && isWeekendRental(start, end) && weekend < total) { total = weekend; rule = 'weekend'; }
  return {days, total: total/100, standard: standard/100, rule};
}
export function filterBookings(bookings, userId, role='all', group='all') {
  const groups = {pending:['requested'],active:['accepted','collected','returned'],history:['completed','declined','cancelled']};
  return bookings.filter(b=>(role==='all'||(role==='owner'?b.owner_id===userId:b.renter_id===userId))&&(!groups[group]||groups[group].includes(b.status)));
}
