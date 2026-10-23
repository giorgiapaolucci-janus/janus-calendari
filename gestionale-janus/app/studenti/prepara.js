/* Una tantum: trasforma i due calendari studenti originali in
   - mattina.json / sera.json  (dati: lezioni + modifiche) -> da pubblicare su GitHub
   - calendario-mattina.html / calendario-sera.html (stessa grafica, dati caricati dal JSON, con copia incorporata di riserva) */
const fs = require('fs'), vm = require('vm');
const path = require('path');
const accessiPath = path.join(__dirname, '../../../accessi-zoom.cjs');
const accessiZoom = fs.existsSync(accessiPath) ? require(accessiPath) : null;
const URL_BASE = process.env.URL_BASE || 'https://UTENTE.github.io/REPO';
function dividi(html) {
  const re = /<script>([\s\S]*?)<\/script>/g; const m = []; let x;
  while ((x = re.exec(html))) m.push({ i: x.index, len: x[0].length, t: x[1] });
  if (m.length !== 2) throw new Error('attesi 2 script, trovati ' + m.length);
  return m;
}
function fix(s) { return s.replace(/Federico Vari\b/g, 'Federico Vani'); }
function esercizi(lezioni) {
  const out = [];
  lezioni.forEach(l => {
    if (!l.homework) return;
    const ref = lezioni.find(o => !o.homework && o.teacher === l.teacher && o.weekday === l.weekday && o.start === l.start && o.zoomUrl);
    l.esercizi = true; delete l.homework;
    l.room = 'AULA DOCENTI';
    if (ref) { l.zoomUrl = ref.zoomUrl; l.note = 'Esercizi assegnati dal docente: in sede in Aula docenti, da remoto da casa. Il docente è in lezione in ' + ref.room + ' (link Zoom).'; }
    else l.note = 'Esercizi assegnati dal docente: in sede in Aula docenti, da remoto da casa.';
    out.push(l.id + ' ' + l.subject + ' ' + l.teacher + ' g' + l.weekday + ' ' + l.start + (ref ? ' -> ' + ref.room : ' -> NESSUN LINK'));
  });
  return out;
}
function patchApp(app) {
  let n = 0; const sost = (a, b) => { if (!app.includes(a)) { console.log('  (patch non applicabile, salto)'); return; } app = app.split(a).join(b); n++; };
  sost("    if (ev.homework) {   // lezione senza Zoom: al posto del pulsante compare \"Esercitazione da casa\"\n      var h = el('span', 'jc-zoom is-off is-home');\n      h.appendChild(el('span', 'l', 'Esercitazione da casa'));\n      h.appendChild(el('span', 's', 'Da casa'));\n      return h;\n    }",
    "    if (ev.esercizi && !url) {   // esercizi senza link: al posto del pulsante compare \"Esercizi\"\n      var h = el('span', 'jc-zoom is-off is-home');\n      h.appendChild(el('span', 'l', 'Esercizi'));\n      h.appendChild(el('span', 's', 'Esercizi'));\n      return h;\n    }");
  return app;
}
function aggiungiTagEsercizi(app) {
  // etichetta ESERCIZI accanto all'aula (vista settimana, mobile) e riga nel dettaglio
  app = app.replace("      var z = pulsanteZoom(ev, { disabilitato: false });", "      if (ev.esercizi) c.appendChild(el('span', 'jc-tag', 'Esercizi'));\n      var z = pulsanteZoom(ev, { disabilitato: false });");
  app = app.replace("    var z = pulsanteZoom(ev, { disabilitato: CONFIG.zoomDisabilitatoSuMobile });", "    if (ev.esercizi) c.appendChild(el('span', 'jc-tag', 'Esercizi'));\n    var z = pulsanteZoom(ev, { disabilitato: CONFIG.zoomDisabilitatoSuMobile });");
  app = app.replace("    riga('Aula', ev.room);", "    if (ev.esercizi) riga('Tipo', 'Esercizi');\n    riga('Aula', ev.room);");
  return app;
}
function costruisci(nome, origine, jsonUrl) {
  const html = fs.readFileSync(origine, 'utf8');
  const [d, a] = dividi(html);
  const sb = { window: {}, console }; sb.window.window = sb.window; vm.createContext(sb); vm.runInContext(d.t, sb);
  const W = sb.window;
  const lezioni = JSON.parse(fix(JSON.stringify(W.JANUS_LEZIONI))).filter(l => !(Array.isArray(l.tracks) && l.tracks.length === 0));   // le lezioni con tracks vuoto (L025, L032, L069, L117) sono eliminate
  const log = esercizi(lezioni);
  const dati = { versione: 1, aggiornato: new Date().toISOString(), lezioni, modifiche: JSON.parse(fix(JSON.stringify(W.JANUS_MODIFICHE || []))) };
  if (accessiZoom) accessiZoom.applica(dati, nome);
  // parte statica del blocco dati: indirizzi, tabella classi, ecc.
  const k = d.t.indexOf('window.JANUS_INDIRIZZI');
  const statico = d.t.slice(k);
  let app = aggiungiTagEsercizi(patchApp(fix(a.t))).replace(/Esercitazione da casa/g, 'Esercizi');
  if (/<\/script/i.test(app)) throw new Error('app contiene </script');
  const incorporati = JSON.stringify(dati).replace(/</g, '\\u003c');
  const loader = `
<script>
${statico}
</script>
<script type="application/json" id="janus-dati">${incorporati}</script>
<script type="text/plain" id="janus-app">${app}</script>
<script>
/* CARICAMENTO DATI: il calendario legge ${nome}.json dall'indirizzo qui sotto (si aggiorna da solo).
   Se l'indirizzo non risponde, usa la copia incorporata in questa pagina. */
(function () {
  var URL_DATI = "${jsonUrl}";
  var incorporati = JSON.parse(document.getElementById('janus-dati').textContent);
  var testoApp = document.getElementById('janus-app').textContent;
  var avviato = false;
  function avvia(d) {
    if (avviato) return; avviato = true;
    window.JANUS_ACCESSI_ZOOM = d.accessiZoom; window.JANUS_LEZIONI = d.lezioni || []; window.JANUS_MODIFICHE = d.modifiche || [];
    var s = document.createElement('script'); s.text = testoApp; document.body.appendChild(s);
  }
  if (!URL_DATI || URL_DATI.indexOf('UTENTE') >= 0 || !window.fetch) { avvia(incorporati); return; }
  var t = setTimeout(function () { avvia(incorporati); }, 4000);
  fetch(URL_DATI + (URL_DATI.indexOf('?') < 0 ? '?v=' : '&v=') + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
    .then(function (d) { if (!d || !d.lezioni || !d.lezioni.length) throw new Error('vuoto'); clearTimeout(t); avvia(d); })
    .catch(function () { clearTimeout(t); avvia(incorporati); });
})();
</script>`;
  const out = html.slice(0, d.i) + loader + html.slice(a.i + a.len);
  fs.writeFileSync(__dirname + '/' + nome + '.json', JSON.stringify(dati, null, 1));
  fs.writeFileSync(__dirname + '/calendario-' + nome + '.html', out);
  console.log(nome, lezioni.length, 'lezioni;', 'esercizi:', log.length); log.forEach(x => console.log('  ' + x));
}
costruisci('mattina', __dirname + '/originale-mattina.html', URL_BASE + '/mattina.json');
costruisci('sera', __dirname + '/originale-sera.html', URL_BASE + '/sera.json');
