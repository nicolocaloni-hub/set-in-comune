# Android e conferme di scambio · 2 novembre 2026

## Prova sul telefono del gestore

Il gestore esegue i tocchi in Chrome sul proprio Android e invia schermate in chat; l'assistente controlla i riscontri. Non è controllo remoto del telefono. Tutte le operazioni mostrate appartengono alla demo locale, non al frontend collegato al backend.

Riscontri positivi: catalogo e scheda, calendario 12–13 novembre, due giorni a 65 euro (130 euro con cauzione separata di 500), creazione della richiesta, accettazione simulata e badge interno, apertura della chat, campo e invio visibili con tastiera aperta, invio del messaggio e persistenza dopo ricaricamento confermata dal gestore. Due foto selezionate, anteprime e ottimizzazione mostrate; descrizione inferiore a 20 caratteri respinta; annuncio di prova salvato, copertina cambiata, prezzo aggiornato da 50 a 55 euro e stato In pausa mostrato. Ritiro simulato presente nel registro del noleggio.

Collaudo completato per i percorsi provati su Android: le schermate successive mostrano il nuovo avviso di restituzione, il pulsante finale e il passaggio a Restituito; seguono conferma della chiusura e recensione pubblicata nella demo. Il gestore conferma infine il ripristino, zero noleggi e tutti i dati di prova resettati. La pulizia del telefono è attestata dalla sua conferma in chat, senza controllo remoto né un export finale acquisito dall’assistente. Non restano attività aperte per questo percorso demo. La persistenza della pausa dopo ricaricamento, le foto nel registro di restituzione e i dettagli del layout chat/ordinamento dopo le modifiche non sono stati riscontrati separatamente sul telefono.

Non attestati: iOS/Safari, orientamento orizzontale, installazione Home, notifiche push, autenticazione e interfaccia con backend collegato. I risultati precedenti del backend via API restano separati. Cloudflare in standby; backup e Turnstile rinviati; nessuna apertura agli utenti reali.

## Modifiche richieste durante il collaudo

- Avvisi contestuali per proprietario e persona che noleggia: corrispondenza con annuncio e accordi al ritiro, confronto con il registro del ritiro al rientro, prova del funzionamento e verifica degli accessori. Problemi e differenze vanno segnalati all'altra persona e annotati, con foto quando utile, prima di portare via l'attrezzatura o separarsi.
- Nei passaggi reali già disponibili (consegna del proprietario, restituzione della persona che noleggia, chiusura del proprietario), la checklist resta obbligatoria; il primo invio apre una seconda conferma. Tornare ai controlli conserva la stessa bozza di note e immagini. Gli upload e la transizione partono soltanto dal pulsante finale. La conferma non dichiara assenza di difetti e non sostituisce il controllo della controparte. Non sono introdotte nuove transizioni o firme bilaterali nel database.
- Anche Simula consegna/chiusura richiede una conferma esplicita e mostra le istruzioni per entrambi i ruoli. L'annullamento non esegue la simulazione.
- Bordi di focus meno marcati e arrotondati, con indicatore conservato per la tastiera; ordinamento mobile su griglia per separare etichetta e select; intestazione compatta durante la chat mobile; titolo dei dialoghi separato dal pulsante di chiusura.

## Verifiche locali della modifica

136 test superati. Quattro nuove prove coprono indicazioni per ruolo, nessun upload/transizione prima della conferma finale, ritorno alla bozza senza perdita di dati, protezione contro doppio tocco e conservazione della bozza in caso di errore. Build demo Vercel e Cloudflare riuscite, controllo delle differenze e scansione dei pattern di credenziali senza rilievi. Nessuna nuova dipendenza installata; usate quelle già disponibili.

## Pubblicazione e controllo browser

Modifica integrata con PR #10, commit main `48bfe4dcb64ac769d27f39125214e2468696d350`. Vercel ha pubblicato il deployment di produzione `dpl_3zi8T5EU853gecst3nBzrumdnKq9` in stato READY. Sul dominio, app.js, marketplace.js, style.css e config.js coincidono byte per byte con il build demo verificato.

Prova diretta nella demo desktop pubblicata: annullare Simula consegna lascia il noleggio Confermato; confermare porta In corso. Nella restituzione, Verifica e continua apre la conferma aggiuntiva senza registrare il passaggio; Torna ai controlli conserva nota e tre spunte. Il pulsante finale porta a Restituito e la simulazione di chiusura a Concluso. Ripristino della sessione dell’assistente eseguito, con zero prenotazioni mostrate e nessun annuncio personale. La distinta pulizia della demo Android è confermata dal gestore nel paragrafo sopra.

Questa registrazione aggiorna soltanto il rapporto: non introduce nuove modifiche al codice o nuovi test e non dichiara collaudati account reali o iOS.
