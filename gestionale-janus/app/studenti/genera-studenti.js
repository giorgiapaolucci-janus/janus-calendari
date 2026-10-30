/* GENERATORE DEI DATI STUDENTI
   Uso:  node genera-studenti.js stato.json [cartella-uscita]
   stato.json = contenuto del software: { "assenze":[], "sost":[], "mods":[] }  (letto dal database del software)
   Parte dai calendari base (base-mattina.json, base-sera.json = quello che vedono oggi gli studenti), poi applica:
   - modifiche PERMANENTI (mods: set/del/add)  -> cambiano le lezioni per sempre
   - sostituzioni APPROVATE (sost)              -> modifiche con data: valgono solo in quel giorno, poi il calendario torna da solo com'era
   Scrive mattina.json e sera.json. Stampa un rapporto (cose non pubblicate, differenze software/studenti). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = __dirname, janus = path.join(dir, '..');
const accessiZoom = require('../../../accessi-zoom.cjs');
const stato = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = process.argv[3] || dir;
const src = ['data.js', 'rules.js', 'engine.js'].map(f => fs.readFileSync(path.join(janus, f), 'utf8')).join('\n');
const ctx = vm.createContext({ console, module: undefined });
vm.runInContext(src + '\n;this.X={ST,lezioni,effettive,nomeD,intervallo,INIZIO,DOC,bump,controlli,disc,DOCENTI};', ctx);
const X = ctx.X;
X.ST.assenze = stato.assenze || []; X.ST.sost = stato.sost || []; X.ST.mods = stato.mods || []; X.ST.regole = stato.regole || []; X.ST.docOv = Object.fromEntries((stato.docenti || []).map(d => [d.id, d])); X.bump();
const rapporto = [];
const hh = h => String(h).padStart(2, '0') + ':00', hf = h => String(h).padStart(2, '0') + ':50';
const aulaTxt = a => a ? 'AULA ' + a : '';

function applica(nome, cal) {
  const base = JSON.parse(fs.readFileSync(path.join(dir, 'base-' + nome + '.json'), 'utf8'));
  const L = base.lezioni; const per = new Map(L.map(l => [l.id, l]));
  const zoomPerAula = {}; L.forEach(l => { if (l.zoomUrl && l.room && !zoomPerAula[l.room]) zoomPerAula[l.room] = l.zoomUrl; });
  const sw = X.lezioni().filter(l => l.cal === cal);
  // 1) controllo allineamento software <-> calendario studenti
  const ids = new Set(sw.map(l => l.id));
  const manca = L.filter(l => /^[LAS]\d+$/.test(l.id) && !ids.has(l.id)).map(l => l.id);
  const extra = sw.filter(l => !per.has(l.id)).map(l => l.id);
  // 2) modifiche permanenti
  let nPerm = 0;
  X.ST.mods.slice().sort((a, b) => (a.creata || '').localeCompare(b.creata || '')).forEach(m => {
    const id = m.lessonId; if (!id) return;
    const lm = id[0] === 'S' ? 'S' : 'M'; if ((lm === 'S') !== (cal === 'S')) { if (!(m.tipo === 'add' && m.lezione && ((m.lezione.h >= 15) === (cal === 'S')))) return; }
    if (m.tipo === 'del') { const i = L.findIndex(l => l.id === id); if (i >= 0) { L.splice(i, 1); per.delete(id); nPerm++; } }
    else if (m.tipo === 'set' && per.has(id)) {
      const l = per.get(id), p = m.patch || {};
      if (p.g != null) l.weekday = p.g;
      if (p.h != null) { l.start = hh(p.h); l.end = hf(p.h); }
      if (p.doc !== undefined) l.teacher = p.doc ? X.nomeD(p.doc) : '';
      if (p.aula !== undefined) { l.room = aulaTxt(p.aula); l.zoomUrl = zoomPerAula[l.room] || l.zoomUrl || ''; }
      if (p.materia) l.subject = p.materia;
      if (p.ind !== undefined) l.class = p.ind.startsWith('TUTTI TRANNE') ? 'PER TUTTI' : p.ind;
      if (p.tracks !== undefined) l.tracks = p.tracks.slice();
      if (p.affiancaA !== undefined) l.affiancaA = p.affiancaA.slice();
      for (const key of ['zoomUrl','zoomPasscode','esercizi','class']) if (p[key] !== undefined) l[key] = p[key];
      if (p.anno) l.year = /ANNO/i.test(p.anno) ? p.anno : p.anno + ' ANNO';
      nPerm++;
    } else if (m.tipo === 'add' && m.lezione) {
      const z = m.lezione;
      const n = { id, weekday: z.g, start: hh(z.h), end: hf(z.h), subject: z.materia, year: /ANNO/i.test(z.anno) ? z.anno : z.anno + ' ANNO', class: cal === 'S' ? 'SERALE' : (z.ind || 'PER TUTTI'), teacher: z.doc ? X.nomeD(z.doc) : '', room: aulaTxt(z.aula), note: z.note || '', zoomUrl: zoomPerAula[aulaTxt(z.aula)] || '', status: 'scheduled' };
      if (z.tracks !== undefined) n.tracks = z.tracks.slice();
      if (z.affiancaA !== undefined) n.affiancaA = z.affiancaA.slice();
      for (const key of ['zoomUrl','zoomPasscode','esercizi','class']) if (z[key] !== undefined) n[key] = z[key];
      L.push(n); per.set(id, n); nPerm++;
    }
  });
  // 3) sostituzioni approvate -> modifiche con data
  const modifiche = []; const date = [...new Set(X.ST.sost.map(s => s.data))].sort();
  date.forEach(d => X.effettive(d).filter(o => o.cal === cal && o.sost && o.docEff !== o.docOrig).forEach(o => {
    const l = per.get(o.id); if (!l) return;
    if (!o.docEff) { rapporto.push('NON pubblicata (scoperta): ' + d + ' ' + hh(o.h) + ' ' + o.materia + ' (' + o.id + ')'); return; }
    modifiche.push({ lessonId: o.id, date: d, teacher: X.nomeD(o.docEff) });
  }));
  rapporto.push(nome + ': ' + L.length + ' lezioni, ' + nPerm + ' modifiche permanenti, ' + modifiche.length + ' sostituzioni con data' + (manca.length ? ' | nel calendario studenti ma non nel software: ' + manca.join(',') : '') + (extra.length ? ' | nel software ma non nei calendari studenti (e non aggiunte): ' + extra.join(',') : ''));
  return accessiZoom.applica({ versione: 1, aggiornato: new Date().toISOString(), lezioni: L, modifiche }, nome);
}
['mattina', 'sera'].forEach((n, i) => { const d = applica(n, i ? 'S' : 'M'); fs.writeFileSync(path.join(out, n + '.json'), JSON.stringify(d)); });

/* ---------- Calendario docenti (docenti.json) ---------- */
const IND = { 'PER TUTTI': 'Tutti gli indirizzi', 'TUTTI': 'Tutti gli indirizzi', 'TUTTI GLI INDIRIZZI': 'Tutti gli indirizzi', 'SCIENTIFICO': 'Scientifico', 'CLASSICO': 'Classico', 'LINGUISTICO': 'Linguistico', 'SCIENZE UMANE': 'Scienze umane', 'UMANE': 'Scienze umane', 'SCIENZE APPLICATE': 'Scienze applicate', 'SPORTIVO': 'Sportivo', 'LES': 'LES', 'ITI INFORMATICO': 'ITI Informatico', 'ITI': 'ITI', 'AFM': 'AFM', 'SOCIO SANITARIO': 'Socio sanitario', 'SOCIO': 'Socio sanitario', 'SOCIOLING': 'Socio linguistico', 'TURISMO': 'Turismo', 'TUR': 'Turismo', 'MME': 'MME', 'IPSEOA': 'IPSEOA', 'MECCATRONICA': 'Meccatronica', 'LICEI': 'Licei', 'RIM': 'RIM', 'SCIENTIFICI': 'Scientifico' };
function fmtInd(s) {
  s = String(s || '').trim(); if (/^TUTTI TRANNE/i.test(s)) return 'Tutti tranne ' + s.slice(13).replace(/\bITI\b/g, 'ITI').replace(/\bE\b/g, 'e').replace(/\bAFM\b/g, 'AFM').toLowerCase().replace(/iti/g, 'ITI').replace(/afm/g, 'AFM');
  const out = [];
  s.split(/\s*[\/,]\s*|\s*-\s*/).forEach(t => { t = t.trim(); if (!t) return; const k = t.toUpperCase(); const v = IND[k] || (t.length <= 4 && t === t.toUpperCase() ? t : t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()); if (!out.includes(v)) out.push(v); });
  return out.join(' / ').replace(/\bles\b/gi, 'LES');
}
const MAT = { 'dta': 'Diritto e tecniche amm. (DTA)', 'gpoi': 'GPOI', 'tpsi e sistemi e reti': 'TPSI e Sistemi e reti', 'metodologie operative': 'Metodologie', 'epica/antologia': 'Epica / Antologia', 'scienze integrate': 'Scienze integrate' };
function fmtMat(m) {
  const s = String(m || '').toUpperCase();
  if (/FRANCESE GRAMMATICA/.test(s)) return 'Francese grammatica';
  if (/FRANCESE AVANZATO/.test(s)) return 'Francese avanzato';
  if (/IGIENE\s*\/\s*METOD/.test(s)) return 'Igiene / Metodologie';
  if (/GEOSTORIA\s*-\s*STORIA DELL/.test(s)) return "Geostoria - Storia dell'arte";
  return X.disc(m).map(d => MAT[d] || d.charAt(0).toUpperCase() + d.slice(1)).join(' / ');
}
function docenti() {
  const righe = X.lezioni().filter(l => l.doc).map(l => ({ id: l.id, doc: l.doc.toUpperCase(), day: l.g, hour: l.h, turno: l.cal === 'S' ? 'Sera' : 'Mattina', anno: l.anno, materia: fmtMat(l.materia), ind: fmtInd(l.ind), aula: l.aula ? +l.aula : 0, note: (l.casa ? '' : (l.note || '')).trim(), esercizi: !!l.casa }));
  righe.sort((a, b) => a.day - b.day || a.hour - b.hour);
  const nomi = {}; X.DOCENTI.forEach(d => { nomi[d.id.toUpperCase()] = d.nome; });
  // sostituzioni approvate e assenze scoperte, per data: { "2026-11-18": { "L063": "BL", "L070": "" } }  ("" = nessun sostituto)
  const sostituzioni = {};
  const date = new Set(); X.ST.sost.forEach(x => date.add(x.data)); X.ST.assenze.forEach(a => X.intervallo(a.dal, a.al).forEach(d => date.add(d)));
  [...date].sort().forEach(d => X.effettive(d).forEach(o => {
    if (!o.doc) return;
    if (o.sost && o.docEff !== o.docOrig) (sostituzioni[d] = sostituzioni[d] || {})[o.id] = o.docEff ? o.docEff.toUpperCase() : '';
    else if (!o.sost && o.scoperta) (sostituzioni[d] = sostituzioni[d] || {})[o.id] = '';
  }));
  return { versione: 1, aggiornato: new Date().toISOString(), nomi, sostituzioni, diurno: righe.filter(r => r.turno === 'Mattina'), serale: righe.filter(r => r.turno === 'Sera') };
}
fs.writeFileSync(path.join(out, 'docenti.json'), JSON.stringify(docenti()));
rapporto.push('docenti: ' + docenti().diurno.length + ' righe mattina, ' + docenti().serale.length + ' righe sera');
console.log(rapporto.join('\n'));
