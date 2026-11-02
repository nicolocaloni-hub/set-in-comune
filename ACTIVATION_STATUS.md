# Attivazione · stato effettivo al 2 novembre 2026

## Completato sul progetto dedicato

- Destinazione verificata: Supabase `srjdysdhxnafjrutufmk`, progetto `set-in-comune`, Francoforte, stato ACTIVE_HEALTHY, organizzazione collegata al team del proprietario. Piano dell’organizzazione verificato Free.
- Migrazione `20261102000639`, `legal_acceptance_and_profile_rectification`, applicata tramite il collegamento Supabase, senza installazioni. Ricevute e controllo server delle nuove attività presenti; nessun documento definitivo attivato.
- Account indicato dal proprietario configurato in `private.app_moderators`. Accesso autenticato a sicurezza, coda segnalazioni e coda privacy verificato. Nessuna delega a terze persone.
- Test SQL remoto delle ricevute: scelta esplicita, hash errati respinti, isolamento fra account, data server/idempotenza, immutabilità dei documenti, blocco delle nuove attività e rettifica del profilo. Tutte le fixture annullate con rollback; zero utenti fixture residui.
- Test SQL remoto A/B/C: richieste, chat, conversazioni preliminari, notifiche, letture riservate, recensioni, segnalazioni e blocchi. Fixture e documenti di prova annullati; nessuna impostazione operativa modificata e nessun invio di email/push. pg_net esegue le richieste soltanto al commit, che il test non effettua.
- Controllo successivo: 1 profilo reale di prova preesistente, 0 annunci, 0 noleggi, 0 ricevute e 0 documenti attivi. Nessuna cancellazione periodica attivata.

## Controlli e limiti

114 test locali erano passati sul codice RC2; con l’integrazione CAPTCHA RC3 i controlli sono aggiornati in TURNSTILE_SETUP.md. Build demo e scansione credenziali restano senza rilievi. Gli advisors dopo la migrazione riportano le tabelle private RLS senza policy (intenzionalmente prive di accesso diretto) e il precedente avviso di protezione da password compromesse disattivata. Nessun piano è stato cambiato per eliminare l’avviso.

## Ultimi controlli · 2 novembre 2026

PR #1 Turnstile integrata e PR #3 mobile pubblicata; main osservato `d521a1253031c82a52b0c216f32f2412200de46a`. Vercel produzione READY, dominio verificato, file pubblicati corrispondenti al build. 119 test superati; prova desktop di catalogo, filtri, dettaglio/calendario, profilo, modulo annuncio e domanda/chat nella sola demo. Il browser disponibile non permette emulazione del telefono né accesso alla preview locale; tastiera, touch e dispositivi reali restano da provare.

Controllo operativo remoto: database circa 14,2 MB; zero file nei tre bucket, riscontri privati e limiti di upload attivi; nessuna pratica aperta o job in coda. Tutte le tabelle public/private hanno RLS e non ci sono funzioni privilegiate nello schema public. Il report è aggregato e di sola lettura, non un backup né il consumo fatturabile del provider. Dettagli e limiti in RECOVERY_PLAN.md.

## Blocchi effettivi alla versione per utenti reali

1. CAPTCHA: il proprietario ha creato il widget Cloudflare nel proprio browser e fornito la Site Key pubblica. È configurata in Vercel, solo produzione. Client integrato con le modifiche legali correnti e worker account-erasure versione 3 attivo. Il worker inoltra il token e ammette le origini canoniche. Manca l’inserimento privato della Secret Key in Supabase e la prova completa widget/Auth; il controllo Auth resta spento. Nessun segreto è stato chiesto in chat.
2. Accesso all’anteprima Vercel: deployment RC2 READY, ma protetto da login. Il collegamento Vercel per ottenere l’accesso temporaneo restituisce «The deployment could not be found, or your Vercel connection may not have access to it.» Nessuna CLI autenticata disponibile; non è stata modificata la protezione.
3. Documenti definitivi: revisione RC4 disponibile; verificate le fonti ufficiali degli accordi standard. Successivamente il gestore ha scelto di preparare Cloudflare Pages Free: build alternativo predisposto, nessuna migrazione effettuata. IONOS verificato come Pack Dominio dal 31 ottobre 2026, due inoltri Gmail; nessuna casella completa inclusa confermata. Individuata Proton Free con DPA come alternativa da creare e provare, senza modifiche alla posta. `PROVIDERS_REVIEW.md` riporta evidenze e limiti; `CONTACT_RETENTION_REVIEW.md` distingue dati di contatto GDPR, domicilio ex art. 7 se applicabile e proposta di conservazione accettata in modo condizionato. Nessun indirizzo pubblicato o flag legale forzato per superare il blocco del build.
4. Prove dal telefono e dal browser con account reali: il nuovo flusso e le push non sono stati collaudati nell’interfaccia collegata. I test SQL reali non sono presentati come prove di upload fisici, ricezione push o uso da telefono.

5. Backup e recupero: manca la prima copia completa esterna di database e file e una prova di ripristino isolata. In questo ambiente non risultano disponibili CLI Supabase, pg_dump o psql; il collegamento SQL non sostituisce un backup. Nessun programma installato o servizio a pagamento attivato. Procedura concreta e query di controllo in RECOVERY_PLAN.md.

Il sito può ricevere le migliorie della demo e i testi veritieri, ma non viene dichiarato aperto a utenti reali finché questi punti non sono risolti. Nessun abbonamento, chiave, DNS o impostazione Auth di redirect modificati.
