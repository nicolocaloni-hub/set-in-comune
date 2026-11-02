# RENT TO A FRIEND · Piano prima del lancio

Stato effettivo al 2 novembre 2026. Questo elenco sostituisce il precedente riepilogo con riferimenti superati. La fonte dettagliata è ACTIVATION_STATUS.md; PRELANCIO.md conserva lo storico.

## Completato

- Callback canonico, password e conferma/recupero email verificati con consegna e scambio PKCE di prova.
- Ricevute e controllo server dei documenti installati con migrazione `20261102000639`; gestore configurato; test SQL A/B/C superati con fixture annullate. Nessun documento definitivo attivo.
- Integrazione Turnstile pubblicata, Site Key in Vercel produzione e worker account-erasure v3 compatibile; enforcement Supabase ancora spento.
- Adattamenti per telefono e flussi desktop della demo pubblicati con PR #3, commit main `d521a1253031c82a52b0c216f32f2412200de46a`. 119 test, build e scansione superati; nessuna prova su telefono reale dichiarata.
- Progetto dedicato sano, organizzazione Supabase Free, spazio e code verificati in sola lettura. Query operativa ripetibile aggiunta; RECOVERY_PLAN.md distingue controlli, procedura e backup non ancora eseguito.

## Punti ancora aperti

| Punto | Passo concreto necessario | Stato |
|---|---|---|
| Documenti e fornitori | Chiudere i riscontri degli account reali, i recapiti del gestore, l'uso di Vercel Hobby e i termini operativi; pubblicare una versione definitiva coerente | Blocco reale; nessuna approvazione inventata |
| Conservazione | Approvare i criteri per finalità e provarne la gestione, inclusa la posta di assistenza | Matrice ancora proposta; nessuna cancellazione periodica generale attiva |
| Backup e ripristino | Creare una copia esterna completa di database e file e provarne il recupero isolato | Mancano strumenti di export/restore e contesto sicuro; nessuna installazione o spesa |
| CAPTCHA | Inserire la Secret Key direttamente in Supabase e coordinare l'attivazione dopo il collaudo client/Auth | Site Key e codice pronti; non attivare parzialmente |
| Collaudo collegato | Dalla UI provare accettazione, accesso/recovery, upload, prenotazioni/chat, diritti, cancellazione e push | SQL e mail già provati; la UI con backend rimane bloccata dai prerequisiti reali |
| Telefono | Verificare impaginazione, tastiera, touch, foto e notifiche su Android/iPhone effettivi | Codice adattato; test fisici mancanti |

## Ordine di completamento

1. Chiudere i riscontri documentali e di hosting, senza nuovi abbonamenti. Le conferme già date dal proprietario non vanno richieste nuovamente.
2. Predisporre e collaudare il recupero dati in un contesto adatto; attuare i criteri di conservazione approvati senza toccare dati reali per prova.
3. Pubblicare i testi definitivi e preparare il frontend collegato nel contesto autorizzato. Per l'anteprima protetta resta un limite di accesso documentato; non disabilitare le protezioni per superarlo.
4. Coordinare widget e Supabase CAPTCHA con Secret Key solo nel pannello appropriato; provare i flussi completi con account e attrezzature di test.
5. Verificare i dispositivi, quote e ripristino; pubblicare il commit verificato soltanto quando i blocchi effettivi sono risolti. Il sito rimane demo fino ad allora.

Le sole email applicative restano conferma e recupero. Nessun incasso o pagamento passa dall'app. Nessun piano, DNS, chiave, autorizzazione del pubblico o requisito privacy viene cambiato da questo piano.
