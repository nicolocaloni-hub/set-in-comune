# Prova reale di upload · 2 novembre 2026

Richiesta del gestore: caricare contenuti sintetici, verificarli ed eliminarli. Il backup è stato successivamente rinviato dal gestore; non costituisce più un'attività richiesta per il primo avvio. Nessun backup viene dichiarato esistente.

## Ambiente e preparazione

Supabase dedicato `srjdysdhxnafjrutufmk`, progetto sano e bucket app verificati: JPEG, 512.000 byte massimi; avatar/annunci pubblici, riscontri privati. Nessun documento legale definitivo attivo. La demo pubblica e i relativi blocchi non sono stati modificati.

Sono stati creati tre account tecnici temporanei con indirizzi sintetici non recapitabili, un annuncio inattivo e un rapporto di noleggio esclusivamente fittizio. Il rapporto è stato predisposto direttamente dal contesto operatore come fixture preesistente, senza alterare policy o definizioni di trigger; il normale flusso di prenotazione e l'accettazione dei documenti non sono attestati da questa preparazione. Nessuna email o push a persone reali.

Il client di prova ha importato una copia isolata di `src/api.js` con il solo URL e la chiave pubblica del progetto. Ha usato login Auth reale e un JPEG sintetico, senza service key. Password e token non sono inclusi in questo rapporto o nel repository.

## Esito: upload bloccato, non collaudo superato

- Login dell'account tecnico riuscito.
- Nuova foto pubblica respinta prima della pubblicazione dei documenti: comportamento atteso.
- Upload di riscontro privato respinto con HTTP 500, `DatabaseError`, SQLSTATE `P0001`.
- Log PostgreSQL riferiti al tentativo: `private.limit_uploads()` chiama `private.enforce_rate_limit(...)`, che solleva “Accedi con una email confermata per continuare.” La scrittura finale dei metadati è eseguita dalla connessione `supabase_storage_admin` del servizio Storage, priva dell'identità JWT dell'utente.
- La stessa inserzione simulata in una transazione SQL con JWT dell'utente confermato e accesso al noleggio riesce ed è stata annullata con rollback. Questa differenza spiega perché i precedenti test SQL non rilevavano il problema dell'upload HTTP fisico.

Non sono dichiarati superati lettura/scaricamento del file, accesso delle controparti, cancellazione via Storage API, flusso completo UI o telefoni. Il caricamento non ha completato la registrazione di un oggetto; la verifica finale non rileva oggetti Storage appartenenti alle fixture. Non è un controllo del contenuto interno del provider S3.

## Correzione pronta per revisione, non applicata

`supabase/launch/storage_upload_actor.sql` modifica solo la funzione applicativa delle quote, con controllo dell'impronta del corpo precedente per non sovrascrivere cambiamenti concorrenti. Quando manca `auth.uid()`, ricava l'autore da `owner_id` soltanto se la connessione è esattamente `supabase_storage_admin`; il proprietario deve essere un account confermato e aperto e deve coincidere con la cartella del file. Un client ordinario non può selezionare questo percorso cambiando una claim o `owner_id`.

Restano limiti di 30 upload/ora, 200 file per utente e 1.500 globali, lock per le quote, RLS e blocco legale delle nuove attività. Nessun EXECUTE diretto della funzione è concesso ad anon/authenticated. Non vengono modificati chiavi, bucket, pubblico/privato, policy o controlli Auth.

Sette nuove verifiche locali coprono scrittura interna senza JWT, proprietà contraffatta, percorso privilegiato non selezionabile dal client, account non confermati/in chiusura e limiti orari/per utente/globali. Suite completa: **132 test superati**; scansione dei pattern noti di credenziali senza rilievi; diff check superato.

Il tentativo `apply_migration` è stato **respinto dal controllo automatico**, perché modifica persistentemente una funzione di sicurezza/quota in produzione e l'autorizzazione ai test non è stata considerata sufficiente per tale correzione. Nessun tentativo alternativo tramite SQL o altro canale. Serve approvazione esplicita della correzione prima di richiederne di nuovo l'applicazione. La funzione remota mantiene l'impronta precedente `c7d0646f3c419d05f4841404317d9961` (MD5 usato come confronto di integrità, non come protezione crittografica).

## Pulizia verificata

La pulizia ha controllato UUID e indirizzi sintetici, proprietà e stato inattivo dell'annuncio e corrispondenza del rapporto fittizio prima delle eliminazioni. Nessuna riga Storage è stata eliminata via SQL. Dopo la pulizia risultano **zero** account Auth, profili, identità, sessioni, annunci, prenotazioni e oggetti Storage riferiti alle fixture. Nessun documento legale è stato attivato e la funzione delle quote è invariata. I normali log tecnici del provider non vengono cancellati né presentati come dati di utenti reali.

La prima richiesta di pulizia è scaduta senza esecuzione; la richiesta successiva, più circoscritta e con controlli degli identificativi, è riuscita ed è stata verificata. Questa pulizia autorizzata dei dati sintetici è distinta dalla migrazione respinta.

## Ripresa dopo l'approvazione

Ricontrollare funzione e progetto, applicare la sola correzione revisionata, verificare advisors e migrazione, creare fixture nuove e ripetere upload reale, download con confronto dei byte, isolamento del terzo account, rifiuto di eliminazione altrui ed eliminazione autorizzata via Storage API. Verificare infine l'assenza dei residui prima di considerare il collaudo superato. Non pubblicare documenti fittizi né aprire gli account reali per far passare le prove.

Fonte primaria sulla proprietà Storage: https://supabase.com/docs/guides/storage/security/ownership . Il comportamento specifico della scrittura finale qui descritto è riscontrato nei log del progetto, non dedotto dalla sola documentazione.
