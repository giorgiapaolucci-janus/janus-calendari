/* DATI BASE - Istituto Janus
   Fonte: foglio "CALENDARIO PRESENZA - PROTOTIPO" (GESTIONE LEZIONI, GESTIONE SERALE, DOCENTI, AULE)
   e foglio "Calendario PERMESSI" (PRE/SMART, SMART, PERMESSI). Letti l'8 ottobre 2026. */

const GIORNI = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
const GIORNI_BREVI = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven'];
const INIZIO = '2026-10-05';
const ORE_MATTINA = [9, 10, 11, 12];
const ORE_SERA = [17, 18, 19, 20];

/* mat = materie canoniche che il docente può insegnare (scheda DOCENTI + materie viste negli orari)
   aule = aula/e abituali; sera = fa lezioni serali; cal = dove insegna oggi (M mattina, S sera) */
const DOCENTI = [
  { id: 'fv', nome: 'Federico Vani', breve: 'Federico', aule: ['1'], cal: 'M', sera: false, mat: ['matematica', 'informatica'] },
  { id: 'gc', nome: 'Giorgia Clementi', breve: 'Giorgia', aule: ['1'], cal: 'MS', sera: true, mat: ['diritto', 'educazione civica'] },
  { id: 'lp', nome: 'Luca Picarazzi', breve: 'Luca', aule: ['2'], cal: 'MS', sera: true, mat: ['italiano', 'storia', 'filosofia', 'latino', 'greco', 'biologia', 'scienze integrate', "storia dell'arte", 'lab italiano'] },
  { id: 'bl', nome: 'Beatrice Lungu', breve: 'Bea', aule: ['3'], cal: 'M', sera: false, mat: ['igiene', 'metodologie operative', 'psicologia'] },
  { id: 'mb', nome: 'Martina Branca', breve: 'Martina', aule: ['3'], cal: 'MS', sera: true, mat: ['inglese', 'lab inglese', 'potenziamento inglese', 'spagnolo', 'scrittura creativa', 'lab creativo', 'lab lettura'] },
  { id: 'er', nome: 'Elisa Rubeo', breve: 'Elisa R.', aule: ['4', '1'], cal: 'M', sera: false, mat: ['fisica', 'matematica'] },
  { id: 'gd', nome: 'Giulia Dipalo', breve: 'Giulia', aule: ['4', '1'], cal: 'MS', sera: true, mat: ['scienze umane', 'lab italiano', 'lab grammatica'] },
  { id: 'ed', nome: 'Elisa Di Felice', breve: 'Elisa', aule: ['5'], cal: 'MS', sera: true, mat: ['francese', 'inglese', 'lab inglese', 'potenziamento inglese', 'lab italiano'] },
  { id: 'gl', nome: 'Gabriele Luverà', breve: 'Gabriele', aule: ['6'], cal: 'MS', sera: true, mat: ['matematica', 'lab matematica', 'fisica', 'meccatronica', 'chimica'] },
  { id: 'lc', nome: 'Lucia Carlucci', breve: 'Lucia', aule: ['7'], cal: 'MS', sera: true, mat: ['economia aziendale', 'economia politica', 'dta', 'gpoi', 'geografia turistica', 'educazione civica', 'relazioni internazionali', 'scienze motorie'] },
  { id: 'aa', nome: 'Alessandra Albano', breve: 'Alessandra', aule: ['4', '6'], cal: 'MS', sera: true, mat: ['italiano', 'storia', 'geostoria', 'latino', 'epica/antologia', "storia dell'arte", 'lab italiano'] },
  { id: 'sm', nome: 'Salvatore Martello', breve: 'Salvatore', aule: ['1'], cal: 'S', sera: true, mat: ['informatica', 'tpsi e sistemi e reti'] },
  { id: 'ft', nome: 'Fabio Trerè', breve: 'Fabio', aule: ['2'], cal: 'S', sera: true, mat: ['matematica'] },
  { id: 'as', nome: 'Alessandra Sbucafratta', breve: 'Sbucafratta', aule: ['1', '4'], cal: 'S', sera: true, mat: ['scienze', 'storia'] },
  { id: 'sz', nome: 'Sara Mazza', breve: 'Sara', aule: ['7'], cal: 'S', sera: true, mat: ['economia aziendale', 'dta'] }
];

/* Turni da "Calendario PERMESSI" (scheda PRE/SMART). Cinque caratteri = lunedì..venerdì.
   P presenza, S smart working, - nessun turno indicato.
   m = mattina (riga 9:00/10:00, vale per tutta la mattina), p = 14:00/15:00,
   p2 = 15:00/16:00, s = 17:00/18:00 (solo dove il foglio lo indica). */
const TURNI = {
  m: { aa: 'SPSPS', bl: 'SPSPP', gd: 'PSPPS', lc: 'PPPPP', ed: 'SPSPP', gl: 'PSPSP', mb: 'PSPPS', lp: 'PPPPP', er: 'PP--P', fv: 'PP--P', gc: '---P-', sm: '-----', ft: '-----', as: '-----', sz: '-----' },
  p: { aa: 'S-S--', bl: 'SPSPP', gd: 'PSPPS', lc: 'S-S-S', ed: '-P-PP', gl: 'PSPSP', mb: 'PSPPS', lp: 'PPPPP', er: '-----', fv: '-----', gc: '-----' },
  p2: { lc: '-S-S-', aa: '----S' },
  s: { ed: 'S-S--', gc: '---S-' }
};

/* Assenze già indicate nel foglio PERMESSI per le date dopo l'inizio delle lezioni */
const ASSENZE_SEED = [
  { id: 'seed_aa_20261009', docenteId: 'aa', dal: '2026-10-09', al: '2026-10-09', tipo: 'recupero', nota: 'R/O recupero open day (foglio PERMESSI)', origine: 'PERMESSI' },
  { id: 'seed_aa_20261012', docenteId: 'aa', dal: '2026-10-12', al: '2026-10-12', tipo: 'ferie', nota: 'F ferie (foglio PERMESSI)', origine: 'PERMESSI' }
];

/* Segnalazioni attaccate a singole lezioni */
const VERIFICA_MSG = {
  ec: "Nel foglio la materia è Educazione civica, ma il testo precedente della cella indicava Economia aziendale. Confermare quale delle due.",
  gab: 'Nel foglio il docente è scritto "Gab". Assegnata a Gabriele Luverà.',
  s019: 'Foglio: martedì 17:00 "Relazioni internazionali". Calendario serale pubblicato: martedì 18:00 "Relazioni internazionali / Economia politica". Confermare quale vale.',
  s025: "Foglio: la lezione è visibile anche ad AFM. Nel calendario serale pubblicato l'AFM era stato tolto dopo l'ultima modifica. Confermare.",
  nodoc: 'Docente da assegnare (cella senza docente nel foglio).'
};

/* Formato riga: id|giorno|ora|anno|materia|indirizzi|docente|aula|note|flag
   flag: v:<codice verifica> oppure d:<indirizzo doppia scelta> */
const RIGHE = `
L001|1|9|1/2|LAB ITALIANO|PER TUTTI|gd|4||
L002|1|9|3/4|MATEMATICA|PER TUTTI|fv|1||
L003|1|9|4/5|MECCATRONICA|MECCATRONICA|gl|6||
L004|1|9|4/5|LAB INGLESE|PER TUTTI|mb|3||
L005|1|9|5|ITALIANO|PER TUTTI|lp|2||
L006|1|10|1/2|SCIENZE UMANE|LES E SCIENZE UMANE|gd|4||
L007|1|10|1/2|ED CIVICA|AFM|lc|7|
L008|1|10|1/2|LAB ITALIANO|PER TUTTI|gd|4||
L009|1|10|3/4|MATEMATICA|PER TUTTI|fv|1||
L010|1|10|4/5|MECCATRONICA|MECCATRONICA|gl|6||
L011|1|10|4/5|LAB INGLESE|PER TUTTI|mb|3||
L012|1|10|5|STORIA|PER TUTTI|lp|2||
L013|1|11|1/2|INGLESE|PER TUTTI|mb|3|(+3 +3/4)|
L014|1|11|3/4|INGLESE|PER TUTTI|mb|3|(+3 +3/4)|
L015|1|11|4/5|ITALIANO|PER TUTTI|lp|2||
L016|1|11|5|MATEMATICA|PER TUTTI|fv|1||
L017|1|12|1/2|INGLESE|PER TUTTI|mb|3|(+3 +3/4)|
L018|1|12|3/4|INGLESE|PER TUTTI|mb|3|(+3 +3/4)|
L019|1|12|4/5|STORIA|PER TUTTI|lp|2||
L020|1|12|5|MATEMATICA|PER TUTTI|fv|1||
L021|2|9|1/2|ITALIANO|PER TUTTI|lp|2||
L022|2|9|3/4|IGIENE|SOCIO|bl|3||
L023|2|9|3/4|FISICA|LICEI|er|4||
L024|2|9|3/4|ED CIVICA|AFM/TUR|lc|7|
L026|2|9|4/5|MATEMATICA|PER TUTTI|fv|1||
L027|2|9|5|MATEMATICA|PER TUTTI|fv|1||
L028|2|10|1/2|ITALIANO|PER TUTTI|lp|2||
L029|2|10|3/4|METODOLOGIE|SOCIO|bl|3||
L030|2|10|3/4|FISICA|LICEI|er|4||
L031|2|10|3/4|ED CIVICA|AFM/TUR|lc|7|
L033|2|10|4/5|MATEMATICA|PER TUTTI|fv|1||
L034|2|10|5|MATEMATICA|PER TUTTI|fv|1||
L035|2|11|1/2|MATEMATICA|PER TUTTI|fv|1||
L036|2|11|3/4|ITALIANO|PER TUTTI|lp|2||
L037|2|11|4/5|IGIENE/METOD|SOCIO|bl|3||
L038|2|11|4/5|FISICA|SCIENTIFICI|er|4||
L039|2|11|4/5|LAB ITALIANO|PER TUTTI|ed|5||
L040|2|11|5|IGIENE/METODOLOGIE OPERATIVE|SOCIO|bl|3||
L041|2|11|5|FISICA|SCIENTIFICI|er|4||
L042|2|11|5|LAB ITALIANO|PER TUTTI|ed|5||
L043|2|12|1/2|MATEMATICA|PER TUTTI|fv|1||
L044|2|12|3/4|STORIA|PER TUTTI|lp|2||
L045|2|12|4/5|PSICOLOGIA|SOCIO|bl|3||
L046|2|12|4/5|FISICA|SCIENTIFICI|er|4||
L047|2|12|4/5|LAB ITALIANO|PER TUTTI|ed|5||
L048|2|12|5|PSICOLOGIA|SOCIO|bl|3||
L049|2|12|5|FISICA|SCIENTIFICI|er|4||
L050|2|12|5|LAB ITALIANO|PER TUTTI|ed|5||
L051|3|9|1/2|SPAGNOLO|LES|mb|3|(+3 + 3/4)|
L052|3|9|1/2|EC.POLITICA|ITI/AFM/UMANE|lc|7||
L053|3|9|3/4|SPAGNOLO|SOCIO/TUR/AFM/LES|mb|3|(+3 + 3/4)|
L054|3|9|3/4|LAB MATEMATICA|PER TUTTI|gl|1||
L055|3|9|4/5|FILOSOFIA|LICEI|lp|2||
L056|3|9|4/5|LAB MATEMATICA|PER TUTTI|gl|1||
L057|3|9|5|FILOSOFIA|LICEI|lp|2||
L058|3|9|5|LAB MATEMATICA|PER TUTTI|gl|1||
L059|3|10|1/2|SPAGNOLO|LES|mb|3|(+3 + 3/4)|
L060|3|10|1/2|LAB MATEMATICA|ITI/AFM/UMANE|gl|1||
L061|3|10|3/4|SPAGNOLO|SOCIO/TUR/AFM/LES|mb|3|(+3 + 3/4)|
L062|3|10|3/4|BIOLOGIA|LICEI (no Les)|lp|2||
L063|3|10|4/5|SCIENZE UMANE|UMANE/LES|gd|4||
L064|3|10|4/5|ED CIVICA|TUTTI|lc|7||
L065|3|10|5|SCIENZE UMANE|UMANE/LES|gd|4||
L066|3|10|5|ED CIVICA|TUTTI|lc|7||
L068|3|11|3/4|SCIENZE UMANE|LES/UMANE|gd|4||
L070|3|11|4/5|SPAGNOLO|LES/SOCIOLING/AFM|mb|3|( +4)|
L071|3|11|4/5|SCIENZE INTEGRATE|SCIENTIFICO / CLASSICO / SCIENZE UMANE / SCIENZE APPLICATE / SPORTIVO|lp|2|(+4)|
L072|3|11|4/5|MECCATRONICA|MECCATRONICA|gl|6||
L073|3|11|5|SPAGNOLO|LES/SOCIOLING/AFM|mb|3|( +4)|
L074|3|11|5|SCIENZE INTEGRATE|SCIENTIFICO / CLASSICO / SCIENZE UMANE / SCIENZE APPLICATE / SPORTIVO|lp|2|(+4)|
L075|3|12|1/2|LAB GRAMMATICA|PER TUTTI|gd|1||
L076|3|12|3/4|LATINO|SCIENTIFICO / SCIENZE UMANE|lp|2||
L077|3|12|3/4|LAB ITALIANO|TUTTI|gd|1||
L078|3|12|4/5|SPAGNOLO|LES/SOCIOLING/AFM|mb|3||
L079|3|12|4/5|LAB ITALIANO|TUTTI|gd|1||
L080|3|12|5|SPAGNOLO|LES/SOCIOLING/AFM|mb|3||
L081|3|12|5|LAB ITALIANO|TUTTI|gd|1||
L082|3|12|5|CHIMICA|SCIENTIFICI|gl|6||
L083|4|9|1/2|GEOSTORIA|TUTTI|aa|4|
L084|4|9|3/4|FILOSOFIA|LICEI|lp|2|+ 4|
L085|4|9|3/4|SCRITTURA CREATIVA|TUTTI|mb|3||
L087|4|9|4/5|SCRITTURA CREATIVA|TUTTI|mb|3||
L088|4|9|5|DIRITTO|AFM / LES / SOCIO SANITARIO / SPORTIVO|gc|1|+4/5|
L089|4|9|5|GPOI|ITI|lc|7|(+4/5)|
L090|4|9|5|SCRITTURA CREATIVA|TUTTI|mb|3||
L091|4|10|1/2|SCIENZE INTEGRATE|TUTTI|lp|2||
L092|4|10|3/4|DIRITTO|SOCIO SANITARIO / TURISMO / AFM / LES / SPORTIVO|gc|1||
L093|4|10|3/4|SCRITTURA CREATIVA|TUTTI|mb|3||
L095|4|10|4/5|SCRITTURA CREATIVA|TUTTI|mb|3||
L096|4|10|5|EC POLITICA / RELAZIONI INTERNAZIONALI|AFM-RIM|lc|7||
L097|4|10|5|SCRITTURA CREATIVA|TUTTI|mb|3||
L098|4|11|1/2|DIRITTO|TUTTI|gc|1||
L099|4|11|3/4|BIOLOGIA|CLASSICO / SCIENZE APPLICATE|lp|2||
L141|4|11|3/4|INGLESE|TUTTI|mb|3||
L101|4|11|4/5|INGLESE|TUTTI|mb|3|(+4)|
L102|4|11|5|INGLESE|TUTTI|mb|3|(+4)|
L103|4|12|1/2|EDUCAZIONE CIVICA|TUTTI|gc|1|(+3/4 ANNO)|
L104|4|12|3/4|GEO TURISTICA|TUR|lc|7||
L105|4|12|3/4|STORIA DELL'ARTE|LICEI|lp|2|(+1/2)|
L106|4|12|3/4|ED CIVICA|TUTTI|gc|1||
L107|4|12|4/5|INGLESE|TUTTI|mb|3|(+4)|
L108|4|12|5|INGLESE|TUTTI|mb|3|(+4)|
L109|5|9|1/2|ED CIVICA|AFM|lc|7|(+3)
L110|5|9|1/2|LAB MATEMATICA|TUTTI|gl|6||
L111|5|9|3/4|LAB MATEMATICA|TUTTI|gl|6||
L113|5|9|4/5|LAB ITALIANO|TUTTI|ed|5||
L115|5|9|5|LAB ITALIANO|TUTTI|ed|5||
L112|5|10|4/5|LATINO|SCIENTIFICO / CLASSICO / SCIENZE UMANE / SPORTIVO|lp|2||
L114|5|10|5|LATINO|SCIENTIFICO / CLASSICO / SCIENZE UMANE / SPORTIVO|lp|2||
L116|5|10|1/2|FISICA|ITI/AFM|er|4|+3/4 Les e Linguistico|
L118|5|10|3/4|FRANCESE|LINGUISTICO / TURISMO / AFM / LES|ed|5|+2/3 LES|
L119|5|10|3/4|INFORMATICA|AFM|fv|1||
L121|5|10|3/4|IGIENE|SOCIO|bl|3||
L122|5|10|4/5|FRANCESE|LINGUISTICO / TURISMO / AFM / SOCIO SANITARIO / LES|ed|5||
L124|5|10|5|FRANCESE|LINGUISTICO / TURISMO / AFM / SOCIO SANITARIO / LES|ed|5||
L143|5|10|4/5|MECCATRONICA|MECCATRONICA|gl|6||
L126|5|11|1/2|FISICA|ITI/AFM|er|4|+3/4 Les e Linguistico|
L127|5|11|1/2|LATINO|UMANE|lp|2||
L128|5|11|3/4|FRANCESE|LINGUISTICO / TURISMO / AFM / LES|ed|5||
L129|5|11|3/4|ED CIVICA|AFM|lc|7|
L130|5|11|3/4|PSICOLOGIA|SOCIO|bl|3||
L131|5|11|3/4|CHIMICA|SCIENTIFICO / SCIENZE APPLICATE / SPORTIVO / SCIENZE UMANE|gl|6|
L132|5|11|4/5|FRANCESE|LINGUISTICO / TURISMO / AFM / SOCIO SANITARIO / LES|ed|5||
L133|5|11|4/5|INFORMATICA|ITI|fv|1||
L134|5|11|5|FRANCESE|LINGUISTICO / TURISMO / AFM / SOCIO SANITARIO / LES|ed|5||
L135|5|11|5|INFORMATICA|ITI|fv|1||
L142|5|11|3/4|LAB ITALIANO|TUTTI|ed|5||
L144|5|11|4/5|LAB ITALIANO|TUTTI|ed|5||
L145|5|11|5|LAB ITALIANO|TUTTI|ed|5||
L136|5|12|1/2|INFORMATICA|ITI/AFM|fv|1||
L137|5|12|3/4|LAB ITALIANO|TUTTI|ed|5||
L138|5|12|4/5|LAB MATEMATICA|TUTTI|gl|4||
L139|5|12|5|STORIA DELL'ARTE|LICEI|lp|2||
L140|5|12|5|LAB MATEMATICA|TUTTI|gl|4||
L146|5|12|4/5|STORIA DELL'ARTE|LICEI|lp|2||
A002|5|11|4/5|LAB MATEMATICA|SCIENTIFICO / SCIENZE UMANE / AFM / SOCIO SANITARIO / MME / LES|gl||Esercizi (aula docenti o da casa)|
A003|5|11|5|LAB MATEMATICA|SCIENTIFICO / SCIENZE UMANE / AFM / SOCIO SANITARIO / MME / LES|gl||Esercizi (aula docenti o da casa)|
A006|1|10|1/2|LAB ITALIANO|ITI INFORMATICO|gd||Esercizi (aula docenti o da casa)|
A008|3|12|1/2|LAB GRAMMATICA|ITI INFORMATICO|gd||Esercizi (aula docenti o da casa)|
A009|4|12|3/4|ED CIVICA|AFM / SOCIO SANITARIO|gc|1||
A010|4|9|4/5|DIRITTO|SOCIO SANITARIO / LES / SPORTIVO / AFM|gc|1||
A013|5|11|4/5|INFORMATICA|SCIENZE APPLICATE|fv|1||
A014|5|11|5|INFORMATICA|SCIENZE APPLICATE|fv|1||
A015|5|10|1/2|ED CIVICA|LES / SCIENZE UMANE|lc|7||
A016|5|11|1/2|LAB MATEMATICA|LES|gl||Esercizi (aula docenti o da casa)|
A017|3|9|1/2|LAB MATEMATICA|LES|gl|1||
A018|5|10|3/4|ED CIVICA|LES / SCIENZE UMANE / LINGUISTICO / SCIENTIFICO / SCIENZE APPLICATE / SPORTIVO|lc|7||
A019|5|11|3/4|LAB MATEMATICA|LES|gl||Esercizi (aula docenti o da casa)|
A020|3|10|3/4|ED CIVICA|SOCIO SANITARIO|lc|7||
A021|5|9|4/5|FISICA|SCIENTIFICO / CLASSICO / LINGUISTICO / SCIENZE UMANE / SCIENZE APPLICATE / SPORTIVO / LES|er|4||
A022|5|9|5|FISICA|SCIENTIFICO / CLASSICO / LINGUISTICO / SCIENZE UMANE / SCIENZE APPLICATE / SPORTIVO / LES|er|4||
A023|3|9|3/4|SPAGNOLO|LINGUISTICO|mb|3||
A024|3|10|3/4|SPAGNOLO|LINGUISTICO|mb|3||
A025|5|11|3/4|CHIMICA|LINGUISTICO|gl|6||
A026|3|11|1/2|SCIENZE MOTORIE|TUTTI|lc|1|Doppia scelta|
A027|3|11|3/4|SCIENZE MOTORIE|TUTTI|lc|1|Doppia scelta|
A028|5|12|1/2|LAB ITALIANO|TUTTI TRANNE ITI E AFM|ed|5||
A029|5|10|4/5|ED CIVICA|ITI / SCIENZE APPLICATE / LES / AFM / SOCIO SANITARIO|lc|7||
A030|5|10|5|ED CIVICA|ITI / SCIENZE APPLICATE / LES / AFM / SOCIO SANITARIO|lc|7||
S001|1|17|1/2|EPICA/ANTOLOGIA|Classico|aa|4||
S002|1|17|4/5|FRANCESE|AFM, IPSEOA|ed|5||
S003|1|17|4/5|LAB MATEMATICA|ITI Informatico|gl|6||
S004|1|17|5|FRANCESE|Turismo, AFM|ed|5||
S005|1|17|5|LAB MATEMATICA|MME, Sportivo, AFM|gl|6||
S006|1|17|5|STORIA DELL'ARTE|Scientifico, LES|lp|2||
S007|1|18|1/2|ITALIANO|Classico|aa|4||
S008|1|18|4/5|LAB INGLESE|Tutti gli indirizzi|ed|5||
S009|1|18|5|LAB INGLESE|Tutti gli indirizzi|ed|5||
S010|1|19|1/2|INGLESE|Tutti gli indirizzi|ed|5||
S011|1|19|4/5|ITALIANO|Tutti gli indirizzi|aa|4||
S012|1|19|5|ITALIANO|Tutti gli indirizzi|aa|4||
S013|1|20|1/2|INGLESE|Tutti gli indirizzi|ed|5||
S014|1|20|4/5|ITALIANO|Tutti gli indirizzi|aa|4||
S015|1|20|5|ITALIANO|Tutti gli indirizzi|aa|4||
S016|2|17|1/2|LAB LETTURA|Tutti gli indirizzi|mb|3||
S017|2|17|4/5|INFORMATICA|ITI Informatico|sm|1||
S018|2|17|4/5|LAB LETTURA|IPSEOA, AFM|mb|3||
S020|2|17|5|FILOSOFIA|Scientifico, Sportivo, LES|lp|2||
S021|2|17|5|LAB LETTURA|Turismo, AFM|mb|3||
S022|2|17|5|MECCATRONICA|MME|gl|6||
S019|2|17|4/5|RELAZIONI INTERNAZIONALI|AFM|lc|7||v:s019
S023|2|18|1/2|LAB LETTURA|Tutti gli indirizzi|mb|3||
S025|2|18|4/5|LAB LETTURA|IPSEOA, AFM|mb|3||v:s025
S026|2|18|4/5|TPSI E SISTEMI E RETI|ITI Informatico|sm|1||
S027|2|18|5|LAB LETTURA|Sportivo, Scientifico, LES, Turismo|mb|3||
S028|2|18|5|MECCATRONICA|MME|gl|6||
S075|2|18|5|RELAZIONI INTERNAZIONALI / ECONOMIA POLITICA|AFM|lc|7||
S029|2|19|1/2|MATEMATICA|Tutti gli indirizzi|gl|6||
S030|2|19|4/5|MATEMATICA|Tutti gli indirizzi|ft|2||
S031|2|19|5|POTENZIAMENTO INGLESE|Tutti gli indirizzi|mb|3||
S032|2|20|1/2|MATEMATICA|Tutti gli indirizzi|gl|6||
S033|2|20|4/5|MATEMATICA|Tutti gli indirizzi|ft|2||
S034|2|20|5|POTENZIAMENTO INGLESE|Tutti gli indirizzi|mb|3||
S035|3|17|1/2|ITALIANO|Classico|aa|4||
S036|3|17|4/5|INGLESE|Tutti gli indirizzi|ed|5||
S037|3|17|5|INGLESE|Tutti gli indirizzi|ed|5||
S038|3|18|1/2|STORIA|Classico|aa|4||
S039|3|18|4/5|INGLESE|Tutti gli indirizzi|ed|5||
S040|3|18|5|INGLESE|Tutti gli indirizzi|ed|5||
S041|3|19|1/2|POTENZIAMENTO INGLESE|Tutti gli indirizzi|ed|5||
S042|3|19|4/5|STORIA|Tutti gli indirizzi|aa|4||
S043|3|19|5|MATEMATICA|Tutti gli indirizzi|ft|2||
S044|3|20|1/2|POTENZIAMENTO INGLESE|Tutti gli indirizzi|ed|5||
S045|3|20|4/5|STORIA|Tutti gli indirizzi|aa|4||
S046|3|20|5|MATEMATICA|Tutti gli indirizzi|ft|2||
S047|4|17|1/2|GRECO|Classico|lp|2||
S048|4|17|4/5|LAB MATEMATICA|Tutti gli indirizzi|gl|6||
S049|4|17|5|LAB MATEMATICA|Sportivo, Scientifico, MME, Turismo, AFM|gl|6||
S050|4|17|5|SCIENZE UMANE|LES|gd|4||
S051|4|18|1/2|SCIENZE|Tutti gli indirizzi|as|4||
S052|4|18|4/5|DIRITTO|AFM, IPSEOA|gc|1||
S053|4|18|4/5|GPOI|ITI Informatico|lc|7||
S054|4|18|5|DIRITTO|Turismo, AFM|gc|1||
S055|4|18|5|FISICA|Scientifico, Sportivo, LES|gl|6||
S056|4|19|4/5|ECONOMIA AZIENDALE|AFM|sz|7||
S057|4|19|5|DTA|Turismo|sz|7||
S076|4|19|5|ECONOMIA AZIENDALE|AFM|sz|7||
S058|4|19|5|FISICA|Scientifico, Sportivo, LES|gl|6||
S059|5|17|1/2|LATINO|Classico|aa|4||
S060|5|17|4/5|LAB MATEMATICA|Tutti gli indirizzi|gl|6||d:AFM
S061|5|17|4/5|SPAGNOLO|AFM|mb|3||
S062|5|17|5|LAB MATEMATICA|Tutti gli indirizzi|gl|6||d:AFM
S063|5|17|5|SPAGNOLO|LES, AFM|mb|3||
S064|5|18|1/2|GEOSTORIA - STORIA DELL'ARTE|Classico|aa|4||
S065|5|18|4/5|SPAGNOLO|AFM|mb|3||
S066|5|18|5|SCIENZE|Sportivo, Scientifico|as|1||
S067|5|18|5|SPAGNOLO|LES, AFM|mb|3||
S068|5|19|1/2|LAB CREATIVO|Tutti gli indirizzi|mb|3||
S069|5|19|4/5|LAB CREATIVO|Tutti gli indirizzi|mb|3||
S070|5|19|5|STORIA|Tutti gli indirizzi|as|4||
S071|5|20|1/2|LAB CREATIVO|Tutti gli indirizzi|mb|3||
S072|5|20|4/5|DIRITTO E TECNICHE AMM|IPSEOA|sz|7||
S073|5|20|4/5|LAB CREATIVO|ITI Informatico, AFM|mb|3||
S074|5|20|5|STORIA|Tutti gli indirizzi|as|4||
`;
