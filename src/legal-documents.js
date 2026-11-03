import {escapeHtml as esc} from './domain.js';

// Only the bounded heading markers in our immutable text snapshots are formatting.
// Every character from the server is escaped; HTML and executable links are never accepted.
export function legalDocumentMarkup(text){
 if(typeof text!=='string'||text.length>150000)throw new Error('Documento non disponibile.');
 return text.split(/\n{2,}/).filter(block=>block.trim()).map(block=>{
  const heading=block.match(/^(#{1,3}) ([^\n]+)$/);
  if(heading){const level=heading[1].length+2;return `<h${level} class="legal-heading">${esc(heading[2])}</h${level}>`;}
  return `<p>${esc(block)}</p>`;
 }).join('');
}
