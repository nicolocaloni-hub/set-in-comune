// Operational proposals, NOT legal minimum periods. No bulk erasure is activated by these values.
export const retentionPolicy={version:'draft-2026-10-31',approved:false,rules:[
 {category:'Foto sostituite o rimosse',period:'Dopo il salvataggio della modifica',handling:'Eliminazione del file non più utilizzato; ripresa manuale in caso di errore.',state:'implemented'},
 {category:'Upload interrotti o mai utilizzati',period:'Proposta: 24 ore',handling:'Pulizia periodica da approvare e attivare. La pulizia manuale esclude i file caricati da meno di un’ora.',state:'proposal'},
 {category:'Account senza noleggi, chat o segnalazioni',period:'Alla conferma di cancellazione',handling:'Cancellazione automatica dei file, dei record e dell’account; retry in caso di errore.',state:'implemented'},
 {category:'Conversazioni, noleggi e foto di consegna',period:'Da definire per finalità e obblighi',handling:'Nessuna conservazione perpetua approvata. Verifica caso per caso per diritti delle controparti, obblighi e controversie.',state:'pending'},
 {category:'Segnalazioni e richieste sui dati',period:'Proposta: 12 mesi dalla chiusura, salvo necessità documentata',handling:'Minimizzare i dati; termine da valutare e approvare prima del lancio.',state:'proposal'},
 {category:'Notifiche lette e log operativi',period:'Proposta: 90 giorni; log dei fornitori da verificare separatamente',handling:'Non coincide con messaggi o registro dei noleggi; cancellazione periodica da approvare.',state:'proposal'},
 {category:'Cache, backup e log dei fornitori',period:'Secondo le condizioni effettive dei servizi',handling:'Verificare copie, scadenze e procedura di cancellazione; non promettere cancellazione istantanea.',state:'pending'}]};
