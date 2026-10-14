# Calendari studenti - come funzionano

Due pagine separate, stessa grafica di prima:
- `calendario-mattina.html` (legge `mattina.json`)
- `calendario-sera.html` (legge `sera.json`)

Ogni pagina ha dentro una copia dei dati (riserva) e, all'apertura, prova a leggere il suo file JSON da internet. Se il file risponde, mostra quello (sempre aggiornato); se non risponde, mostra la copia interna.

## Una tantum
1. Crea su GitHub un repository dedicato (es. `janus-calendari`), pubblico, con dentro solo `mattina.json` e `sera.json`. Attiva GitHub Pages (Settings > Pages > Branch main).
2. Nelle due pagine HTML cerca `URL_DATI` e sostituisci `https://UTENTE.github.io/REPO` con l'indirizzo vero del tuo repository.
3. In Delera, nei due blocchi "HTML/Javascript personalizzato", incolla il contenuto dei due file (uno per blocco).

## Ogni volta che il calendario cambia
Scrivi nella chat del progetto: "aggiorna il calendario studenti". Claude legge dal software le modifiche permanenti e le sostituzioni approvate, rigenera `mattina.json` e `sera.json` e li carica su GitHub. Le pagine Delera NON vanno toccate.

- Modifiche permanenti: restano sempre.
- Sostituzioni temporanee (malattia, ecc.): compaiono solo nelle date indicate; finita la data il calendario torna da solo come prima.
- Lezioni scoperte (nessun sostituto): non vengono pubblicate, finché non le assegni.

## Esercizi (regola R04 / R23)
Le lezioni "esercizi" mostrano: etichetta ESERCIZI, aula DOCENTI (per chi è in sede), pulsante ACCEDI ALLA LEZIONE con il link Zoom dell'aula in cui il docente fa lezione in quell'ora (venerdì 11:00: Aula 6, Gabriele).

## File tecnici
- `base-*.json`: calendari di partenza (quello che vedono oggi gli studenti, già corretto: Federico Vani, esercizi, 7 lezioni nascoste eliminate).
- `genera-studenti.js`: applica le modifiche del software ai calendari base.
- `prepara.js`: ha creato le pagine dai due codici originali (non serve più).

## Calendario docenti
Terza pagina, `calendario-docenti.html`, legge `docenti.json`. Il file è generato dal software (stessa fonte dei due studenti): ogni modifica permanente ai calendari si riflette anche qui, quando dici "aggiorna i calendari". Mostra l'orario settimanale tipo: le sostituzioni temporanee non compaiono.
