# Costi di Set in comune

Verifica delle fonti ufficiali: 30 ottobre 2026. Importi in USD ove indicato; cambio, IVA, imposte, consumo e rinnovi possono variare. Stime orientative, non un preventivo o una garanzia di costo massimo.

| Voce | Partenza | Crescita / note |
|---|---|---|
| GitHub, repository privata | Free: 0 USD | Repository private illimitate; limiti separati per Actions e altri servizi |
| Hosting Vercel | Hobby: 0 USD per uso personale/non commerciale | Pro: da 20 USD/mese; consumi extra possibili. Per un marketplace commerciale pianificare Pro. |
| Supabase: account, database, foto | Free: 0 USD entro i limiti | Pro: da 25 USD/mese per configurazione iniziale standard; compute e consumo extra separati |
| Dominio | Sottodominio Vercel senza acquisto separato | Dominio personalizzato facoltativo: preventivo da verificare per nome, estensione e rinnovo |
| Email transazionali | Non usate dalla demo; email Auth da configurare in produzione | Provider SMTP, dominio mittente e volumi da scegliere e quotare |
| Mappe e geocoding | 0 costi API in questa versione | Quartieri e coordinate indicative locali; eventuale servizio cartografico da quotare in futuro |
| Pagamenti e cauzioni in app | Nessun servizio di pagamento integrato | Nessuna commissione applicativa di pagamento; pagamenti esterni possono avere costi propri |
| Assicurazione | Non fornita dalla piattaforma | Eventuali premi e condizioni da concordare con assicuratore e proprietario |
| Manutenzione, assistenza, moderazione | Tempo del gestore | Non incluso negli abbonamenti infrastrutturali |
| Privacy, termini e consulenza | Da definire con professionista | Budget separato prima dell'apertura pubblica |

## Scenari

- Demo personale/non commerciale: può rimanere entro i piani gratuiti. Non è un servizio multiutente con database collegato.
- Pilota di natura commerciale: base Vercel Pro 20 USD/mese + eventuale Supabase Free nei limiti. Se il piano Pro esiste già, verificare la fattura e i consumi dell'intero account invece di sommare automaticamente un nuovo abbonamento.
- Base con Vercel Pro + Supabase Pro: da 45 USD/mese (540 USD/anno) prima di imposte, extra, email, dominio e servizi professionali.
- Crescita: foto, download e traffico, query, invii email e lavoro di supporto possono pesare più del numero di account. Non è possibile garantire una cifra mensile senza misurare utilizzo e configurazione.

Supabase Free include attualmente 500 MB di database, 1 GB di file, 5 GB di egress e 5 GB di cached egress; i progetti gratuiti possono essere sospesi dopo una settimana di inattività. Come ordine di grandezza, quattro foto da 0,5 MB per annuncio occupano circa 2 MB: 1 GB corrisponde a circa 500 annunci, prima di foto di riscontro e altri file. Questo è un calcolo illustrativo, non la capacità garantita del progetto.

## Come tenere bassi i costi

1. Comprimere e ridimensionare le foto prima del caricamento; la versione corrente impone un limite di file ma non esegue ancora una compressione automatica.
2. Attivare avvisi e limiti di spesa nei provider quando si sceglie il piano di produzione.
3. Partire da Roma, pochi utenti invitati e pagamento diretto.
4. Controllare banda, spazio file e email ogni mese.
5. Introdurre mappe, pagamenti e verifiche identità solo quando il modello di utilizzo è chiaro.

Fonti:
- https://github.com/pricing
- https://vercel.com/pricing
- https://vercel.com/docs/plans
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase
