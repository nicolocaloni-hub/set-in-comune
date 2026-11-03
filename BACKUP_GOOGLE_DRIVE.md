# Backup esterno: preparazione e stato reale

Aggiornato: 3 novembre 2026. **Nessun backup reale del database o delle foto è stato creato e nessun ripristino del database è stato verificato.** Lo script è una preparazione da collaudare con gli accessi reali, non una procedura già certificata per il recupero.

Destinazione verificata: account `rent.to.a.friend@gmail.com`, cartella privata [RENT TO A FRIEND – Backup](https://drive.google.com/drive/folders/1v6XMqTwAZZQSxwrqyz_XFQCIjcxtYxM9). Il 3 novembre un file fittizio di 109 byte è stato caricato, riscaricato e confrontato byte per byte; aveva come unico proprietario l'account previsto. Il file di collaudo è stato eliminato. Questo prova soltanto il trasferimento tramite il collegamento Drive.

## Esecuzione cloud dal browser: nessuna installazione sul PC

Il workflow `.github/workflows/rtaf-backup.yml` prepara Python, client PostgreSQL 17 e GnuPG in un runner temporaneo di GitHub Actions. Non cambia il sistema operativo o le impostazioni del computer del titolare. Il collegamento Python ricevuto in precedenza non serve per questo percorso.

Al push dei soli file relativi al backup esegue test con dati fittizi, senza accessi di produzione. Il test GnuPG deve passare realmente: ogni test saltato rende il controllo fallito nel cloud. Il test locale saltato per il limite del runtime resta non eseguito finché non si osserva un run cloud riuscito.

Per avviare dal browser, il workflow deve essere sul ramo predefinito `main`. In **Actions → RTAF cloud backup → Run workflow**, lasciare disattivata `capture` per il primo collaudo. Non è stata attivata alcuna periodicità. Consuma i minuti di GitHub Actions del piano: non abilitare addebiti aggiuntivi senza valutare la quota disponibile.

La copia reale parte soltanto da `main`, tramite avvio manuale, con entrambe le opzioni `capture` e `quiet_window` attive. Inserire nelle **Settings → Secrets and variables → Actions → Secrets** del repository privato:

- `RTAF_DB_PASSWORD`: password database esistente, senza modificarla o resettarla alla cieca.
- `RTAF_STORAGE_SECRET`: chiave server Supabase con lettura dei bucket privati.
- `RTAF_BACKUP_PUBLIC_KEY_ASC`: intero blocco ASCII della sola chiave pubblica OpenPGP.
- `RTAF_BACKUP_FINGERPRINT`: impronta completa corrispondente, verificata dal titolare.

Le eventuali `RTAF_DB_HOST` e `RTAF_DB_USER` vanno nelle **Variables** della stessa pagina, usando il pooler in modalità sessione e i valori del pannello Connect del progetto. Nessun segreto va negli input visibili del workflow o in chat. Le credenziali permettono l'accesso a dati reali: mantenere privato il repository e consentire modifiche a codice e workflow soltanto a collaboratori fidati.

La chiave reale di recupero è stata generata e verificata il 3 novembre 2026 nel [run 41717578532](https://github.com/nicolocaloni-hub/set-in-comune/actions/runs/41717578532). Il titolare ha confermato il download del pacchetto e la configurazione delle chiavi pubbliche su GitHub. L'impronta pubblica è `C9EFC8DE0028369D0553D1CD10954ABD47A5A737`. La prova ha recuperato la chiave esportata in un portachiavi separato e decifrato dati fittizi: non è un ripristino del database reale. Conservare il file privato cifrato e la passphrase separatamente; non inserire la chiave privata nel repository.

Il titolare ha verificato nel pannello Connect l'host session pooler `aws-1-eu-central-1.pooler.supabase.com`. Il wrapper cloud lo usa come predefinito, con utente `postgres.srjdysdhxnafjrutufmk`, porta 5432 e verifica TLS completa. Non serve aggiungere una variabile GitHub per questo host. La connessione e il dump reali restano da verificare.

Se riesce, il workflow pubblica temporaneamente (un giorno) **solo l'archivio cifrato e il suo checksum**, tra gli Artifacts del run. Nessun upload a Drive è implementato in questo workflow. Scaricare dal browser l'archivio cifrato e il checksum e caricarli nella cartella Drive verificata è un trasferimento di file, senza installare programmi. Prima di dichiarare la copia esterna completa, riscaricare da Drive e confrontare il checksum. Per automatizzare anche l'upload a Drive servirà un'autorizzazione Google dedicata al runner: il collegamento della chat non viene esportato.

La copia reale, il trasferimento del relativo archivio e la prova di ripristino isolata restano da eseguire. Il workflow non contiene alcun comando di ripristino in produzione e non sostituisce la verifica di compatibilità del dump con il target Supabase.

## Prerequisiti da configurare in ambiente protetto

### Preparare la chiave di recupero dal browser

Il workflow **RTAF recovery key** crea la chiave su un runner temporaneo; non installa nulla sul computer del titolare. Al push esegue soltanto il collaudo con una chiave fittizia e passphrase casuale temporanea, senza credenziali di produzione. Per la creazione reale:

1. Generare nel proprio gestore password una passphrase casuale di almeno 32 caratteri, su una sola riga, e conservarla. Inserirla temporaneamente nei segreti Actions come `RTAF_RECOVERY_PASSPHRASE`.
2. Aprire **Actions → RTAF recovery key → Run workflow**, selezionare `main` e attivare `generate` e `saved_passphrase`. Si crea una NUOVA coppia di chiavi a ogni avvio: non ripetere per errore e non sostituire una chiave usata per backup precedenti senza conservare anche quella vecchia.
3. Il programma genera una chiave OpenPGP RSA 3072 protetta dalla passphrase e con validità di tre anni. La esporta in un ulteriore involucro GPG AES-256 protetto dalla stessa passphrase. In un portachiavi separato riapre il file esportato e verifica la decifratura di dati fittizi; verifica anche il rifiuto di una password errata. Nessun accesso a Supabase avviene in questo passaggio.
4. A run riuscito scaricare dagli Artifacts il pacchetto `rtaf-recovery-key-…` (disponibile per un giorno). Conservare **PRIVATE_RECOVERY_KEY.asc.gpg** in un luogo sicuro separato dai backup, con una seconda copia indipendente. La passphrase resta nel gestore password. Scaricare questi documenti non cambia impostazioni o sistema operativo del PC.
5. Aprire come testo `PUBLIC_KEY.asc` e inserirne il contenuto in `RTAF_BACKUP_PUBLIC_KEY_ASC`; inserire il contenuto di `FINGERPRINT.txt` in `RTAF_BACKUP_FINGERPRINT`. Sono i soli dati da trasferire al workflow che crea backup.
6. Dopo aver salvato le copie e verificato i file, eliminare da GitHub il segreto temporaneo `RTAF_RECOVERY_PASSPHRASE` e l'artifact di generazione. Non eliminare le copie di recupero conservate dal titolare. Non inviare chiave privata o passphrase in chat.

La generazione cloud comporta temporaneamente la disponibilità del materiale privato al runner e della passphrase al segreto Actions: affidarsi solo al repository privato e ai suoi collaboratori fidati, eliminando la passphrase dal servizio a setup concluso. La chiave reale è stata generata nel run indicato sopra; la prova del pacchetto non equivale al ripristino del database.

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

La chiave privata di recupero e la relativa passphrase restano al titolare, in un luogo sicuro separato dalla cartella dei backup. La coppia reale è già stata generata e verificata come indicato sopra: non rigenerarla per avviare il backup.

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
