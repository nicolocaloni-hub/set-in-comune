# Stress test RENT TO A FRIEND — 3 novembre 2026

## Esito e modifiche

155 test superati, 0 falliti, circa 8,5 secondi per l'intera suite sul runner locale. Build in modalità connessa riuscita. Scansione delle credenziali note: nessun risultato nel codice e nella storia Git disponibile localmente.

Due difetti sono stati riprodotti prima delle modifiche con test falliti e corretti in `src/api.js`:

1. **Avvio bloccato da dati locali malformati.** Un valore JSON come `{}` nel vecchio salvataggio della demo causava un errore prima dell'avvio, anche con il database reale collegato. La modalità reale ora ignora quel salvataggio senza modificarlo. I contenitori della demo vengono normalizzati e una sessione locale con struttura non valida viene ignorata. I dati validi delle vecchie demo sono conservati.
2. **Risultati troncati dal limite del server.** Catalogo, disponibilità, annunci personali/pubblici, noleggi, conversazioni e messaggi erano letti con una singola richiesta. Nella riproduzione, 1.205 annunci diventavano 1.000; nelle chat lunghe mancavano i messaggi più recenti. Ora le letture proseguono per pagine ordinate, anche con un limite server inferiore alla pagina richiesta. Un errore su una pagina successiva interrompe l'operazione, senza restituire una cronologia incompleta come completa. La lettura ha limiti espliciti di 200 richieste e 50.000 righe, oltre i quali segnala un errore.

È stato inoltre eliminato un costo quadratico: l'associazione tra annunci e disponibilità usa una mappa anziché riscorrere tutti i periodi per ogni annuncio. Su 10.000 annunci e 20.000 periodi, il benchmark locale della sola associazione ha registrato queste durate:

| Esecuzione | Prima | Dopo |
| --- | ---: | ---: |
| 1 | 1.930,71 ms | 12,67 ms |
| 2 | 1.144,19 ms | 5,09 ms |
| 3 | 987,15 ms | 5,74 ms |

Questi numeri misurano soltanto JavaScript nel runner, non tempi di caricamento nel browser o capacità del servizio pubblico.

## Carichi eseguiti

| Prova | Carico | Risultato osservato |
| --- | --- | --- |
| Server statico locale isolato | 512 richieste, concorrenza 32, circa 12,8 MB | 0 risposte inattese; mediana 17 ms, p95 102 ms, p99 122 ms; durata 477 ms |
| Percorsi riservati e metodo inatteso | 7 percorsi e 1 POST | Tutti rifiutati: 404 / 405 |
| API simulata, catalogo grande | 10.000 annunci e 20.000 periodi | Tutti conservati; 62 richieste paginate; 177 ms nella suite completa |
| Cronologia chat con server limitato | 2.307 messaggi, limiti di 1.000 e 137 righe | Cronologia completa, compreso l'ultimo messaggio; errore della pagina intermedia propagato |
| Sessione scaduta | 64 letture simultanee con provider simulato | Un solo rinnovo; tutte le letture usano la nuova sessione |
| Salvataggi locali | JSON interrotto, scalari, array, oggetti incompleti, righe nulle e vecchi dati validi | Avvio e recupero dei contenitori; nessuna riscrittura della demo in modalità reale |
| Date | 20.000 casi pseudocasuali ripetibili, seed 20261103 | Date inesistenti e periodi fuori limite rifiutati |
| Testo ostile | 10.000 valori con markup, virgolette e caratteri speciali | Escape HTML corretto |
| Prenotazione ripetuta, PostgreSQL isolato | Raffica di 32 richieste identiche | Una sola prenotazione creata |
| Date sovrapposte, PostgreSQL isolato | 16 richieste di persone diverse, 16 tentativi di accettazione | Una sola accettazione; le altre rifiutate |
| Antispam, PostgreSQL isolato | Raffica di 128 inserimenti | 5 messaggi salvati, 123 rifiutati dal limite |
| Isolamento utenti, PostgreSQL isolato | 64 letture e un inserimento da estraneo | 0 righe lette; inserimento rifiutato dalle policy |
| Archivio con noleggi aperti | Tentativo di archiviazione durante le richieste | Rifiutato; storico preservato |

Il database isolato è PGlite: le raffiche accodano transazioni su **una sola connessione**. Verificano regole, quote e invarianti; non certificano il comportamento dei lock tra sessioni PostgreSQL concorrenti. Le fixture Auth, Storage, rete push e documenti sono locali e sintetiche. Non sono stati creati utenti, annunci o messaggi reali.

## Verifiche sul servizio pubblico

Il sito è stato aperto nel browser come visitatore: avvio, catalogo vuoto reale e avviso di accesso necessario risultavano visibili. Nessun errore JavaScript dell'app rilevato in quella navigazione; un messaggio di un'estensione del browser è stato escluso dal conteggio dell'app.

La lettura Vercel dei runtime error nelle ultime 24 ore non ha restituito errori. Questo dato non intercetta tutti gli errori del browser e non è una prova di carico.

Le sonde HTTP programmatiche sul dominio reale non sono state completate perché l'accesso di rete del runner non è stato autorizzato. Non vengono quindi conteggiate come test superati né usate per stimare latenza o disponibilità di produzione. Nessuna raffica intensa è stata inviata al sito reale.

## Punti da migliorare con la crescita

- Il controllo prestazioni Supabase segnala **11 foreign key senza indice di copertura** e **11 policy con rivalutazione per riga**. Sono opportunità di ottimizzazione; non sono stati modificati permessi o policy durante questi stress test. Prima di intervenire, misurare i piani con dati rappresentativi e verificare nuovamente l'isolamento utenti.
- Il client ora evita il taglio a 1.000 righe, ma carica e rende ancora l'intero risultato. Cataloghi molto grandi richiederanno ricerca/paginazione lato server e chat con caricamento incrementale; il polling attuale rilegge la cronologia. La paginazione a offset non costituisce una fotografia transazionale: inserimenti/rimozioni durante la lettura possono spostare righe fra pagine.
- Il limite foto globale già previsto dal backend è di 1.500 oggetti, con quote per utente. È una soglia operativa da monitorare, non un test della capacità massima dell'hosting.
- Restano da provare realmente il recupero password via email, il ciclo completo tra due account (richiesta, chat, consegna, restituzione e recensione), la cancellazione autonoma e la concorrenza fra connessioni PostgreSQL distinte.

Nessun abbonamento, installazione o servizio aggiuntivo è stato attivato. Google e Turnstile restano rinviati secondo la scelta del titolare.

## Ripetibilità

- `npm test`: suite completa, comprese le nuove prove.
- `npm run test:stress`: solo le prove in `tests/stress-*.test.mjs`, tutte isolate e senza credenziali reali.
- `npm run security:scan`: ricerca di pattern noti di credenziali nel codice e nella storia Git locale.

Non usare questi risultati per dichiarare un numero massimo di utenti concorrenti supportati dalla produzione.
