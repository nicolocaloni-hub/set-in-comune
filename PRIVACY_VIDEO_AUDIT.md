# Revisione dei video: privacy e trasparenza

## Nuovo video allegato · sette controlli prima della pubblicazione

31 ottobre 2026 · file `SaveClip.App_AQN0jZGZ7yKYSD-nJpFmeDnBN0tddd52FEMa-yf0h-K9Eegj99mcK7GWrtJAwm-F0Bq0OfXBnsSavPMKCjXOVlKOz0aHcLXDMP2SGOk.mp4`, durata 48,85 secondi. Analizzati fotogrammi ogni mezzo secondo, didascalie e lista riepilogativa a circa 40 secondi. Non si assume di avere una trascrizione audio integrale; i sette punti sono leggibili nel video. Non sono stati contattati il creatore del video né i servizi pubblicizzati.

| Indicazione nel video | Riscontro e intervento su RENT TO A FRIEND |
|---|---|
| 1. Prima il consenso (11–18 s) | Nessun Google Analytics, Meta Pixel, SDK pubblicitario o strumento di profilazione negli asset distribuiti. CSP limita script a origine propria e blocca gli script inline. Aggiunto controllo di build contro tracker noti, script/iframe esterni e import remoti. Il controllo è limitato ai pattern e ai sorgenti analizzati: non sostituisce un audit del traffico né implementa un CMP. Non è stato introdotto alcun tracker. |
| 2. Rifiuta visibile come Accetta (19–22 s) | Senza tracciamento facoltativo non è stato creato un banner di consenso fittizio. Pagina pubblica `/#cookies` spiega memoria tecnica, scopi, durata e rimozione. Un futuro tracker richiederà prima consenso effettivo, blocco preventivo, rifiuto equivalente e revoca: questa release non ne autorizza l’attivazione. |
| 3. Privacy policy vera (22–26 s) | Titolare Nicolò Caloni e contatto già indicati; precisati dati locali, IP tecnico, foto, messaggi, fornitori, finalità, retention non ancora approvata e diritti. Aggiunta matrice dei riferimenti locali. PKCE scaduto o malformato viene ora rimosso anche aprendo normalmente l’app, senza invio a terzi. Restano recapito, durate per finalità e accordi effettivi da completare; non marcati come approvati. |
| 4. Scarica ed elimina (26–29 s) | Esportazione e gestione richieste già presenti. Cancellazione automatica già predisposta soltanto per account senza rapporti condivisi o ruolo operatore; gli altri passano al gestore. Demo: dati locali e simulazioni dichiarate. Nessuna cancellazione reale eseguita. Il flusso completo con Auth e file reali rimane da collaudare prima del lancio. |
| 5. Termini e mail (29–32 s) | Condizioni e email `rent.to.a.friend@gmail.com` già pubbliche. Rafforzate spiegazioni dei segnali profilo, delle recensioni e dell’ordinamento. Le condizioni definitive e la relativa accettazione documentata devono essere completate prima di abilitare account reali. Non è stato dato per approvato un documento legale. |
| 6. Carte su Stripe (33–36 s) | Non applicabile alla versione attuale: nessuna raccolta di carte, nessun checkout, abbonamento, rinnovo o addebito automatico. Non è stato creato un account Stripe, non è stato attivato un piano o sostenuto un costo. Stripe è un esempio di prestatore di pagamento, non un obbligo di scegliere quel fornitore; un’integrazione futura richiederà un progetto dedicato. |
| 7. Niente badge falsi (37–42 s) | Email confermata deriva da Auth e non è verifica d’identità. Foto e bio sono dichiarazioni dell’utente. Ora è esplicito che completezza profilo, noleggi conclusi e recensioni non certificano affidabilità, consegna o pagamento indipendenti. Recensioni solo da controparti di noleggi conclusi, una per autore e noleggio; nessuna stella preassegnata. Ordine iniziale rinominato Ordine demo/Più recenti e criteri dichiarati, senza posizionamento a pagamento. |

### Verifiche di questa revisione

94 test locali superati, inclusi controlli sui tracker, pulizia dei riferimenti PKCE scaduti, isolamento dei dati, recensioni ed esportazione/cancellazione. Build demo riuscito; il test di build collegato continua a respingere la configurazione non approvata. Nessun cambiamento allo schema remoto, nessun nuovo fornitore o pagamento introdotto.

### Decisioni che il codice non può prendere per il titolare

- Recapito da pubblicare e dati dell’attività, se applicabili; il proprietario ha già scelto di aggiungere il recapito prima del lancio. Nessun indirizzo personale ricavato o inventato.
- Scelta risolta il 1 novembre 2026: il proprietario ha confermato soltanto privati. Condizioni e modulo annunci aggiornati; non è una verifica indipendente dello status. Restano condizioni definitive e relativa accettazione documentata prima del lancio.
- Approvare finalità, basi giuridiche e durate; verificare DPA, trasferimenti, backup e log dei fornitori. Il build con backend resta bloccato.
- Risolvere il limite di Vercel Hobby per uso commerciale e l’applicabilità del DPA. Nessun upgrade autorizzato o attivato; dominio e demo non equivalgono a lancio commerciale.
- Completare SMTP/Resend, assegnare account operatore, provare esportazione e cancellazione con account reali di test e verificare la coda e il contatto email. Nessuna nuova email inviata da questa revisione.

### Fonti primarie rilette per questa verifica

- Garante, Linee guida cookie e altri strumenti di tracciamento, 10 giugno 2021: https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876
- Garante, FAQ cookie: https://www.garanteprivacy.it/faq/cookie
- Garante, informativa e basi giuridiche: https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/8981258
- EDPB, diritti e termine di riscontro: https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en
- AGCM, trasparenza di recensioni, ordinamento e venditori: https://convienesaperlo.agcm.it/diritto/diritto-alla-trasparenza/
- Stripe, ambito PCI e strumenti ospitati: https://stripe.com/guides/pci-compliance
- Vercel, DPA: https://vercel.com/legal/dpa ; uso Hobby: https://vercel.com/docs/limits/fair-use-guidelines

Le cifre delle sanzioni e il caso SHEIN citati nel video non sono utilizzati come previsione di una multa per questa app. Nessuna dichiarazione di conformità totale o assenza di rischio.

## Video precedente · dieci rischi

Questa sezione conserva la verifica precedente. Per la cancellazione automatica introdotta dopo quella verifica fanno fede la sezione nuova qui sopra e `LEGAL_SETUP.md`.

31 ottobre 2026 · RENT TO A FRIEND · Video allegato di circa 47 secondi.
La lista è stata letta dai fotogrammi del video. Le cifre mostrate non sono state assunte come sanzioni applicabili in Italia o come preventivi. Questa revisione tecnica non certifica conformità legale.

| Punto del video | Applicazione all’app |
|---|---|
| 1. Informativa assente | Pagina pubblica `/#privacy`, raggiungibile anche da registrazione e Profilo. Indicata come pre-lancio finché mancano le informazioni del titolare. |
| 2. Raccolta dati non dichiarata | Distinti dati locali della demo, richieste tecniche al sito, account e dati condivisi con la community. |
| 3. Uso AI non dichiarato | Dichiarazione coerente con il codice: nessun chatbot né invio di dati utente a modelli AI. Non aggiunto un servizio AI. |
| 4. Fornitori omessi | Vercel, Supabase, Resend previsto ma non collegato, e servizi push del browser; avvertenza su verifica dei subfornitori e trasferimenti. |
| 5. Upload mai cancellati | Rimozione via Storage API delle vecchie foto dopo salvataggio riuscito, fallback visibile e comando di pulizia per file propri inutilizzati da oltre un’ora. Nessuna cancellazione diretta di storage.objects in produzione. Richiesta di cancellazione account tracciata separatamente. |
| 6. Bucket pubblico | Riscontri di noleggio privati, link firmati 300 secondi e RLS sui partecipanti; foto di annunci/profili intenzionalmente pubbliche e dichiarate prima del caricamento. Eliminata enumerazione anonima dei metadati dei due bucket pubblici. |
| 7. Testimonianze false | Recensioni solo da controparti di noleggi conclusi; unica recensione per noleggio e autore; demo dichiarata, nessuna stella inventata. Vincoli esistenti verificati dai test SQL. |
| 8. Cancellazione difficile | Accesso diretto da Profilo e footer a I tuoi dati: esportazione JSON, cancellazione locale demo, richiesta account senza motivazione e stato consultabile. Coda del gestore con termine di riscontro e risposta visibile. La coda non è un motore di cancellazione automatica. |
| 9. Rinnovi senza avviso | Nessuna sottoscrizione, prova con carta o sistema di addebito nell’app. Esplicitato nelle condizioni; superare una quota blocca upload e non attiva un acquisto. Non predisposti abbonamenti. |
| 10. Chatbot e autolesionismo | Non applicabile: la chat è tra persone, non genera risposte AI. Restano blocco e segnalazione. Un futuro chatbot richiederà una revisione propria prima di essere attivato. |

## Prima degli utenti reali

In `src/privacy.js` completare identità del titolare, contatto effettivamente presidiato, tempi di conservazione per categoria e revisione dell’informativa. Il build con backend collegato viene rifiutato se questi dati non sono completi e `reviewed` non è true. Non è un blocco del servizio Supabase: limita il rilascio del frontend collegato. Il frontend pubblico resta demo.

Il gestore deve approvare basi giuridiche, condizioni, accordi con fornitori, eventuali trasferimenti extra SEE, retention per backup/log e modalità di esercizio dei diritti. Non si dichiara una conservazione automatica non implementata. Configurare un account operatore reale prima di aprire le richieste: gli operatori sono assegnati esclusivamente in `private.app_moderators`, mai da metadati modificabili dall’utente. Presidio giornaliero della coda privacy, massimo 200 righe visualizzate, contatto email alternativo nell’informativa. Il solo salvataggio della richiesta non invia email.

## Procedura del gestore per cancellazione

1. Leggere la richiesta autenticata dalla coda; dare riscontro entro un mese, con motivi di eventuale proroga o limitazione. Il termine visualizzato è un mese di calendario.
2. Identificare eventuali noleggi aperti, controversie, dati di altre persone e obblighi di conservazione. Non obbligare l’utente a scrivere una motivazione o a sottoscrivere un piano.
3. Fornire una copia dei dati quando richiesta: il JSON dell’app include i record disponibili, non i file binari, i log dei fornitori né tutti i dati amministrativi. Completare l’accesso con i dati pertinenti dei fornitori quando necessario.
4. Per la cancellazione approvata revocare le sessioni e disabilitare accesso/push; rimuovere o anonimizzare i record pertinenti secondo la decisione documentata. Rimuovere i file via Storage API prima di eliminare l’account Auth; controllare riferimenti a noleggi/recensioni e vincoli. Non cancellare righe Storage via SQL, né cancellare conversazioni altrui indiscriminatamente. Questa procedura resta un’attività dell’operatore, non viene eseguita dal pulsante utente.
5. Verificare che foto e dati pubblici non siano più raggiungibili, controllare upload residui e documentare i tempi residui di cache/backup. Non promettere il ritiro di copie scaricate da terzi.
6. Registrare nella coda un riscontro comprensibile: cosa è stato eliminato, cosa resta, motivi e durata. Lo stato “Gestione conclusa” non è di per sé una prova che la cancellazione sia avvenuta. Dopo chiusura dell’account inviare il riscontro al contatto verificato secondo la procedura del gestore.

La pulizia client non è un job periodico globale e non elimina riscontri ancora utilizzati. Non è stata eseguita alcuna cancellazione di dati o file reali durante questa revisione.

## Fonti primarie consultate

- EDPB: https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase delete objects: https://supabase.com/docs/guides/storage/management/delete-objects
- Changelog Supabase: https://supabase.com/changelog.md (verificata anche la modifica TLS di ottobre; nessun cambiamento richiesto per i client HTTPS moderni usati qui).

## Stato verifiche

83 test locali superati, inclusi separazione RLS delle esportazioni, richieste idempotenti, autorizzazione operatore, file altrui e riferimenti protetti, ordine salvataggio/cancellazione e ripresa dopo errore Storage. Build demo riuscito; build con backend rifiutato finché informativa non approvata. Scansione pattern segreti senza riscontri. La migrazione remota `privacy_rights_and_upload_cleanup` è stata applicata con successo dopo conferma Supabase. `supabase/tests/privacy_smoke.sql` ha verificato isolamento, idempotenza, esportazione e autorizzazione operatore; tutte le fixture sono state annullate. Verifica finale: zero profili e zero richieste reali. Gli advisory di sicurezza non riportano WARN/ERROR; le tabelle private senza policy sono intenzionalmente inaccessibili direttamente ai client. Nel browser pubblico sono stati verificati download JSON demo, persistenza della richiesta dopo ricaricamento e comando di pulizia simulato. Nessuna email, push o cancellazione reale effettuata.
