# Costi e soglie di Set in comune

Fonti ufficiali consultate il 30 ottobre 2026. Valori in USD prima di imposte, cambio ed extra. Nessun upgrade, prova a pagamento o abbonamento viene attivato dal codice. I limiti del provider valgono per progetto/organizzazione, non per singolo utente dell'app, e possono essere condivisi con altri progetti.

## Durante lo sviluppo

La versione pubblicata è ancora una demo locale: annunci, profili, foto e messaggi di prova restano nel browser. Non consuma uno spazio foto Supabase di questa app, perché non ha ancora un database collegato. Il limite del browser è più basso dei limiti cloud: se finisce, l'app avvisa e annulla la modifica invece di simulare un salvataggio riuscito.

GitHub privato è gratuito nell'uso attuale. La demo può essere sviluppata su Vercel Hobby per uso personale/non commerciale. Non è ancora stato verificato il piano di fatturazione effettivo dell'account; eventuali abbonamenti preesistenti sono separati da questo lavoro.

## Limiti gratuiti e momento di rivalutazione

| Risorsa | Limite gratuito ufficiale | Soglia operativa consigliata (nostra, non del provider) |
|---|---|---|
| Supabase Storage: tutte le foto, inclusi avatar e riscontri | 1 GB | Rivedere pulizia e upgrade a 700–800 MB |
| Supabase database: profili, annunci, richieste, messaggi, indici e metadati storage | 500 MB per progetto | Rivedere a 350–400 MB; lo spazio non coincide con il peso delle foto |
| Supabase egress non in cache | 5 GB | Rivedere a 3,5–4 GB nel mese |
| Supabase egress in cache | 5 GB, quota indipendente | Rivedere a 3,5–4 GB nel mese; non sommare le due quote come se fossero intercambiabili |
| Supabase Auth | 50.000 utenti attivi mensili | Le foto o la banda probabilmente diventerebbero un vincolo prima; non è una garanzia di capacità |
| Supabase inattività | Possibile pausa dopo 1 settimana | Valutare Pro quando serve continuità e backup, anche con pochi utenti |
| Vercel Hobby | 100 GB Fast Data Transfer e 1.000.000 CDN Requests nel periodo previsto dal piano | Valutare uso e natura del progetto; Hobby è riservato a uso personale/non commerciale |
| Email di conferma e recupero | SMTP Supabase di test: indirizzi preautorizzati e attualmente 2 messaggi/ora | Prima di invitare utenti esterni serve un SMTP dedicato; un piano Supabase Pro da solo non risolve questo punto |

Le soglie al 70–80% sono raccomandazioni per conservare margine, **non allarmi automatici già configurati**. I contatori ufficiali sono nelle dashboard dei provider. Sul Free un superamento non converte automaticamente l'organizzazione in Pro: Supabase può notificare e poi applicare restrizioni se l'eccesso continua. Vercel Hobby può sospendere la funzionalità esaurita fino al rinnovo della disponibilità, secondo il limite interessato.

## Quante foto posso caricare?

Non esiste un numero fisso di foto che fa scattare un pagamento. Contano peso totale conservato, traffico delle visualizzazioni e tutti gli altri consumi. Esempi con unità decimali arrotondate (1 GB = circa 1.000 MB), senza altri file:

| Peso medio salvato per foto | 300 foto | Foto teoriche in 1 GB | Foto a circa 750 MB |
|---|---:|---:|---:|
| 200 KB | 60 MB | 5.000 | 3.750 |
| 300 KB | 90 MB | 3.300 | 2.500 |
| 500 KB | 150 MB | 2.000 | 1.500 |
| 4 MB, originali non compressi | 1.200 MB | 250 | 187 |

La versione 0.3 riduce le immagini nel browser: lato lungo massimo 1.600 pixel, JPEG massimo 500 KiB (512.000 byte), fino a quattro foto per annuncio o passaggio di consegna e una foto profilo. Rimuove i metadati EXIF riscrivendo l'immagine. Il peso effettivo dipende dalla fotografia: non garantiamo una media di 200 o 300 KB. Le foto ridotte non sostituiscono gli originali per eventuali necessità documentali.

Con una media di 300 KB e quattro foto per annuncio, 1 GB equivale teoricamente a circa 830 annunci. Per mantenere margine, circa 600 annunci occuperebbero 720 MB **prima** di avatar, foto di consegna/restituzione e file non più associati. Se un singolo utente carica 300 foto, quelle foto contano nella stessa quota di tutti gli altri utenti.

## La banda può finire prima dello spazio

Una foto da 300 KB scaricata 1.000 volte trasferisce circa 300 MB, pur continuando a occupare soltanto 300 KB di spazio. Una schermata che scarica 12 foto da 300 KB trasferisce circa 3,6 MB: circa 1.400 caricamenti integrali valgono 5 GB. È solo una stima: cache del browser/CDN, lazy loading, dimensioni reali, API e altri servizi cambiano il risultato. La quota cached e quella uncached si misurano separatamente.

Le foto cloud di questa architettura sono servite direttamente da Supabase: il loro traffico grava su Supabase, mentre Vercel serve l'interfaccia. Non usiamo un servizio di trasformazione immagini a consumo. La chat usa polling ogni 15 secondi solo mentre è visibile; un uso intenso richiederà anche ottimizzazioni di query, paginazione e aggiornamenti incrementali.

## Quando avrebbe senso pagare

1. **Ora: rifinitura e prove personali.** Nessun nuovo piano a pagamento. Completare interfaccia, schema e test; poi collegare un progetto gratuito nell'organizzazione scelta dal proprietario.
2. **Prima del pilota esterno.** Configurare SMTP, verificare email e isolamento dei dati con account distinti; definire assistenza, moderazione e testi del gestore. Un provider SMTP può offrire una quota gratuita, ma disponibilità, dominio mittente e condizioni vanno verificati prima della scelta.
3. **Quando il progetto diventa commerciale.** Pianificare un hosting compatibile. Per Vercel Hobby l'uso personale/non commerciale è un requisito: non bisogna aspettare 300 foto, un numero di utenti o il primo incasso per valutare l'idoneità del piano.
4. **Con crescita misurata o necessità di continuità.** Valutare Supabase Pro avvicinandosi alle soglie sopra, o prima se servono continuità, backup automatici e maggiore capacità. Gli utenti attivi da soli non sono un criterio sufficiente.

Vercel Pro parte da 20 USD/mese e Supabase Pro da 25 USD/mese per la configurazione base con primo progetto Micro incluso nei crediti: insieme da circa 45 USD/mese, prima di imposte ed extra. Supabase Pro comprende 100 GB di file, 8 GB database per progetto e quote egress di 250 GB uncached + 250 GB cached, indipendenti. Compute aggiuntivo, ulteriori progetti, utenti Vercel fatturabili e consumi oltre soglia possono aumentare la cifra. Un account già Pro non va contato due volte senza controllare la fattura.

## Altre voci

- Dominio personalizzato: facoltativo durante lo sviluppo, costo e rinnovo da verificare per l'estensione scelta.
- Mappe: questa versione usa quartieri e distanze indicative, senza API cartografiche a pagamento.
- Pagamenti: pagamento e cauzione sono direttamente tra le persone; nessun provider di pagamento integrato. Eventuali costi dei loro mezzi di pagamento restano separati.
- Assicurazione, verifica documenti, consulenza, privacy/termini, moderazione e assistenza: non inclusi nei piani hosting/database.

## Fonti ufficiali

- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/manage-your-usage/storage-size
- https://supabase.com/docs/guides/platform/manage-your-usage/egress
- https://supabase.com/docs/guides/platform/billing-faq
- https://supabase.com/docs/guides/auth/auth-smtp
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/plans/pro-plan
- https://github.com/pricing

## Protezioni predisposte nel pilota 0.3

Lo schema iniziale limita il caricamento a 30 foto/ora e 200 file per utente, con 1.500 file complessivi nei bucket dell’app (massimo teorico circa 768 MB a 500 KiB per file). Sono quote dell’app predisposte nel codice, ancora da attivare sul backend. Non garantiscono un costo massimo del provider e non misurano la banda o altri progetti. È necessaria la pulizia dei file sostituiti e la supervisione della dashboard.
