# Backup e prove · riscontri del 2 novembre 2026

Il gestore ha scelto di rinviare Turnstile e proseguire con backup e prove. Nessuna installazione, piano a pagamento, apertura a utenti reali, modifica DNS o ripristino sulla produzione è autorizzato implicitamente dai test.

## Destinazione e preflight remoto

Verifiche in sola lettura tramite il collegamento Supabase, effettuate dopo la richiesta:

- Progetto dedicato `srjdysdhxnafjrutufmk`, nome `set-in-comune`, regione `eu-central-1`, stato `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.011`.
- Organizzazione collegata al progetto: piano `free` / `tier_free`.
- Sette migrazioni elencate: schema iniziale, notifiche, consegna push, richieste e fiducia, diritti/pulizia, cancellazione account e ricevute/rettifica. L'elenco delle migrazioni non è un dump né una verifica di ogni oggetto SQL attivo.
- Advisor sicurezza: undici tabelle dello schema privato con RLS senza policy dirette (INFO, accesso intenzionalmente tramite funzioni controllate) e avviso `auth_leaked_password_protection` disattivata (WARN preesistente). Nessuna protezione o piano modificato per eliminare l'avviso. Riferimenti: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy e https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

Non sono stati letti contenuti di utenti, hash di password, chiavi private o file per queste verifiche. Il rapporto aggregato SQL precedentemente fermato dal limite del controllo automatico non è rieseguito né aggirato tramite un altro canale. Conteggi di profili, annunci e oggetti del rapporto precedente restano dati storici, non conteggi aggiornati.

## Backup: non completato

Sono state ricontrollate le disponibilità di `supabase`, `pg_dump`, `psql` e Docker: nessuno è disponibile nel contesto attuale. Nessun pacchetto viene installato. Il collegamento permette letture e operazioni sul progetto, ma non fornisce un export completo recuperabile di database e Storage.

La documentazione ufficiale raccomanda export regolari esterni per Free; un dump del database non contiene le foto fisiche dello Storage. Non si presenta un CSV, un report SQL, le migrazioni o l'esportazione JSON di un singolo utente come backup completo.

Per completare servono un ambiente affidabile con strumenti compatibili con PostgreSQL 17 già disponibili, accesso sicuro alla connessione senza credenziali in chat, destinazione privata cifrata esterna al progetto e un contesto isolato di ripristino senza invio email/push o job. Non si presume che un nuovo progetto/branch sia gratuito. Procedura e copertura in `RECOVERY_PLAN.md`.

Non è stata creata una copia del database o dei file, non esiste un ripristino verificato e non è misurato un tempo di recupero. Il fatto che in un rapporto precedente lo Storage fosse vuoto non sostituisce un inventario attuale.

## Turnstile rinviato: allineamento necessario

Il codice precedente richiedeva ancora una Site Key nel build collegato e il widget nei moduli. La revisione introduce un opt-in esplicito, spento di default: `PUBLIC_TURNSTILE_ENABLED=true` è necessario per usare una Site Key. Senza opt-in una chiave pubblica rimasta nell'ambiente non carica il widget. Senza Site Key i moduli non chiedono token. Non sono rimosse conferma email, autenticazione, controlli di accesso, quote o blocchi privacy/documenti.

Quando configurato, il client continua a verificare presenza, scadenza e monouso del token; l'effettiva validazione rimane server. Nessuna impostazione Auth viene disabilitata da questa modifica. L'informativa collegata distingue il provider spento da quello configurato.

## Prove e limiti

I test automatici locali ricostruiscono PostgreSQL con fixture isolate e simulano i confini Auth/Storage. Coprono isolamento fra account, richieste/prenotazioni/chat, foto, esportazione, cancellazione, documenti e notifiche. Sono prove del codice, non un test sul database ripristinato, una consegna email/push o un collaudo su telefoni reali.

Le nuove regressioni verificano moduli senza widget, richieste Auth/cancellazione prive di metadati CAPTCHA, callback canonico, mancata attivazione da Site Key residua, opt-in con chiave obbligatoria e conservazione dei blocchi di rilascio. Le fixture di prontezza nel test del build restano solo in directory temporanee: nessun flag reale è approvato o rimosso.

Le prove sul sito pubblico restano della demo. Il collaudo collegato completo e quello Android/iPhone restano da completare nel contesto appropriato, senza fingere che test SQL o desktop li sostituiscano.

## Esito delle prove di questa revisione

- 125 test locali superati, inclusi i tre nuovi test della modalità senza CAPTCHA e i casi già presenti di isolamento PostgreSQL, Auth, Storage, prenotazioni, chat, privacy e notifiche.
- Build demo Vercel e Pages riusciti; snapshot RC6 rigenerati come proposta senza SQL di pubblicazione; controlli sintattici e diff check superati. Scansione dei pattern noti di credenziali sul lavoro locale e sulla cronologia disponibile senza rilievi.
- Browser desktop sul dominio: catalogo con sei esempi; filtro Luci con un risultato; dettaglio Amaran e calendario; richiesta demo 10–11 novembre a 22 euro/giorno, totale 44 euro e cauzione separata 100 euro; stato in attesa, accettazione simulata, chat e messaggio di prova presenti anche dopo ricaricamento. Gli avvisi della pagina confermano che le operazioni sono locali e non contattano persone reali.
- Non eseguiti: backup completo, ripristino da backup, nuovo test SQL remoto, UI con backend reale, upload fisico remoto, consegna email/push e prova Android/iPhone. Non sono assunti come superati dai risultati sopra.

## Documentazione ricontrollata

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes
- https://supabase.com/changelog/cbc-tls-ciphers-deprecated

Changelog letto: per dump/restore PostgreSQL 17.11 occorre valutare eventuali operatori personalizzati ed estensioni; non sono state eseguite modifiche o rilevazioni SQL ulteriori su questo punto. La rimozione annunciata di cifrari TLS HTTP obsoleti riguarda client datati: nessuna impostazione TLS è indebolita per la prova.
