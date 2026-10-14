/* REGOLE - Istituto Janus. Unica fonte per: tab "Regole" del software e manuale (MANUALE-REGOLE.md).
   Ogni regola: id, area, titolo, testo, stato ('attiva' = applicata dal motore; 'ipotesi' = da confermare). */
const RULES = [
  { id: 'R01', area: 'Struttura', stato: 'attiva', titolo: 'Orari e calendario',
    testo: 'Le lezioni vanno da lunedì a venerdì. Mattina: ore 9, 10, 11, 12 (quattro ore). Sera: ore 17, 18, 19, 20 (quattro ore). Le lezioni sono per anni (1/2, 3/4, 5) e per indirizzi. Inizio del calendario: lunedì 5 ottobre 2026.' },
  { id: 'R02', area: 'Struttura', stato: 'attiva', titolo: 'Tre viste, una sola fonte',
    testo: 'Il software mostra il calendario della mattina (Gold Experience e Gold Academy Live), il calendario della sera e gli orari dei docenti. I dati base derivano dal foglio "Calendario presenza - prototipo" (schede GESTIONE LEZIONI, GESTIONE SERALE, DOCENTI, AULE) e dal foglio "Calendario PERMESSI" (turni). Da ora la fonte unica è il software: le modifiche si fanno qui, il foglio non va più modificato a mano.' },
  { id: 'R03', area: 'Struttura', stato: 'attiva', titolo: 'Sessioni di lezione',
    testo: 'Più righe con lo stesso giorno, ora, docente e aula formano una sola sessione (un docente che parla a più anni o indirizzi insieme). La sessione si sposta, si copre o si annulla come un blocco unico.' },
  { id: 'R04', area: 'Struttura', stato: 'attiva', titolo: 'Esercizi: aula docenti o da casa',
    testo: 'Le lezioni che nel foglio hanno nota "Esercizi" (prima "Esercitazione da casa") e nessuna aula non richiedono un docente in aula: gli studenti svolgono esercizi assegnati dal docente. Chi è in sede li fa in AULA DOCENTI, chi è collegato li fa da casa. Se il docente è assente non serve sostituirlo. Sotto l\'ora di lezione compare la dicitura "ESERCIZI" (non "casa").' },
  { id: 'R23', area: 'Struttura', stato: 'attiva', titolo: 'Venerdì 11:00: laboratori di Matematica in Aula 6',
    testo: 'Tutti i laboratori di Matematica del venerdì alle 11:00 si svolgono in Aula 6 con Gabriele Luverà, per tutti gli indirizzi interessati. Le sessioni di esercizi mantengono la possibilità di svolgerli da remoto da casa e il link Zoom dell\'Aula 6. Per le altre sessioni di esercizi resta invariata l\'aula prevista: il link è quello dell\'aula in cui il docente fa lezione in quell\'ora.' },
  { id: 'R24', area: 'Struttura', stato: 'attiva', titolo: 'Mercoledì 11:00: Scienze motorie al posto del Lab italiano',
    testo: 'Dal 9 ottobre 2026 il mercoledì alle 11:00 (terza ora) il Lab italiano / Lab grammatica con Giulia Dipalo non c\'è più. Per gli indirizzi con la doppia scelta resta Scienze motorie in Aula 1 con Lucia Carlucci. Le lezioni senza docente confermate: Lab italiano del lunedì 10:00 (1/2 anno) è con Giulia Dipalo in Aula 4 (prosecuzione della prima ora); Lab italiano del venerdì 11:00 (3/4, 4/5, 5 anno) è con Elisa Di Felice in Aula 5; Ed. civica del giovedì 12:00 (3/4 anno) è con Giorgia Clementi in Aula 1.' },
  { id: 'R05', area: 'Conflitti', stato: 'attiva', titolo: 'Un docente, una sola aula alla volta',
    testo: 'Un docente non può essere in due aule (o in due sessioni diverse) nello stesso giorno e alla stessa ora. Una modifica o una sostituzione che crea questo conflitto non viene proposta.' },
  { id: 'R06', area: 'Conflitti', stato: 'attiva', titolo: 'Un\'aula, un solo docente alla volta',
    testo: 'Nella stessa aula, nello stesso giorno e alla stessa ora, non possono esserci docenti diversi. Un\'aula condivisa tra due docenti nella stessa ora è segnalata come conflitto nei Controlli.' },
  { id: 'R07', area: 'Docenti', stato: 'attiva', titolo: 'Materie che ogni docente può insegnare',
    testo: 'Ogni docente ha un elenco di materie (scheda DOCENTI del foglio, più le materie viste negli orari). Per ogni sostituzione il motore assegna un livello di competenza: ESATTA (la materia è nell\'elenco del docente), AFFINE (materia dello stesso gruppo disciplinare, es. matematica / fisica / lab matematica), PARZIALE (area vicina, es. inglese / francese), NESSUNA. Si propongono solo docenti con competenza almeno parziale; i candidati con competenza esatta hanno sempre la precedenza su quelli affini, e questi su quelli parziali.' },
  { id: 'R08', area: 'Docenti', stato: 'attiva', titolo: 'Gruppi disciplinari (affinità)',
    testo: 'Matematica, lab matematica, fisica. Scienze, biologia, scienze integrate, chimica. Informatica, TPSI, meccatronica. Italiano, lab italiano, lab grammatica, lab lettura, epica/antologia, scrittura creativa, lab creativo. Storia, geostoria, storia dell\'arte, italiano, latino, greco, filosofia. Inglese, lab inglese, potenziamento inglese. Scienze umane, psicologia, filosofia, igiene, metodologie operative. Diritto, educazione civica, economia politica, relazioni internazionali. Economia aziendale, DTA, GPOI, economia politica. Geografia turistica, geostoria, relazioni internazionali. Area parziale: lingue (inglese, francese, spagnolo), area umanistica con area linguistica, scienze con fisica e matematica.' },
  { id: 'R09', area: 'Turni', stato: 'attiva', titolo: 'Turni in presenza e smart working (mattina)',
    testo: 'I turni vengono dal foglio PERMESSI: P = presenza, S = smart working, "-" = nessun turno. Per le lezioni della mattina serve il docente in sede: si propone chi ha turno P. Chi quel giorno è in smart working (S) può essere proposto solo come ultima scelta, con avviso "serve il rientro in sede". Chi non ha turno quel giorno non viene proposto. Si propongono solo docenti che lavorano abitualmente la mattina. Turni confermati il 9 ottobre: Alessandra Albano smart lunedì, mercoledì e venerdì, in presenza martedì e giovedì; Martina Branca smart martedì e venerdì (presenza lunedì, mercoledì, giovedì); Gabriele Luverà smart martedì e giovedì (presenza lunedì, mercoledì, venerdì).' },
  { id: 'R10', area: 'Turni', stato: 'attiva', titolo: 'Assenze e permessi',
    testo: 'Un docente assente (malattia, ferie, permesso, recupero) non può essere proposto per nessuna ora di quei giorni. Le assenze già presenti nel foglio PERMESSI per le date successive all\'inizio delle lezioni sono caricate all\'avvio: Albano il 9 ottobre (recupero open day) e il 12 ottobre (ferie).' },
  { id: 'R11', area: 'Serale', stato: 'attiva', titolo: 'Docenti del serale',
    testo: 'Per le lezioni della sera si propongono solo docenti che fanno già lezioni serali. Non fanno la sera: Federico Vani, Beatrice Lungu, Elisa Rubeo. Un docente del serale che non ha lezioni la sera di quel giorno può essere proposto, ma con avviso "disponibilità da confermare".' },
  { id: 'R12', area: 'Serale', stato: 'attiva', titolo: 'Luca Picarazzi: mai il venerdì sera',
    testo: 'Luca esce alle 16:00 il venerdì: non può fare lezione né sostituire il venerdì sera.' },
  { id: 'R13', area: 'Serale', stato: 'attiva', titolo: 'Lucia Carlucci: sera solo martedì e giovedì dalle 17 alle 19',
    testo: 'Lucia può fare lezione la sera solo il martedì e il giovedì, nelle ore 17 e 18 (fino alle 19:00).' },
  { id: 'R14', area: 'Sostituzioni', stato: 'attiva', titolo: 'Il software propone, una persona approva',
    testo: 'Quando si segnala un\'assenza o una modifica, il software prepara una proposta con i docenti candidati e gli avvisi. Nulla cambia nel calendario finché una persona autorizzata non preme "Approva". Con "Rifiuta" la proposta viene scartata e non lascia tracce nel calendario.' },
  { id: 'R15', area: 'Sostituzioni', stato: 'attiva', titolo: 'Come si sceglie il sostituto',
    testo: 'Ordine di preferenza: 1) competenza esatta, poi affine, poi parziale; 2) docente con turno in presenza (mattina); 3) docente che è già nell\'aula o nella fascia oraria (continuità: la stessa persona per ore consecutive); 4) chi ha avuto meno sostituzioni nel periodo (equità); 5) chi ha meno ore quel giorno. Il docente scelto non deve avere altre lezioni nella stessa ora. Se nessun docente è idoneo, la lezione resta "scoperta" e viene segnalata.' },
  { id: 'R16', area: 'Sostituzioni', stato: 'attiva', titolo: 'Massimo 8 ore al giorno per docente',
    testo: 'I docenti del foglio PERMESSI non possono lavorare più di 8 ore al giorno (mattina più sera insieme). Il limite è bloccante: nessuna sostituzione, spostamento o cambio docente può portare un docente oltre le 8 ore in un giorno, e i Controlli segnalano come conflitto un docente già oltre il limite. Con 6 o più ore di lezione nello stesso giorno compare un avviso "carico alto". Il software conta per ora solo le ore di lezione; se vanno contate anche altre attività (riunioni, laboratori) va detto qui.' },
  { id: 'R17', area: 'Modifiche', stato: 'attiva', titolo: 'Modifiche permanenti al calendario',
    testo: 'Spostare una lezione (giorno, ora, aula) o cambiare il docente in modo definitivo è una modifica permanente. Prima di applicarla il software controlla i conflitti (docenti, aule, competenze, turni, regole serali) e mostra solo i problemi nuovi creati dalla modifica. Va approvata come ogni proposta.' },
  { id: 'R18', area: 'Modifiche', stato: 'attiva', titolo: 'Chi può approvare',
    testo: 'Possono approvare, rifiutare, annullare un\'assenza e applicare modifiche le persone con permesso di modifica sul software (la responsabile del progetto e chi lei designa). Chi ha solo permesso di lettura può consultare calendari, controlli e regole.' },
  { id: 'R20', area: 'Approvazioni', stato: 'attiva', titolo: 'Il manuale va sempre rispettato',
    testo: 'Ogni proposta, sostituzione o modifica deve rispettare tutte le regole di questo manuale, comprese quelle aggiunte in seguito. Se una richiesta contrasta con una regola, il software lo dice e propone un\'alternativa invece di forzare.' },
  { id: 'R21', area: 'Dati da confermare', stato: 'ipotesi', titolo: 'Ipotesi sui nomi nel foglio turni',
    testo: 'Le colonne del foglio PERMESSI sono state lette come: Alessandra Albano, Beatrice, Giulia, Lucia, Elisa (Di Felice), Gabriele, Martina, Luca, Elisa (Rubeo), Federico (Vani). Giorgia Clementi non era nell\'elenco: le sue giornate (giovedì mattina e sera) sono state ricavate dagli orari e vanno confermate. Confermati: "Ale" è Alessandra Albano; "Gab" è Gabriele Luverà; "ED CIVICA" è Educazione civica (non Economia aziendale).' },
  { id: 'R22', area: 'Dati da confermare', stato: 'ipotesi', titolo: 'Differenze trovate nel calendario serale',
    testo: 'Lezione S019: nel foglio è martedì 17:00 "Relazioni internazionali", nel calendario pubblicato martedì 18:00 "Relazioni internazionali / Economia politica". Lezione S025: nel foglio è visibile anche ad AFM, nel calendario pubblicato AFM era stato tolto. Finché non vengono confermate restano segnalate come "da verificare". Le lezioni L025, L032, L069, L117 (righe senza ID nel foglio) e L120, L123, L125 (Lab italiano del venerdì 10:00, \"eliminato per tutti\") sono nascoste agli studenti: sono considerate rimosse e non fanno parte del software.' }
];

function regoleTutte(custom) {
  const base = RULES.map(r => ({ ...r }));
  const extra = (custom || []).filter(r => r.attiva !== false).map((r, i) => ({
    id: 'P' + String(i + 1).padStart(2, '0'), area: 'Regole aggiunte', stato: 'attiva', titolo: r.titolo || 'Regola aggiunta', testo: r.testo, custom: true, docId: r.id
  }));
  return base.concat(extra);
}

function manualeMarkdown(custom, extraInfo) {
  const rs = regoleTutte(custom);
  const aree = [];
  rs.forEach(r => { if (!aree.includes(r.area)) aree.push(r.area); });
  let md = '# Manuale delle regole - Istituto Janus\n\n';
  md += 'Questo manuale raccoglie tutte le regole che il software di gestione calendari rispetta. Va tenuto sempre in considerazione per ogni modifica richiesta: ogni proposta di sostituzione, spostamento o cambio docente deve rispettarlo. Quando arriva una nuova regola o una disponibilità, si aggiunge qui e nella tab Regole del software.\n\n';
  aree.forEach(a => {
    md += '## ' + a + '\n\n';
    rs.filter(r => r.area === a).forEach(r => {
      md += '### ' + r.id + ' - ' + r.titolo + (r.stato === 'ipotesi' ? ' (da confermare)' : '') + '\n' + r.testo + '\n\n';
    });
  });
  if (extraInfo) md += extraInfo;
  return md;
}
if (typeof module !== 'undefined') module.exports = { RULES, regoleTutte, manualeMarkdown };
