# Copie di sicurezza e ripristino · stato al 2 novembre 2026

## Verificato adesso

Progetto Supabase `srjdysdhxnafjrutufmk`, organizzazione Free, Francoforte, PostgreSQL 17.11.0.011, stato ACTIVE_HEALTHY. Rapporto aggregato in `supabase/launch/operational-status-2026-11-02.json`; query ripetibile in `operational_status.sql`. La query è in transazione di sola lettura, non crea RPC e non esporta contenuti o identificativi personali.

- Database: 14.243.507 byte, circa 14,2 MB. È una misura PostgreSQL, non il contatore di fatturazione o di egress del provider.
- Tre bucket attesi, zero oggetti e zero dimensioni sconosciute; nessun oggetto segnalato in altri bucket. Il controllo usa i metadati: non è una verifica fisica dello storage.
- Avatar e annunci pubblici; riscontri di consegna privati. Limite 512.000 byte per file e solo JPEG nei tre bucket.
- Trigger quote attivo. Il corpo della funzione coincide con quello versionato (MD5 `c7d0646f3c419d05f4841404317d9961`, confronto di integrità, non protezione crittografica): 30 upload/ora, 200 file per utente, 1.500 file complessivi. Nessun EXECUTE diretto concesso ad anon/authenticated.
- Tabelle public/private con RLS; nessuna funzione SECURITY DEFINER nello schema public. Nessuna pratica privacy aperta o job di cancellazione/push presente.
- Nessuna copia completa o prova di ripristino effettuata. Ricostruire lo schema nei test locali non equivale a ripristinare un backup del progetto.

## Limite del piano e blocco operativo

La documentazione Supabase raccomanda ai progetti Free esportazioni regolari e copie esterne. I backup del database non includono i file fisici di Storage: record e fotografie vanno protetti separatamente. Non è stato attivato alcun piano o componente a pagamento.

In questo ambiente non risultano disponibili `supabase`, `pg_dump` o `psql`. Non sono stati installati strumenti né richieste password del database o service key. Il collegamento MCP consente queste verifiche SQL ma non sostituisce un export completo recuperabile. Per questo **backup e ripristino restano un requisito aperto**, con dipendenze identificate.

## Procedura da attuare prima degli utenti reali

1. Usare un ambiente affidabile con strumenti già disponibili e compatibili con PostgreSQL 17; seguire la guida ufficiale corrente. Verificare il progetto sorgente, l'accesso alla connessione e i privilegi richiesti. Le credenziali si inseriscono nel contesto sicuro del provider/strumento, mai in chat, URL salvati nel repository o file pubblici.
2. Predisporre una destinazione cifrata esterna al progetto e riservata al gestore. Concordare frequenza, durata e cancellazione delle copie con la conservazione effettivamente approvata. Nessun archivio dei dati personali nel repository, nell'hosting statico o nel report aggregato.
3. Esportare ruoli, schema e dati secondo la guida, verificando esplicitamente la copertura di public/private e degli utenti Auth, RLS, policy, trigger, privilegi, ricevute e versioni legali. Inventariare le configurazioni non comprese nell'export, senza copiarne i segreti nel rapporto.
4. Per Storage creare anche un inventario riservato e copiare i file fisici tramite le API autorizzate, inclusi i bucket privati. Associare dimensioni e impronte alle copie. Non basta il dump dei metadati `storage.objects`; non modificare quelle righe per ripristinare i file.
5. Annotare fuori dall'archivio sensibile solo data, progetto, versioni, conteggi, impronte ed esito. Conservare separatamente codice e configurazioni di Auth/SMTP/Turnstile, funzioni, cron, dominio e variabili, indicando dove il gestore può ripristinarli in modo sicuro.
6. Provare il recupero in una destinazione isolata e identificata, con rete di invio email/push e job operativi disabilitati nel contesto di prova prima di importare dati. Nessun ripristino sperimentale sulla produzione. Non creare progetti o servizi fatturabili senza istruzione specifica.
7. Verificare conteggi e file, permessi A/B/C, fotografie private, documenti/ricevute, assenza di RPC privilegiate pubbliche e impossibilità di riaprire account già cancellati. Riesaminare le cancellazioni avvenute dopo la copia prima di ricollegare il servizio.
8. Registrare tempo e perdita massima effettivamente misurati; soltanto dopo dichiarare il recupero collaudato. In caso di incidente prima di questa prova, non promettere un tempo o un recupero completo non dimostrati.

## Controllo di spazio e code

Eseguire manualmente `supabase/launch/operational_status.sql` con il contesto operatore del progetto dedicato. Non esporla come endpoint pubblico. Confrontare separatamente la dashboard Usage per banda, quote condivise e consumo del periodo: non sono ricavabili dai byte istantanei di questo report.

Le soglie già proposte in COSTI.md (70–80%) sono un promemoria operativo, non allarmi attivati. Se un limite si avvicina, verificare prima file inutilizzati e traffico; non cancellare foto necessarie, estendere quote o cambiare piano automaticamente. Nessun cron, promemoria o monitoraggio continuativo è stato creato in questo intervento.

## Fonti ufficiali ricontrollate

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/platform/database-size
- https://supabase.com/docs/guides/platform/manage-your-usage/storage-size

Changelog controllato: PostgreSQL 17.11 richiede attenzione agli operatori personalizzati e ad alcune estensioni nel dump/ripristino. Non sono state eseguite reindicizzazioni o altre modifiche fuori ambito. La guida va riletta al momento dell'esecuzione effettiva; nessun comando di ripristino non provato è stato inventato qui.
