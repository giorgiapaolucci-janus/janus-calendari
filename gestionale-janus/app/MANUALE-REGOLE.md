# Manuale delle regole - Istituto Janus

Questo manuale raccoglie tutte le regole che il software di gestione calendari rispetta. Va tenuto sempre in considerazione per ogni modifica richiesta: ogni proposta di sostituzione, spostamento o cambio docente deve rispettarlo. Quando arriva una nuova regola o una disponibilità, si aggiunge qui e nella tab Regole del software.

## Struttura

### R01 - Orari e calendario
Le lezioni vanno da lunedì a venerdì. Mattina: ore 9, 10, 11, 12 (quattro ore). Sera: ore 17, 18, 19, 20 (quattro ore). Le lezioni sono per anni (1/2, 3/4, 5) e per indirizzi. Inizio del calendario: lunedì 5 ottobre 2026.

### R02 - Tre viste, una sola fonte
Il software mostra il calendario della mattina (Gold Experience e Gold Academy Live), il calendario della sera e gli orari dei docenti. I dati base derivano dal foglio "Calendario presenza - prototipo" (schede GESTIONE LEZIONI, GESTIONE SERALE, DOCENTI, AULE) e dal foglio "Calendario PERMESSI" (turni). Da ora la fonte unica è il software: le modifiche si fanno qui, il foglio non va più modificato a mano.

### R03 - Sessioni di lezione
Più righe con lo stesso giorno, ora, docente e aula formano una sola sessione (un docente che parla a più anni o indirizzi insieme). La sessione si sposta, si copre o si annulla come un blocco unico.

### R04 - Esercizi: aula docenti o da casa
Le lezioni che nel foglio hanno nota "Esercizi" (prima "Esercitazione da casa") e nessuna aula non richiedono un docente in aula: gli studenti svolgono esercizi assegnati dal docente. Chi è in sede li fa in AULA DOCENTI, chi è collegato li fa da casa. Se il docente è assente non serve sostituirlo. Sotto l'ora di lezione compare la dicitura "ESERCIZI" (non "casa").

### R23 - Venerdì 11:00 (3/4 anno): Chimica o esercizi di Lab matematica
Non tutti gli indirizzi hanno Chimica. Il venerdì alle 11:00, 3/4 anno, alcuni indirizzi fanno Chimica con Gabriele Luverà in Aula 6; gli altri fanno Lab matematica in modalità esercizi: Gabriele dà degli esercizi, chi è collegato li svolge da casa, chi è in sede li svolge in Aula docenti mentre Gabriele è in lezione di Chimica in Aula 6. Nel calendario studenti queste lezioni mostrano il pulsante "Accedi alla lezione" con il link Zoom dell'Aula 6 (il docente in quel momento è lì) e, come aula per chi viene in sede, "Aula docenti". Lo stesso comportamento vale per tutte le sessioni "Esercizi": il link è quello dell'aula in cui il docente fa lezione in quell'ora.

### R24 - Mercoledì 11:00: Scienze motorie al posto del Lab italiano
Dal 9 ottobre 2026 il mercoledì alle 11:00 (terza ora) il Lab italiano / Lab grammatica con Giulia Dipalo non c'è più. Per gli indirizzi con la doppia scelta resta Scienze motorie in Aula 1 con Lucia Carlucci. Le lezioni senza docente confermate: Lab italiano del lunedì 10:00 (1/2 anno) è con Giulia Dipalo in Aula 4 (prosecuzione della prima ora); Lab italiano del venerdì 11:00 (3/4, 4/5, 5 anno) è con Elisa Di Felice in Aula 5; Ed. civica del giovedì 12:00 (3/4 anno) è con Giorgia Clementi in Aula 1.

## Conflitti

### R05 - Un docente, una sola aula alla volta
Un docente non può essere in due aule (o in due sessioni diverse) nello stesso giorno e alla stessa ora. Una modifica o una sostituzione che crea questo conflitto non viene proposta.

### R06 - Un'aula, un solo docente alla volta
Nella stessa aula, nello stesso giorno e alla stessa ora, non possono esserci docenti diversi. Un'aula condivisa tra due docenti nella stessa ora è segnalata come conflitto nei Controlli.

## Docenti

### R07 - Materie che ogni docente può insegnare
Ogni docente ha un elenco di materie (scheda DOCENTI del foglio, più le materie viste negli orari). Per ogni sostituzione il motore assegna un livello di competenza: ESATTA (la materia è nell'elenco del docente), AFFINE (materia dello stesso gruppo disciplinare, es. matematica / fisica / lab matematica), PARZIALE (area vicina, es. inglese / francese), NESSUNA. Si propongono solo docenti con competenza almeno parziale; i candidati con competenza esatta hanno sempre la precedenza su quelli affini, e questi su quelli parziali.

### R08 - Gruppi disciplinari (affinità)
Matematica, lab matematica, fisica. Scienze, biologia, scienze integrate, chimica. Informatica, TPSI, meccatronica. Italiano, lab italiano, lab grammatica, lab lettura, epica/antologia, scrittura creativa, lab creativo. Storia, geostoria, storia dell'arte, italiano, latino, greco, filosofia. Inglese, lab inglese, potenziamento inglese. Scienze umane, psicologia, filosofia, igiene, metodologie operative. Diritto, educazione civica, economia politica, relazioni internazionali. Economia aziendale, DTA, GPOI, economia politica. Geografia turistica, geostoria, relazioni internazionali. Area parziale: lingue (inglese, francese, spagnolo), area umanistica con area linguistica, scienze con fisica e matematica.

## Turni

### R09 - Turni in presenza e smart working (mattina)
I turni vengono dal foglio PERMESSI: P = presenza, S = smart working, "-" = nessun turno. Per le lezioni della mattina serve il docente in sede: si propone chi ha turno P. Chi quel giorno è in smart working (S) può essere proposto solo come ultima scelta, con avviso "serve il rientro in sede". Chi non ha turno quel giorno non viene proposto. Si propongono solo docenti che lavorano abitualmente la mattina. Turni confermati il 9 ottobre: Alessandra Albano smart lunedì, mercoledì e venerdì, in presenza martedì e giovedì; Martina Branca smart martedì e venerdì (presenza lunedì, mercoledì, giovedì); Gabriele Luverà smart martedì e giovedì (presenza lunedì, mercoledì, venerdì).

### R10 - Assenze e permessi
Un docente assente (malattia, ferie, permesso, recupero) non può essere proposto per nessuna ora di quei giorni. Le assenze già presenti nel foglio PERMESSI per le date successive all'inizio delle lezioni sono caricate all'avvio: Albano il 9 ottobre (recupero open day) e il 12 ottobre (ferie).

## Serale

### R11 - Docenti del serale
Per le lezioni della sera si propongono solo docenti che fanno già lezioni serali. Non fanno la sera: Federico Vani, Beatrice Lungu, Elisa Rubeo. Un docente del serale che non ha lezioni la sera di quel giorno può essere proposto, ma con avviso "disponibilità da confermare".

### R12 - Luca Picarazzi: mai il venerdì sera
Luca esce alle 16:00 il venerdì: non può fare lezione né sostituire il venerdì sera.

### R13 - Lucia Carlucci: sera solo martedì e giovedì dalle 17 alle 19
Lucia può fare lezione la sera solo il martedì e il giovedì, nelle ore 17 e 18 (fino alle 19:00).

## Sostituzioni

### R14 - Il software propone, una persona approva
Quando si segnala un'assenza o una modifica, il software prepara una proposta con i docenti candidati e gli avvisi. Nulla cambia nel calendario finché una persona autorizzata non preme "Approva". Con "Rifiuta" la proposta viene scartata e non lascia tracce nel calendario.

### R15 - Come si sceglie il sostituto
Ordine di preferenza: 1) competenza esatta, poi affine, poi parziale; 2) docente con turno in presenza (mattina); 3) docente che è già nell'aula o nella fascia oraria (continuità: la stessa persona per ore consecutive); 4) chi ha avuto meno sostituzioni nel periodo (equità); 5) chi ha meno ore quel giorno. Il docente scelto non deve avere altre lezioni nella stessa ora. Se nessun docente è idoneo, la lezione resta "scoperta" e viene segnalata.

### R16 - Massimo 8 ore al giorno per docente
I docenti del foglio PERMESSI non possono lavorare più di 8 ore al giorno (mattina più sera insieme). Il limite è bloccante: nessuna sostituzione, spostamento o cambio docente può portare un docente oltre le 8 ore in un giorno, e i Controlli segnalano come conflitto un docente già oltre il limite. Con 6 o più ore di lezione nello stesso giorno compare un avviso "carico alto". Il software conta per ora solo le ore di lezione; se vanno contate anche altre attività (riunioni, laboratori) va detto qui.

## Modifiche

### R17 - Modifiche permanenti al calendario
Spostare una lezione (giorno, ora, aula) o cambiare il docente in modo definitivo è una modifica permanente. Prima di applicarla il software controlla i conflitti (docenti, aule, competenze, turni, regole serali) e mostra solo i problemi nuovi creati dalla modifica. Va approvata come ogni proposta.

### R18 - Chi può approvare
Possono approvare, rifiutare, annullare un'assenza e applicare modifiche le persone con permesso di modifica sul software (la responsabile del progetto e chi lei designa). Chi ha solo permesso di lettura può consultare calendari, controlli e regole.

## Approvazioni

### R20 - Il manuale va sempre rispettato
Ogni proposta, sostituzione o modifica deve rispettare tutte le regole di questo manuale, comprese quelle aggiunte in seguito. Se una richiesta contrasta con una regola, il software lo dice e propone un'alternativa invece di forzare.

## Dati da confermare

### R21 - Ipotesi sui nomi nel foglio turni (da confermare)
Le colonne del foglio PERMESSI sono state lette come: Alessandra Albano, Beatrice, Giulia, Lucia, Elisa (Di Felice), Gabriele, Martina, Luca, Elisa (Rubeo), Federico (Vani). Giorgia Clementi non era nell'elenco: le sue giornate (giovedì mattina e sera) sono state ricavate dagli orari e vanno confermate. Confermati: "Ale" è Alessandra Albano; "Gab" è Gabriele Luverà; "ED CIVICA" è Educazione civica (non Economia aziendale).

### R22 - Differenze trovate nel calendario serale (da confermare)
Lezione S019: nel foglio è martedì 17:00 "Relazioni internazionali", nel calendario pubblicato martedì 18:00 "Relazioni internazionali / Economia politica". Lezione S025: nel foglio è visibile anche ad AFM, nel calendario pubblicato AFM era stato tolto. Finché non vengono confermate restano segnalate come "da verificare". Le lezioni L025, L032, L069, L117 (righe senza ID nel foglio) e L120, L123, L125 (Lab italiano del venerdì 10:00, "eliminato per tutti") sono nascoste agli studenti: sono considerate rimosse e non fanno parte del software.

## Domande aperte (da confermare)

- Differenze S019 e S025 tra foglio e calendario serale pubblicato.

## Confermato

- Federico Vani; Gab = Gabriele Luverà; ED CIVICA = Educazione civica; lezioni rimosse L025, L032, L069, L117, L120, L123, L125; mercoledì 11:00 niente Lab italiano con Giulia (vedi R24).
