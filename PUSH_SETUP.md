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

Dopo la conferma del proprietario sono state applicate le migrazioni `20261030174113_notifications.sql` e `20261030182051_push_delivery_runtime.sql`. Sono attivi pg_net, pg_cron e il job `set-in-comune-push-retry` ogni minuto. Le chiavi VAPID e il segreto del webhook sono conservati in Vault; `private.push_settings.enabled` è attivo. La funzione `push-dispatch` è distribuita con autenticazione tramite il proprio segreto, senza accesso anonimo alla coda o alle credenziali.

Il server è configurato, ma le push non sono ancora disponibili dal sito pubblico: il frontend resta in demo, senza account reali o dispositivi sottoscritti. Il collegamento pubblico attende Auth/redirect, un mittente SMTP gratuito per conferma indirizzo e recupero password, e le prove tra dispositivi. Nessun piano a pagamento attivato.

## Configurazione ripetibile e passaggi rimanenti

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

## Verifica remota dopo l’attivazione server

- `supabase/tests/notifications_smoke.sql` eseguito sul progetto reale: richiesta, soppressione della nota duplicata, destinatario del messaggio, isolamento RLS, privilegi RPC e cursore di lettura verificati. Tutte le fixture sono state annullate nella stessa transazione. Nessuna email o push a persone reali.
- Invocazione HTTP autenticata tramite pg_net: 200, coda vuota (`processed: 0`). Senza autenticazione: 401. Questo verifica il collegamento database → Edge Function → RPC/Vault; non dimostra la consegna a un telefono.
- Controllo finale: zero profili, annunci, prenotazioni, messaggi, notifiche, sottoscrizioni e job. Scheduler attivo ogni minuto.
- Advisor sicurezza: soltanto informazioni `rls_enabled_no_policy` sulle quattro tabelle private, intenzionalmente prive di accesso diretto per client; nessun avviso o errore.
