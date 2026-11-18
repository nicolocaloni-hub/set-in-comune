# Cloudflare Turnstile · rinviato dal gestore

## Incidente del 18 novembre 2026 e ordine obbligatorio di attivazione

Il 18 novembre il widget è stato acceso sul sito (`PUBLIC_TURNSTILE_ENABLED=true`) senza prima verificare i domini consentiti del widget su Cloudflare: la verifica falliva nel browser e per circa 7 ore nessuna iscrizione è arrivata a Supabase Auth. Rimedio: widget spento alle 20:12 e, nel codice, un widget che non riesce a funzionare non blocca più i moduli (il server decide). Per riattivare, seguire questo ordine:

1. Su Cloudflare, nel widget con Site Key `0x4AAAAAAFwUSi…`, verificare che i domini consentiti includano `rent-to-a-friend.it` e `www.rent-to-a-friend.it`.
2. Accendere `PUBLIC_TURNSTILE_ENABLED=true` in Vercel (Production) e ridistribuire.
3. Dal telefono, aprire Registrati: il riquadro deve mostrare «Verifica di sicurezza completata». Se mostra «non disponibile», tornare al punto 1.
4. Solo dopo il punto 3, il gestore incolla la Secret Key in Supabase → Authentication → Attack Protection e salva.
5. Verificare dai log Auth che compaiano `/signup` con stato 200 e che un login senza token venga rifiutato.

Decisione successiva del 2 novembre 2026: **non includere Turnstile nella prima versione** e proseguire con backup e prove. Non è un requisito per il lancio. Il build usa `PUBLIC_TURNSTILE_ENABLED=false` per impostazione predefinita: ignora una Site Key rimasta nell'ambiente e genera configurazione vuota/CSP senza il provider. I moduli collegati senza Site Key non caricano il widget e non richiedono token; API e worker continuano a funzionare con il controllo Auth non configurato per CAPTCHA. Nessun segreto, Site Key remota o altra impostazione di sicurezza è modificato da questa revisione.

Il codice di integrazione rimane disponibile per un eventuale opt-in futuro (`PUBLIC_TURNSTILE_ENABLED=true` più Site Key valida e server coordinato). Le verifiche del token, il monouso e la scadenza restano obbligatori quando il widget è configurato. Non disabilitare una verifica server già attiva per aggirare un errore: in quel caso fermare il rilascio e riallineare il piano.

## Storico dell'integrazione RC3

Stato precedente al 2 novembre 2026. Site Key pubblica fornita dal proprietario; nessuna Secret Key ricevuta, richiesta in chat, letta o memorizzata nel codice.

## Destinazioni verificate

- Repository `nicolocaloni-hub/set-in-comune`, base main `70b102dcc7a4b837715c7a5b9485bdabc8ef588b`, tree equivalente al checkout di integrazione.
- Progetto Vercel `set-in-comune-app`, `prj_Zo54HpvO655WojjmyK7cN1LWmdCN`, team `team_rnC452vRJFngd9ywbazKgU70`.
- `PUBLIC_TURNSTILE_SITE_KEY` verificata nel progetto, tipo pubblico/plain, solo target production. Nessun valore di backend pubblico configurato per aprire account reali.
- Supabase `srjdysdhxnafjrutufmk`. La funzione remota prima dell’aggiornamento coincideva esattamente con i tre file della base locale: nessuna modifica altrui sovrascritta.

## Cosa fa il codice

Client esplicito senza nuove dipendenze: carica il provider soltanto aprendo un modulo protetto degli account collegati. Nessun caricamento Cloudflare nella demo. Sono coperti signup, login, recupero password e conferma cancellazione. Il token vive in memoria, viene consumato una sola volta e invalidato prima dei cinque minuti del provider; scadenza, errore e cambio/chiusura modulo lo cancellano. Nessun token CAPTCHA salvato in localStorage, sessionStorage o esportazioni.

Le nuove firme API restano compatibili con test e client non configurati finché il server CAPTCHA è spento; con sitekey configurata il client rifiuta l’invio senza token. La barriera decisiva resta la verifica server: la sola presenza del widget non attiva la protezione Auth.

CSP limitata a `challenges.cloudflare.com` per script/frame; il meta CSP della demo continua a escluderlo. Nessuna modifica a callback canonico, SMTP, chiavi, DNS, piani o blocchi privacy/documenti. Il client conserva le ricevute e le istruzioni email già pubblicate. Snapshot di proposta aggiornati a RC3, non pubblicati nel registro server.

## Cancellazione account: installato e verificato

Funzione `account-erasure` aggiornata alla versione 3, mantenendo la propria autenticazione e `verify_jwt=false` già esistente. Il token è inoltrato esclusivamente alla riautenticazione Auth; dimensione e tipo sono validati. Nessun token è restituito o scritto nei log.

È stato riscontrato che la funzione precedente respingeva le origini canoniche con 403. Le origini esatte di dominio e www sono ora incluse insieme all’alias precedente; non sono ammessi host arbitrari o sottodomini non elencati.

Verifica remota dopo il deploy:
- OPTIONS da `https://rent-to-a-friend.it`: 204 con origine corretta.
- OPTIONS da `https://www.rent-to-a-friend.it`: 204 con origine corretta.
- OPTIONS da origine estranea: 403.
- POST senza credenziali o con JWT invalido: 401, senza eseguire cancellazioni.
- POST da origine estranea: 403.

Nessun account o file cancellato per queste prove. Il primo tentativo di deploy è stato respinto per un percorso import-map ereditato; specificando `deno.json` il deploy è riuscito. Il codice attivo resta la versione 3 verificata.

## Ordine di attivazione

1. Cloudflare: widget Managed, hostnames dominio e www, pre-clearance spento, piano Free. Queste opzioni sono state indicate al proprietario; la configurazione del suo pannello non è stata ispezionata da questa sessione.
2. Worker compatibile: completato prima dell’attivazione del controllo Auth.
3. Frontend collegato: attivare soltanto dopo le verifiche privacy e documenti, mantenendo Site Key nell’ambiente di produzione. Provare la visualizzazione sul dominio autorizzato. Il widget non può essere collaudato su un hostname preview non incluso nella configurazione Cloudflare.
4. Secret Key: il proprietario la inserisce direttamente nel pannello Supabase, in Authentication / Bot and Abuse Protection, provider Turnstile. Non va inviata in chat né inserita in Vercel o nel repository.
5. Abilitare la verifica Auth come ultimo passaggio, con browser di prova pronto. Provare signup, login, recovery e riautenticazione per la cancellazione su sole fixture; controllare anche token assente, scaduto e riutilizzato. In caso di configurazione errata fermare l’apertura, senza lasciare una protezione parziale.

Al momento la prova Auth con identità inesistente, senza token, restituisce `invalid_credentials`: il CAPTCHA server non è ancora richiesto. Questo è un controllo dello stato, non una prova di corretta validazione di token reali.

## Verifiche e limiti

119 test locali superati; build demo, controlli sintattici e scansione credenziali senza rilievi. Il build collegato con Site Key presente resta correttamente bloccato dalla revisione privacy.

Test locali: cicli widget isolati, assenza di contatti provider in demo, limiti/scadenza/monouso dei token, inoltro ai tre flussi Auth e alla cancellazione, rinnovo sessione senza token e origini canoniche senza estendere l’accesso a host estranei. Nessuna installazione di dipendenze eseguita.

Restano da svolgere il collaudo di un token reale Cloudflare con Supabase e i dispositivi. La presenza del codice online o della Site Key salvata non viene presentata come protezione già attiva.

Fonti ufficiali:
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://supabase.com/docs/guides/auth/auth-captcha
