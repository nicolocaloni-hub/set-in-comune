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
