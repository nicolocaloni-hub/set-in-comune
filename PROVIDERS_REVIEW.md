# Fornitori e trasferimenti · revisione del 2 novembre 2026

Ambito effettivo: sito statico Vercel; progetto Supabase dedicato `srjdysdhxnafjrutufmk` a Francoforte; Resend per sole conferma email e recupero; assistenza IONOS inoltrata a `assistenza.rtaf@gmail.com`; Turnstile predisposto ma non richiesto da Auth; push facoltative da provare. La demo non usa il backend per i contenuti locali. Gli accordi esistenti possono incorporare un DPA: non si richiede automaticamente una nuova firma o un acquisto.

## Esito per fornitore

| Fornitore | Verifica documentale completata | Stato e riscontro ancora necessario |
|---|---|---|
| Supabase | DPA v1 del 1 agosto 2026 incorporato nei termini; SCC per i trasferimenti pertinenti. Lista subfornitori aggiornata al 12 ottobre 2026 ricontrollata. Non tutti i trattamenti sono limitati alla regione del database. | Progetto e organizzazione del gestore verificati nei controlli tecnici, piano Free. Collegare al fascicolo del gestore gli estremi non segreti dell'account/accordo esistente; non presumere che la creazione del progetto richieda un nuovo DPA da firmare. I log e il recupero del piano effettivo restano separati. |
| Resend | DPA standard eseguito all'iscrizione su ogni piano; copia dell'account scaricabile da Documents. Conservazione dichiarata: email/log 30 giorni, backup 7 giorni, residui entro 90 giorni dalla cessazione. Conservazione negli USA anche se l'invio usa una regione UE; SCC e meccanismo DPF distinti. | SMTP e prove conferma/reset già verificati. Archiviare il riscontro non segreto dell'account e l'accordo già esistente; non richiedere firme aggiuntive dedotte. Non usare AI Editor/Support con contenuti degli utenti. |
| Cloudflare Turnstile | DPA v6.4 del 3 aprile 2026 nell'accordo principale; garanzie SCC per i trasferimenti pertinenti. La privacy Turnstile distingue il servizio svolto per il sito dal miglioramento del rilevamento dei bot, per cui Cloudflare indica un ruolo autonomo. | Widget creato dal proprietario e Site Key configurata. La demo non lo carica. Collegare gli estremi dell'account al gestore; completare Secret Key esclusivamente in Supabase e prova reale nell'ordine previsto. Nessuna durata fissa dei segnali è stata inventata. |
| IONOS | Centro assistenza: dal 19 luglio 2022 le disposizioni privacy sono incluse nei nuovi contratti; condizioni generali art. 11.1 e DPA specifico consultati. Quando agisce da responsabile si applicano le disposizioni collegate. | Non serve chiedere automaticamente una nuova firma. Verificare data/prodotto del contratto che comprende dominio e inoltro: il DPA elenca anche Mail Basic/Business, ma l'inoltro isolato non viene equiparato senza riscontro a una casella. Nessuna prova di consegna dell'assistenza eseguita. |
| Google/Gmail consumer | Google dichiara espressamente che per Gmail consumer non offre un DPA e non opera come responsabile; valgono termini e privacy consumer. Workspace è un prodotto con termini distinti. Un indirizzo @gmail.com da solo non dimostra una sottoscrizione Workspace. | **Questione concreta ancora aperta**, non un documento soltanto da scaricare. Non presentare la casella gratuita come responsabile contrattualizzato. Valutare il ruolo e la comunicazione dei dati oppure usare una casella coperta da accordo adeguato. Prima di spendere, verificare se una vera casella è già inclusa nel contratto IONOS. Nessun inoltro, messaggio o account è stato modificato. |
| Vercel Hobby | Fair Use: uso personale non commerciale; fra gli esempi commerciali compare la promozione di prodotti/servizi a pagamento. DPA: ruolo da responsabile previsto per Pro/Enterprise; dati di contatto e dati generati dal servizio hanno disciplina da titolare nei casi indicati. | **Idoneità del lancio ancora da chiarire.** Dato che gli annunci presentano noleggi a pagamento, l'assenza di incasso/commissione non dimostra la compatibilità con Hobby. Questa è una valutazione prudente sul caso, non una risposta ricevuta da Vercel. Non dedurre che tutti i dati tecnici richiedano il DPA Pro, né che Hobby copra tutti i trattamenti. Serve riscontro specifico oppure una scelta gratuita compatibile autorizzata; nessun upgrade o cambio hosting. |
| Servizi push dei browser | L'app prevede payload generici senza testo della chat e revoca. Il fornitore dipende dal dispositivo; non si assegna un nome unico per tutti. | Test reali, flusso di revoca e destinatari tecnici ancora da documentare. Nessuna consegna dichiarata da test simulati. |

## I tre nodi da risolvere

### Aggiornamento dopo accesso IONOS e scelta del gestore

Il 2 novembre è stato verificato direttamente il pannello IONOS: contratto **IONOS Pack Dominio**, attivo dal **31 ottobre 2026**, con dominio aggiuntivo `rent-to-a-friend.it`. `assistenza@rent-to-a-friend.it` inoltra a `assistenza.rtaf@gmail.com`; `info@rent-to-a-friend.it` inoltra a `info.rent.to.a.friend@gmail.com`. Sono inoltri, non caselle complete. Nella selezione dei prodotti erano visibili inoltro gratuito e Mail Business con **Ordina**, senza un'opzione Mail Basic inclusa. Il dettaglio del contratto ha restituito un errore anche dopo una ricarica: non si certifica quindi l'assenza di ogni ulteriore diritto contrattuale. Non sono stati registrati qui identificativi cliente, numeri di contratto, indirizzi privati o pagamenti.

Il gestore conferma di non avere un'altra casella oltre Gmail e sceglie di **preparare Cloudflare gratuito**. `CLOUDFLARE_PREPARATION.md` descrive il build pronto, prove e passaggio futuro: nessun progetto Pages, migrazione o DNS modificato. Le indicazioni precedenti di questo documento su verifiche non ancora effettuate vanno lette con questo aggiornamento.

**Alternativa email gratuita individuata, non attivata:** Proton Mail dichiara che il DPA si applica anche al piano Free; il testo contrattuale lo collega all'uso del servizio da parte di un'attività/organizzazione indipendentemente dalla forma giuridica. Il piano Free offre un indirizzo Proton, 500 MB iniziali espandibili fino a 1 GB secondo la checklist, 150 email/giorno e non supporta un dominio personalizzato per inviare come `assistenza@rent-to-a-friend.it`. Si può valutare la ricezione tramite l'inoltro IONOS e la risposta dall'indirizzo Proton, già coerente con la scelta del gestore di rispondere da un indirizzo diverso. Questo percorso non elimina IONOS: la disciplina dell'inoltro va comunque documentata. Nessun account Proton creato, termini accettati, inoltro cambiato, email inviata o posta cancellata. La creazione delle credenziali e l'accettazione devono avvenire da parte del titolare; non usare registrazioni automatizzate vietate dai termini Proton. Servono poi prova di ricezione/risposta e gestione delle copie già su Gmail prima di togliere Google dall'elenco dei fornitori. Non attestare la conformità dell'intero canale solo perché esiste il DPA.

Fonti Proton: https://proton.me/support/is-proton-mail-gdpr-compliant ; https://proton.me/legal/dpa (10 febbraio 2026); https://proton.me/mail/pricing ; https://proton.me/support/get-started-mail ; https://proton.me/support/custom-domain ; https://proton.me/legal/terms .

La verifica del recapito e la valutazione motivata delle durate sono in `CONTACT_RETENTION_REVIEW.md`. Il gestore non ha autorizzato la pubblicazione di casa propria e ha accettato le durate in modo condizionato; nessun flag di conformità è stato forzato.

1. **Assistenza:** verificare il prodotto IONOS già acquistato e se include una casella effettiva, senza ordinare servizi. Se si sceglie di cambiare destinazione, provarla prima, aggiornare i testi e valutare le copie di posta già esistenti; non cancellare posta per prova.
2. **Hosting:** richiedere un riscontro sul modello preciso a Vercel o decidere una soluzione gratuita compatibile. Il proprietario ha già scelto di non pagare: questa revisione non riapre quella decisione né avvia migrazioni.
3. **Dati del gestore e criteri operativi:** completare il recapito pertinente e la valutazione della conservazione. Non ricavare l'indirizzo di casa dalla posta, dai contratti o da altre fonti per pubblicarlo senza istruzione specifica.

## Come controllare IONOS senza acquisti

Dal proprio account: Menu → Il mio account → Contratti & abbonamenti → contratto di `rent-to-a-friend.it`. Nelle schede Dettagli e Servizi del contratto verificare data, prodotto e caselle incluse. Basta comunicare il nome del prodotto e se è disponibile una casella già inclusa: non servono password, numeri cliente, indirizzi privati o dati di pagamento. Non selezionare Ordina, upgrade o nuovi abbonamenti.

## Limiti ed evidenze

Una ricerca mirata nella casella Gmail collegata al dominio e ai mittenti IONOS non ha trovato riscontri contrattuali. Non sono state lette email estranee, inviate richieste ai fornitori, sottoscritte condizioni o acquistati servizi. Le configurazioni dichiarate dal proprietario restano distinte dagli account verificabili tramite collegamenti tecnici.

La lista subfornitori non dimostra che ogni soggetto riceva ogni dato. L'app non invia chat o foto a modelli generativi; i controlli automatizzati di sicurezza dei fornitori sono distinti da questa dichiarazione. La registrazione in un piano gratuito non elimina obblighi o vincoli contrattuali, ma non implica automaticamente che sia obbligatorio pagare.

`providersReviewed=false` resta motivato dai nodi sopra. Supabase/Resend/Cloudflare hanno documentazione standard individuata: non sono tre nuovi contratti da far acquistare al gestore. Nessuna falsa attestazione di conformità o apertura al pubblico.

## Fonti ufficiali ricontrollate

- Supabase DPA: https://supabase.com/legal/customer-resources/data-processing-addendum
- Supabase subfornitori: https://supabase.com/legal/customer-resources/subprocessor-list
- Resend GDPR, durata, accordo e ruoli: https://resend.com/security/gdpr
- Resend DPA: https://resend.com/legal/dpa
- Resend subfornitori: https://resend.com/legal/subprocessors
- Cloudflare DPA: https://www.cloudflare.com/cloudflare-customer-dpa/
- Cloudflare privacy Turnstile: https://www.cloudflare.com/turnstile-privacy-policy/
- IONOS accordi: https://www.ionos.it/aiuto/protezione-dei-dati/informazioni-generali-sullordinanza-di-base-sulla-protezione-dei-dati-oderr/contratto-per-il-trattamento-dei-dati/
- IONOS condizioni generali: https://www.ionos.it/terms-gtc/condizioni-generali-per-litalia/
- IONOS informazioni contratto: https://www.ionos.it/aiuto/mein-konto/rund-um-meinen-vertrag/informazioni-contrattuali-e-condizioni-generali-per-i-contratti-ionos/
- Google Gmail consumer: https://support.google.com/policies/answer/9581826?hl=it
- Vercel DPA: https://vercel.com/legal/dpa
- Vercel Fair Use: https://vercel.com/docs/limits/fair-use-guidelines
