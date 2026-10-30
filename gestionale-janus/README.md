# Gestionale Janus

Area dedicata allo sviluppo condiviso del software Janus.
Test di collaborazione: modifica effettuata dalla seconda collaboratrice tramite Codex.

## Versione operativa del gestionale

Codice del gestionale operativo con docenti e lezioni allineati ai calendari pubblicati al 30 ottobre 2026. Comprende Marianna Raia, le modifiche di mattina e sera, le assegnazioni MME/Turismo e la lezione di Meccanica con Google Meet senza docente. Non è la copia HTML autonoma preparata per Delera.

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

Il calendario iniziale importa le modifiche storiche e applica una volta l'allineamento del 30 ottobre definito in `allineamento.json`. I collegamenti alle lezioni e gli accessi per aula/orario rimangono quelli dei calendari pubblicati. Non sono incluse credenziali Google/GitHub o token OAuth. Ogni avvio usa un archivio locale escluso da Git. Lo snapshot versionato in `dati/` conserva lo storico già presente nel repository.

### Aggiornare un gestionale già in uso

Eseguire Fetch/Pull del ramo `preparazione-janus`, chiudere il vecchio processo Janus e riavviarlo dalla stessa cartella, conservando `archivio/`. Al primo avvio aggiornato il programma confronta le lezioni locali con la versione precedente e quella pubblicata; salva un backup, applica l'allineamento e registra l'operazione. I riavvii successivi non riapplicano le modifiche, quindi le nuove modifiche delle collaboratrici restano valide.

Assenze, sostituzioni, proposte, regole, personalizzazioni dei docenti e lezioni locali aggiuntive sono conservate. Se una lezione modificata localmente contrasta con l'allineamento, nessuna modifica del pacchetto viene applicata: viene mostrato l'elenco degli ID da verificare e la pubblicazione automatica viene sospesa. Non sostituire l'archivio locale con lo snapshot GitHub. Alessandra Sbucafratta è esclusa dai filtri attivi ma rimane riconoscibile nello storico.

`npm test` verifica anche la migrazione, i conflitti locali e il confronto di tutte le 248 lezioni esportate (compresi link e passcode) con i calendari pubblicati.

Non copiare la cartella `archivio` dal Mac nel repository. Per la sincronizzazione reale occorre configurare gli accessi nell’ambiente autorizzato. Senza credenziali questa copia non pubblica sui calendari esterni. L’integrazione esistente, se configurata, pubblica i dati su `main`: non attivarla durante semplici prove di sviluppo.

### Cosa comprende

Calendario, docenti, assenze e modifiche, controlli, regole, persistenza locale con backup e controllo revisioni, generatori dei tre calendari e integrazioni Google/GitHub. La funzione Chat interna è stata rimossa. `riservato/` contiene la preparazione del portale di sola consultazione, ancora da configurare e pubblicare. I relativi test richiedono prima `npm run build:riservato`.

Le due copie locali non condividono automaticamente i dati inseriti nel gestionale: GitHub condivide il codice. Un archivio operativo unico richiede una configurazione ulteriore. La pubblicazione del codice in questo ramo non cambia i file dei calendari Delera.
