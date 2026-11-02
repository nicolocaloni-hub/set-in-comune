# Privacy e conservazione · proposta operativa RC4

Titolare: Nicolò Caloni. Contatto pubblico: assistenza@rent-to-a-friend.it.
Il recapito postale e gli obblighi informativi del gestore del sito restano da qualificare: il solo art. 13 GDPR non impone la pubblicazione della casa privata, ma non esaurisce gli altri obblighi applicabili al servizio. Nessun indirizzo è stato inventato o pubblicato.

## Registro essenziale dei trattamenti

| Operazione | Dati e accesso | Base proposta e verifica necessaria |
|---|---|---|
| Account | Email, credenziali gestite da Auth, nome visibile, quartiere; bio e foto facoltative | Esecuzione del servizio richiesto; minimizzazione dei dati opzionali |
| Annunci e richieste | Descrizione, foto, prezzi, date e dichiarazioni; dati pubblici degli annunci, accordi riservati alle parti | Servizio contrattuale/precontrattuale; nessun incasso o commissione del gestore |
| Chat e riscontri | Messaggi, note e foto pertinenti del ritiro/restituzione; controparti e accessi del gestore necessari | Fornitura della funzione richiesta; eventuali prove per un interesse specifico da documentare |
| Sicurezza/moderazione | Segnalazioni, fatti pertinenti, provvedimenti e motivi; solo operatore autorizzato | Legittimo interesse con valutazione di necessità/bilanciamento; eventuali obblighi specifici |
| Richieste privacy | Identificativo, richiesta, esito e date; gestore | Adempimento dei diritti e prova del riscontro, riducendo il contenuto conservato |
| Ricevute condizioni | Account, versione, impronte e data del server, dichiarazione privato maggiorenne | Gestione e documentazione delle condizioni del servizio; presa visione della privacy distinta dal consenso |
| Push | Endpoint e chiavi del dispositivo, preferenze; niente testo chat nella push | Funzione facoltativa richiesta e revocabile; verificare il servizio del browser/dispositivo |
| Assistenza email | Indirizzo mittente, oggetto e contenuto necessario; IONOS, casella Gmail e gestore | Assistenza richiesta o gestione dei diritti; evitare duplicazioni e dati sensibili non necessari |

Queste basi vanno valutate per le operazioni effettive. Non si chiede un unico consenso obbligatorio a tutti i trattamenti. Non si usa il consenso per sostituire un contratto con i fornitori. Il bilanciamento dell’interesse per abusi e contenziosi è documentato prima dell’apertura.

## Valutazione preliminare dell’interesse per la sicurezza

Finalità proposta: prevenire accessi automatizzati e abusi, tutelare utenti e funzionamento, gestire segnalazioni e singole contestazioni. Necessità: conferma email, limiti delle azioni, controllo dei soli fatti pertinenti e widget nei moduli protetti; nessun controllo generalizzato dei contenuti a fini pubblicitari. Alternative meno invasive: dati facoltativi, quartiere invece dell’indirizzo, notifiche senza testo chat, niente documenti d’identità nella procedura ordinaria.

Bilanciamento e garanzie da validare nel pilota: il visitatore può attendersi sicurezza, ma IP, segnali tecnici e interventi sugli account incidono sulla persona. Limitare accessi, spiegare i ruoli dei fornitori, motivare gli interventi e consentire contestazioni. Le segnalazioni hanno valutazione umana; non usare una semplice dichiarazione dell’utente come prova. Registrare necessità, dati e durata del singolo caso. Questo testo è la preparazione dell’analisi, non una certificazione che legittimi ogni trattamento del fornitore o una revisione già approvata.

## Calendario proposto e motivazioni

La matrice completa è `src/retention.js`. Le durate sono scelte organizzative proposte, non prescrizioni universali di legge. Nessun job di cancellazione periodica è attivato da questi numeri.

- Account: fino alla richiesta di chiusura; il profilo pubblico non resta visibile indefinitamente dopo la chiusura. I rapporti condivisi vengono verificati dal gestore.
- Foto sostituite: eliminazione dopo il salvataggio; upload orfani: proposta 24 ore con controllo di assenza di riferimenti.
- Chat senza noleggio: proposta 12 mesi dall’ultimo messaggio, per richieste, chiarimenti e segnalazioni tardive; riesaminare l’utilità nel pilota.
- Noleggi conclusi, chat collegate e riscontri: proposta 24 mesi dalla conclusione, per assistenza e contestazioni pratiche. Non è un termine di prescrizione e non copre automaticamente ogni controversia.
- Segnalazioni e richieste privacy chiuse: proposta 12 mesi per riscontro, riesame e controllo degli abusi; ridurre il contenuto all’esito necessario.
- Notifiche lette e log dell’app: proposta 90 giorni per diagnosi e contatori; mai password, token o contenuti completi delle chat nei log.
- Assistenza via email: proposta 12 mesi dalla chiusura della pratica, per riscontri e riesami; riesame manuale delle copie ricevute/inviate e degli allegati, distinguendo eventuali contenziosi. La cancellazione Supabase non elimina la posta Gmail. Nessun job della casella è attivo.
- Ricevute: durante l’account, con cancellazione quando Auth elimina l’utente. Se una controversia impone una prova ulteriore, valutare e documentare separatamente i soli dati necessari prima della cancellazione; non introdurre una conservazione indefinita di tutti i profili.
- Annunci e recensioni: mantenere solo durante la pubblicazione e verificare rimozione/anonimizzazione alla chiusura. La visibilità pubblica non è una giustificazione per conservarli per sempre.

## Controversie ed eccezioni

Registrare il riferimento della pratica, i dati indispensabili, la finalità, il motivo di proroga, chi decide, la scadenza di riesame e chi può accedere. Riesame almeno ogni sei mesi e al termine della pratica. Un blocco di cancellazione riguarda il solo contenuto pertinente; non blocca automaticamente tutti i dati dell’account. Non applicare a tutta la chat un indistinto termine fiscale decennale.

## Procedura manuale di conservazione, prima dell’automazione

1. Calcolare le scadenze in sola lettura; escludere noleggi aperti, pratiche e file referenziati. I dati di esempio non vanno copiati nel database condiviso.
2. Riesaminare le eccezioni, minimizzare i record e preparare un elenco di soli identificativi e percorsi, senza esportare contenuti inutili.
3. Controllare l’effetto sui diritti delle controparti, sulle FK e sulle viste pubbliche. La procedura di cancellazione attuale rinvia al gestore gli account con rapporti condivisi.
4. Cancellare file tramite Storage API, poi record eliminabili/anonimizzabili; mai limitarsi a cancellare righe da storage.objects. Lavorare a lotti con esito verificato e possibilità di ripresa.
5. Verificare dati residui, visibilità e scadenza delle copie dei fornitori. Registrare un esito minimale, non il contenuto eliminato.
6. Attivare l’automazione solo dopo prova su fixture, revisione dei criteri e verifica della procedura di recupero. La proposta non finge che questi job esistano già.

## Richieste degli interessati

### Gestione dell'assistenza Gmail mantenuta dal gestore

Canale confermato: `assistenza@rent-to-a-friend.it` inoltrato a `assistenza.rtaf@gmail.com`; risposte dalla casella Gmail come già scelto. Non creare una nuova casella, sostituire il destinatario o attivare risposte automatiche. Il gestore legge e gestisce personalmente le richieste; nessuna reperibilità continua è promessa.

Raccogliere il riferimento al contenuto e il minimo necessario per il problema. Evitare documenti, dati finanziari e allegati non pertinenti; usare verifiche proporzionate dell'identità per le richieste sui dati. Separare le pratiche aperte da quelle chiuse e annotare data di chiusura, motivo di eventuale conservazione ulteriore e riesame. La proposta di 12 mesi richiede una revisione manuale di ricevuti, inviati e allegati: cancellare un account Supabase non elimina la posta. Non cancellare messaggi reali per collaudare la procedura.

Verifiche ancora da riscontrare nella **casella di assistenza**, non nell'account Google personale: accesso riservato al gestore, protezione dell'account e recupero, destinatario effettivo dell'inoltro, ricezione e risposta, gestione delle copie. Nessuna di queste verifiche è attestata dal solo indirizzo pubblicato o dalla disponibilità di un collegamento Gmail di un altro account. Non esportare la posta in documenti pubblici o nel repository. L'informativa continua a indicare Gmail consumer e la questione contrattuale aperta; queste misure operative non sostituiscono la valutazione del ruolo e degli accordi.

- Canali: I tuoi dati o email di contatto; non subordinare accesso, opposizione o cancellazione all’accettazione di nuove condizioni.
- Identità: usare l’account autenticato o una verifica proporzionata; non richiedere di routine una copia del documento.
- Termine: riscontro entro un mese; se sono applicabili proroghe, comunicarne motivo e durata entro il primo mese.
- Accesso: il JSON dell’app è un aiuto e include le ricevute; il gestore deve verificare altri dati pertinenti, destinatari e limiti dei diritti altrui.
- Cancellazione semplice: worker per account senza rapporti condivisi; chiusura accessi e verifica effettiva di file/Auth. Con noleggi, chat o segnalazioni serve valutazione, non rifiuto automatico del diritto.
- Rettifica: il pacchetto SQL separa validazione avatar e quota delle modifiche, evitando di esporre la funzione parametrica dei limiti. Applicato al backend con migrazione `20261102000639`; smoke test remoto superato con rollback delle fixture. Il collaudo dalla UI collegata resta da completare.

## Incidenti e presidio

Limitare accessi e contenuti esposti, preservare solo le prove necessarie, annotare cronologia, dati coinvolti e rimedi. Valutare con tempestività gli obblighi di notifica: non ogni errore è automaticamente una violazione notificabile, e non si attende la conclusione dell’indagine quando decorrono termini applicabili. Nessun invio automatico ad autorità o utenti è implementato.

## Riferimenti primari

- GDPR, artt. 5, 6, 12–22, 28, 30 e 32–34: https://eur-lex.europa.eu/eli/reg/2016/679/oj/ita
- Garante, informativa: https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/8981258
- Ulteriori obblighi informativi del prestatore, da qualificare: https://www.normattiva.it/atto/caricaDettaglioAtto?atto.dataPubblicazioneGazzetta=2003-04-14&atto.codiceRedazionale=003G0090
