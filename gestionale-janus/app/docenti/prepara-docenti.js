/* Una tantum: dal calendario docenti originale crea calendario-docenti.html (stessa grafica, dati da docenti.json con copia di riserva) */
const fs = require('fs');
const URL_BASE = process.env.URL_BASE || 'https://giorgiapaolucci-janus.github.io/janus-calendari';
const html = fs.readFileSync(__dirname + '/originale-docenti.html', 'utf8');
const dati = fs.readFileSync(__dirname + '/docenti.json', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/); let app = m[1];
const rep = (a, b) => { if (!app.includes(a)) throw new Error('manca: ' + a.slice(0, 50)); app = app.split(a).join(b); };
// 1) dati: al posto di NOMI / DIURNO / SERALE
const i0 = app.indexOf('  var NOMI = {'), i1 = app.indexOf("  var GIORNI = ");
app = app.slice(0, i0) + "  var D = window.JANUS_DOCENTI;\n  var NOMI = D.nomi;\n" + app.slice(i1);
const j0 = app.indexOf('  /* Riga: [docente'), j1 = app.indexOf('  var FAM = [');
app = app.slice(0, j0) + `  /* Riga: [docente, giorno 1-5, ora di inizio, anno, materia, indirizzi, aula (0 = nessuna), note] */
  function riga(r) { return [r.doc, r.day, r.hour, r.anno, r.materia, r.ind, r.aula, r.esercizi ? CASA : (r.note || undefined), r.id]; }
  var DIURNO = D.diurno.map(riga);
  var SERALE = D.serale.map(riga);

` + app.slice(j1);
// 1b) coda dello script: orario per data con sostituzioni
app = app.slice(0, app.indexOf('  /* Unisce le righe')) + `
  /* ---- Orario per data: applica le sostituzioni (D.sostituzioni = { "2026-11-18": { "L063": "BL", "L070": "" } }, "" = nessun sostituto) ---- */
  var SOST = D.sostituzioni || {};
  var TUTTE_RIGHE = DIURNO.map(function (r) { return { r: r, turno: 'Mattina' }; }).concat(SERALE.map(function (r) { return { r: r, turno: 'Sera' }; }));
  var MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function lunedi(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* Lezioni di una data, raggruppate: righe con stesso docente, ora, materia, aula e stato diventano una lezione con più classi. */
  function lezioniDelGiorno(dIso, day) {
    var mp = SOST[dIso] || {}, gr = {}, out = [];
    function add(doc, x, tag, kind) {
      var r = x.r;
      var k = [x.turno, doc, r[2], r[4], r[6], kind].join('|');
      var l = gr[k];
      if (!l) { l = gr[k] = { doc: doc, day: day, hour: r[2], turno: x.turno, subject: r[4], aula: r[6], classi: [], note: [], tag: tag, kind: kind }; out.push(l); }
      if (!l.classi.some(function (c) { return c.anno === r[3] && c.ind === r[5]; })) l.classi.push({ anno: r[3], ind: r[5] });
      if (r[7] && r[7] !== CASA && l.note.indexOf(r[7]) < 0) l.note.push(r[7]);
      if (r[7] === CASA) l.casa = true;
    }
    TUTTE_RIGHE.forEach(function (x) {
      var r = x.r; if (r[1] !== day) return;
      var orig = r[0], id = r[8];
      if (Object.prototype.hasOwnProperty.call(mp, id) && mp[id] !== orig) {
        var eff = mp[id];
        if (eff) { add(eff, x, 'Sostituisce ' + NOMI[orig], 'sost'); add(orig, x, 'Sostituito da ' + NOMI[eff], 'out'); }
        else add(orig, x, 'Assente, nessun sostituto', 'out');
      } else add(orig, x, '', '');
    });
    return out;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== '') n.textContent = text;
    return n;
  }

  var sel = document.getElementById('docente');
  var codici = Object.keys(NOMI).filter(function (c) { return TUTTE_RIGHE.some(function (x) { return x.r[0] === c; }); });
  codici.sort(function (a, b) { return NOMI[a].localeCompare(NOMI[b], 'it'); });
  codici.forEach(function (c) { var o = el('option', '', NOMI[c]); o.value = c; sel.appendChild(o); });

  function card(l) {
    var c = el('article', 'card f-' + famiglia(l.subject) + (l.kind ? ' is-' + l.kind : ''));
    if (l.tag) c.appendChild(el('div', 'tag', l.tag));
    c.appendChild(el('div', 'time', pad(l.hour) + ':00 – ' + pad(l.hour) + ':50'));
    c.appendChild(el('h3', 'subject', l.subject));
    c.appendChild(el('span', 'aula' + (l.aula ? '' : ' is-home'), l.aula ? 'Aula ' + l.aula : 'Esercizi'));
    var perInd = {}, ordine = [];
    l.classi.forEach(function (x) {
      if (!perInd[x.ind]) { perInd[x.ind] = []; ordine.push(x.ind); }
      perInd[x.ind].push(x.anno);
    });
    var ul = el('ul', 'classes');
    ordine.forEach(function (ind) {
      var anni = perInd[ind].sort(function (a, b) { return ORDINE_ANNI.indexOf(a) - ORDINE_ANNI.indexOf(b); });
      var li = el('li');
      li.appendChild(el('b', '', anni.join(' · ') + (anni.length ? ' anno' : '')));
      li.appendChild(document.createTextNode(ind));
      ul.appendChild(li);
    });
    c.appendChild(ul);
    var note = l.note.slice();
    if (l.casa) note.unshift('Esercizi in aula docenti o da casa');
    if (note.length) c.appendChild(el('p', 'note', note.join(' · ')));
    return c;
  }

  var lun = lunedi(new Date());
  function periodo() {
    var a = lun, b = addDays(lun, 4);
    return a.getDate() + (a.getMonth() !== b.getMonth() ? ' ' + MESI[a.getMonth()] : '') + ' – ' + b.getDate() + ' ' + MESI[b.getMonth()] + ' ' + b.getFullYear();
  }

  function disegna() {
    var doc = sel.value, oggi = iso(new Date());
    var settimana = [];
    for (var d = 1; d <= 5; d++) {
      var dt = addDays(lun, d - 1), di = iso(dt);
      var mie = lezioniDelGiorno(di, d).filter(function (l) { return l.doc === doc; });
      mie.sort(function (a, b) { return a.hour - b.hour || a.subject.localeCompare(b.subject); });
      settimana.push({ d: d, dt: dt, di: di, mie: mie });
    }
    var fatte = [], aule = [], giorni = 0, turni = [], sostit = 0;
    settimana.forEach(function (g) {
      if (g.mie.some(function (l) { return l.kind !== 'out'; })) giorni++;
      g.mie.forEach(function (l) {
        if (l.kind === 'sost') sostit++;
        if (l.kind === 'out') return;
        fatte.push(l);
        if (l.aula && aule.indexOf(l.aula) < 0) aule.push(l.aula);
        if (turni.indexOf(l.turno) < 0) turni.push(l.turno);
      });
    });
    aule.sort();
    var s = document.getElementById('summary'); s.textContent = '';
    s.appendChild(el('div', 'name', NOMI[doc]));
    function stat(k, v) { var dd = el('div', 'stat'); dd.appendChild(el('b', '', k)); dd.appendChild(el('span', '', v)); s.appendChild(dd); }
    stat('Lezioni questa settimana', String(fatte.length));
    stat('Giorni', giorni + ' su 5');
    stat('Aule', aule.length ? aule.map(function (a) { return 'Aula ' + a; }).join(', ') : 'Esercizi');
    stat('Turni', turni.length ? turni.join(' e ') : '—');
    if (sostit) stat('Sostituzioni', String(sostit));
    var lg = el('div', 'legend');
    FAM.forEach(function (f) { var sp = el('span'); sp.appendChild(el('i', 'f-' + f.id)); sp.appendChild(document.createTextNode(f.nome)); lg.appendChild(sp); });
    s.appendChild(lg);

    document.getElementById('range').textContent = periodo();
    var wk = document.getElementById('week'); wk.textContent = '';
    settimana.forEach(function (g) {
      var col = el('section', 'day' + (g.di === oggi ? ' is-today' : ''));
      var h = el('div', 'dayhead');
      h.appendChild(el('h2', '', GIORNI[g.d - 1] + ' ' + g.dt.getDate()));
      var n = g.mie.filter(function (l) { return l.kind !== 'out'; }).length;
      h.appendChild(el('small', '', n === 0 ? '' : n === 1 ? '1 lezione' : n + ' lezioni'));
      col.appendChild(h);
      var list = el('div', 'list');
      if (!g.mie.length) list.appendChild(el('div', 'empty', 'Nessuna lezione'));
      else {
        var ultimo = '';
        g.mie.forEach(function (l) {
          if (l.turno !== ultimo) { list.appendChild(el('div', 'slot', l.turno)); ultimo = l.turno; }
          list.appendChild(card(l));
        });
      }
      col.appendChild(list);
      wk.appendChild(col);
    });
  }

  sel.value = 'MB';
  sel.addEventListener('change', disegna);
  document.getElementById('prev').addEventListener('click', function () { lun = addDays(lun, -7); disegna(); });
  document.getElementById('next').addEventListener('click', function () { lun = addDays(lun, 7); disegna(); });
  document.getElementById('oggi').addEventListener('click', function () { lun = lunedi(new Date()); disegna(); });
  disegna();
})();
`;
// 2) dicitura: ESERCIZI al posto di "casa"
rep("var CASA = 'Esercitazione da casa';", "var CASA = 'Esercizi';");
if (/<\/script/i.test(app)) throw new Error('</script');
let stile = html.slice(0, m.index), corpo = html.slice(m.index + m[0].length);
stile = stile.replace('</style>', `.nav{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.nav button{height:38px;padding:0 14px;border:1px solid var(--line-strong);border-radius:10px;background:var(--soft);color:var(--fg);font:inherit;font-size:13.5px;font-weight:600;cursor:pointer}
.nav button:hover{border-color:var(--peri)}
.nav .range{font-size:15px;font-weight:650;margin-left:4px}
.card.is-sost{outline:2px solid var(--violet);outline-offset:-2px}
.card.is-out{opacity:.55}
.card.is-out .subject{text-decoration:line-through}
.tag{align-self:flex-start;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--violet);background:var(--bg);border:1px solid var(--violet);padding:1px 6px;border-radius:5px}
.card.is-out .tag{color:var(--muted);border-color:var(--line-strong)}
</style>`);
stile = stile.replace('<div class="summary" id="summary"></div>', '<div class="nav"><button id="prev" type="button">&lsaquo; Settimana precedente</button><button id="oggi" type="button">Oggi</button><button id="next" type="button">Settimana successiva &rsaquo;</button><span class="range" id="range"></span></div>\n    <div class="summary" id="summary"></div>')
  .replace(/Orario settimanale tipo, valido[^<]*/, 'Orario settimanale con le sostituzioni approvate. Valido da lunedì 5 ottobre 2026. Mattina 9:00–13:00, sera 17:00–21:00.');
const out = '<meta charset="utf-8">\n' + stile + `<script type="application/json" id="janus-dati">${dati.replace(/</g, '\\u003c')}</script>
<script type="text/plain" id="janus-app">${app}</script>
<script>
/* CARICAMENTO DATI: legge docenti.json dall'indirizzo qui sotto (si aggiorna da solo); se non risponde usa la copia incorporata. */
(function () {
  var URL_DATI = "${URL_BASE}/docenti.json";
  var incorporati = JSON.parse(document.getElementById('janus-dati').textContent);
  var testoApp = document.getElementById('janus-app').textContent;
  var avviato = false;
  function avvia(d) {
    if (avviato) return; avviato = true;
    window.JANUS_DOCENTI = d;
    var s = document.createElement('script'); s.text = testoApp; document.body.appendChild(s);
  }
  if (!URL_DATI || URL_DATI.indexOf('UTENTE') >= 0 || !window.fetch) { avvia(incorporati); return; }
  var t = setTimeout(function () { avvia(incorporati); }, 4000);
  fetch(URL_DATI + '?v=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
    .then(function (d) { if (!d || !d.diurno || !d.diurno.length) throw new Error('vuoto'); clearTimeout(t); avvia(d); })
    .catch(function () { clearTimeout(t); avvia(incorporati); });
})();
</script>
` + corpo;
fs.writeFileSync(__dirname + '/calendario-docenti.html', out);
console.log('ok', out.length);
