# Calendari Janus: accessi per aula e ora

La fonte dei link Zoom e dei passcode è accessi-zoom.json: 56 combinazioni (7 aule, 4 ore al mattino e 4 alla sera). Conservare i passcode come stringhe, senza aggiungere zeri. Il CSV non distingue i giorni: l'abbinamento vale per tutti i giorni della settimana. Le email degli account non sono pubblicate.

I JSON mattina.json e sera.json contengono accessiZoom e zoomPasscode per le lezioni. Il generatore del gestionale usa la stessa configurazione, applicata dopo cambi di aula e ora. Per gli Esercizi segue l'aula Zoom del docente. Non viene cambiato alcun orario didattico.

## Collegamento Delera (una sola volta)
Sostituire i blocchi HTML mattina e sera con delera/calendario-mattina.html e delera/calendario-sera.html. Queste versioni leggono gli accessi dai JSON su GitHub; i blocchi precedenti con mappe fisse non vengono aggiornati automaticamente. Il pulsante lilla Aggiorna calendario riapre la pagina con un parametro nuovo e richiede i dati senza cache. Le schede aperte prima della modifica vanno riaperte per vedere il pulsante.

## Aggiornamenti futuri
Cambiare accessi-zoom.json su main e sul ramo preparazione-janus, poi rigenerare e pubblicare i JSON dei calendari con lo stato operativo corrente. Il modulo accessi-zoom.cjs applica la configurazione ai dati senza cambiare le lezioni. Cambiare il passcode visualizzato non modifica la riunione Zoom: il link completo e il codice devono restare coerenti con Zoom. Non usare lo stato di prova o copie vecchie per rigenerare i calendari pubblici.

Il repository è pubblico: link e passcode sono pubblici, come espressamente autorizzato. docenti.json resta invariato. Non sono inclusi token, credenziali amministrative, archivi personali o email degli account Zoom.

Per aggiornare i soli accessi conservando le lezioni gia pubblicate: `node aggiorna-accessi.cjs`. Verifica: `node --test test-accessi.cjs`.
