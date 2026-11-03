// Requirements and counters use the same trimmed length as the listing validator.
export function enhanceFormFields(root){
 for(const field of root.querySelectorAll('form.stack input,form.stack textarea,form.stack select')){
  if(['checkbox','radio','file','hidden','submit','button'].includes(field.type)||field.dataset.hintsReady)continue;
  const label=field.closest('label');if(!label)continue;
  field.dataset.hintsReady='true';
  field.id ||= 'field-'+field.form.id+'-'+field.name;
  if(!/facoltativ[oa]/i.test(label.textContent)){
   const title=document.createElement('span');title.className='field-label';for(const node of [...label.childNodes])if(node.nodeType===3)title.append(node);
   const note=document.createElement('span');note.className='field-requirement';note.textContent=field.required?' · obbligatorio':' · facoltativo';title.append(note);label.insertBefore(title,field);
  }
  const min=Math.max(0,field.minLength||0),max=field.maxLength>0?field.maxLength:0;
  if(!min&&!max)continue;
  const help=document.createElement('span');help.className='field-hint';help.id=field.id+'-hint';
  const range=min&&max?`Da ${min} a ${max} caratteri`:min?`Almeno ${min} caratteri`:`Fino a ${max} caratteri`;
  const counted=field.tagName==='TEXTAREA'||field.type==='text';
  help.textContent=range+(counted?', esclusi gli spazi iniziali e finali.':'.');
  const group=document.createElement('div');group.className='form-field-group';label.before(group);group.append(label,help);
  const described=(field.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);described.push(help.id);
  if(counted){
   const count=document.createElement('span');count.className='field-counter';count.id=field.id+'-count';count.setAttribute('aria-live','polite');group.append(count);described.push(count.id);
   const update=()=>{const length=field.value.trim().length,short=length>0&&length<min;
    count.textContent=`${length}${max?' / '+max:''} caratteri${min?' · minimo '+min:''}`;count.classList.toggle('incomplete',short);
    field.setCustomValidity((field.required||length>0)&&length<Math.max(min,field.required?1:0)?`Inserisci almeno ${Math.max(min,1)} caratteri, senza contare gli spazi iniziali e finali.`:max&&length>max?`Usa al massimo ${max} caratteri.`:'');
   };
   field.addEventListener('input',update);update();
  }
  field.setAttribute('aria-describedby',[...new Set(described)].join(' '));
 }
}
