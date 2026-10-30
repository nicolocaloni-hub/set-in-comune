# Prima del lancio

## Disponibile nella demo 0.3

- Un unico account logico per cercare e mettere a noleggio; profili di esempio dichiarati come demo.
- Profilo pubblico apribile da annuncio, richiesta e chat: nome, quartiere, foto e bio facoltative, attrezzature condivise.
- Foto profilo modificabile o rimovibile, bio modificabile; email non presente nel profilo pubblico.
- Foto compresse nel browser, anteprime, copertina, rimozione dalla selezione e galleria annuncio.
- Creazione/modifica/messa in pausa degli annunci; importi delle richieste già inviate conservati.
- Prenotazioni filtrabili per ruolo e stato; richiesta, accettazione simulata, consegna/restituzione, registro e chat.
- Errori di spazio locale espliciti, controlli importi/date, prevenzione richieste duplicate.

## Predisposto nel codice, da collegare e verificare

Il database di questa app non è ancora creato/collegato. Non usare il database di altri progetti. Prima di crearlo, scegliere l'organizzazione e verificare che il costo proposto sia zero. Il file SQL iniziale è per un progetto nuovo: non eseguirlo su un database con dati o tabelle omonime.

- Supabase Auth email/password, conferma indirizzo, recupero password, profili condivisi e upload.
- Indicatore pubblico di email confermata derivato solo da Auth, non modificabile dal profilo. Non verifica identità personale, documento, proprietà dell'attrezzatura o affidabilità.
- RLS su dati e storage, foto pubbliche per annunci/profili e foto private per riscontri del noleggio.
- Modifica degli annunci limitata al proprietario e ai campi consentiti, con accordi già creati immutati.
- Cancellazione dei nuovi upload non associati dopo un errore; pulizia periodica di avatar/foto sostituiti e retention ancora da definire.

## Necessario prima di invitare utenti reali

1. Progetto gratuito separato in UE, Auth con conferma email e SMTP dedicato (anche con eventuale quota gratuita da verificare). Configurazione redirect sul dominio corretto.
2. Prove A/B/C su browser indipendenti: B non può vedere chat e riscontri A/C, modificare profilo/annunci di A o marcare la propria email come confermata.
3. Prove prenotazioni simultanee, modifica annuncio mentre arrivano richieste, upload falliti, sessioni scadute, logout e recupero password.
4. Contatti e procedure del gestore per assistenza, segnalazioni, moderazione e abusi; meccanismi di blocco utenti/segnalazione da implementare.
5. Privacy, termini, tempi di conservazione, cancellazione/esportazione dati e regole in caso di mancata consegna o danni. La schermata attuale non sostituisce documenti definitivi.
6. Accessibilità e prove sui telefoni reali; paginazione del catalogo e della chat prima di volumi elevati.
7. Valutazione dell'idoneità di Vercel Hobby alla natura del pilota; nessun piano a pagamento senza richiesta esplicita del proprietario.

## Dopo il pilota

Misurare spazio, banda e uso; confrontare le soglie in COSTI.md. Valutare recensioni legate a noleggi conclusi, notifiche email, controllo identità e pagamenti integrati soltanto con processi e costi definiti. Un profilo completo è un elemento utile per decidere, non una garanzia.

## Sicurezza 0.3

Consultare `SECURITY_AUDIT.md`: PKCE, sessione per scheda, validazione delle chiavi pubbliche, build con asset consentiti, policy e limiti server sono verificati localmente. Restano prove e configurazione su Supabase/Vercel reali. Nessuna garanzia di sicurezza assoluta.
