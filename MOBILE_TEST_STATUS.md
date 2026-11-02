# Android e conferme di scambio · 2 novembre 2026

## Prova sul telefono del gestore

Il gestore esegue i tocchi in Chrome sul proprio Android e invia schermate in chat; l'assistente controlla i riscontri. Non è controllo remoto del telefono. Tutte le operazioni mostrate appartengono alla demo locale, non al frontend collegato al backend.

Riscontri positivi: catalogo e scheda, calendario 12–13 novembre, due giorni a 65 euro (130 euro con cauzione separata di 500), creazione della richiesta, accettazione simulata e badge interno, apertura della chat, campo e invio visibili con tastiera aperta, invio del messaggio e persistenza dopo ricaricamento confermata dal gestore. Due foto selezionate, anteprime e ottimizzazione mostrate; descrizione inferiore a 20 caratteri respinta; annuncio di prova salvato, copertina cambiata, prezzo aggiornato da 50 a 55 euro e stato In pausa mostrato. Ritiro simulato presente nel registro del noleggio.

Restano da riscontrare sul telefono: restituzione, chiusura e recensione; nuove conferme introdotte sotto; layout dopo le correzioni; pulizia finale. Il gestore ha ancora una prenotazione, messaggi e un annuncio con due immagini nella demo del suo browser. Non dichiarare eliminati questi dati prima del ripristino verificato. La pausa è mostrata; la sua persistenza dopo ricaricamento non è stata confermata separatamente.

Non attestati: iOS/Safari, orientamento orizzontale, installazione Home, notifiche push, autenticazione e interfaccia con backend collegato. I risultati precedenti del backend via API restano separati. Cloudflare in standby; backup e Turnstile rinviati; nessuna apertura agli utenti reali.

## Modifiche richieste durante il collaudo

- Avvisi contestuali per proprietario e persona che noleggia: corrispondenza con annuncio e accordi al ritiro, confronto con il registro del ritiro al rientro, prova del funzionamento e verifica degli accessori. Problemi e differenze vanno segnalati all'altra persona e annotati, con foto quando utile, prima di portare via l'attrezzatura o separarsi.
- Nei passaggi reali già disponibili (consegna del proprietario, restituzione della persona che noleggia, chiusura del proprietario), la checklist resta obbligatoria; il primo invio apre una seconda conferma. Tornare ai controlli conserva la stessa bozza di note e immagini. Gli upload e la transizione partono soltanto dal pulsante finale. La conferma non dichiara assenza di difetti e non sostituisce il controllo della controparte. Non sono introdotte nuove transizioni o firme bilaterali nel database.
- Anche Simula consegna/chiusura richiede una conferma esplicita e mostra le istruzioni per entrambi i ruoli. L'annullamento non esegue la simulazione.
- Bordi di focus meno marcati e arrotondati, con indicatore conservato per la tastiera; ordinamento mobile su griglia per separare etichetta e select; intestazione compatta durante la chat mobile; titolo dei dialoghi separato dal pulsante di chiusura.

## Verifiche locali della modifica

136 test superati. Quattro nuove prove coprono indicazioni per ruolo, nessun upload/transizione prima della conferma finale, ritorno alla bozza senza perdita di dati, protezione contro doppio tocco e conservazione della bozza in caso di errore. Build demo Vercel e Cloudflare riuscite, controllo delle differenze e scansione dei pattern di credenziali senza rilievi. Nessuna nuova dipendenza installata; usate quelle già disponibili.

Il riscontro browser della versione pubblicata e quello sul telefono vengono registrati separatamente dopo la pubblicazione; questi test locali non li sostituiscono.
