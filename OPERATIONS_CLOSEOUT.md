# Gestione operativa · riscontri del 3 novembre 2026

Gestore: Nicolò Caloni. Contatto: assistenza@rent-to-a-friend.it, inoltrato a assistenza.rtaf@gmail.com. Approvazione editoriale e pubblicazione già acquisite: non sono state richieste di nuovo e nessun testo legale attivo viene sostituito da questa revisione.

## Esito tecnico osservato

La prova `supabase/tests/operations_smoke.sql` è stata eseguita sul progetto dedicato `srjdysdhxnafjrutufmk`. Usa quattro identità temporanee in una transazione terminata con ROLLBACK; non sono account registrati via email o sessioni HTTP firmate. Le notifiche asincrone non vengono inviate perché non c'è COMMIT. Nessun caricamento fisico e nessuna risposta email esterna sono stati eseguiti.

| Percorso | Riscontro |
|---|---|
| Segnalazione | Creata dall'utente di prova su un annuncio di prova, visibile nella propria area e nella coda dell'operatore |
| Accessi | Utente estraneo senza accesso alle code, agli esiti altrui o alle tabelle private; invii di esiti e riscontri da parte sua respinti; RPC operatore non eseguibili dall'anonimo |
| Gestore | Ruolo riconosciuto dalla tabella privata, presa in carico e chiusura della pratica riuscite; stato non valido respinto |
| Intervento manuale | Operatore SQL ha messo in pausa il solo annuncio temporaneo, verificato che non fosse pubblico e ripristinato la visibilità; nessun annuncio reale coinvolto |
| Richiesta sui dati | Idempotenza, scadenza a un mese, presa in carico, lunghezza minima del riscontro e visibilità della risposta al solo richiedente verificate |
| Significato della chiusura | Registrare `completed` conclude il riscontro e non elimina l'account. Il test ha verificato che il profilo continuasse a esistere |
| Esportazione | Profilo del richiedente corretto; assenza dei campi credenziali controllati. Il pacchetto non è stato salvato o pubblicato |
| Conservazione | Pratiche temporanee chiuse e retrodatate oltre 12 mesi individuate per revisione; pratica riaperta esclusa dai casi chiusi. Nessuna eliminazione reale |

Una lettura indipendente dopo il rollback ha riscontrato **zero account, profili, annunci, segnalazioni e richieste temporanee**, un solo account Auth totale, un solo moderatore e zero foto nei tre bucket. I dati originali sono preservati. Evidenza aggregata: [supabase/operations/evidence-2026-11-03.json](supabase/operations/evidence-2026-11-03.json).

Il primo tentativo della prova si è fermato perché il programma di test non aveva ripristinato le claim dopo la fase anonima. È stato corretto il test e ripetuto con successo; non viene attribuito questo errore all'applicazione.

Il precedente collaudo HTTP reale delle cancellazioni semplici e del ciclo tra due account resta documentato in [LIVE_ACCOUNT_TEST.md](LIVE_ACCOUNT_TEST.md). Non è stato ripetuto eliminando nuovi account reali. Nessuna nuova prova di ricezione push, telefono o recapito email viene dedotta da questi test SQL.

## Procedura quotidiana del gestore

1. Accedere con il proprio account già autorizzato. Dal Profilo aprire Sicurezza e gestione segnalazioni; da I tuoi dati aprire la coda delle richieste privacy. Le voci operatore sono riservate al ruolo effettivo; non creare ruoli tramite metadati del profilo.
2. Prendere in carico la pratica, leggere soltanto i dati pertinenti e controllare riferimenti, controparti e noleggi aperti. Per le richieste via email annotare un riferimento, data di ricezione e scadenza; non chiedere documenti d'identità di routine.
3. Registrare una motivazione minima, l'intervento previsto e il termine di riesame. Nei casi semplici usare le funzioni già disponibili; per rapporti condivisi o controversie fare la valutazione manuale descritta in PRIVACY_OPERATIONS.md.
4. Applicare e verificare l'intervento prima di dichiararlo eseguito. Il salvataggio dell'esito della segnalazione **non** sospende un account, nasconde un annuncio o invia una email. Il riscontro nella coda privacy **non** esegue l'eliminazione tecnica.
5. Dare il riscontro tramite il canale pertinente e solo con i dati necessari. Nell'app lo stato della segnalazione è visibile al segnalante; la nota del moderatore è interna. Il campo privacy è invece visibile al richiedente. I messaggi manuali di assistenza sono gestiti dal titolare; nessun invio automatico è stato aggiunto.
6. Chiudere solo dopo la verifica dell'esito; annotare cosa è stato fatto, cosa resta conservato e perché, eventuale riesame e data di chiusura. Una limitazione del diritto richiede una motivazione concreta, non il solo fatto che esista uno storico condiviso.

### Pausa e ripristino manuali

La pausa provata è un aggiornamento amministrativo mirato, con controllo di ID della segnalazione, ID annuncio e proprietario atteso, verifica della visibilità anonima e confronto con lo stato precedente. Usare una transazione con rollback per l'anteprima; confermare un caso reale solo dopo aver esaminato gli effetti. Non eseguire la prova completa sulle pratiche reali e non usare aggiornamenti senza WHERE.

La pausa non è un ban né un vincolo permanente contro la ripubblicazione da parte del proprietario. Una misura che richieda blocco duraturo o sospensione Auth necessita di una procedura distinta, verificando anche sessioni e token già emessi. Questa revisione non inventa tali pulsanti, non sospende account e non cancella dati condivisi. I noleggi già creati non vengono annullati dalla sola pausa.

## Assistenza: riscontro acquisito dal titolare

Il titolare ha confermato in questa sessione **ricezione dell'inoltro, possibilità di risposta, verifica in due passaggi e recupero configurati** sulla casella assistenza.rtaf@gmail.com. È una conferma fattuale del titolare, registrata come tale: il collegamento Gmail dell'assistente appartiene all'account personale e non è stato usato come prova delle impostazioni della casella di assistenza.

Le risposte dalla casella Gmail restano la scelta già acquisita. Nessuna nuova casella, impersonazione del mittente, delega, risposta automatica, filtro o cancellazione di posta è stato creato. Non salvare password, codici di recupero, corrispondenza o dati di pratiche nel repository.

## Conservazione manuale applicabile

I criteri approvati restano invariati: revisione delle chat preliminari a 12 mesi, noleggi conclusi e riscontri a 24 mesi, pratiche chiuse a 12 mesi, notifiche lette/log app a 90 giorni, assistenza email a 12 mesi dalla chiusura. Sono criteri organizzativi con eccezioni concrete, non scadenze legali universali o un'autorizzazione a cancellare tutto.

Eseguire dal SQL Editor dell'operatore [supabase/operations/review.sql](supabase/operations/review.sql). È una transazione di sola lettura, con timeout, che restituisce solo conteggi. Il controllo effettuato ha restituito un moderatore e zero pratiche aperte/scadute o candidati delle categorie analizzate. Non è stato eliminato alcun dato.

Per ogni candidato: verificare controversie, noleggi attivi, richieste in corso, dipendenze e riferimenti dei file; limitare un'eventuale conservazione ulteriore ai dati necessari e fissare il riesame. Il conteggio è un invito alla revisione, non una lista automaticamente eliminabile. I file si rimuovono tramite Storage API, mai cancellando soltanto `storage.objects`.

Posta ricevuta, inviata, allegati, copie Drive e log dei fornitori sono controlli separati. Una cancellazione Supabase non li elimina. Dopo un recupero da una copia precedente vanno riapplicate le cancellazioni e rettifiche successive prima di riaprire il servizio. Non sono state attivate cancellazioni periodiche né una nuova durata delle copie esterne. Il promemoria mensile per il backup manuale già concordato resta invariato.

## Fornitori e recapiti: verifiche documentate, esiti non forzati

Il fascicolo aggiornato è in [PROVIDERS_REVIEW.md](PROVIDERS_REVIEW.md). Il contatto pubblico e il titolare sono identificati; la qualificazione dell'eventuale recapito postale resta distinta. Non sono stati ricavati indirizzi da fatture, account o altre fonti personali e nessun indirizzo è stato pubblicato.

Restano **due aree esterne da chiudere con riscontri specifici**, senza un'altra approvazione generica dei testi:

- applicabilità dell'obbligo di domicilio/sede al servizio effettivo e, se dovuto, recapito reale autorizzato alla pubblicazione;
- ruolo e copertura contrattuale dei servizi effettivi, in particolare Vercel Hobby, Gmail/Drive consumer e piano/accordo dell'account GitHub che esegue Actions. Gli accordi standard Supabase e Resend sono stati ricontrollati, ma il solo possesso di un account non prova qualsiasi valutazione giuridica.

La conferma della sicurezza della casella non crea un DPA per Gmail consumer. Cifrare una copia riduce l'esposizione, ma non sostituisce automaticamente la valutazione del fornitore. Non sono stati acquistati piani, cambiati DNS o attivati fornitori alternativi. I flag di qualificazione giuridica ancora aperti non sono stati marcati come superati per far risultare tutto concluso.

## Verifiche della consegna

172 test automatici superati senza errori o salti, sintassi JavaScript e diff check riusciti, build demo completata e scansione dei pattern di credenziali superata. Le due modifiche alla schermata operatore chiariscono che il salvataggio non esegue provvedimenti e mantengono selezionato lo stato delle richieste privacy già concluse/limitate; non cambiano testi legali, ruoli o impostazioni Auth. I file operativi sono sorgenti del repository e non nuovi endpoint pubblici.
