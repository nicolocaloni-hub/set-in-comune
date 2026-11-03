import test from 'node:test';
import assert from 'node:assert/strict';
import {legalDocumentMarkup} from '../src/legal-documents.js';
import {termsMarkup} from '../src/privacy.js';

test('legal snapshot headings are semantic and boldable without interpreting server HTML',()=>{
 const rendered=legalDocumentMarkup('## Solo privati maggiorenni\n\nUn paragrafo di testo.\n\n## Richieste, chat e disponibilità\n\n<img src=x onerror=alert(1)>');
 assert.match(rendered,/<h4 class="legal-heading">Solo privati maggiorenni<\/h4>/);
 assert.match(rendered,/<h4 class="legal-heading">Richieste, chat e disponibilità<\/h4>/);
 assert.ok(rendered.includes('&lt;img'));assert.doesNotMatch(rendered,/<img/);
 assert.equal(legalDocumentMarkup('Testo precedente senza marcatori.'),'<p>Testo precedente senza marcatori.</p>');
 assert.throws(()=>legalDocumentMarkup('x'.repeat(150001)),/non disponibile/);
});
test('custody rules describe both parties and preserve liability for the platform’s own conduct',()=>{
 const terms=termsMarkup(false);
 for(const phrase of ['Custodia e responsabilità','furto, smarrimento e danneggiamento','causa a lui non imputabile','Controlli e obblighi del proprietario','non prende in consegna','non è parte del noleggio','propri fatti od omissioni imputabili','dolo, colpa grave'])assert.ok(terms.includes(phrase),phrase);
});
