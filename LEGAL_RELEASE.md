# Aggiornamento condizioni e leggibilità · 3 novembre 2026

Versione `2026-11-03-1`, richiesta dal gestore: titoletti riconoscibili nella finestra di accettazione, obblighi di custodia dell’utilizzatore, controlli del proprietario e chiarimento del ruolo della piattaforma. Il testo non introduce un esonero generale del gestore né una manleva per sue condotte: conserva espressamente responsabilità per fatti od omissioni imputabili al gestore, dolo, colpa grave, obblighi di ordine pubblico e altri diritti inderogabili. La responsabilità per perdita o deterioramento è descritta con la prova della causa non imputabile e il normale uso conforme, senza addebiti o attribuzioni automatiche della piattaforma.

Gli snapshot nuovi mantengono marcatori di intestazione testuali inclusi nelle impronte; il frontend li rende come titoli semantici in grassetto ed esegue escaping integrale di ogni testo. Nessun HTML fornito dal server viene eseguito. La versione precedente resta archiviata e immutabile; ogni accettazione è ancora personale e legata a versione e impronte. Nessuna ricevuta viene trasferita alla nuova versione.

Verifica locale: 145 test superati, compresi escaping delle intestazioni, clausole di custodia e responsabilità inderogabili, integrità degli snapshot, invalidazione delle vecchie accettazioni e controlli di pubblicazione. La prova Android inviata dal gestore mostra registrazione e profilo riusciti; il database conferma l’indirizzo del nuovo account verificato. Questo non attesta ancora recupero password, noleggio tra due controparti o cancellazione self-service.

Riferimenti primari consultati: Codice civile, artt. 1229, 1341, 1587, 1588 e 1590; documentazione normativa del Ministero dell’Economia e delle Finanze e testo ufficiale del Codice civile. Nessuna attestazione di efficacia universale o approvazione legale viene dedotta dal solo testo pubblicato.

## Storico dei rilasci

# Attivazione dei documenti e delle ricevute

## Rilascio autorizzato · 2 novembre 2026

Il gestore ha richiesto esplicitamente e definitivamente: (1) attivazione dei documenti nel database con ricevute di accettazione, (2) collegamento del dominio pubblico al database reale. La versione autorizzata è `2026-11-02-7`. Nessuna ricevuta viene inserita per conto degli utenti: ogni persona deve leggere e scegliere le tre caselle nel proprio account confermato.

Il controllo di build ora verifica l’approvazione esplicita della pubblicazione, l’identità e il contatto del titolare, i criteri manuali di conservazione e l’eventuale recapito richiesto. L’autorizzazione al rilascio resta distinta dai vecchi flag che mescolavano l’approvazione editoriale con tutte le evidenze di audit. Le voci non verificate dei fornitori e la qualificazione del recapito non sono convertite in attestazioni positive; nessun indirizzo viene inventato. I criteri pubblici non promettono una pulizia automatica generale.

Le istruzioni storiche sotto documentano la preparazione precedente. Questa autorizzazione supera il precedente blocco generico sulla pubblicazione; restano attivi conferma email, RLS, controlli server sulle nuove attività, isolamento delle chat, limiti di frequenza e accettazione personale della versione corrente. Google e Turnstile restano rimandati per scelta del gestore. Nessun piano viene acquistato.

Il collaudo completo fra due controparti reali rimane un passaggio successivo, distinto dall’attivazione di documenti e configurazione. Login, modifica profilo ed esportazione Android già provati non equivalgono a quel collaudo.

## Storico della preparazione

# Attivazione dei documenti e delle ricevute RC2

## Aggiornamento operativo · 2 novembre 2026

Lo stato corrente è in [ACTIVATION_STATUS.md](ACTIVATION_STATUS.md). Ricevute installate sul progetto Supabase dedicato con migrazione `20261102000639`; account gestore configurato; smoke test remoti ricevute e A/B/C superati con rollback delle fixture. I riferimenti sotto a SQL soltanto locale o non applicato sono lo storico della preparazione. Non sono stati pubblicati documenti definitivi né attivato il frontend per utenti reali. Il codice Turnstile e la Site Key sono ora configurati; restano attivazione server/prova reale, accesso all’anteprima, verifiche documentali e recupero dati. Vedere LAUNCH_PLAN.md per lo stato corrente.


## Stato storico RC2 (precedente all’applicazione remota)

Preparazione locale e ramo GitHub di lancio; nessuna applicazione al progetto remoto, nessun documento attivato, nessuna cancellazione periodica e nessun utente abilitato da questo pacchetto. Il sito pubblico resta demo. Le durate di conservazione proposte sono distinguibili dalle funzioni già operative.

Il proprietario ha autorizzato il lavoro e scelto i piani gratuiti; non serve una nuova autorizzazione generica per completare i preparativi. Non si devono inventare dati, dichiarare applicabile un accordo non verificato o marcare revisioni come concluse per eliminare un errore di build.

## Componenti

- `src/privacy.js`: informativa e condizioni aderenti allo stato demo/collegato; verifica esplicita dei recapiti, senza imporre automaticamente l’indirizzo di casa.
- `src/service-policy.js`: versione RC2, regole di annullamenti/danni, moderazione/riesame e accettazione; `approved=false`.
- `src/retention.js`: matrice di proposta con motivazioni in `PRIVACY_OPERATIONS.md`; `approved=false`.
- `supabase/launch/legal_acceptance.sql`: due tabelle private con RLS e nessun accesso diretto ai client; wrapper RPC invoker e funzioni privilegiate in private con verifica dell’utente confermato.
- API e UI: documenti letti come snapshot testuali dal server, caselle separate e non preselezionate, ricevuta con account della sessione e data server, versioni e impronte SHA-256. Nessun dato di identità, timestamp, IP o user agent scelto dal client.
- Nuove attività: controllo server su inserimento di annunci, richieste, messaggi, recensioni e foto profilo/annunci; controllo su modifica di annunci attivi e accettazione di richieste. Metadati utente e sola UI non bastano a ottenere un’accettazione.
- Rapporti esistenti: lettura, ritiro dell’annuncio, rettifica del profilo e messaggi per noleggi già accettati/in ritiro o restituzione restano disponibili; i diritti e la cancellazione non sono subordinati alla nuova accettazione.
- Correzione necessaria alla rettifica: validazione avatar invoker senza accesso alla quota parametrica; trigger separato con azione/limite fissi e verifica del proprietario, non una concessione di esecuzione della funzione generica ai client.

## Preparare i testi per la revisione

```
npm test
npm run build
npm run security:scan
npm run legal:prepare
```

Il generatore crea `legal-review/condizioni.txt`, `privacy.txt` e `release-candidate.json`. Le impronte descrivono esattamente i byte UTF-8 dei testi; il database le ricalcola al momento della pubblicazione. Le copie sono una proposta e riportano le verifiche incompiute: non si inviano ai clienti come documenti definitivi.

## Condizioni da chiudere prima di pubblicare

1. Verificare dati del titolare e requisiti di contatto del servizio: completare `contactReviewComplete` e la decisione motivata `postalAddressRequired`, più l’eventuale recapito pertinente.
2. Completare `PROVIDERS_REVIEW.md` sugli account effettivi, inclusi assistenza IONOS/Gmail, ruoli/accordi Vercel Hobby, trasferimenti e log. La scelta del piano non è una verifica del suo DPA.
3. Revisionare finalità, basi, bilanciamento degli interessi, calendario e gestione delle eccezioni. Attuare almeno una procedura manuale verificata coerente con i termini pubblicati; non promettere job inesistenti.
4. Qualificare gli obblighi applicabili del gestore/marketplace e del DSA. Prima di promettere sospensioni e riesami provare accesso operatore, intervento manuale e comunicazione effettiva delle decisioni.
5. Aggiornare i testi in modo che non contengano più avvisi di verifica incompiuta. Solo dopo riscontri reali impostare le revisioni complete; usare una versione definitiva nuova, non la RC2 come se fosse approvata automaticamente.

## Preparazione SQL e pubblicazione

La CLI Supabase non è disponibile in questo ambiente e il proprietario vieta installazioni. Non è stato inventato un filename di migrazione datato e non è stato applicato DDL remoto. Nel contesto di rilascio con CLI già disponibile:

1. Creare una migrazione con `supabase migration new legal_acceptance`, inserendo il contenuto preparato e revisionato di `supabase/launch/legal_acceptance.sql` dopo le migrazioni esistenti. Verificare la corrispondenza dello schema e gli advisors prima/dopo l’applicazione.
2. Applicare in un contesto di prova adeguato. Lo script non pubblica documenti: in assenza di versione attiva le nuove attività sono bloccate. Non applicarlo su un servizio con utenti operativi senza pianificare schema, pubblicazione e frontend insieme.
3. Dopo la revisione effettiva, `node scripts/prepare-legal-release.mjs --publish-sql` genera l’SQL di pubblicazione. Senza i prerequisiti fallisce; non esegue richieste di rete e non applica SQL. Controllare versione, testi e impronte del file appena generato.
4. Pubblicare gli snapshot con lo stesso rilascio del frontend. Una versione pubblicata è immutabile: per cambiarla si crea una nuova versione e si disattiva la precedente nella stessa transazione. I testi archiviati non vengono cancellati; non contengono dati degli utenti.
5. Provare dalla UI collegata conferma email → lettura → caselle → ricevuta → annuncio; provare anche mancata accettazione, versione cambiata e richieste REST/RPC dirette.
6. Verificare esportazione con ricevuta e cancellazione del solo account di prova. La FK elimina le ricevute alla cancellazione Auth; una controversia effettiva richiede decisione specifica sui dati da conservare prima dell’eliminazione.

Non sono necessarie service key nel browser, nuovi abbonamenti o email automatiche aggiuntive. Non disattivare la privacy per far passare il build.

## Compatibilità CAPTCHA

La PR #1 è separata. Integrare le differenze con revisione esplicita di app.js, api.js, privacy.js, assets/build e worker di cancellazione; non sostituire i file del ramo CAPTCHA con questi o viceversa. Il widget va attivato nell’ordine già documentato nella PR #1.

## Esiti

114 test superati, build demo riuscito, scansione credenziali senza rilievi. Pubblicazione di documenti non revisionati verificata in errore.

Test di isolamento ricevute, negazione anonimi/non confermati, scelta esplicita, hash/versione obsoleti, immutabilità, idempotenza/data server, blocco di nuove attività via REST/RPC e preservazione dei rapporti in corso superati localmente con PostgreSQL PGlite. Le prove su account e browser reali del nuovo flusso restano necessarie prima dell’apertura. Nessun risultato locale viene presentato come migrazione o collaudo remoto già avvenuto.
