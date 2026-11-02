# Google e confine visitatore · 2 novembre 2026

## Decisione del gestore · aggiornamento 2 novembre 2026

Accesso Google rimandato esplicitamente a una fase successiva. Non completare né attivare il provider durante questo lancio; usare email e password. La configurazione Google Cloud avviata dal gestore non dimostra che esista un client collegato al servizio Auth. I passaggi sotto restano documentazione per una futura ripresa, non attività necessarie al lancio attuale.

## Stato

Collegamento client OAuth Google predisposto, non attivato e non collaudato con un account Google reale. L'endpoint pubblico Auth settings del progetto dedicato risponde `external.google=false`; email/password è abilitato e la conferma email è richiesta. Nessun nuovo accesso Google Cloud, segreto, piano o consenso è stato creato.

La schermata mostra il pulsante Continua con Google solo se il provider è attivo, il servizio è collegato e l'origine è quella del callback canonico. La preview riservata del proprietario continua a usare solo account esistenti e password; non avvia OAuth su un'origine diversa dal callback. Registrazione, recupero e operazioni marketplace rimangono soggetti ai blocchi già presenti.

## Configurazione da completare

1. Nel progetto Google Cloud del gestore, configurare Google Auth Platform: nome RENT TO A FRIEND, pubblico, contatto di assistenza e domini del servizio. Aggiungere solo gli scope `openid`, `email`, `profile` (le voci Google email/profile corrispondenti). Non chiedere Gmail, Drive, Calendar o accesso offline.
2. Creare un client OAuth di tipo applicazione web. Origine applicazione: `https://rent-to-a-friend.it`. Redirect autorizzato Google: `https://srjdysdhxnafjrutufmk.supabase.co/auth/v1/callback`.
3. Inserire Client ID e Client Secret nel provider Google del progetto Supabase `srjdysdhxnafjrutufmk`. Il segreto resta sul servizio Auth: mai nel frontend, repository, chat o documentazione. Abilitare il provider solo dopo avere configurato la schermata di consenso e gli eventuali utenti di test.
4. Verificare il redirect finale Auth esatto `https://rent-to-a-friend.it/`, senza wildcard. Il dominio pubblico è ancora demo: prima del collaudo Google deve esserci un frontend collegato sul callback canonico, oppure un ambiente di collaudo con callback fisso dedicato, configurato e autorizzato separatamente. Non derivare il callback da parametri o URL arbitrari.
5. Aggiornare i controlli effettivi sui fornitori/privacy per l'aggiunta di Google e svolgere il primo login con scelta e consenso dell'utente. Nessun controllo viene segnato come approvato da questa modifica del codice.
6. Provare: rifiuto del consenso; primo accesso; ritorno da Google nello stesso browser; accesso successivo; email già verificata presente nel servizio; logout. Verificare che non siano richiesti permessi aggiuntivi e che non si registri automaticamente un'accettazione delle condizioni.

Fonti ufficiali: https://supabase.com/docs/guides/auth/social-sign-in/auth-google e https://supabase.com/docs/guides/auth/auth-identity-linking .

## Comportamento dell'app

Accedi con email chiama esclusivamente il servizio password, senza tentare una registrazione. Registrati con email ha titolo, azione e campi separati; chiede di ripetere l'email e richiede il link di conferma. Un refuso in una registrazione può comunque corrispondere a un indirizzo diverso: il sistema non può dedurre quello desiderato. Nessuna interrogazione pubblica rivela se un'email è registrata.

Continua con Google dichiara che il primo accesso può creare un profilo; il collegamento delle identità con la stessa email verificata è gestito da Auth. Il client usa PKCE e il callback fisso, non conserva i token di accesso Google e non accetta token implicit nell'URL.

I visitatori possono vedere informazioni degli annunci, prezzi, profili e recensioni. Il dettaglio non presenta il modulo di prenotazione né il compositore dei messaggi; offre Accedi e Registrati. API client e permessi server bloccano comunque la scrittura senza autenticazione. Controllo remoto: anon non può eseguire request_booking né inserire in messages o inquiry_messages.
