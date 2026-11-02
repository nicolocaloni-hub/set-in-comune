# Prova reale di upload · 2 novembre 2026

## Esito effettivo

Correzione applicata al progetto Supabase dedicato `srjdysdhxnafjrutufmk` con migrazione **20261102115131**, `storage_upload_actor_quota`, dopo l'autorizzazione esplicita del gestore. Diciotto controlli HTTP reali tramite il codice dell'app superati; pulizia finale verificata. Rapporto senza credenziali in `supabase/launch/storage-http-result-2026-11-02.json`.

Il sito pubblico resta demo, nessun documento legale definitivo è stato attivato. Cloudflare resta in standby; Turnstile e backup restano rinviati per scelta del gestore. Questo collaudo riguarda il backend tramite API, non l'apertura del servizio o la prova su telefoni reali.

## Problema trovato e correzione

Il primo caricamento fisico falliva con HTTP 500/P0001: il controllo quote richiedeva `auth.uid()` anche nella scrittura finale dei metadati effettuata dalla connessione interna `supabase_storage_admin`, senza JWT utente. I precedenti test SQL con JWT simulato riuscivano e non coprivano questo passaggio del servizio Storage.

La sola funzione applicativa `private.limit_uploads()` ora ricava l'autore da `owner_id` quando manca il JWT e la connessione è esattamente `supabase_storage_admin`. Richiede account confermato/aperto e corrispondenza fra proprietario e cartella del file; un client ordinario non può selezionare il percorso interno modificando una claim o `owner_id`.

Restano quote fisse di 30 upload/ora, 200 file per utente e 1.500 globali, lock sulle quote, RLS e blocchi legali delle nuove attività. Nessun EXECUTE diretto concesso ad anon/authenticated. Nessuna modifica a chiavi, bucket, impostazioni pubblico/privato, policy o controlli Auth. L'impronta del corpo remoto coincide con quella del file revisionato: `52e0c35cd1fc78612cf7b54aa20d8efc` (MD5 per confronto di integrità, non protezione crittografica).

Il primo tentativo di migrazione era stato respinto dal controllo automatico per mancanza di autorizzazione specifica; nessun aggiramento. Dopo il consenso esplicito del gestore, lo stesso intervento revisionato è stato applicato tramite `apply_migration` e verificato.

## Preparazione della prova

Tre account tecnici con indirizzi sintetici non recapitabili, un annuncio inattivo e un rapporto di noleggio fittizio sono stati predisposti dal contesto operatore. Il rapporto rappresenta un noleggio preesistente: questa preparazione non collauda registrazione email, accettazione documenti o normale creazione della prenotazione. Nessun documento fittizio pubblicato e nessuna definizione di policy/trigger disattivata per il test HTTP.

Il client ha importato una copia isolata di `src/api.js`, configurata con URL e chiave pubblica del progetto. Ha usato login Auth reale e un JPEG sintetico di **1.610 byte**, senza service key. Password, token e URL firmati non sono nel repository o nel rapporto. Nessuna installazione o piano a pagamento.

## Prove riuscite sul backend reale

| Prova | Esito osservato |
|---|---|
| Accesso dei tre account tecnici | Login Auth riusciti |
| Nuova foto pubblica senza documenti definitivi | Respinta come previsto: il blocco di pre-lancio resta attivo |
| Upload JPEG privato del noleggio fittizio | Riuscito tramite Storage API |
| Download del proprietario e della controparte | HTTP 200, byte e SHA-256 uguali all'originale |
| Accesso pubblico al file privato | Negato |
| Terzo account: firma del file, lettura/scrittura chat | Negate; nessun messaggio privato visibile |
| Terzo account: tentativo di eliminazione | Nessun file rimosso; successivo download del proprietario ancora integro |
| Chat fra le parti | Messaggio sintetico salvato e letto dalla controparte |
| Esportazione dati del proprietario | Profilo del solo account di prova presente |
| Cancellazione autorizzata del JPEG temporaneo | Eseguita tramite Storage API; nessuna nuova firma ottenibile dopo la rimozione |
| Contatore quote | Un solo upload fisico conteggiato una volta, senza doppio conteggio della pre-verifica Storage |

La foto era temporanea e non agganciata a un verbale di ritiro/restituzione; non si attesta l'eliminabilità di prove ancora necessarie a un rapporto reale.

## Pulizia verificata

Dopo l'eliminazione via Storage API sono stati rimossi solo i dati fittizi, con controlli su UUID, indirizzi sintetici, proprietà e annuncio inattivo. Risultano **zero** account Auth, profili, identità, sessioni, annunci, prenotazioni, messaggi, notifiche e oggetti Storage delle fixture. Nessuna riga Storage è stata eliminata via SQL.

Nessuna email o push a persone reali. Credenziali e harness temporanei sono rimossi dal contesto locale dopo la verifica. I normali log tecnici del provider non sono cancellati e non sono presentati come dati di utenti reali. La conferma di pulizia scaduta senza esecuzione è stata riproposta in forma idempotente, circoscritta agli stessi identificativi, e la rimozione è stata verificata.

## Controlli locali e limiti

**132 test locali superati**, incluse sette regressioni su scrittura interna senza JWT, proprietà contraffatta, account non confermati/in chiusura, client senza accesso al percorso privilegiato e quote orarie/per utente/globali. Scansione dei pattern noti di credenziali e controllo delle differenze senza rilievi.

Gli advisors successivi alla migrazione mantengono gli undici INFO delle tabelle private prive di policy dirette e il precedente WARN sulla protezione da password compromesse disattivata. Nessun piano o protezione è stato cambiato per eliminare quell'avviso. Riferimenti: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

Restano da collaudare UI collegata, foto pubbliche dopo la pubblicazione dei documenti effettivi, registrazione/recovery nel nuovo flusso, registri di consegna, cancellazione account tramite interfaccia, ricezione push e Android/iPhone reali. Nessun backup o ripristino è stato eseguito. I risultati HTTP non sono presentati come prova completa del lancio.

Fonte primaria sulla proprietà Storage: https://supabase.com/docs/guides/storage/security/ownership . Il comportamento della scrittura interna è stato riscontrato nei log del progetto e riprodotto dal test HTTP.
