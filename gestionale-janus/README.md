# Gestionale Janus

Area dedicata allo sviluppo condiviso del software Janus.
Test di collaborazione: modifica effettuata dalla seconda collaboratrice tramite Codex.

## Versione operativa del gestionale

Codice derivato dal gestionale operativo di Giorgia, con le modifiche al calendario del 12 e del 14 ottobre 2026 (revisione 2). Non è la copia HTML autonoma preparata per Delera.

### Avvio

1. In GitHub Desktop selezionare questo repository e il ramo `preparazione-janus`, poi Fetch origin / Pull origin.
2. Installare Node.js 18 o successivo. Non sono necessari pacchetti npm per il gestionale principale.
3. Aprire il terminale nella cartella `gestionale-janus` ed eseguire `npm start` oppure `node server.cjs`.
4. Aprire http://127.0.0.1:8765/ . Su Windows è disponibile `Avvia-Janus.cmd`; su Mac `Avvia-Janus.command`.
5. Per i test: `npm test`. Non avviare più istanze sulla stessa porta.

### Collaborazione tra pari

Entrambe le collaboratrici possono modificare il codice, fare commit e push con i propri account e con i permessi GitHub già assegnati. Non è previsto nel codice un ruolo di proprietaria superiore. Le approvazioni delle proposte didattiche nel gestionale restano una funzione operativa utilizzabile da entrambe.

Prima di iniziare: Fetch/Pull. Prima di fare push: Fetch/Pull e risolvere gli eventuali conflitti conservando il lavoro di entrambe. Non usare Force push. Coordinatevi prima di modificare contemporaneamente gli stessi file. Per questa consegna si usa esclusivamente `preparazione-janus`; nessun merge su `main`. Nessun nuovo server è necessario per collaborare sul codice.

### Dati e segreti

Il calendario iniziale comprende le 69 modifiche permanenti della revisione 2. Non sono incluse assenze personali, sostituzioni datate, cronologia delle proposte, credenziali Google/GitHub, token OAuth, backup o archivi del Mac. Ogni avvio crea un archivio locale escluso da Git. I link Zoom nel codice non contengono la password del collegamento; gli accessi alle lezioni vanno forniti separatamente alle persone autorizzate.

Non copiare la cartella `archivio` dal Mac nel repository. Per la sincronizzazione reale occorre configurare gli accessi nell’ambiente autorizzato. Senza credenziali questa copia non pubblica sui calendari esterni. L’integrazione esistente, se configurata, pubblica i dati su `main`: non attivarla durante semplici prove di sviluppo.

### Cosa comprende

Calendario, docenti, assenze e modifiche, controlli, regole, persistenza locale con backup e controllo revisioni, generatori dei tre calendari e integrazioni Google/GitHub. La sezione Chat presente nella sorgente originale resta disattivata: non è stato aggiunto alcun nuovo collegamento AI. `riservato/` contiene la preparazione del portale di sola consultazione, ancora da configurare e pubblicare. I relativi test richiedono prima `npm run build:riservato`.

Le due copie locali non condividono automaticamente i dati inseriti nel gestionale: GitHub condivide il codice. Un archivio operativo unico richiede una configurazione ulteriore. La pubblicazione del codice in questo ramo non cambia i file dei calendari Delera.
