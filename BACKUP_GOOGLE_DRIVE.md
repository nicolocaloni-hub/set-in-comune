# Backup esterno: preparazione e stato reale

Aggiornato: 3 novembre 2026. **Nessun backup reale del database o delle foto è stato creato e nessun ripristino del database è stato verificato.** Lo script è una preparazione da collaudare con gli accessi reali, non una procedura già certificata per il recupero.

Destinazione verificata: account `rent.to.a.friend@gmail.com`, cartella privata [RENT TO A FRIEND – Backup](https://drive.google.com/drive/folders/1v6XMqTwAZZQSxwrqyz_XFQCIjcxtYxM9). Il 3 novembre un file fittizio di 109 byte è stato caricato, riscaricato e confrontato byte per byte; aveva come unico proprietario l'account previsto. Il file di collaudo è stato eliminato. Questo prova soltanto il trasferimento tramite il collegamento Drive.

## Prerequisiti da configurare in ambiente protetto

Usare una macchina amministrata e temporanea con Python 3, client PostgreSQL **17** (`pg_dump`, `pg_dumpall`, `pg_restore`), certificati CA aggiornati e GnuPG funzionante. Il runtime della sessione attuale non ha i client PostgreSQL e vieta i socket di `gpg-agent`: il test reale di cifratura/decifratura qui è rimasto non eseguito.

| Impostazione | Contenuto e provenienza |
| --- | --- |
| `RTAF_DB_PASSWORD` | Password dell'accesso diretto PostgreSQL del progetto `srjdysdhxnafjrutufmk`, inserita soltanto nel gestore di segreti del runtime scelto. Non resettare la password senza verificare gli altri utilizzatori. |
| `RTAF_STORAGE_SECRET` | Chiave server Supabase che possa leggere tutti e tre i bucket, compreso `handoff-photos`. Non usare la chiave anonima e non inserirla nel frontend. |
| `RTAF_BACKUP_PUBLIC_KEY` | Percorso di un file contenente soltanto la chiave pubblica OpenPGP del titolare. |
| `RTAF_BACKUP_FINGERPRINT` | Impronta completa della chiave pubblica, verificata dal titolare. |
| `RTAF_DB_HOST`, `RTAF_DB_USER` | Facoltativi: host e utente del pooler in modalità sessione, porta 5432, regione Francoforte, se l'IPv6 diretto non è disponibile. Copiarli dal pannello Connect del progetto. |
| `RTAF_DB_CA` | Facoltativo: percorso CA esplicito, se necessario. La verifica TLS completa è obbligatoria; non disabilitarla. |

Le credenziali non vanno incollate in chat, in comandi con valori letterali, nel repository, nei log o nelle variabili pubbliche del sito. Il collegamento Drive della chat non fornisce un token esportabile per programmi esterni. Per un processo autonomo occorrerebbe configurare separatamente un'identità Google autorizzata alla cartella; ciò non è stato fatto.

La chiave privata di recupero e la relativa passphrase restano al titolare, in un luogo sicuro separato dalla cartella dei backup. Prima della prima copia reale generare la coppia sul suo dispositivo e provare a decifrare un archivio fittizio. Non è stata generata una chiave privata di produzione in questa sessione.

## Esecuzione manuale preparata

Dopo aver predisposto le variabili in modo protetto, dalla radice del repository:

```sh
python3 -m unittest discover -s tests -p test_rtaf_backup.py -v
python3 scripts/rtaf_backup.py preflight
python3 scripts/rtaf_backup.py capture --output-dir backup-output
```

Il programma legge il database senza modificarlo: esportazione logica completa in formato custom e ruoli senza password. Non esclude gli schemi Auth, Storage o private. Se i permessi sui componenti gestiti impediscono l'esportazione, si ferma: un dump parziale non deve essere accettato. La compatibilità del dump nativo con tutti i componenti del progetto va ancora verificata; consultare anche la procedura ufficiale Supabase CLI prima dell'uso reale.

Scarica i file fisici di `listing-photos`, `profile-photos`, `handoff-photos`, controlla paginazione, dimensioni e inventario prima/dopo, crea un manifesto SHA-256 e cifra per la chiave pubblica verificata. I limiti attuali sono 1.500 foto JPEG, 512.000 byte per foto, archivio decompresso massimo 2 GiB: si ferma se vengono superati. Aggiornare questi limiti se cambia il prodotto, senza saltare i controlli.

Serve una finestra senza scritture applicative per una copia coerente tra database e file: i due servizi non condividono una transazione. Il confronto degli inventari non dimostra da solo la coerenza di tutti i riferimenti del database. Non mettere il sito in manutenzione automaticamente senza un piano operativo concordato.

Il plaintext vive in una directory temporanea e viene rimosso all'uscita normale e sugli errori gestiti; questo non equivale a cancellazione forense e un arresto forzato potrebbe lasciarlo sul disco. Usare disco cifrato e runtime effimero. Caricare **soltanto** il file `.tar.gz.gpg` nella cartella verificata, poi riscaricarlo e confrontare SHA-256. Il comando `capture` non effettua upload e restituisce esplicitamente `drive_uploaded: false`.

## Prova di ripristino ancora necessaria

1. Decifrare una copia riscaricata in un ambiente isolato. Eseguire `python3 scripts/rtaf_backup.py verify-archive /percorso/archivio.tar.gz`: verifica hash e contenuto, **non ripristina PostgreSQL**.
2. Preparare un'istanza di prova compatibile con Supabase/PostgreSQL 17, estensioni, ruoli gestiti e migrazioni del repository. Nessuna connessione di scrittura alla produzione.
3. Disabilitare prima del ripristino email, push, webhook, cron e funzioni con effetti esterni. Ricreare la configurazione necessaria da fonti protette: Auth/SMTP, redirect OAuth, funzioni e relativi segreti, API keys e chiave radice Vault non sono ricostruiti automaticamente da questo script.
4. Ripristinare ruoli e database con una procedura adattata al target isolato; copiare i file nei bucket di prova tramite API Storage. Non scrivere direttamente nella tabella `storage.objects` come sostituto dell'upload fisico.
5. Confrontare conteggi, vincoli, RLS, hash di tutte le foto e riferimenti da profili, annunci e consegne. Verificare login con account di prova e letture autorizzate/non autorizzate. Registrare durata, errori e campione di funzioni applicative.
6. Soltanto a esito positivo registrare backup come recuperabile e definire frequenza, conservazione e notifiche di errore. Nessuna pianificazione è stata attivata.

## Verifiche del 3 novembre 2026

- Suite backup offline: 11 test superati, 1 test reale GnuPG non eseguito per il limite del runtime indicato sopra. Coperti paginazione dei bucket privati, hash, rifiuto di percorsi non sicuri e chiavi private, interruzione su foto cambiate e rimozione dell'output cifrato incompleto.
- Suite applicativa: 172 test superati. Build completata. Scansione dei pattern noti di credenziali: nessun risultato in 136 file di lavoro e 489 blob della cronologia locale. La scansione non prova l'assenza di ogni possibile segreto.
- Cartella Drive verificata vuota dopo l'eliminazione del file fittizio. Nessun dato reale o chiave privata caricati.

## Riferimenti

- [Supabase: backup e ripristino](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase: database backups e limiti per Storage](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL 17: pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html)
- [PostgreSQL 17: pg_dumpall](https://www.postgresql.org/docs/17/app-pg-dumpall.html)

I precedenti `RECOVERY_PLAN.md` e `BACKUP_TEST_STATUS.md` descrivono controlli precedenti; la richiesta attuale autorizza a proseguire, ma non dimostra l'esistenza di una copia reale.
