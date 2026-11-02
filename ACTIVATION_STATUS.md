# Produzione collegata · rilascio 2 novembre 2026

Attivazione definitiva dei punti 1 e 2 richiesta dal gestore. La versione `2026-11-02-7` è pubblicata e attiva nel database dedicato dal 2 novembre 2026 alle 22:52:27 UTC. Le impronte dei testi ricalcolate dal database corrispondono agli snapshot locali; zero ricevute al momento dell’attivazione. Riferimento verificabile: `legal-review/activation.json`.

Configurazione Vercel di produzione collegata al progetto `srjdysdhxnafjrutufmk` tramite URL e sola chiave publishable. Nessuna service key nel frontend. La protezione delle preview rimane invariata; il dominio personalizzato resta pubblico. Email/password disponibili con conferma email obbligatoria, nessun accesso anonimo autenticato e Google disattivato. Turnstile rimandato; la vecchia chiave pubblica da sola non lo abilita.

Verifica locale: 143 test superati, build connected riuscito, scansione credenziali senza rilievi. La scelta personale delle condizioni resta richiesta dal server prima delle nuove attività; nessuna accettazione viene creata per conto del proprietario. Nessun account, annuncio o noleggio fittizio è creato da questo rilascio.

Il passaggio 3 (registrazione/conferma/recupero email, noleggio completo tra due account reali e cancellazione del solo account di prova) resta distinto e non viene dichiarato superato. Le scelte privacy e di pubblicazione sono documentate in `PRIVACY_CLOSEOUT.md` e `LEGAL_RELEASE.md`; le evidenze non attestate non sono convertite in verifiche positive.

## Storico prima dell’attivazione

# Attivazione · stato effettivo al 2 novembre 2026

## Ultima prova fisica di upload

Dopo l'autorizzazione specifica del gestore, correzione quote Storage applicata con migrazione `20261102115131`, `storage_upload_actor_quota`. Diciotto controlli HTTP reali superati: upload JPEG privato, download identico per le parti, isolamento del terzo account, chat/esportazione, rifiuto di eliminazione altrui e rimozione autorizzata via Storage API. Un upload conteggiato una sola volta. Tutte le fixture rimosse: zero account, sessioni, file e record di prova residui verificati. Funzione non eseguibile direttamente dai client, quote e blocchi legali preservati; advisors senza nuovi tipi di avviso. 132 test locali superati. Dettagli e limiti in `STORAGE_UPLOAD_TEST.md`.

Il sito resta demo: nessuna apertura agli utenti reali o pubblicazione di documenti fittizi. UI collegata e telefoni restano da verificare. Backup rinviato dal gestore, Cloudflare in standby e Turnstile rinviato.

## Completato sul progetto dedicato

- Destinazione verificata: Supabase `srjdysdhxnafjrutufmk`, progetto `set-in-comune`, Francoforte, stato ACTIVE_HEALTHY, organizzazione collegata al team del proprietario. Piano dell’organizzazione verificato Free.
- Migrazione `20261102000639`, `legal_acceptance_and_profile_rectification`, applicata tramite il collegamento Supabase, senza installazioni. Ricevute e controllo server delle nuove attività presenti; nessun documento definitivo attivato.
- Account indicato dal proprietario configurato in `private.app_moderators`. Accesso autenticato a sicurezza, coda segnalazioni e coda privacy verificato. Nessuna delega a terze persone.
- Test SQL remoto delle ricevute: scelta esplicita, hash errati respinti, isolamento fra account, data server/idempotenza, immutabilità dei documenti, blocco delle nuove attività e rettifica del profilo. Tutte le fixture annullate con rollback; zero utenti fixture residui.
- Test SQL remoto A/B/C: richieste, chat, conversazioni preliminari, notifiche, letture riservate, recensioni, segnalazioni e blocchi. Fixture e documenti di prova annullati; nessuna impostazione operativa modificata e nessun invio di email/push. pg_net esegue le richieste soltanto al commit, che il test non effettua.
- Controllo successivo: 1 profilo reale di prova preesistente, 0 annunci, 0 noleggi, 0 ricevute e 0 documenti attivi. Nessuna cancellazione periodica attivata.

## Controlli e limiti

114 test locali erano passati sul codice RC2; con l’integrazione CAPTCHA RC3 i controlli sono aggiornati in TURNSTILE_SETUP.md. Build demo e scansione credenziali restano senza rilievi. Gli advisors dopo la migrazione riportano le tabelle private RLS senza policy (intenzionalmente prive di accesso diretto) e il precedente avviso di protezione da password compromesse disattivata. Nessun piano è stato cambiato per eliminare l’avviso.

## Ultimi controlli · 2 novembre 2026

PR #1 Turnstile integrata e PR #3 mobile pubblicata; main osservato `d521a1253031c82a52b0c216f32f2412200de46a`. Vercel produzione READY, dominio verificato, file pubblicati corrispondenti al build. 119 test superati; prova desktop di catalogo, filtri, dettaglio/calendario, profilo, modulo annuncio e domanda/chat nella sola demo. Il browser disponibile non permette emulazione del telefono né accesso alla preview locale; tastiera, touch e dispositivi reali restano da provare.

Controllo operativo remoto: database circa 14,2 MB; zero file nei tre bucket, riscontri privati e limiti di upload attivi; nessuna pratica aperta o job in coda. Tutte le tabelle public/private hanno RLS e non ci sono funzioni privilegiate nello schema public. Il report è aggregato e di sola lettura, non un backup né il consumo fatturabile del provider. Dettagli e limiti in RECOVERY_PLAN.md.

## Approvazione privacy e Cloudflare in standby

Il gestore ha chiesto di considerare risolta la privacy; scelta Gmail e approvazione sono registrate in `PRIVACY_CLOSEOUT.md`. La revisione RC5 precisa assenza di ogni pubblicità, accesso ai diritti senza account/nuove condizioni e minimizzazione delle richieste via email; completa la procedura manuale senza attivare pulizie. L'approvazione non è presentata come un DPA o un collaudo eseguito: i blocchi tecnici demo/privacy restano invariati.

Cloudflare Pages demo è stata creata dal gestore ed è raggiungibile a `https://rent-to-a-friend.pages.dev/`; home e privacy sono state verificate nel browser, header HTML forniti dal gestore coerenti con il build. Zona del dominio preparata; nessun cambio di delega eseguito dall'agente. Dopo gli errori del pannello IONOS, il gestore ha sospeso la migrazione: dominio ancora su Vercel. Le dichiarazioni precedenti sull'assenza del progetto Pages sono superate da questo aggiornamento.

## Backup e prove · decisione successiva

Turnstile rinviato dal gestore, non requisito di lancio. Opt-in del build esplicito e disattivato di default; moduli collegati senza widget utilizzabili, mantenendo i blocchi privacy/documenti e le verifiche quando il provider è configurato. Nessun controllo server già attivo è stato disabilitato. Le istruzioni CAPTCHA sotto descrivono lo storico, non un’attività da eseguire ora.

Supabase ricontrollato in sola lettura tramite metadati: progetto sano, organizzazione Free, sette migrazioni elencate, advisor descritti in `BACKUP_TEST_STATUS.md`. Non è stato esportato il database o copiato lo Storage. Gli strumenti di backup/ripristino continuano a mancare; non sono stati installati né comprati. I contatori storici non sono presentati come nuovi e la query aggregata precedentemente bloccata non è stata ripetuta tramite un altro canale.

## Controlli ancora necessari prima degli utenti reali

Aggiornamento successivo alle scelte del gestore: assistenza Gmail mantenuta; possibile AdSense futuro per i costi, ma attivazione rinviata. Preparazione Cloudflare nella PR #6, nessuna migrazione. 122 test locali e build demo Vercel/Pages superati, credenziali senza pattern rilevati, documenti RC4 rigenerati senza variazione delle impronte e senza SQL di pubblicazione. Cloudflare continua a mostrare un errore di accesso. Il tentativo di aggiornare il report aggregato Supabase è stato impedito dal controllo automatico per limite d'utilizzo e non è stato eseguito; non si attestano nuovi controlli remoti. Nessun account reale, pubblicità, pulizia periodica o modifica di recapito è stato attivato.

1. CAPTCHA: il proprietario ha creato il widget Cloudflare nel proprio browser e fornito la Site Key pubblica. È configurata in Vercel, solo produzione. Client integrato con le modifiche legali correnti e worker account-erasure versione 3 attivo. Il worker inoltra il token e ammette le origini canoniche. Manca l’inserimento privato della Secret Key in Supabase e la prova completa widget/Auth; il controllo Auth resta spento. Nessun segreto è stato chiesto in chat.
2. Accesso all’anteprima Vercel: deployment RC2 READY, ma protetto da login. Il collegamento Vercel per ottenere l’accesso temporaneo restituisce «The deployment could not be found, or your Vercel connection may not have access to it.» Nessuna CLI autenticata disponibile; non è stata modificata la protezione.
3. Documenti definitivi: revisione RC4 disponibile; verificate le fonti ufficiali degli accordi standard. Successivamente il gestore ha scelto di preparare Cloudflare Pages Free: build alternativo predisposto, nessuna migrazione effettuata. IONOS verificato come Pack Dominio dal 31 ottobre 2026, due inoltri Gmail; nessuna casella completa inclusa confermata. Proton Free è un’alternativa studiata e non da attivare: il gestore ha confermato Gmail. `PROVIDERS_REVIEW.md` riporta evidenze e limiti; `CONTACT_RETENTION_REVIEW.md` distingue dati di contatto GDPR, domicilio ex art. 7 se applicabile e proposta di conservazione accettata in modo condizionato. Nessun indirizzo pubblicato o flag legale forzato per superare il blocco del build.
4. Prove dal telefono e dal browser con account reali: il nuovo flusso e le push non sono stati collaudati nell’interfaccia collegata. I test SQL reali non sono presentati come prove di upload fisici, ricezione push o uso da telefono.

5. Backup e recupero: manca la prima copia completa esterna di database e file e una prova di ripristino isolata. In questo ambiente non risultano disponibili CLI Supabase, pg_dump o psql; il collegamento SQL non sostituisce un backup. Nessun programma installato o servizio a pagamento attivato. Procedura concreta e query di controllo in RECOVERY_PLAN.md.

Il sito può ricevere le migliorie della demo e i testi veritieri, ma non viene dichiarato aperto a utenti reali finché questi punti non sono risolti. Nessun abbonamento, chiave, DNS o impostazione Auth di redirect modificati.
