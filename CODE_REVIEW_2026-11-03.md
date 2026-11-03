# Revisione del codice e dei rischi — 3 novembre 2026

Ambito: client web di RENT TO A FRIEND, autenticazione, salvataggi, foto, moduli e protezioni del database. Sorgente di partenza: `908e44a0c349d3e0d031d45186af45be929fb57b`. Le verifiche del database remoto sono state in sola lettura: nessun account, annuncio, noleggio, foto, policy o schema è stato modificato per il collaudo.

## Problemi riprodotti e corretti

| Problema | Effetto possibile | Correzione e prova |
|---|---|---|
| Risposte Auth in ritardo dopo logout o cambio account | Una vecchia sessione poteva sostituire quella nuova, oppure un vecchio errore 401 poteva chiudere il nuovo accesso. | Generazione della sessione verificata prima di inviare e dopo aver ricevuto una richiesta; refresh separato per generazione. I risultati superati vengono rifiutati. Test con risposte sospese e rilasciate dopo logout/nuovo accesso. |
| Errore temporaneo durante il rinnovo | Un guasto di rete o un 503 cancellava le credenziali locali e costringeva a rifare l'accesso. | Le credenziali restano disponibili per riprovare dopo errori temporanei. Un refresh esplicitamente revocato continua a chiudere la sessione. Test di fallimento temporaneo, ripresa e revoca. |
| Logout dipendente dal completamento delle chiamate | Credenziali e dati privati potevano rimanere nella schermata durante un errore del servizio. | Logout locale immediato; invalidazione delle richieste precedenti; svuotamento di prenotazioni, conversazioni, ricevute correnti, contatori e contesto privato; ritorno al catalogo pubblico. La revoca remota può ancora fallire ed è segnalata, senza ripristinare la sessione locale. |
| Aggiornamenti del profilo e pausa annuncio senza righe modificate | L'app poteva mostrare successo anche se un aggiornamento non aveva toccato il record; la pulizia della vecchia foto poteva partire troppo presto. | Richiesta della rappresentazione aggiornata e controllo dell'identificativo prima di confermare il successo o pulire vecchie foto. Test con risposta vuota. |
| Sostituzione della foto profilo prima della decodifica | Una nuova immagine illeggibile faceva sparire quella precedente dalla bozza, con rischio di salvarne poi involontariamente la rimozione. | Sostituzione della bozza solo dopo la preparazione riuscita; la foto precedente resta disponibile in caso di errore. |
| Foto e campi modificabili durante l'invio | L'ordine/copertina delle foto o il testo visibile potevano cambiare mentre veniva salvata una versione precedente. | Bozza fotografica bloccata e fotografata in un elenco stabile durante upload/salvataggio; controlli del modulo temporaneamente disabilitati e ripristinati dopo errore. La bozza e il messaggio restano disponibili per riprovare. |

## Verifiche concluse

- **172 test automatici superati**, inclusi 11 nuovi casi di regressione e la suite SQL locale, controlli di accesso, prenotazioni sovrapposte, spam, immagini private, cancellazione, documenti e notifiche.
- Build riuscita; controlli di sintassi e `git diff --check` superati.
- `npm audit --package-lock-only`: zero vulnerabilità note nelle dipendenze analizzate alla data della verifica.
- Scansione di pattern di credenziali: nessun riscontro in 132 file esaminati e 483 blob della cronologia Git disponibile localmente. È una ricerca di pattern, non una prova di assenza di qualsiasi segreto possibile.
- Database reale: zero tabelle pubbliche senza RLS; la vista dei riepiloghi usa `security_invoker=true`; zero funzioni `SECURITY DEFINER` pubbliche; le funzioni privilegiate private hanno `search_path` configurato.
- Ruolo anonimo senza SELECT su prenotazioni e messaggi; ruolo autenticato senza lettura delle impostazioni push private; trigger delle quote upload non eseguibile direttamente dall'anonimo.
- Le policy di eliminazione delle foto controllate impediscono di cancellare immagini ancora referenziate da profili, annunci o registri di noleggio accessibili al proprietario.

I nuovi test di sessione simulano le risposte Auth/REST: non richiedono password reali, invio email o account di collaudo sulla produzione. I test SQL locali non misurano la capacità massima del database remoto e non sostituiscono un ripristino da backup.

## Punti rimasti aperti

1. **Backup e ripristino: rischio operativo importante.** `BACKUP_TEST_STATUS.md` e `RECOVERY_PLAN.md` documentano il lavoro non completato. In questa revisione non è stato creato né ripristinato un backup completo. Servono copie private esterne del database **e dei file fisici** dello Storage, strumenti PostgreSQL compatibili, accesso sicuro e una destinazione isolata per il collaudo del ripristino. Codice su GitHub ed esportazione JSON dell'utente non sostituiscono queste copie. Nessuna credenziale va inviata in chat o salvata nel repository.
2. **Ottimizzazioni database per la crescita.** Gli advisor riportano 11 avvisi su valutazioni Auth nelle policy RLS e 11 segnalazioni informative su indici per chiavi esterne. Non indicano di per sé una fuga di dati. La loro modifica va misurata e collaudata separatamente; non sono state cambiate policy o aggiunti indici sulla produzione in questo intervento. I due indici indicati come non usati non sono stati rimossi: il basso utilizzo attuale non ne dimostra l'inutilità.
3. **Controllo delle password compromesse.** Supabase segnala che la protezione da password già trapelate non è attiva. La documentazione la riserva al piano Pro o superiore. Nessun piano è stato cambiato. Restano i controlli già presenti su lunghezza password, conferma email, autenticazione e permessi.

Questa è una revisione con correzioni e test mirati, non una certificazione di sicurezza né una garanzia di assenza di difetti futuri.

## Riferimenti

- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
- https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

Il changelog corrente è stato consultato. La dismissione di vecchi cifrari TLS riguarda client obsoleti; non sono stati indeboliti TLS, CSP o i controlli di accesso. Nessun intervento di reindicizzazione o modifica delle estensioni è stato eseguito sulla produzione.
