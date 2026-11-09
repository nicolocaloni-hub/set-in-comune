import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldProblem,fieldName,invalidFields} from '../src/form-hints.js';

const label=text=>({querySelector:()=>({firstChild:{textContent:text}}),textContent:text});
const field=(props,validity={})=>({type:'text',validationMessage:'',name:'x',validity,closest:()=>label(props.label||'Titolo'),...props});

test('number problems say the allowed range and to type digits only',()=>{
 const discount=field({type:'number',min:'0',max:'50',step:'1',label:'Sconto da 7 giorni (%, facoltativo)'},{stepMismatch:true});
 assert.equal(fieldName(discount),'Sconto da 7 giorni');
 assert.match(fieldProblem(discount),/numero intero tra 0 e 50 .*senza simboli come %/);
 const weekend=field({type:'number',min:'0',max:'10000',step:'0.01'},{badInput:true});
 assert.match(fieldProblem(weekend),/importo tra 0 e 10000, con massimo due decimali/);
});

test('missing values, checkboxes and text limits get a readable reason',()=>{
 assert.equal(fieldProblem(field({},{valueMissing:true})),'è obbligatorio.');
 assert.equal(fieldProblem(field({type:'checkbox'},{valueMissing:true})),'spunta la casella per continuare.');
 assert.equal(fieldName(field({type:'checkbox'})),'Dichiarazione');
 assert.equal(fieldProblem(field({validationMessage:'Inserisci almeno 20 caratteri.'},{customError:true})),'Inserisci almeno 20 caratteri.');
});

test('only fields that would block submission are listed, in form order',()=>{
 const a={willValidate:true,checkValidity:()=>true},b={willValidate:true,checkValidity:()=>false},c={willValidate:false,checkValidity:()=>false},d={willValidate:true,checkValidity:()=>false};
 assert.deepEqual(invalidFields({elements:[a,b,c,d]}),[b,d]);
});
