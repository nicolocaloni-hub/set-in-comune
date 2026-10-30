# Set in comune

Marketplace di attrezzatura audiovisiva tra filmmaker, prima area: Roma.
Account unico per proprietario e richiedente. Pagamento e cauzione restano direttamente tra le parti.

## Stato della versione 0.4

Interfaccia responsive e modalità demo funzionante, con ricerca, categorie, date, prezzi, quartieri, preferiti, annunci, disponibilità, richieste, messaggi e registro consegna/restituzione. Gli annunci iniziali e i proprietari sono esempi fittizi, indicati come demo. Le immagini sono illustrazioni, non fotografie dei prodotti reali.

Senza configurazione Supabase, i dati restano nel localStorage del singolo browser: **non è un marketplace multiutente operativo**. La demo non invia messaggi a persone reali. La modalità connessa non mostra annunci fittizi.

È inclusa l'implementazione Supabase per registrazione email/password, recupero password, profili pubblici con avatar e bio, indicatore di email confermata derivato da Auth, annunci modificabili, upload foto, prenotazioni e chat. Lo schema iniziale è installato nel progetto dedicato gratuito; le migrazioni notifiche, il server di invio e lo scheduler sono attivi. Il collegamento pubblico resta da completare dopo Auth/email e verifica tra dispositivi. I flussi multiutente e le policy devono essere verificati su staging prima dell'apertura pubblica.

## Avvio

Node 22 o superiore. Non ci sono dipendenze npm runtime. I test SQL usano PGlite, fissato nel lockfile come dipendenza di sviluppo. Installare con `npm ci` prima dei test.

```sh
npm ci
npm test
npm run security:scan
npm run build
npm run dev
```

Aprire http://127.0.0.1:4173. Il build crea `dist/` e genera la configurazione pubblica dalle variabili di ambiente. `npm run dev` serve il build già prodotto.

## Attivazione multiutente su Supabase

1. Il progetto dedicato gratuito `set-in-comune` (`srjdysdhxnafjrutufmk`, regione UE) è già creato. Per un ambiente nuovo separato, creare un progetto soltanto dopo aver verificato organizzazione e costo.
2. Sul progetto attuale lo schema iniziale è già installato: non eseguirlo di nuovo. Per un ambiente nuovo, eseguire `supabase/001_initial.sql` nel SQL editor del nuovo progetto. Non è una migrazione idempotente: eseguirla una sola volta. Non usarla su database esistenti con tabelle omonime.
3. Abilitare email/password e conferma email. Impostare una password minima di 10 caratteri lato Auth.
4. Configurare Site URL e redirect consentiti al dominio Vercel definitivo. Il client usa PKCE S256 per conferma email e recupero password: il link va aperto nello stesso browser della richiesta. Non accetta token implicit incollati nell’URL. Abilitare SMTP dedicato per invii a utenti reali; il servizio email di test Supabase ha limitazioni.
5. In Vercel impostare `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY` per gli ambienti desiderati. Sono dati pubblici del client: usare solo la chiave publishable/anon, **mai service_role o chiavi segrete**. Le variabili devono essere presenti durante il build. Non incollare credenziali private nel codice o nella chat.
6. Effettuare un nuovo deploy, poi eseguire le verifiche multiutente indicate sotto.

Il client conserva la sessione nel sessionStorage della singola scheda, rinnova il token quando necessario e pulisce codice o token dall’URL prima dello scambio. Il verifier PKCE resta temporaneamente nel localStorage per poter aprire il link in un’altra scheda dello stesso browser; viene rimosso allo scambio e non è un bearer token. In ambienti condivisi effettuare sempre il logout. Le sessioni dipendono dalle impostazioni di Supabase Auth.

## Modello di sicurezza e prenotazione

- Profili pubblici: nome, bio, quartiere, avatar e stato di conferma email, mai email o indirizzo. Foto e bio sono facoltative; l’email confermata non equivale a identità verificata.
- Annunci: visibili se attivi; il proprietario può vederli anche in pausa.
- Richieste, messaggi e foto di riscontro: accessibili ai soli partecipanti tramite RLS.
- Prezzo, cauzione, accessori, condizioni e assicurazione vengono copiati server-side nella richiesta. Il client non decide importi o identità del proprietario.
- Giorni fatturati inclusivi: dal 12 al 15 = quattro giorni. Massimo sessanta giorni per richiesta.
- La richiesta non blocca le date; l'accettazione sì. Un lock sulla riga dell'annuncio serializza accettazioni e blocchi manuali, impedendo sovrapposizioni confermate.
- Transizioni protette da RPC: richiedente invia/annulla/restituisce; proprietario accetta/rifiuta/consegna/chiude. Nessun aggiornamento diretto agli stati è concesso al client.
- Registro immutabile dei passaggi con note e foto. La conferma è una dichiarazione dell'attore, non una firma elettronica, una perizia o una garanzia della piattaforma.
- Foto annunci in bucket pubblico; foto di consegna in bucket privato con URL firmati di cinque minuti. Max quattro file per operazione. Le foto originali JPG/PNG/WebP fino a 15 MB vengono convertite nel browser a JPEG, massimo 1.600 pixel e 500 KiB. Avatar pubblico in bucket separato, una foto per profilo.
- Chat con polling ogni quindici secondi mentre la sezione è visibile. Limite server: cinque messaggi in dieci secondi per mittente.
- Cauzione separata dal costo. L'app non incassa, custodisce, assicura né rimborsa denaro.

## Deploy Vercel

Il progetto è predisposto per Vercel con `vercel.json`: build `npm run build`, output `dist`, nessun framework richiesto. Repository privata: https://github.com/nicolocaloni-hub/set-in-comune. Progetto Vercel collegato: `set-in-comune-app` (ID `prj_Zo54HpvO655WojjmyK7cN1LWmdCN`). Demo verificata online: https://set-in-comune-app.vercel.app/. Il progetto `set-in-comune` rimane la prima anteprima senza collegamento Git; per gli aggiornamenti usare `set-in-comune-app`.

Non eseguire upgrade a piani a pagamento senza una scelta esplicita del proprietario dell'account. La protezione Vercel esistente non viene disattivata dal codice.

## Verifiche

`npm test`: calcolo giorni, input date, sovrapposizioni inclusive, transizioni per ruolo, ciclo demo, persistenza, blocco prenotazioni proprie e visibilità degli annunci in pausa.

Prima della produzione con utenti reali, eseguire in staging con tre account A/B/C:

1. A pubblica un annuncio; B prenota e C non può leggere richiesta o chat.
2. B non può accettare la propria richiesta o cambiare prezzo/owner via REST.
3. A accetta due richieste sovrapposte in concorrenza: solo una deve riuscire.
4. Un blocco manuale non può sovrapporsi a un noleggio accettato.
5. Le foto private non sono leggibili da utenti estranei o anonimi.
6. Email di conferma, login, rinnovo sessione, logout e reset password funzionano sul dominio finale.
7. Consegna, restituzione, chiusura, annullamento e fallimenti upload sono visibili correttamente su due browser indipendenti.

## Limiti e attività prima del lancio pubblico

- Provisioning del database e test di integrazione non ancora completati.
- Documenti privacy/termini del gestore, contatti assistenza e procedura per cancellazione dati da completare: la schermata informativa è un avviso di stato, non un testo legale definitivo.
- Moderazione, segnalazioni, gestione reclami e account bloccati da implementare prima di una community pubblica aperta.
- Non sono ancora presenti recensioni, verifica identità, notifiche email di nuove richieste, pagamenti, polizze, firma contratti o mappe stradali.
- Distanze stimate tra centri dei quartieri (raggio dieci km); non distanze stradali o da un indirizzo preciso.
- Upload da tenere monitorati: la cancellazione di file orfani, la retention e il backup automatico richiedono un processo operativo.
- La ricerca carica la prima pagina REST (limite Supabase predefinito): prima di cataloghi estesi implementare paginazione e filtri server-side.

Vedere `COSTI.md` per limiti ufficiali, esempi sul numero di foto e soglie consigliate. Vedere `PRELANCIO.md` per distinguere le funzioni demo dai requisiti ancora da verificare prima del pilota.

La revisione dei venti punti del video, le correzioni, i test e i controlli ancora da svolgere sono in `SECURITY_AUDIT.md`. Per lo schema iniziale mantenere `private` fuori dagli schemi esposti della Data API.

## Notifiche e installazione

Manifest, service worker, preferenze per dispositivo e contatori dei non letti sono implementati. La modalità demo permette di verificare i contatori tramite una richiesta e la sua accettazione simulata; non invia push a utenti fittizi. `PUSH_SETUP.md` descrive attivazione, stato del progetto gratuito e passaggi ancora da completare. Il server notifiche è configurato e verificato senza destinatari reali. Il frontend pubblico resta in demo fino alla configurazione Auth/email e alle prove tra dispositivi reali.
