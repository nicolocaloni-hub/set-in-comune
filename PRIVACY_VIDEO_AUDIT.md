# Revisione del video: privacy e trasparenza

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
