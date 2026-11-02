# Collaudo dell’interfaccia pubblicata · 2 novembre 2026

## Esito e perimetro

Eseguite direttamente nel browser le prove della demo su `https://rent-to-a-friend.it/`, con autorizzazione del gestore, sole immagini e testi sintetici e successivo ripristino. I flussi provati sotto sono riusciti. **Non è completato il collaudo di lancio con account reali né quello su Android/iPhone.** Nessuna apertura del servizio o rimozione dei blocchi privacy/demo è stata effettuata per poter dichiarare superati questi punti.

Riferimento ricontrollato su GitHub: `main` = `48bb33ddd51ac96f2fed019aca4063b60e4e6fad`, tree `88bd0c5b45f057907bc73a2dab32892115698f67`. La copia locale pulita aveva lo stesso tree. Pagina iniziale, `config.js`, `api.js` e `auth-config.js` sul dominio hanno risposto HTTP 200 con byte identici al build locale. Il callback rimane `https://rent-to-a-friend.it/`; il frontend pubblico conserva URL/chiave backend vuoti ed esegue la demo.

## Prove UI riuscite

| Funzione | Riscontro nel browser |
|---|---|
| Catalogo | Sei annunci iniziali, dettaglio e profili di esempio raggiungibili |
| Ricerca vuota | Termine sintetico inesistente: zero risultati e comando di ripristino funzionante |
| Categoria | Luci: solo Amaran 200x S |
| Preferiti | Aggiunta, filtro e persistenza dell’annuncio preferito dopo ricaricamento |
| Prezzo | Ordinamento crescente: gratuito, 12, 18, 22, 25, 65 euro; filtro massimo 20 euro: tre risultati |
| Date incoerenti | Restituzione precedente al ritiro respinta dalla validazione del campo; filtro non applicato |
| Calendario e preventivo | Selezione 10–11 novembre: due giorni a 22 euro, totale 44 euro, cauzione separata 100 euro |
| Richiesta | Creazione locale, stato In attesa e condizioni salvate raggiungibili |
| Accettazione | Simulazione: stato Confermato, contatore di un messaggio non letto, azzerato aprendo la chat |
| Chat | Messaggio sintetico salvato e presente dopo ricaricamento; tag HTML mostrati come testo, accenti conservati |
| Ritiro e restituzione | Passaggio In corso; restituzione respinta senza checklist; completata con tre verifiche, nota e foto sintetica |
| Registro | Ritiro e restituzione presenti, verifiche e nota salvate; foto caricata e decodificata a 480×320 pixel |
| Chiusura e recensione | Simulazione Concluso; recensione locale inviata e presente sul profilo, media 5/5 e un noleggio concluso |
| Annuncio con foto | Annuncio sintetico a 15 euro con due JPEG; ottimizzazione, anteprime e cambio copertina riusciti |
| Modifica annuncio | Rimozione di una foto e prezzo aggiornato a 17 euro, salvati |
| Disponibilità e pausa | Periodo 15–16 novembre salvato; annuncio in pausa non presente nel catalogo degli attivi |
| Profilo | Nome e bio salvati; foto sintetica aggiunta, completezza passata al 100% |
| Domanda prima della prenotazione | Conversazione distinta creata senza una seconda prenotazione |
| Blocco e sblocco | Blocco: messaggi precedenti visibili, campo e invio disabilitati; sblocco: invio riattivato |
| Segnalazione | Motivo e descrizione sintetici salvati solo nella demo, senza contattare un operatore |
| Esportazione | Download JSON leggibile con profilo, annuncio, prenotazione, messaggi, registro e recensione di prova |
| Pulizia foto | Comando simulato: zero file inutilizzati eliminati, coerentemente con la modalità demo |
| Richiesta di cancellazione | Simulazione locale salvata con riferimento; non presentata come cancellazione di un account reale |
| Pagine informative | Privacy, Cookie e memoria, Condizioni e I tuoi dati raggiungibili senza account |
| Ripristino | Rimozione dei dati sintetici confermata da una seconda esportazione e dall’interfaccia |

La finestra effettivamente osservata misura 1363×936 CSS pixel. Nella pagina informativa controllata il documento non deborda orizzontalmente. Nel registro degli avvisi/errori catturati dalla scheda, tutti i 313 eventi osservati provenivano dall’estensione del browser; nessuno aveva origine negli script del dominio. Questo riscontro è limitato alla sessione e ai log acquisiti, non è una garanzia di assenza di qualsiasi errore.

## Pulizia verificata

Secondo JSON scaricato dopo `Cancella e ripristina demo`:

```json
{
  "demo": true,
  "profile": "Il tuo profilo demo",
  "avatar_present": false,
  "synthetic_marker_present": false,
  "listings": 0,
  "bookings": 0,
  "messages": 0,
  "evidence": 0,
  "reviews": 0,
  "privacy_requests": 0
}
```

Il catalogo è tornato ai sei esempi iniziali, i preferiti risultano deselezionati e la pagina Noleggi mostra zero prenotazioni. Le foto di questa sessione erano nella memoria della demo, non nello Storage remoto. Gli export temporanei e i JPEG di input sono rimossi dall’ambiente di lavoro dopo il riscontro; restano soltanto le schermate di prova e questo rapporto, privi di credenziali.

Le precedenti fixture del collaudo HTTP erano già state eliminate e verificate separatamente: `STORAGE_UPLOAD_TEST.md` e `supabase/launch/storage-http-result-2026-11-02.json`. Non si dichiara una nuova query remota di pulizia in questa sessione.

## Telefono: limite concreto dell’ambiente

Non è esposto un dispositivo Android/iPhone, né un servizio di dispositivi fisici collegato. Il browser disponibile non offre una API di ridimensionamento o emulazione; i tentativi con i comandi UI di DevTools/zoom non hanno modificato il viewport osservato. La ricerca di un’integrazione per dispositivi mobili non ha restituito un collegamento adatto. Non è stato usato Tinyfish e non è stato installato software.

Il codice già pubblicato contiene viewport responsive, regole a 760/480/360 pixel, pulsanti touch più grandi, spazi per safe area, moduli a colonna e navigazione chat per schermi stretti. **L’ispezione del codice non verifica il rendering mobile.** Non sono attestati touch, tastiera virtuale, selezione/scatto foto dal telefono, installazione alla Home, Safari iOS, Chrome Android, orientamento o push su telefono. Serve un ambiente che esponga realmente questi dispositivi; non occorre un nuovo consenso generico alle prove già autorizzate.

## Altri collaudi non sostituiti dalla demo

- UI collegata ad Auth/Database/Storage: il sito sul dominio è ancora demo; per la prova completa occorre un contesto collegato e protetto con i prerequisiti effettivi di rilascio. Non sono stati falsificati flag o pubblicati documenti fittizi per aggirare i controlli.
- Registrazione, conferma e recupero password nel contesto definitivo: il precedente lavoro su callback/PKCE resta documentato, ma non viene presentato come nuova prova UI in questa sessione.
- Nuova prenotazione reale, foto pubbliche collegate, registro e cancellazione account dall’interfaccia collegata, notifiche push e ricezione fra dispositivi: non attestati da questa demo. Il test HTTP precedente ha usato un rapporto fittizio preesistente, non una prenotazione creata dal percorso ordinario.
- Backup e ripristino restano rinviati dal gestore; Cloudflare in standby, Turnstile e pubblicità rinviati. Nessun piano, DNS, chiave o impostazione Supabase è modificato da questo collaudo.

I 132 test automatici e i 18 controlli HTTP precedenti restano validi per i perimetri già registrati; non sono conteggiati come nuovi test eseguiti in questa sessione. Nessuna modifica al codice dell’app è risultata necessaria dalle prove UI svolte.
