# Verifica di sicurezza richiesta dal video

Data: 30 ottobre 2026. Ambito: sorgenti locali di Set in comune, build pubblico, cronologia Git disponibile localmente, test di autenticazione con risposte simulate e test SQL su PostgreSQL locale tramite PGlite. Nessun servizio o piano a pagamento attivato. Lo schema non è applicato a un progetto Supabase reale. Gli esiti SQL e Auth riportati qui sono locali; la pubblicazione della demo non li trasforma in verifiche del backend remoto.

## Esito

36 test superati, build riuscito, `npm audit` senza vulnerabilità note nelle dipendenze esaminate. La scansione dei pattern di credenziali nel codice e nella cronologia locale non ha trovato corrispondenze. Questo non è una certificazione, un penetration test completo o una garanzia di assenza di vulnerabilità.

## I venti punti del video

| # | Punto | Intervento / verifica | Limite residuo |
|---|---|---|---|
| 1 | Nascondere le chiavi API | Solo URL Supabase e chiave publishable/anon possono essere inclusi nel build. Chiavi segrete, service-role JWT e valori arbitrari bloccano il build. | Una chiave pubblica è visibile per definizione: la protezione dei dati dipende da Auth/RLS. |
| 2 | Controllare variabili d'ambiente | Validazione dell'origine HTTPS, senza credenziali, percorsi o query. Serializzazione esplicita di sole due variabili; test con un segreto fittizio non pubblicato. | Configurazione reale Vercel da verificare al collegamento del backend. |
| 3 | Proteggere le route admin | Non esistono route o account admin nell'app. Nessun ruolo viene assegnato da bio, profilo o user_metadata. | Un futuro pannello admin richiederà autorizzazione server dedicata. |
| 4 | Autenticazione corretta | Link email con PKCE S256, scambio del codice con verifier locale, rifiuto di token implicit inseriti nell'URL, pulizia dell'URL anche negli errori. Sessione nel sessionStorage della scheda. | Invio email e flusso completo sul dominio finale da provare su Supabase. |
| 5 | Controllo accessi | RLS e privilegi per colonna. Solo proprietario e richiedente leggono il noleggio e la chat; gli altri utenti sono respinti nei test SQL. L'email confermata viene letta da Auth. | Conferma email, policy e accesso attraverso REST da riverificare sul servizio reale. |
| 6 | Validare i moduli | Vincoli client e SQL su testi, date, importi e foto. Identificatori API validati. I valori vengono trasmessi come JSON/parametri, non concatenati in SQL. | Validazione lato browser migliora l'esperienza; quella server resta decisiva. |
| 7 | Proteggere da XSS | Escape del testo inserito nell'HTML; URL immagine limitati al backend configurato, niente SVG o script; CSP senza unsafe-inline/eval, più restrittiva nel build. | Verifica browser completa e test dei futuri componenti ancora necessari. |
| 8 | Rate limiting | Limiti SQL per messaggi, richieste, modifiche e upload; test di accesso diretto alle tabelle. Quote sulle foto per utente e per pilota. | Login, reset e signup vanno limitati/configurati anche in Supabase Auth; la difesa distribuita/IP non è sostituita dai limiti per utente. |
| 9 | Proteggere endpoint API | Stato/importi dei noleggi modificabili solo tramite RPC autorizzate; logica privilegiata in schema private, wrapper pubblici invoker; nessun UPDATE diretto ai prezzi salvati nelle richieste. | Schema private da tenere escluso dagli schemi esposti della Data API. |
| 10 | Controllare CORS | Il frontend non abilita wildcard CORS; accetta solo GET/HEAD sui file pubblici. Chiamate API senza cookie, redirect vietati e destinazione fissa. | I servizi Supabase hanno proprie regole CORS: non sono un sostituto di RLS e richiedono prova sul progetto reale. |
| 11 | Header di sicurezza | CSP, nosniff, no-referrer, Permissions-Policy; HSTS, X-Frame-Options DENY e COOP configurati per Vercel. Il server locale applica gli header pertinenti ed è testato via HTTP. | Controllare la presenza degli header sul deploy della release. |
| 12 | Disattivare debug | Nessuna modalità debug dell'app o source map nel pacchetto pubblico; errori Auth generici e niente dettagli SQL inattesi mostrati agli utenti. | Le impostazioni e i log della futura infrastruttura vanno verificati separatamente. |
| 13 | Aggiornare dipendenze | Nessuna dipendenza runtime npm; PGlite 0.5.13 fissato come dipendenza di test, lockfile incluso; npm audit senza vulnerabilità note. | Nuove vulnerabilità possono emergere; gli aggiornamenti di Node gestiti da Vercel restano esterni al repository. |
| 14 | Rimuovere pacchetti inutili | Una sola dipendenza di sviluppo, usata nei test SQL; installazione Vercel configurata per omettere le dipendenze di sviluppo. | Non sono aggiunti servizi di sicurezza esterni. |
| 15 | Cercare file esposti | Build con elenco esplicito di asset, non copia indiscriminata della cartella. Test HTTP confermano 404 per env, Git, SQL, lockfile e traversal; POST restituisce 405. | Da ripetere dopo il prossimo deploy. |
| 16 | Proteggere database | RLS su tabelle e calendario, privilegi minimi, schema private non esposto, foto di riscontro private, snapshot degli accordi, lock sulle attrezzature. Test SQL con utenti A/B/C e account non confermato. | PGlite non riproduce tutti i servizi Supabase né transazioni su connessioni concorrenti: serve staging reale. |
| 17 | Hash delle password | Password affidate a Supabase Auth tramite HTTPS, mai salvate nei profili o nella demo; niente hashing o archivio password personalizzato. | Politica password e protezioni Auth da configurare nel progetto reale. |
| 18 | Cercare segreti in Git | Script ripetibile `npm run security:scan` su working tree e tutti i blob raggiungibili nella cronologia Git locale. Output senza valori sensibili. Nessun pattern noto trovato. | Non rileva ogni segreto possibile e non certifica eventuali commit remoti non presenti localmente. Nessuna credenziale è stata ruotata. |
| 19 | Audit completo | Revisione dei componenti presenti e test di regressione, SQL, accessi, autenticazione, build e HTTP; risultati e limiti documentati qui. | Non è un penetration test indipendente e non copre servizi non ancora configurati. |
| 20 | “Non fare errori” | Test e vincoli riducono gli errori e rendono le verifiche ripetibili. | Nessuna app può essere garantita immune da errori o attacchi. |

## Limiti del pilota predisposti nel database

- 5 messaggi ogni 10 secondi per utente.
- 20 richieste di noleggio ogni ora; massimo 20 richieste contemporaneamente in attesa.
- 10 annunci nuovi ogni ora; 60 modifiche annuncio e 60 operazioni calendario ogni ora.
- 30 modifiche profilo e 30 foto caricate ogni ora per utente.
- 200 file per utente e 1.500 file complessivi nei tre bucket dell'app. Sono limiti iniziali modificabili nel codice, non limiti di Supabase.
- Ogni foto pubblicata è un JPEG fino a 500 KiB: 1.500 file corrispondono a un massimo teorico di circa 768 MB. Non è un limite di spesa garantito e non tiene conto del consumo di altri progetti nell'organizzazione.

I limiti non sono ancora attivi online: saranno applicati solo dopo l'installazione dello schema. Il limite di 200 file include anche foto vecchie non ancora ripulite; un processo di pulizia/retention è necessario prima della community pubblica.

## Verifiche necessarie prima di aprire ad altri utenti

1. Verificare il deploy della release approvata nella repository privata, senza attivare abbonamenti.
2. Creare/collegare un progetto gratuito dedicato nell'organizzazione scelta dal proprietario; eseguire lo schema solo su un database nuovo.
3. Configurare conferma email, SMTP, redirect precisi, rate limit Auth e durata dei JWT; usare soltanto chiave publishable/anon nel frontend.
4. Eseguire i test A/B/C via API e browser separati, tentativi concorrenti su connessioni reali, foto private e link firmati scaduti, logout/refresh/reset e upload interrotti.
5. Controllare advisory Supabase, header e file esposti del nuovo deploy, permessi della repository/hosting e dashboard di consumo.
6. Completare moderazione, segnalazioni, assistenza, conservazione/cancellazione dati e documenti del gestore.

## Fonti tecniche primarie

- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://github.com/supabase/auth-js/blob/master/src/GoTrueClient.ts
- https://supabase.com/docs/guides/auth/jwts
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/security/product-security
- https://pglite.dev

## Controllo in sola lettura della demo già online

Sul dominio `https://set-in-comune-app.vercel.app` la home ha restituito 200 con CSP, nosniff e HSTS. La configurazione pubblica indica che URL e chiave backend non sono impostati. I percorsi `/.env`, `/.git/config` e `/supabase/001_initial.sql` restituiscono 404. Questa osservazione riguarda la versione precedente al deploy della release 0.3; non ho creato link che aggirino la protezione dei deployment.

## Estensione notifiche 0.4

Le notifiche introducono nuovi test per RLS dei destinatari, lettura concorrente, endpoint consentiti, segreti server, cifratura Web Push, retry, account condivisi e assenza di prompt automatici. I risultati aggiornati si ottengono con `npm test`; i 36 test indicati sopra descrivono la release 0.3. Il database dedicato gratuito esiste con lo schema iniziale, e, dopo la conferma del proprietario, migrazioni notifiche e worker sono attivi. Le verifiche remote di RLS, destinatari, contatori, RPC e autenticazione webhook sono passate; il sito resta in demo in attesa di Auth/email e delle prove sui telefoni.
