# Privacy · consegna operativa del 2 novembre 2026

**Decisione del gestore: privacy approvata e considerata risolta il 2 novembre 2026.** Nicolò ha confermato espressamente di considerare risolta la questione dopo il riepilogo dei limiti di Gmail. Restano assistenza Gmail, piani gratuiti, pubblicità rinviata e Cloudflare in attesa del ripristino IONOS. Non occorre un altro consenso generico a queste scelte. L'approvazione del gestore non attesta prove tecniche non effettuate, non crea accordi mancanti con i fornitori e non apre il servizio agli utenti reali.

## Fatti acquisiti e lavoro predisposto

- Titolare: Nicolò Caloni. Canale pubblico per assistenza e diritti: `assistenza@rent-to-a-friend.it`, inoltrato da IONOS a `assistenza.rtaf@gmail.com`. Resta questo canale; non si crea Proton e non si cambia destinatario. Le risposte possono partire da Gmail, come già scelto.
- Il sito sul dominio resta demo. La demo Cloudflare Pages `https://rent-to-a-friend.pages.dev/` è stata creata dal gestore e verificata nel browser; il dominio serve ancora Vercel. La migrazione DNS è sospesa su richiesta del gestore dopo errori del pannello IONOS. Nessun passaggio a Cloudflare è dichiarato completato.
- Nessun checkout, commissione, pubblicità, analisi del pubblico o email marketing. Le sole email applicative previste sono conferma indirizzo e recupero password. La possibilità di pubblicità futura non autorizza ad attivarla adesso.
- Informativa, cookie/memoria e condizioni distinguono demo, servizio collegato, fornitori e dati locali. La revisione RC5 esplicita l'assenza di qualsiasi pubblicità e il canale per i diritti senza account o nuova accettazione; non richiede password o documenti per email.
- Registro dei trattamenti, valutazione preliminare degli interessi di sicurezza, calendario candidato, gestione richieste, eccezioni e incidenti sono in `PRIVACY_OPERATIONS.md`. Le prove SQL storiche e i test locali sono distinti dai collaudi del servizio collegato ancora mancanti.
- I criteri di conservazione e le loro motivazioni restano in `CONTACT_RETENTION_REVIEW.md`: la successiva approvazione del gestore è registrata qui; non occorre chiedere un nuovo sì indistinto. La prova della procedura e i tempi effettivi di copie/log restano controlli del rilascio. Non vengono promesse pulizie automatiche inesistenti.

## Limiti registrati insieme all'approvazione

### 1. Assistenza Gmail consumer

Google dichiara di non offrire un DPA e di non operare come responsabile per Gmail consumer. Le linee guida EDPB 07/2020 richiedono però di qualificare i ruoli in base alle operazioni effettive: non basta assegnare a Google il ruolo di titolare in un testo, né il consenso degli utenti può sostituire un contratto da responsabile quando necessario.

Il caso concreto è ristretto: posta di assistenza e richieste privacy, mittente e contenuto necessario, gestore unico, inoltro IONOS, nessuna email di marketing, nessuna esportazione automatica di chat/foto dal backend verso Gmail. Non sono documentati un esito specifico su ruolo, base della comunicazione e trasferimenti o la copertura dell'inoltro IONOS come se fosse una casella completa. Non si afferma che Gmail sia vietato in ogni caso, né che il semplice avviso nell'informativa equivalga a un DPA.

La scelta di mantenere Gmail è conclusa dal gestore. Non richiediamo una password o una nuova casella e non acquistiamo Workspace. L'approvazione non viene trasformata in una certificazione giuridica del fornitore. Le verifiche della casella descritte sotto restano controlli tecnici distinti.

### 2. Recapito del gestore

Identità e contatto GDPR sono già individuati; il possibile domicilio/sede richiesto dalle norme sui servizi della società dell'informazione è una questione distinta. Il servizio attuale è gratuito per l'uso della piattaforma, mette in contatto privati per noleggi a pagamento esterni all'app e potrebbe finanziarsi con annunci soltanto in futuro. Questi fatti vanno usati nella qualificazione dell'attività: nessuna esenzione è dedotta automaticamente dall'assenza di incasso nell'app.

Non è stato fornito un esito specifico sull'applicabilità degli obblighi di recapito al servizio effettivo, né un indirizzo autorizzato alla pubblicazione. Se occorre un domicilio/sede, deve essere reale e pertinente; non deve necessariamente essere casa propria. Città o indirizzo inventato non sono sostituti automatici. Nessun indirizzo viene cercato nei dati dell'account o pubblicato da questa revisione. `postalAddressRequired` resta `null`: l'approvazione non viene tradotta nell'affermazione fattuale che non sia richiesto alcun recapito.

## Verifiche operative da completare

| Ambito | Riscontro concreto | Limite attuale |
|---|---|---|
| Casella di assistenza | Accessi/deleghe, verifica in due passaggi e recupero; ricezione all'indirizzo pubblico e risposta; cartelle ricevuti/inviati/allegati e copie | La connessione Gmail disponibile appartiene all'account personale, non a questa casella. Non è una verifica di `assistenza.rtaf@gmail.com`. Non chiedere codici di recupero in chat. |
| Conservazione | Applicare la procedura a dati sintetici, controllare dipendenze, file e copie; documentare i tempi dei fornitori e le eccezioni | Nessuna pulizia periodica generale attiva; nessuna eliminazione reale per prova. Un testo o un calendario non dimostrano l'esecuzione. |
| Diritti nel servizio collegato | Prova completa da interfaccia, esportazione con file pertinenti, cancellazione semplice e gestione dei casi condivisi | Test locali/SQL precedenti non attestano un collaudo UI collegato. |
| Fornitori del sito | Concludere il passaggio Cloudflare e mantenere il fornitore reale nell'informativa; verificare account/accordi e log/copie pertinenti | Pages demo attiva, dominio ancora Vercel; IONOS in attesa. |

Il calendario operativo è manuale: non occorre acquistare un sistema di ticket o attivare un job per redigere la procedura. Il gestore deve poterla applicare e verificarne gli esiti prima di prometterla agli utenti. Nessun promemoria, filtro Gmail, messaggio a terzi o cancellazione è creato da questo documento.

## Approvazione e rilascio restano distinti

La scelta e l'approvazione del gestore sono concluse; non si riaprono con un'altra richiesta di consenso. I riscontri dei fornitori e le prove operative devono essere registrati senza dati personali superflui prima di marcare i relativi controlli tecnici come superati. I flag esistenti del build non distinguono l'approvazione editoriale dalla prontezza completa: restano invariati per preservare i blocchi demo/privacy già richiesti. Questa consegna non pubblica documenti nel database e non apre il servizio modificando soltanto un booleano.

## Verifica della consegna

Revisione locale: 122 test superati, build demo Vercel e Pages riusciti, controllo delle differenze senza errori di spaziatura e scansione dei pattern noti di credenziali senza rilievi. Nessuna dipendenza installata: sono state riutilizzate quelle già presenti per i soli test. Gli snapshot RC5 sono rigenerati come `proposal-not-published`; nessun SQL di pubblicazione è generato o applicato e nessuna prova operativa remota viene dedotta dai test locali.

## Fonti primarie ricontrollate

- Google, Gmail consumer e assenza DPA: https://support.google.com/policies/answer/9581826?hl=it
- EDPB, linee guida definitive 07/2020 su titolare e responsabile: https://www.edpb.europa.eu/documents/guideline/guidelines-072020-on-the-concepts-of-controller-and-processor-in-the-gdpr_en
- EDPB, gestione dei diritti e verifiche d'identità proporzionate: https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en
- Garante, contenuti dell'informativa: https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/8981258
- D.lgs. 70/2003, artt. 2 e 7, testo pubblicato dal Parlamento: https://www.parlamento.it/parlam/leggi/deleghe/03070dl.htm
- CNIL, scelta e attuazione delle durate: https://www.cnil.fr/sites/default/files/atoms/files/guide_durees_de_conservation.pdf


## Testi pubblici per il servizio · 2 novembre 2026

Su richiesta del gestore, privacy e condizioni pubbliche descrivono il servizio con account e il confine tra consultazione libera, accesso e registrazione. Le pagine pubbliche non usano più il testo principale delle condizioni demo. Un ambiente espressamente marcato demo rimane descritto separatamente, senza promettere operazioni reali in una build locale.

Accesso Google rimandato dal gestore: nessuna attivazione OAuth e nessuna descrizione di Google Sign-In come funzione disponibile. IONOS/Gmail resta il canale di assistenza già scelto; non viene cambiato o dichiarato coperto da un DPA consumer. I criteri di conservazione pubblici distinguono le revisioni manuali dalla pulizia automatica generale, che non è attiva.

L’aggiornamento dei testi pubblici non crea ricevute di accettazione né pubblica una versione attiva nel database. Verifica di rilascio: il dominio pubblico restituisce ancora una configurazione backend vuota; il database ha zero versioni legali attive. Login, profilo ed esportazione Android del proprietario sono acquisiti; registrazione, recupero email e scambio tra due account reali non sono attestati dalla sola demo. I guard del rilascio restano invariati.


## Autorizzazione definitiva ai punti 1 e 2 · 2 novembre 2026

Il gestore ha autorizzato la pubblicazione della versione `2026-11-02-7` e il collegamento della produzione al backend dedicato. L’approvazione di pubblicazione viene registrata come tale, separata dalle evidenze tecniche e contrattuali non attestate. I flag storici di verifica fornitori e qualificazione del recapito non vengono impostati a vero per sbloccare un build. Il gate di pubblicazione verifica l’approvazione esplicita e i dati effettivamente pubblicati; nessuna ricevuta è creata senza la scelta autenticata del titolare dell’account. Nessuna cancellazione, nuova identità, prova di email o spesa è autorizzata implicitamente da questo aggiornamento.
