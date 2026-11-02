# Cloudflare Pages Free · preparazione, non migrazione

Scelta del gestore del 2 novembre 2026: preparare Cloudflare gratuito, mantenendo i piani gratuiti e gli attuali blocchi demo/privacy. Questo pacchetto non cambia produzione, dominio, DNS, nameserver, chiavi o account.

## Pacchetto pronto

- Repository: `nicolocaloni-hub/set-in-comune`, sito statico senza Pages Functions.
- Comando: `npm run build:pages`; directory di output: `dist`; Node 22 o superiore.
- Nessun pacchetto aggiuntivo, SDK, Wrangler, runtime a pagamento o servizio server Cloudflare necessario per questo build. Le dipendenze di sviluppo non sono necessarie al build.
- `build:pages` richiama il build esistente, aggiunge `dist/_headers` e imposta `dist/hosting-config.js` a Cloudflare Pages. Il build ordinario mantiene Vercel: anche una preview deve descrivere il fornitore corretto nell'informativa. La configurazione di Vercel non viene alterata.
- Gli header mantengono CSP, HSTS, X-Frame-Options, COOP, nosniff, Referrer-Policy e Permissions-Policy. La CSP usa il solo backend configurato. Nessun tracker o script di analisi viene aggiunto.
- La demo conserva `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY` vuoti; non carica Turnstile. Non copiare Secret Key, service_role o credenziali nell'ambiente pubblico.
- Il callback Auth resta `https://rent-to-a-friend.it/`. Site URL e Redirect URLs di Supabase non cambiano. Una preview `pages.dev` serve per verificare la demo, non per affermare che conferma/reset PKCE fra origini funzionino.
- Non configurare funzioni, Analytics, Web Analytics, Zaraz, AI, log aggiuntivi o upgrade durante l'importazione.

## Quello che manca nell'account Cloudflare

Nessun progetto Pages è stato creato da questo lavoro e non esiste ancora una preview Cloudflare verificata. Dopo l'accesso al pannello va importato il repository privato, mantenendo accesso GitHub limitato a quel repository e la selezione Free. L'eventuale autorizzazione GitHub e l'accettazione di nuovi termini devono essere effettuate dal titolare nel flusso appropriato. Non chiedere credenziali in chat. Se la procedura richiede installazioni o un piano a pagamento, fermarsi.

Nel pannello impostare le variabili di build `SKIP_DEPENDENCY_INSTALL=1` e `NODE_VERSION=22`, comando di build `npm run build:pages`, output `dist`. Cloudflare documenta la prima variabile per evitare l'installazione automatica; il nostro build non ne esegue una sostitutiva. Verificare nei log che non vengano installati pacchetti. In alternativa il build locale già prodotto è un asset statico caricabile con Direct Upload, senza introdurre Wrangler; la scelta tra Direct Upload e integrazione Git deve precedere la creazione del progetto. Un progetto Direct Upload non può essere convertito successivamente a integrazione Git: per quella occorrerebbe un altro progetto.

Prima di collegare il dominio: controllare una preview HTTPS, header reali delle risposte, navigazione, service worker/aggiornamenti, manifest e modalità demo. I test locali non sostituiscono una risposta del CDN Cloudflare.

## Passaggio del dominio: fase distinta

Per il dominio principale `rent-to-a-friend.it`, Pages richiede una zona Cloudflare con nameserver Cloudflare. Il dominio resta registrato presso IONOS; non è necessario trasferire la registrazione. Una semplice modifica al record A del dominio principale non sostituisce questa procedura.

Prima di un eventuale passaggio, preparare l'inventario DNS effettivo e il piano di ritorno, preservando MX, SPF, DKIM, DMARC, record di verifica e invio Resend/Supabase e ogni altro record in uso. Verificare DNSSEC/DS, CAA e certificato. Mostrare al titolare i cambiamenti concreti prima di modificare nameserver o DNS: la richiesta attuale autorizza la preparazione, non quel passaggio.

Non spegnere Vercel prima del collaudo. Aggiornare l'informativa soltanto al cambio effettivo dei fornitori, distinguendo Pages da Turnstile e le rispettive finalità. Non rimuovere Vercel dal testo mentre serve ancora il dominio.

## Fonti ufficiali del 2 novembre 2026

- https://developers.cloudflare.com/pages/functions/pricing/ — richieste agli asset statici gratuite; Functions hanno quote separate.
- https://developers.cloudflare.com/pages/platform/limits/ — limiti del piano Pages Free, da rispettare anche senza fatturazione.
- https://developers.cloudflare.com/pages/configuration/headers/ — `_headers` per risposte statiche, non per Functions.
- https://developers.cloudflare.com/pages/configuration/custom-domains/ — nameserver necessari per il dominio principale; regole diverse per sottodomini.
- https://developers.cloudflare.com/pages/configuration/build-configuration/ — configurazione del build.
- https://developers.cloudflare.com/pages/configuration/build-image/ — controllo dell'installazione dipendenze.
- https://www.cloudflare.com/terms/ — condizioni Self-Serve, DPA incorporato per i dati coperti; non individuata la limitazione generale a uso personale non commerciale propria di Vercel Hobby. Questo confronto non è una garanzia generale di conformità dell'app.

Il costo di registrazione/rinnovo del dominio IONOS resta separato dall'hosting gratuito.

## Validazione del pacchetto

121 test locali superati, incluso il confronto degli asset fra build Vercel e Pages (differiscono soltanto l'etichetta del fornitore e `_headers`) e la verifica che Pages non aggiri il blocco privacy degli account reali. Build demo Pages e controllo sintattico superati; scansione dei pattern di credenziali sul lavoro locale e sulla cronologia disponibile senza rilievi. Non è una scansione di segreti universale. Nessun test remoto del CDN, nuova casella email, dispositivo reale o cambio dominio viene dichiarato eseguito.
