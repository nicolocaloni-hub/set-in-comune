# Assetto privacy di RENT TO A FRIEND

Aggiornato il 31 ottobre 2026. Documento operativo di pre-lancio, non attestazione di conformità.

## Identità e stato

- Titolare: **Nicolò Caloni**, confermato dal proprietario in questa sessione.
- Contatto privacy e assistenza: **assistenza@rent-to-a-friend.it**.
- Recapito postale: il proprietario ha scelto di aggiungerlo prima del lancio. Non è stato ricavato né pubblicato un indirizzo personale.
- `reviewed=false`, `providersReviewed=false` e `retentionPolicy.approved=false`: gli account reali non vengono inclusi nel build pubblico finché le informazioni non sono complete e approvate.
- Nessun documento dei fornitori è stato sottoscritto o accettato automaticamente in questa revisione. Nessun acquisto o upgrade.

## Fornitori: documenti verificati, non accordi inventati

| Fornitore | Trattamento previsto | Riscontro dal documento pubblico | Stato per questa app |
|---|---|---|---|
| Supabase | Auth, database, foto, funzioni e notifiche | Il DPA versione 1 del 1 agosto 2026 dichiara di integrare i termini e avere efficacia dalla data dell’accordo. Elenca subfornitori e SCC. La regione scelta non esclude altri trattamenti descritti nel DPA. | Progetto dedicato UE verificato; titolarità dell’account, applicabilità dell’accordo e subfornitori da ricondurre a Nicolò prima del lancio. |
| Vercel | Sito statico, distribuzione e richieste tecniche | Il DPA pubblico, aggiornato 17 marzo 2026, indica applicabilità a Pro/Enterprise. La documentazione Hobby indica uso personale non commerciale. | **Blocco da risolvere per lancio commerciale**: non assumere che il piano gratuito sia coperto dal DPA citato. Ottenere conferma oppure scegliere un hosting con copertura adeguata; nessun piano attivato. La demo di sviluppo resta online. |
| Resend | Solo conferma indirizzo e recupero password | Il DPA aggiornato 31 dicembre 2025 dichiara incorporazione nei termini/accordo e include SCC e subfornitori. Descrive anche la durata alla cessazione del servizio: non equivale alla durata di ogni singola email. | Account Free; SMTP non collegato. Prima del lancio verificare intestazione, DPA applicabile, log, subfornitori e dominio mittente. Nessuna email marketing prevista. |
| Push del browser | Consegna facoltativa delle notifiche | Destinatari dipendono da browser/sistema operativo; il contenuto della chat non è incluso nelle push dell’app. | Documentare servizio effettivo per i dispositivi supportati; revoca disponibile. |

Fonti primarie:
- https://supabase.com/legal/customer-resources/data-processing-addendum
- https://supabase.com/legal/customer-resources/subprocessor-list
- https://vercel.com/legal/dpa
- https://vercel.com/docs/plans/hobby
- https://resend.com/legal/dpa
- https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en

## Conservazione

La matrice in `src/retention.js` è pubblicata nell’informativa come **bozza da approvare**, con distinzione fra funzioni effettive e proposte. Non è stata attivata alcuna cancellazione periodica generale dei dati sulla base di periodi arbitrari.

Proposte operative: upload orfani 24 ore; notifiche lette/log applicativi 90 giorni; segnalazioni e richieste privacy 12 mesi dalla chiusura, salvo necessità documentata. Non sono termini di legge universali. Per chat, noleggi, riscontri, obblighi, controversie e backup occorrono finalità, basi, durata e procedura definite. Non applicare a tutto il database un indistinto termine fiscale di dieci anni.

Sono operative nel codice la cancellazione dei vecchi file dopo una modifica riuscita e la cancellazione automatica su conferma per account senza rapporti da verificare. La pulizia manuale degli orfani esclude upload più recenti di un’ora. Non confondere una riga rimossa da Storage con la cancellazione del file: si usa sempre Storage API.

## Cancellazione automatica: ambito e controlli

L’endpoint `account-erasure` verifica il token con Auth e chiede nuovamente la password; ignora eventuali ID utente nel corpo. La password non viene registrata o restituita. Il browser non riceve service key né chiavi del worker.

- Account senza alcun noleggio, conversazione, segnalazione o ruolo operatore: accodamento, chiusura accessi via database, revoca delle sessioni, rimozione fisica delle foto dei tre bucket dell’app, rimozione dei record, cancellazione Auth e registrazione dell’esito. Il completamento non viene simulato al frontend.
- Account con rapporti condivisi o ruolo di gestione: richiesta registrata per verifica, con motivo visibile. Non è un rifiuto dei diritti. Il gestore valuta eliminazione, anonimizzazione ed eventuali eccezioni, dandone riscontro.
- Gli account in cancellazione sono nascosti dalle policy pubbliche e non possono usare JWT precedenti per le operazioni protette. Nuovi rapporti con loro vengono respinti.
- Errori temporanei: queue persistente, lease di cinque minuti, massimo cinque account per invocazione, ripresa ogni cinque minuti solo quando esiste lavoro; dopo dodici tentativi serve intervento del gestore. I job problematici sono visibili nella coda privacy riservata al gestore.
- Il processo elimina solo percorsi nel prefisso UUID dell’account; verifica che i file siano effettivamente rimossi prima di eliminare record o Auth. Non cancella file di altre persone.
- Nessuna cancellazione automatica di chat o contratti condivisi: questa release li rinvia al gestore. Nessuna cancellazione reale eseguita durante i test.

## Approvazioni e attività prima del lancio

1. Inserire il recapito scelto e gli eventuali dati dell’attività del titolare; completare condizioni e processo di accettazione delle versioni definitive.
2. Approvare la matrice di conservazione per finalità, inclusi backup e log, e attivare i processi periodici necessari solo dopo tale decisione.
3. Risolvere la copertura dell’hosting gratuito e verificare gli accordi realmente applicabili agli account intestati al titolare.
4. Rivedere basi giuridiche e condizioni per il modello di noleggio effettivo; valutare gli obblighi applicabili ai marketplace in base a utenti e attività, senza presumere che una privacy policy esaurisca tutti gli obblighi.
5. Assegnare a un account reale il ruolo operatore e presidiare richieste, code di errore e scadenze; configurare dominio/SMTP e svolgere i test completi tra account reali.
6. Completare la revisione dei documenti e solo allora togliere il blocco del build collegato. Nessuna garanzia “zero multe”.

## Verifiche tecniche di questa release

90 test locali superati; build demo riuscito e build collegato bloccato fino alle verifiche del titolare. Migrazione remota automatic_account_erasure applicata; funzione account-erasure attiva con autenticazione propria di utente e hook. Verificati 401 senza credenziali, 401 per hook errato, 403 da origine estranea e 401 per sessione invalida. Smoke SQL remoto con rollback: eligibility, privilegi server, JWT precedenti respinti, profilo/annunci nascosti, nuovi contatti respinti, lease non duplicata e rimozione dei soli record fixture. Le prove di password, ordine Storage/record/Auth e retry usano provider simulati: il flusso completo con account e file reali va ancora verificato prima del lancio. Nessuna cancellazione reale dichiarata o effettuata.


## Ambito del pilota confermato · 1 novembre 2026

Il proprietario ha scelto **soltanto privati**. Ammesse persone fisiche maggiorenni che agiscono per scopi estranei ad attività imprenditoriali o professionali, senza operare per conto di un’impresa. Esclusi società e noleggiatori professionali. La restrizione compare nelle condizioni, nella registrazione e nel modulo di pubblicazione/modifica, con dichiarazione non preselezionata e verifica nel submit del frontend.

La dichiarazione non è una verifica indipendente dello status e non è ancora una ricevuta di accettazione conservata sul server. Non sono state aggiunte verifiche di documenti o partita IVA, né un badge Privato verificato. Prima degli account reali completare condizioni definitive, prova dell’accettazione e procedura operativa di valutazione e gestione delle segnalazioni di attività professionali. Gli altri blocchi di pre-lancio rimangono aperti.

Fonte primaria consultata per la distinzione basata sull’attività effettiva: Corte di giustizia UE, C-105/17, https://eur-lex.europa.eu/legal-content/IT/TXT/?uri=CELEX%3A62017CJ0105 . La limitazione agli utenti privati non elimina automaticamente gli obblighi del gestore.


## Contatto aggiornato · 1 novembre 2026

Indirizzo pubblico per assistenza e diritti sui dati: assistenza@rent-to-a-friend.it. Il proprietario ha configurato su IONOS un reindirizzamento verso assistenza.rtaf@gmail.com e ha accettato di rispondere da Gmail. La schermata fornita conferma la configurazione; la consegna effettiva di un messaggio di prova non è stata verificata dall’agente. Non è un servizio SMTP di invio per conferma email o recupero password dell’app.
