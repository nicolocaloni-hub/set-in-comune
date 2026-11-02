# Cloudflare Pages Free · demo pubblicata, dominio in attesa

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

## Stato effettivo dopo l'intervento del gestore

Il gestore ha creato il progetto Pages `rent-to-a-friend`, collegato al repository e al ramo `main`, con `npm run build:pages`, output `dist`, framework Nessuno, `NODE_VERSION=22` e `SKIP_DEPENDENCY_INSTALL=1`. Il pannello ha mostrato distribuzione riuscita a `https://rent-to-a-friend.pages.dev/`. L'installazione delle dipendenze non è stata verificata nei log remoti.

Nel browser sono stati controllati home, navigazione e informativa: modalità demo e fornitore Cloudflare Pages coerenti. Gli header della risposta HTML copiati dal gestore includono CSP restrittiva, no-cache, HSTS, COOP, nosniff, DENY e no-referrer. Il confronto HTTP diretto degli asset non è stato completato (403): non si attesta identità byte per byte fra build locale e CDN. Header di service worker/manifest e aggiornamento offline restano da collaudare sul servizio remoto.

La zona Cloudflare del dominio è stata preparata dal gestore sul piano Free. Sono stati aggiunti i due DKIM IONOS mancanti dalla scansione e gli screenshot mostrano i record su DNS only. Il confronto completo di nomi, TXT e priorità MX non è concluso. I nameserver assegnati sono `carlane.ns.cloudflare.com` e `yew.ns.cloudflare.com`; quelli IONOS osservati sono `ns1070.ui-dns.biz`, `ns1104.ui-dns.de`, `ns1104.ui-dns.org`, `ns1027.ui-dns.com`. La consultazione pubblica DS del 2 novembre non ha restituito record DS; è un riscontro puntuale, da ripetere prima di un successivo cambio.

Il gestore ha poi chiesto all'agente di intervenire direttamente. Il pannello IONOS ha mostrato un errore dei propri sistemi e la pagina nameserver non era utilizzabile; nessun salvataggio è stato effettuato. **Su successiva istruzione del gestore la migrazione è in standby.** Il dominio continua a servire Vercel; non modificare DNS, delega o posta mentre il passaggio resta sospeso.

## Passaggio del dominio: fase distinta

Per il dominio principale `rent-to-a-friend.it`, Pages richiede una zona Cloudflare con nameserver Cloudflare. Il dominio resta registrato presso IONOS; non è necessario trasferire la registrazione. Una semplice modifica al record A del dominio principale non sostituisce questa procedura.

Prima di un eventuale passaggio, preparare l'inventario DNS effettivo e il piano di ritorno, preservando MX, SPF, DKIM, DMARC, record di verifica e invio Resend/Supabase e ogni altro record in uso. Verificare DNSSEC/DS, CAA e certificato. Il gestore ha successivamente autorizzato l’intervento diretto, ma ha poi sospeso il passaggio dopo gli errori IONOS. Conservare il piano concreto per la ripresa e non applicarlo durante lo standby.

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

122 test locali superati dopo la conferma del rinvio della pubblicità, incluso il confronto degli asset fra build Vercel e Pages (differiscono soltanto l'etichetta del fornitore e `_headers`), il blocco degli annunci non revisionati e la verifica che Pages non aggiri il blocco privacy degli account reali. Build demo Vercel/Pages e controllo sintattico superati; scansione dei pattern di credenziali sul lavoro locale e sulla cronologia disponibile senza rilievi. Non è una scansione di segreti universale. Le osservazioni remote successive sono descritte sopra con i relativi limiti. Nessuna nuova casella email, prova su dispositivo reale o cambio dominio è dichiarato eseguito.
