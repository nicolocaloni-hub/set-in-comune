# RENT TO A FRIEND · Piano prima del lancio

Stato effettivo al 2 novembre 2026. Questo elenco sostituisce il precedente riepilogo con riferimenti superati. La fonte dettagliata è ACTIVATION_STATUS.md; PRELANCIO.md conserva lo storico.

## Completato

- Callback canonico, password e conferma/recupero email verificati con consegna e scambio PKCE di prova.
- Ricevute e controllo server dei documenti installati con migrazione `20261102000639`; gestore configurato; test SQL A/B/C superati con fixture annullate. Nessun documento definitivo attivo.
- Integrazione Turnstile pubblicata, Site Key in Vercel produzione e worker account-erasure v3 compatibile; enforcement Supabase ancora spento.
- Adattamenti per telefono e flussi desktop della demo pubblicati con PR #3, commit main `d521a1253031c82a52b0c216f32f2412200de46a`. 119 test, build e scansione superati; nessuna prova su telefono reale dichiarata.
- Progetto dedicato sano, organizzazione Supabase Free, spazio e code verificati in sola lettura. Query operativa ripetibile aggiunta; RECOVERY_PLAN.md distingue controlli, procedura e backup non ancora eseguito.

## Decisione privacy acquisita

Il gestore ha chiesto di considerare risolta la privacy. Approvazione e scelte sono registrate in `PRIVACY_CLOSEOUT.md`; la revisione RC5 aggiorna i testi e la procedura operativa. Non si richiede nuovamente consenso su Gmail o piani gratuiti. I controlli di rilascio sotto distinguono questa decisione dai riscontri tecnici non ancora eseguiti: nessuna nuova attestazione di conformità, prova di cancellazione o apertura al pubblico.

## Controlli di rilascio ancora aperti

| Punto | Passo concreto necessario | Stato |
|---|---|---|
| Documenti e fornitori | Conservare l’approvazione privacy del gestore; completare i riscontri fattuali degli account e pubblicare la versione coerente con l’hosting effettivo | Decisione del gestore acquisita; prove e accordi non inventati |
| Conservazione | Provare la gestione dei criteri descritti, inclusa la posta di assistenza e le eccezioni | Approvazione del gestore acquisita; nessuna cancellazione periodica generale attiva |
| Backup e ripristino | Creare una copia esterna completa di database e file e provarne il recupero isolato | Mancano strumenti di export/restore e contesto sicuro; nessuna installazione o spesa |
| CAPTCHA | Inserire la Secret Key direttamente in Supabase e coordinare l'attivazione dopo il collaudo client/Auth | Site Key e codice pronti; non attivare parzialmente |
| Collaudo collegato | Dalla UI provare accettazione, accesso/recovery, upload, prenotazioni/chat, diritti, cancellazione e push | SQL e mail già provati; la UI con backend rimane bloccata dai prerequisiti reali |
| Telefono | Verificare impaginazione, tastiera, touch, foto e notifiche su Android/iPhone effettivi | Codice adattato; test fisici mancanti |

## Ordine di completamento

### Decisioni aggiornate e attività rinviate

- Assistenza: resta l'inoltro IONOS verso Gmail già scelto; nessun account Proton da creare. Ricezione dichiarata dal gestore distinta dai controlli della casella ancora da verificare.
- Hosting: demo Cloudflare Pages Free creata dal gestore e verificata nel browser; dominio ancora Vercel. Zona DNS preparata e passaggio in standby su istruzione del gestore dopo errori IONOS. Nessun salvataggio di delega effettuato dall’agente e nessun piano a pagamento.
- Pubblicità: possibile in futuro per sostenere i costi; **rinviata su istruzione del gestore**. Non è un prerequisito del lancio e non va attivata adesso. Niente script AdSense, banner, account pubblicitari, CMP o modifica delle dichiarazioni pubbliche come se gli annunci fossero presenti.
- Prima di una futura monetizzazione: verificare idoneità del sito e condizioni di Google, destinatari/trasferimenti, informativa e consenso appropriato; per annunci personalizzati in SEE/Regno Unito/Svizzera Google richiede una CMP certificata integrata TCF. Gli annunci non personalizzati non eliminano automaticamente il tema dei cookie/consensi. Verificare anche gli obblighi economici e fiscali del gestore, senza dedurre esenzioni dal solo obiettivo di coprire i costi. Nessuna pratica fiscale viene aperta da questo piano.
- Recapito: il possibile finanziamento pubblicitario futuro è registrato nella valutazione; non si dichiara l'app sempre estranea ad attività economica. Nessun domicilio viene ricavato dall'account o pubblicato senza scelta specifica.
- Controlli remoti: l'ultimo report SQL non è stato rieseguito perché il controllo automatico delle autorizzazioni ha raggiunto un limite d'utilizzo. Il report già salvato non è presentato come nuovo e non è un backup. Il blocco non viene aggirato.

1. Chiudere i riscontri documentali e di hosting, senza nuovi abbonamenti. Le conferme già date dal proprietario non vanno richieste nuovamente.
2. Predisporre e collaudare il recupero dati in un contesto adatto; attuare i criteri di conservazione approvati senza toccare dati reali per prova.
3. Pubblicare i testi definitivi e preparare il frontend collegato nel contesto autorizzato. Per l'anteprima protetta resta un limite di accesso documentato; non disabilitare le protezioni per superarlo.
4. Coordinare widget e Supabase CAPTCHA con Secret Key solo nel pannello appropriato; provare i flussi completi con account e attrezzature di test.
5. Verificare i dispositivi, quote e ripristino; pubblicare il commit verificato soltanto quando i blocchi effettivi sono risolti. Il sito rimane demo fino ad allora.

Le sole email applicative restano conferma e recupero. Nessun incasso o pagamento passa dall'app. Nessun piano, DNS, chiave, autorizzazione del pubblico o requisito privacy viene cambiato da questo piano.
