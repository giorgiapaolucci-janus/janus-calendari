# Manuale operativo – Calendari Istituto Janus
Ultimo aggiornamento: 9 ottobre 2026

## Come è fatto il sistema
- **Software "Calendari Janus"** (artifact di Claude, solo Giorgia): fonte unica di orari, docenti, turni, assenze, sostituzioni e regole. Le modifiche si fanno qui.
- **Repository GitHub** `janus-calendari`: contiene i dati pubblicati `mattina.json`, `sera.json`, `docenti.json`.
- **Tre pagine su Delera** (blocco HTML personalizzato): leggono i JSON da GitHub e si aggiornano da sole, senza toccare Delera.
- **File Excel "Calendario lezioni ufficiale"**: copia per i colleghi, rigenerata a ogni aggiornamento.
- **Manuale delle regole** (`MANUALE-REGOLE.md`): le regole che il software rispetta sempre.

## Link
- Repository GitHub: https://github.com/giorgiapaolucci-janus/janus-calendari
- Dati pubblicati (GitHub Pages):
  - https://giorgiapaolucci-janus.github.io/janus-calendari/mattina.json
  - https://giorgiapaolucci-janus.github.io/janus-calendari/sera.json
  - https://giorgiapaolucci-janus.github.io/janus-calendari/docenti.json
- Anteprime Delera (condivisibili):
  - Calendario mattina: https://link.delera.co/preview/6xnboKNg5t3M3UTOWh0r?notrack=true
  - Calendario sera: https://link.delera.co/preview/g3cZxdxJKYUSOkxJ4GUF?notrack=true
  - Calendario docenti: https://link.delera.co/preview/1PKnvJoCd0GS1Hpok8dU?notrack=true

## Operazioni di ogni giorno
1. **Modifica o assenza**: si registra nel software (chat o pulsanti). Le sostituzioni sono proposte dal software e approvate da una persona.
2. **Aggiornamento**: Giorgia scrive a Claude "aggiorna i calendari". Claude legge assenze, sostituzioni e modifiche dal software, rigenera `mattina.json`, `sera.json`, `docenti.json`, li carica su GitHub e rigenera il file Excel.
3. **Controllo**: ricaricare le pagine Delera; le modifiche compaiono in pochi minuti.

## Cosa si vede e quando
- **Modifica permanente** (es. cambio aula): resta sempre.
- **Sostituzione temporanea** (malattia, ferie…): compare solo nelle date indicate; finita la data tutto torna come prima. Nella pagina docenti il sostituito è barrato ("Sostituito da…"), chi sostituisce ha l'etichetta "Sostituisce…". La pagina docenti ha le frecce per cambiare settimana.
- **Lezione scoperta** (nessun sostituto): non è pubblicata finché non viene assegnata.
- **Esercizi**: etichetta ESERCIZI, aula DOCENTI, pulsante "Accedi alla lezione" con il link Zoom dell'aula in cui il docente fa lezione in quell'ora.

## Se qualcosa non torna
- Dato sbagliato in una pagina: dirlo a Claude indicando giorno, ora e classe; si corregge nel software e si aggiorna.
- Pagina Delera non aggiornata: ricaricare con cache svuotata; se persiste, verificare che il link GitHub Pages dei JSON risponda.
- Le pagine Delera hanno una copia interna dei dati (riserva) che si usa solo se GitHub non risponde.

## Da non fare
- Non modificare a mano i JSON su GitHub, le pagine su Delera o il file Excel: verrebbero sovrascritti al prossimo aggiornamento.
- Non usare più il foglio "Calendario presenza – prototipo": è fermo all'8 ottobre 2026.

## Turni mattina (confermati il 9 ottobre 2026)
Albano: smart lun/mer/ven, presenza mar/gio. Branca: smart mar/ven. Luverà: smart mar/gio. Gli altri docenti come da foglio PERMESSI.
