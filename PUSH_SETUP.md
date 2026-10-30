# Notifiche push e installazione web app — versione 0.4

## Funzioni implementate

- Manifest, icone Home e service worker per installare la web app su iPhone, Android e computer compatibili.
- Schermata Profilo → Notifiche con attivazione volontaria sul singolo dispositivo, preferenze per messaggi/richieste e disattivazione.
- Istruzioni iPhone: Safari → Condividi → Aggiungi alla schermata Home → aprire dall'icona → attivare notifiche. iOS 16.4 o successivo richiesto per Web Push.
- Contatori in navigazione e nelle conversazioni. Il cursore di lettura conserva i messaggi arrivati dopo quelli appena visualizzati.
- Invii Web Push cifrati e firmati con VAPID. Il testo della conversazione non viene incluso nelle notifiche sulla schermata di blocco.
- Coda persistente per dispositivo, retry con attesa progressiva, scadenza dopo 24 ore, rimozione degli endpoint che restituiscono 404/410.
- Il logout scollega il dispositivo e cancella il collegamento locale al profilo; le push rimaste per un altro account non vengono mostrate.
- Nessun prompt automatico al caricamento. La demo non registra dispositivi fittizi per le push reali.
- Offline: pagina informativa, senza salvare chat, token o profili nella cache del service worker.

Le email restano limitate a conferma indirizzo e recupero password. Non sono introdotte email per messaggi o prenotazioni.

## Stato dell'attivazione remota

Il 30 ottobre 2026 è stato creato il progetto Supabase gratuito `set-in-comune`, regione UE, riferimento `srjdysdhxnafjrutufmk`, nell'organizzazione scelta dal proprietario. Il preventivo restituito dal provider è 0 USD/mese. È installato lo schema iniziale, senza dati utente reali.

La migrazione `supabase/migrations/20261030174113_notifications.sql` è stata testata localmente ma non è stata applicata al progetto remoto: il provider ha restituito una conferma scaduta durante l'operazione. Prima dell'attivazione tra persone reali va completato quel passaggio. Non aggirare la conferma richiesta da Supabase.

Le push non sono attive tra utenti reali finché non sono completati migrazione, configurazione e verifiche sottostanti. Il sito resta in modalità demo e non mostra una falsa conferma di attivazione.

## Attivazione dopo la conferma

1. Applicare la migrazione notifiche al progetto dedicato già inizializzato. Non eseguire di nuovo `001_initial.sql` e non usare il progetto Smartset.
2. Abilitare `pg_net` e `pg_cron` sul progetto. La migrazione applicativa non abilita servizi a pagamento.
3. Generare una coppia VAPID e un segreto casuale per autenticare il webhook; conservarli in Supabase Vault. Non mettere la chiave privata, il segreto del webhook o service-role nel frontend, nel repository o in variabili PUBLIC_.
4. Creare la riga singleton di `private.push_settings` usando gli ID restituiti da Vault. `worker_url` deve puntare a `https://<project-ref>.supabase.co/functions/v1/push-dispatch`, `app_origin` all'origine HTTPS dell'app e `subject` a un URI HTTPS/mailto controllato dal gestore. Impostare `enabled` solo dopo aver verificato il server.
5. Distribuire `supabase/functions/push-dispatch`: `verify_jwt=false` è necessario per il webhook privato, che esegue la propria autenticazione con un segreto di 256 bit. Le funzioni RPC con credenziali e coda accettano soltanto service-role; gli utenti non possono leggerle né avviare invii arbitrari.
6. Configurare un job Cron ogni minuto che esegua `select private.dispatch_due_push();`. Il job richiama il server soltanto se ci sono invii da tentare; non occorre una pagina aperta.
7. Collegare URL e chiave publishable/anon in Vercel, configurare Site URL/redirect Auth e il servizio email gratuito per conferma/reset. La demo non può inviare push tra persone distinte.
8. Verificare con due account reali autorizzati e due dispositivi: messaggio, richiesta, lettura, preferenze, logout, account diverso, dispositivo offline, revoca dei permessi e apertura della conversazione dalla notifica. La prova sul telefono resta necessaria anche dopo i test automatici.

La generazione locale dei segreti di configurazione non equivale alla loro attivazione sul server. I file locali di lavoro con credenziali sono esclusi da Git.

## Limiti operativi

- Massimo 10 dispositivi per account e 60 aggiornamenti di sottoscrizione/ora.
- Fino a 6 tentativi di consegna con attesa progressiva, massimo 24 ore. Non è una garanzia di consegna: rete, permessi, risparmio energetico e impostazioni del dispositivo possono ritardare o impedire un avviso.
- I record della coda restano per diagnosi; una politica di retention va definita prima di volumi elevati. Nessuna cancellazione automatica generale delle sottoscrizioni è introdotta.
- Si usano le quote gratuite del backend; non è un servizio illimitato né un limite di spesa garantito.

## Verifiche ripetibili

`npm ci`, `npm test`, `npm run build`, `npm run security:scan`, `npm audit`.

I test coprono RLS, destinatari, soppressione dei duplicati della nota iniziale, cursori di lettura, preferenze, protezione da SSRF, cifratura/VAPID, lease, retry, endpoint scaduti, nessun prompt automatico, vincolo Home su iPhone, disattivazione e protezione da notifiche per account precedenti. I test del database usano PostgreSQL locale/PGlite con fixture Auth/Vault/HTTP: non dimostrano da soli la consegna da parte di Apple/Google/Mozilla.
