# Collaudo con due account reali — 3 novembre 2026

## Risultato applicativo

**27 controlli superati** usando due account registrati tramite Auth, confermati mediante le email effettivamente ricevute e collegati a due sessioni distinte. Le operazioni sono passate attraverso il client `src/api.js`, la Data API, lo Storage e gli RPC di produzione, senza chiavi amministrative nel client e senza modificare gli stati del noleggio via SQL.

Il noleggio e le recensioni erano esplicitamente contrassegnati come collaudo: nessuno scambio fisico o pagamento reale. L'account personale del titolare non è stato utilizzato per queste operazioni ed è rimasto presente.

| Area | Verifica osservata |
| --- | --- |
| Registrazione | Due account creati; nessuna sessione immediata prima della conferma email |
| Conferma email | Entrambi i link reali hanno completato il flusso PKCE e restituito utenti confermati |
| Condizioni e ricevute | Nuove attività bloccate prima dell'accettazione; ricevute personali disponibili dopo la scelta esplicita dei profili di collaudo |
| Profilo | Bio e quartiere salvati e riletti per entrambi; avatar del proprietario visibile alla controparte |
| Annuncio e foto | Annuncio sintetico a prezzo e cauzione zero pubblicato tramite il client e letto dall'altro account |
| Proprietà | Il tentativo del richiedente di modificare il prezzo dell'annuncio altrui non ha cambiato alcuna riga |
| Visitatori | Lettura delle prenotazioni senza autenticazione rifiutata |
| Chat preliminare | Domanda inviata dal richiedente e letta dal proprietario |
| Richieste | Due richieste salvate e due richieste non lette conteggiate al proprietario |
| Concorrenza HTTP | Due accettazioni concorrenti con date sovrapposte: una sola riuscita; l'altra richiesta poi rifiutata |
| Chat del noleggio | Messaggi letti da entrambi; tentativo di invio con l'identità dell'altro utente rifiutato |
| Consegna | Checklist incompleta e ruolo errato rifiutati; passaggio corretto salvato |
| Foto privata | Caricata dal richiedente; il proprietario ha ottenuto l'accesso e scaricato gli stessi byte; URL pubblico rifiutato |
| Restituzione e chiusura | Restituzione del richiedente e chiusura del proprietario persistite; tre passaggi di consegna/restituzione/chiusura nel registro |
| Recensioni | Due recensioni reciproche visibili; secondo invio dello stesso recensore rifiutato |
| Esportazione | Per ciascun account, profilo ed email propri e ricevute personali nell'esportazione |
| Archivio | Annuncio archiviato e assente dal catalogo letto dall'altro account |
| Nuovo accesso | Logout e nuovo login con password riusciti per entrambi |

Verifica indipendente sul database dopo il ciclo: due utenti confermati, due sessioni, un noleggio concluso, una richiesta rifiutata, due recensioni e annuncio archiviato. Il titolare risultava ancora presente.

## Cancellazione e pulizia

Prima del ciclo completo è stata provata la cancellazione autonoma su una prima coppia di profili temporanei senza storico: il servizio ha rimosso entrambi. La verifica successiva riportava zero account/profili della prima coppia, due lavorazioni concluse, zero file e il solo account preesistente.

La coppia del ciclo completo ha uno storico di prova. È stata preparata una transazione con controllo di identità, assenza di relazioni con terzi e assenza di noleggi aperti: elimina esclusivamente i rapporti sintetici e poi affida profili, sessioni e file fisici al worker di cancellazione già esistente.

**Pulizia finale completata e verificata.** Dopo il precedente blocco per limite d'utilizzo e una conferma scaduta, la richiesta Supabase è stata confermata ed eseguita. La transazione ha rimosso soltanto i rapporti sintetici; il worker esistente ha completato entrambe le cancellazioni, rimuovendo file fisici, profili e utenti Auth. La lettura finale riportava zero utenti/profili/sessioni/refresh token/annunci/file/ricevute della coppia, due lavorazioni concluse e un solo account totale: quello personale del titolare, preservato. I marcatori tecnici delle lavorazioni concluse non sono account attivi.

## Limiti ed esecuzione

Il collaudo è stato programmatico sulle API reali, non un controllo dell'interfaccia su due telefoni. Non prova il recupero password via email, la consegna delle notifiche push, la tenuta a carico elevato o l'isolamento verso un terzo account autenticato estraneo al noleggio. Il test di concorrenza riguarda due richieste HTTP effettive; non ha registrato gli identificativi delle connessioni PostgreSQL.

Il programma di collaudo ha richiesto due correzioni proprie: un'aspettativa troppo specifica sul testo dell'errore Storage prima dell'accettazione e un riferimento di configurazione mancante nel programma. Il ciclo è stato ripreso conservando le sessioni e completato. Questi errori del collaudo non sono presentati come difetti dell'app.

Le credenziali temporanee sono rimaste in memoria durante l'esecuzione; password, token di sessione e link di conferma non sono riportati in questo documento. Nessun provider di accesso, CAPTCHA, abbonamento o permesso dell'app è stato modificato.
