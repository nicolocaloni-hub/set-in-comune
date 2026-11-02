# Collaudo del proprietario con backend reale · 2 novembre 2026

Il gestore autorizza il collaudo con il proprio account esistente dopo il completamento del percorso demo Android. iPhone: prova rinviata per sua scelta, non attestata come superata.

Backend verificato attivo; un solo account con email confermata e ruolo operatore. Nessun documento attivo. Non si pubblicano documenti fittizi né ricevute e non si cambia il blocco server delle nuove attività.

## Perimetro della prima prova

Preview Vercel riservata tramite la protezione SSO già presente, ramo `test/owner-account-check-20261102`, piano Hobby esistente. Il dominio pubblico resta demo. Il build dedicato rifiuta produzione, altri rami, altro backend o chiavi private. La chiave client publishable è configurata solo per questo ramo preview; non è una chiave privilegiata.

Consentiti: accesso con account esistente, profilo, lettura dei dati, esportazione e uscita. Le modifiche del profilo vengono realmente salvate nel database. Annunci, nuove foto pubbliche, richieste, chat nuove e recensioni rimangono sottoposti ai controlli legali del server; in assenza dei documenti attivi non vanno dichiarati collaudati.

Registrazione, recupero e cambio password sono esclusi da questa prima preview: il callback esistente resta sul dominio pubblico demo e deve essere collaudato separatamente. Non si disabilita conferma email, non si inventano accettazioni e non si modifica la password dell'account reale. Non cancellare l'account del gestore per prova.

L'utente inserisce le proprie credenziali direttamente nel modulo. Non inviare password o codici in chat. Una prova fra due controparti richiederà un secondo account di test identificato e i documenti attivi; non rappresentare questa prima prova come collaudo completo del marketplace collegato.

## Verifica

138 test locali superati, build demo normale riuscito, scansione dei pattern di credenziali e controllo diff senza rilievi. Due nuove prove verificano perimetro del build e assenza di richieste Auth per signup/reset/cambio password nella preview di collaudo. Nessuna nuova dipendenza installata.

## Riscontri Android del proprietario

Preview pubblicata; accesso reale riuscito dopo il ripristino della password richiesto dal proprietario. Credenziali e token non sono registrati in questo documento.

Il proprietario ha confermato: salvataggio della bio «Collaudo Android», permanenza dopo ricarica, uscita e nuovo accesso con la bio conservata. Screenshot dell'esportazione JSON aperta su Android: bio presente e raccolte noleggi vuote. Non sono attestati test del recupero email, del login Google, della registrazione o del marketplace multiutente. È in attesa il riscontro della vista del profilo pubblico.

Il pulsante mostra/nascondi password è stato pubblicato e risulta visibile nello screenshot inviato dal proprietario. La nuova schermata distingue Accedi e Registrati; la registrazione resta chiusa nella preview. Vedi GOOGLE_SIGN_IN_SETUP.md per configurazione OAuth ancora mancante.
