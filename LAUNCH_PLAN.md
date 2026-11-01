# RENT TO A FRIEND · Preparazione del lancio

Stato al 1 novembre 2026. Preparazione, non dichiarazione di servizio aperto.

## Scelte confermate

- Solo privati maggiorenni, inizialmente Roma; escluso l’uso per aziende o attività professionali.
- La piattaforma mette in contatto le persone. Nessun pagamento, cauzione, commissione, rimborso o polizza viene gestito dall’app; gli accordi economici sono fra le parti.
- Conferma indirizzo e recupero password sono le sole email applicative. Le notifiche di chat/noleggi sono nell’app o push facoltative, ancora da collaudare sui dispositivi.
- Restare sui piani gratuiti Supabase e Vercel; nessuna prova a pagamento o spesa autorizzata. Il dominio già esistente resta invariato.

## Piani gratuiti e decisione prima dell’apertura

**Supabase:** non è richiesto un upgrade per abilitare Auth, database e Storage nelle quote Free. Le quote pubblicate sono 500 MB database, 1 GB file, 5 GB egress e 5 GB cached egress, 50.000 utenti attivi mensili; il progetto può essere sospeso dopo una settimana di inattività. Il piano gratuito non include backup automatici e SLA. Quote globali, spazio residuo e procedura di recupero devono essere monitorati, senza acquisti automatici.

**Vercel:** il team corrente risulta Hobby. La policy limita Hobby all’uso personale non commerciale e include fra gli esempi commerciali la promozione di prodotti o servizi a pagamento. Il modello senza commissioni e senza checkout è confermato dal proprietario, ma non è stata ottenuta una risposta di Vercel sulla sua idoneità a Hobby. Non considerare né certa la necessità di pagare né certa l’ammissibilità: serve un chiarimento specifico. Il DPA pubblico copre Pro/Enterprise per i trattamenti da responsabile; va verificato il ruolo effettivo dell’hosting statico e la copertura applicabile.

Rimanere gratuiti è un vincolo del proprietario. Se Vercel richiede Pro per questo uso, l’apertura su Vercel resta sospesa; un hosting gratuito alternativo richiede una scelta del proprietario e verifica di condizioni, privacy, dominio e header. Non è stata iniziata alcuna migrazione.

Fonti ufficiali ricontrollate:
- https://vercel.com/docs/limits/fair-use-guidelines
- https://vercel.com/legal/dpa
- https://supabase.com/pricing

## Preparato in questo ramo

- Banner e footer della modalità collegata descrivono il noleggio tra privati a Roma.
- La registrazione collegata non dice più che gli account reali sono chiusi. La demo mantiene il proprio avviso.
- Privacy: Resend è descritto per conferma e recupero; nessuna email chat/marketing promessa. Restano visibili le verifiche incompiute, senza marcarle come approvate.
- Condizioni: il recapito viene letto dalle impostazioni del titolare e protetto da escape HTML; nessun indirizzo personale inventato.
- Cookie e memoria: la modalità collegata non presenta dati della demo come dati dell’account; restano spiegati sessione per scheda e PKCE.
- Conferma e recupero email spiegano browser, dispositivo e monouso del link. Il callback canonico resta invariato.
- Revisione della privacy, dei fornitori e della conservazione ancora false. La build collegata continua a fallire finché questi prerequisiti non sono completati.

Queste modifiche non includono la PR #1 CAPTCHA, non modificano il backend o le policy di accesso, non svuotano dati e non aprono account al pubblico.

## Evidenze già disponibili

| Ambito | Risultato | Limite della verifica |
|---|---|---|
| Callback | `https://rent-to-a-friend.it/` per conferma e recupero; redirect reale verificato | Flusso richiesto dall’ambiente di test, non dalla UI pubblica |
| Email | Conferma e recupero consegnati in Gmail, SPF/DKIM/DMARC superati | Serve il collaudo finale partendo dalla UI collegata |
| Password | Reset riuscito, vecchia password rifiutata, nuova accettata; sessioni di prova chiuse | La sessione del browser e l’interfaccia recovery richiedono prova completa |
| Configurazione Auth | Minimo 10 caratteri; password attuale richiesta nel cambio ordinario; conferma email attiva | CAPTCHA ancora spento |
| Dati condivisi | Verificati 1 profilo, 0 annunci, 0 prenotazioni nel progetto dedicato | Il profilo è l’account di prova Auth; non è un catalogo di utenti reali |
| Pubblico | Demo, configurazione backend pubblica vuota | Nessun lancio avvenuto |

## Attività che impediscono di dichiarare pronto il lancio

| Attività | Cosa manca |
|---|---|
| Hosting gratuito | Chiarimento di ammissibilità su Vercel Hobby e copertura privacy, oppure scelta di un’alternativa gratuita verificata |
| Titolare e documenti | Recapito da rendere pubblico, revisione definitiva dell’informativa e delle condizioni, verifica effettiva degli accordi dei fornitori |
| Conservazione | Decisione per finalità su chat, noleggi, riscontri, segnalazioni, log e backup; procedure coerenti. La matrice è ancora bozza; nessuna cancellazione periodica generale è stata attivata |
| Accettazione condizioni | Condizioni definitive versionate, accettazione esplicita e ricevuta lato server da implementare e verificare; una casella frontend non è una ricevuta |
| Protezione abusi | Completare la configurazione e le prove CAPTCHA della PR #1; nessuna attivazione parziale che blocchi registrazione, login o cancellazione |
| Operatore | Account del gestore, accesso alle code, procedura per assistenza, segnalazioni, cancellazioni non automatiche ed errori del worker |
| Collaudo con utenti distinti | A/B/C: accesso ai dati, chat/foto private, autorizzazioni, prenotazioni contemporanee, upload falliti, logout e cancellazione con sole fixture di prova |
| Dispositivi | Registrazione e recupero dalla UI, desktop e telefono, link monouso/scaduti/browser differente, permessi e consegna push, tastiera e accessibilità |

## Sequenza di apertura, dopo i prerequisiti

1. Chiudere la decisione sull’hosting senza attivare spese; completare i dati e documenti del titolare.
2. Implementare ricevuta delle condizioni e procedure di conservazione approvate; collaudarle senza cancellare dati reali.
3. Completare CAPTCHA nell’ordine della PR #1, incluse le funzioni di cancellazione. Configurare l’operatore.
4. Generare un build collegato di prova con sole chiavi pubbliche e raggiungibile nel contesto approvato; provare tutti i flussi con account distinti e sole attrezzature di test chiaramente riconoscibili. Non copiare gli annunci della demo nel database.
5. Controllare quote, recupero dati, dominio, TLS e header; completare i test sui dispositivi.
6. Pubblicare il commit verificato quando i blocchi sono risolti; ricontrollare il dominio e sorvegliare errori, code e consumi. I cambi di piano restano esclusi senza nuova istruzione del proprietario.

## Verifiche della preparazione

- 102 test locali superati; build demo riuscito; scansione di credenziali senza rilievi.
- Build collegato verificato in errore sul blocco privacy, con configurazione pubblica di prova: nessun aggiramento.
- Sintassi dei tre moduli modificati e differenze Git controllate.
- Il browser cloud non raggiunge il server locale: `net::ERR_CONNECTION_REFUSED` su `127.0.0.1:4173`. Nessuna verifica visuale locale dichiarata riuscita. Il rendering dei testi nelle due modalità è coperto dai test, con dati fittizi solo in memoria.
- Il codice base corrisponde al tree remoto di `main` a `5b815a67da73fba9b33ad71786fa20ef0c37ef58`; le modifiche precedenti nel checkout CAPTCHA e nel checkout originale sono preservate.

Nessun esito locale sostituisce i collaudi remoti ancora elencati sopra.
