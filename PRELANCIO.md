# Prima del lancio

## Disponibile nella demo 0.6

- Un unico account logico per cercare e mettere a noleggio; profili di esempio dichiarati come demo.
- Profilo pubblico apribile da annuncio, richiesta e chat: nome, quartiere, foto e bio facoltative, attrezzature condivise.
- Foto profilo modificabile o rimovibile, bio modificabile; email non presente nel profilo pubblico.
- Foto compresse nel browser, anteprime, copertina, rimozione dalla selezione e galleria annuncio.
- Creazione/modifica/messa in pausa degli annunci; importi delle richieste già inviate conservati.
- Prenotazioni filtrabili per ruolo e stato; richiesta, accettazione simulata, consegna/restituzione, registro e chat.
- Errori di spazio locale espliciti, controlli importi/date, prevenzione richieste duplicate.

## Predisposto nel codice, da collegare e verificare

Il progetto dedicato gratuito `set-in-comune` è creato e contiene lo schema iniziale, ma non è ancora collegato al sito pubblico. Le migrazioni notifiche, il server di invio e lo scheduler sono attivi; il sito pubblico resta in demo in attesa della configurazione Auth/email e delle prove sui telefoni. Non usare il database Smartset e non creare un duplicato del progetto. Il file SQL iniziale è per un progetto nuovo: non eseguirlo su un database con dati o tabelle omonime.

- Supabase Auth email/password, conferma indirizzo, recupero password, profili condivisi e upload.
- Indicatore pubblico di email confermata derivato solo da Auth, non modificabile dal profilo. Non verifica identità personale, documento, proprietà dell'attrezzatura o affidabilità.
- RLS su dati e storage, foto pubbliche per annunci/profili e foto private per riscontri del noleggio.
- Modifica degli annunci limitata al proprietario e ai campi consentiti, con accordi già creati immutati.
- Cancellazione dei nuovi upload non associati dopo un errore; pulizia periodica di avatar/foto sostituiti e retention ancora da definire.

## Necessario prima di invitare utenti reali

1. Progetto gratuito separato in UE, Auth con conferma email e SMTP dedicato (anche con eventuale quota gratuita da verificare). Configurazione redirect sul dominio corretto.
2. Prove A/B/C su browser indipendenti: B non può vedere chat e riscontri A/C, modificare profilo/annunci di A o marcare la propria email come confermata.
3. Prove prenotazioni simultanee, modifica annuncio mentre arrivano richieste, upload falliti, sessioni scadute, logout e recupero password.
4. Contatti e procedure del gestore per assistenza, segnalazioni, moderazione e abusi; blocchi e segnalazioni implementati; assegnare l’account del gestore a private.app_moderators e verificare il processo di risposta.
5. Privacy, termini, tempi di conservazione, cancellazione/esportazione dati e regole in caso di mancata consegna o danni. La schermata attuale non sostituisce documenti definitivi.
6. Accessibilità e prove sui telefoni reali; paginazione del catalogo e della chat prima di volumi elevati.
7. Valutazione dell'idoneità di Vercel Hobby alla natura del pilota; nessun piano a pagamento senza richiesta esplicita del proprietario.

## Dopo il pilota

Misurare spazio, banda e uso; confrontare le soglie in COSTI.md. Le recensioni per noleggi conclusi sono implementate. Valutare controllo identità e pagamenti integrati soltanto con processi e costi definiti. Le email restano limitate a conferma indirizzo e recupero password. Un profilo completo è un elemento utile per decidere, non una garanzia.

## Sicurezza 0.3

Consultare `SECURITY_AUDIT.md`: PKCE, sessione per scheda, validazione delle chiavi pubbliche, build con asset consentiti, policy e limiti server sono verificati localmente. Restano prove e configurazione su Supabase/Vercel reali. Nessuna garanzia di sicurezza assoluta.

## Notifiche 0.4

Funzioni implementate e testate localmente; migrazioni e servizio di invio attivati dopo la conferma del proprietario. Le verifiche sul database reale e sul webhook autenticato sono passate; il frontend resta in demo in attesa di Auth/email e delle prove sui dispositivi. Vedere `PUSH_SETUP.md`. Nessuna push reale è dichiarata operativa prima di un test con account e dispositivi distinti.

## Privacy e diritti · release 0.7

Pagine Privacy, Condizioni e I tuoi dati aggiunte; esportazione JSON, richiesta di cancellazione senza motivazione, coda operatore con termine di riscontro, pulizia dei propri upload inutilizzati. Vecchie foto profilo/annuncio eliminate via Storage API dopo il salvataggio; errore recuperabile da I tuoi dati. Il build collegato al backend è bloccato finché titolare e conservazione non sono definiti e revisionati in `src/privacy.js`. La richiesta di cancellazione non elimina automaticamente un account: il gestore deve applicare e verificare la procedura in `PRIVACY_VIDEO_AUDIT.md`. La migrazione `20261031141946_privacy_rights_and_upload_cleanup.sql` è stata applicata al progetto dedicato; smoke test remoto superato con rollback di tutte le fixture. I test tra account e dispositivi reali rimangono da eseguire dopo il completamento Auth/SMTP e dei documenti. Nessun abbonamento attivato.

## Cancellazione account e titolare · release 0.8

Nicolò Caloni confermato come titolare; contatto rent.to.a.friend@gmail.com. Recapito rinviato dal proprietario a prima del lancio. Cancellazione automatica predisposta per account senza noleggi, conversazioni, segnalazioni o ruoli operatore, con verifica password, chiusura accessi, eliminazione file via Storage API, cancellazione Auth e retry. Gli altri casi passano alla verifica del gestore con motivo visibile. Matrice di conservazione pubblicata come bozza, non approvata; non sono attivi job di eliminazione periodica generale. Vedere `LEGAL_SETUP.md` per limiti, riscontro DPA dei fornitori e blocco da risolvere sull’hosting Hobby. Migrazione automatic_account_erasure applicata, worker account-erasure attivo e retry ogni cinque minuti configurato. Smoke test remoto superato con rollback di tutte le fixture; endpoint respinge accessi non autorizzati. Non è stata cancellata alcuna utenza reale tramite Auth admin.


## Secondo video · cookie, pagamenti e badge

Verificati i sette punti del nuovo video di 48,85 secondi in `PRIVACY_VIDEO_AUDIT.md`. Pagina Cookie e memoria accessibile da footer e I tuoi dati, inventario della memoria locale e controlli sul tracciamento in build; pulizia PKCE scaduto anche senza callback. Più trasparenza su segnali profilo, recensioni e ordinamento. Nessun tracker facoltativo, consenso pubblicitario, Stripe o sistema di addebito introdotto. Le condizioni definitive, la scelta privati/professionisti e la prova della relativa accettazione restano attività di pre-lancio. I blocchi di privacy e hosting restano aperti.
