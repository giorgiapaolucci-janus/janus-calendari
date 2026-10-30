/* MOTORE - regole, competenze, disponibilità, sostituzioni, controlli.
   Stato condiviso in ST (riempito dal db o in locale). Nessun accesso a DOM qui. */
const ST = { assenze: [], sost: [], mods: [], proposte: [], regole: [], docOv: {}, ver: 0 };
const DOC = {}; (typeof DOCENTI_ARCHIVIO==='undefined'?[]:DOCENTI_ARCHIVIO).concat(DOCENTI).forEach(d => { DOC[d.id] = d; });
function bump() { ST.ver++; _memo.clear(); }
const _memo = new Map();

/* ---------- date ---------- */
const pad2 = n => String(n).padStart(2, '0');
const isoD = d => d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
const dParse = s => new Date(s + 'T00:00:00Z');
const addDays = (s, n) => { const d = dParse(s); d.setUTCDate(d.getUTCDate() + n); return isoD(d); };
const dow = s => dParse(s).getUTCDay();
const lunediDi = s => { const x = dow(s); return addDays(s, x === 0 ? -6 : 1 - x); };
const fmtD = s => { const d = dParse(s); return GIORNI_BREVI[d.getUTCDay()] + ' ' + d.getUTCDate() + '/' + (d.getUTCMonth() + 1); };
const fmtDL = s => { const d = dParse(s); return (GIORNI[d.getUTCDay()] || ['Domenica', 'Sabato'][d.getUTCDay() === 0 ? 0 : 1]) + ' ' + d.getUTCDate() + '/' + (d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); };
function intervallo(dal, al) {
  const out = []; if (!dal || !al || al < dal) return out;
  for (let d = dal, n = 0; d <= al && n < 120; d = addDays(d, 1), n++) { const w = dow(d); if (w >= 1 && w <= 5) out.push(d); }
  return out;
}
function validaData(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && isoD(dParse(s)) === s; }

/* ---------- materie ---------- */
const SUBJ_RULES = [
  [/EPICA/, 'epica/antologia'], [/LAB.*ITALIANO/, 'lab italiano'], [/LAB.*INGLESE/, 'lab inglese'], [/LAB.*MATEMATICA/, 'lab matematica'],
  [/LAB.*GRAMMATICA/, 'lab grammatica'], [/LAB.*LETTURA/, 'lab lettura'], [/LAB.*CREATIVO/, 'lab creativo'], [/LAB.*FISICA/, 'lab fisica'], [/POTENZIAMENTO/, 'potenziamento inglese'],
  [/SCRITTURA/, 'scrittura creativa'], [/ED\.? ?CIVICA|EDUCAZIONE CIVICA/, 'educazione civica'], [/EC\.? ?POLITICA|ECONOMIA POLITICA/, 'economia politica'],
  [/ECONOMIA AZIENDALE/, 'economia aziendale'], [/DIRITTO E TECNICHE|^DTA/, 'dta'], [/GPOI/, 'gpoi'], [/GEO TURISTICA|GEOGRAFIA TUR/, 'geografia turistica'],
  [/GEOSTORIA/, 'geostoria'], [/STORIA DELL/, "storia dell'arte"], [/STORIA/, 'storia'], [/ITALIANO/, 'italiano'], [/MATEMATICA/, 'matematica'],
  [/FISICA/, 'fisica'], [/CHIMICA/, 'chimica'], [/BIOLOGIA/, 'biologia'], [/SCIENZE INTEGRATE/, 'scienze integrate'], [/SCIENZE UMANE/, 'scienze umane'],
  [/SCIENZE MOTORIE/, 'scienze motorie'], [/SCIENZE/, 'scienze'], [/INGLESE/, 'inglese'], [/FRANCESE/, 'francese'], [/SPAGNOLO/, 'spagnolo'],
  [/LATINO/, 'latino'], [/GRECO/, 'greco'], [/FILOSOFIA/, 'filosofia'], [/DIRITTO/, 'diritto'], [/INFORMATICA/, 'informatica'],
  [/MECCATRONICA/, 'meccatronica'], [/TPSI/, 'tpsi e sistemi e reti'], [/PSICOLOGIA/, 'psicologia'], [/IGIENE/, 'igiene'], [/METOD/, 'metodologie operative'],
  [/RELAZIONI INTERNAZ/, 'relazioni internazionali']
];
function disc(materia) {
  const s = String(materia || '').toUpperCase().replace('EPICA/ANTOLOGIA', 'EPICA_ANTOLOGIA').replace(/IGIENE\/METOD\w*( OPERATIVE)?/, 'IGIENE / METODOLOGIE');
  const out = [];
  s.split(/\s*\/\s*|\s+-\s+/).forEach(p => {
    p = p.trim(); if (!p) return;
    const r = SUBJ_RULES.find(x => x[0].test(p));
    const v = r ? r[1] : p.toLowerCase();
    if (!out.includes(v)) out.push(v);
  });
  return out;
}
const GRUPPI_AFFINI = [
  ['matematica', 'lab matematica', 'fisica'], ['scienze', 'biologia', 'scienze integrate', 'chimica'], ['informatica', 'tpsi e sistemi e reti', 'meccatronica'],
  ['italiano', 'lab italiano', 'lab grammatica', 'lab lettura', 'epica/antologia', 'scrittura creativa', 'lab creativo'],
  ['storia', 'geostoria', "storia dell'arte", 'italiano', 'latino', 'greco', 'filosofia', 'epica/antologia'], ['latino', 'greco', 'italiano', 'epica/antologia'],
  ['inglese', 'lab inglese', 'potenziamento inglese'], ['scienze umane', 'psicologia', 'filosofia', 'igiene', 'metodologie operative'],
  ['diritto', 'educazione civica', 'economia politica', 'relazioni internazionali'], ['economia aziendale', 'dta', 'gpoi', 'economia politica'],
  ['geografia turistica', 'geostoria', 'relazioni internazionali'], ['educazione civica', 'storia', 'diritto']
];
const GRUPPI_PARZIALI = [
  ['inglese', 'lab inglese', 'potenziamento inglese', 'francese', 'spagnolo'], ['italiano', 'lab italiano', 'storia', 'inglese', 'francese', 'spagnolo', 'lab lettura', 'scrittura creativa'],
  ['scienze', 'chimica', 'fisica', 'matematica', 'biologia'], ['fisica', 'meccatronica', 'informatica', 'matematica'], ['economia aziendale', 'diritto', 'dta', 'gpoi', 'economia politica', 'matematica']
];
const _in = (gr, a, b) => gr.some(g => g.includes(a) && g.includes(b));
function matDocente(id) {
  const o = ST.docOv[id] || {}; const d = DOC[id]; if (!d) return [];
  const tolte = new Set((o.matTolte || []).map(x => x.toLowerCase()));
  return [...d.mat, ...(o.matExtra || [])].map(x => x.toLowerCase()).filter(x => !tolte.has(x));
}
/* livello: 3 esatta, 2 affine, 1 parziale, 0 nessuna - per un elenco di parti di materia */
function livelloPer(id, parti) {
  const mat = matDocente(id); if (!parti.length) return 3;
  let min = 3;
  parti.forEach(p => {
    let t = 0;
    if (mat.includes(p)) t = 3;
    else if (mat.some(m => _in(GRUPPI_AFFINI, m, p))) t = 2;
    else if (mat.some(m => _in(GRUPPI_PARZIALI, m, p))) t = 1;
    min = Math.min(min, t);
  });
  return min;
}
const NOME_LIV = ['nessuna', 'parziale', 'affine', 'esatta'];

/* ---------- lezioni ---------- */
let BASE = [];
function caricaBase() {
  BASE = RIGHE.trim().split('\n').filter(x => x && x.includes('|')).map(r => {
    const [id, g, h, anno, materia, ind, doc, aula, note, flag] = r.split('|');
    const l = { id, g: +g, h: +h, anno, materia, ind, doc: (doc && doc !== '-') ? doc : null, aula: aula || '', note: note || '', cal: id[0] === 'S' ? 'S' : 'M', v: null, dop: null };
    (flag || '').split(',').forEach(f => { if (f.startsWith('v:')) l.v = f.slice(2); if (f.startsWith('d:')) l.dop = f.slice(2); });
    return l;
  });
  BASE.forEach(l => { l.casa = !!l.esercizi || (!l.aula && /casa|esercizi/i.test(l.note)); l.subj = disc(l.materia); });
}
function lezioni() {
  if (_memo.has('lez')) return _memo.get('lez');
  const mods = ST.mods.slice().sort((a, b) => (a.creata || '').localeCompare(b.creata || ''));
  const m = new Map(BASE.map(l => [l.id, { ...l }]));
  mods.forEach(x => {
    if (x.tipo === 'add' && x.lezione) { const l = { ...x.lezione, id: x.lessonId }; l.casa = !!l.esercizi || (!l.aula && /casa|esercizi/i.test(l.note || '')); l.subj = disc(l.materia); l.cal = l.h >= 15 ? 'S' : 'M'; m.set(l.id, l); }
    else if (x.tipo === 'del') m.delete(x.lessonId);
    else if (x.tipo === 'set' && m.has(x.lessonId)) {
      const l = m.get(x.lessonId); Object.assign(l, x.patch || {});
      l.cal = l.h >= 15 ? 'S' : 'M'; l.casa = !!l.esercizi || (!l.aula && /casa|esercizi/i.test(l.note || '')); l.subj = disc(l.materia);
    }
  });
  const out = [...m.values()]; _memo.set('lez', out); return out;
}
const nomeD = id => (DOC[id] ? DOC[id].nome : (id || '—'));
const brevD = id => (DOC[id] ? DOC[id].breve : (id || '—'));

function assenzaDi(id, date) { return ST.assenze.find(a => a.docenteId === id && a.dal <= date && date <= a.al) || null; }

/* lezioni di una data con sostituzioni applicate */
function effettive(date) {
  const k = 'eff' + date; if (_memo.has(k)) return _memo.get(k);
  const g = dow(date); let out = [];
  if (g >= 1 && g <= 5 && date >= INIZIO) {
    const mp = {};
    ST.sost.filter(s => s.data === date).sort((a, b) => (a.creata || '').localeCompare(b.creata || '')).forEach(s => Object.assign(mp, s.map || {}));
    out = lezioni().filter(l => l.g === g).map(l => {
      const o = { ...l, data: date, docOrig: l.doc, docEff: l.doc, sost: false };
      if (Object.prototype.hasOwnProperty.call(mp, l.id)) { o.docEff = mp[l.id] || null; o.sost = true; }
      const ass = o.docEff ? assenzaDi(o.docEff, date) : null;
      o.assenza = ass; o.scoperta = !!ass && !l.casa;
      return o;
    });
  }
  _memo.set(k, out); return out;
}

/* sessioni: gruppi (cal, ora, docente, aula) di una data */
function sessioni(date, filtro) {
  const m = new Map();
  effettive(date).forEach(l => {
    if (filtro && !filtro(l)) return;
    const k = [l.cal, l.h, l.docEff || '-', l.aula || 'casa'].join('|');
    if (!m.has(k)) m.set(k, { key: k, data: date, cal: l.cal, h: l.h, g: l.g, aula: l.aula, doc: l.docEff, docOrig: l.docOrig, casa: l.casa, lezioni: [], subj: [] });
    const s = m.get(k); s.lezioni.push(l); l.subj.forEach(x => { if (!s.subj.includes(x)) s.subj.push(x); });
    if (l.scoperta) s.scoperta = true; if (l.sost) s.sost = true; if (l.assenza) s.assenza = l.assenza;
  });
  return [...m.values()].sort((a, b) => a.h - b.h);
}

const MAX_ORE_GIORNO = 8;
/* ---------- disponibilità ---------- */
function turno(id, cal, g) {
  const t = cal === 'M' ? TURNI.m : TURNI.s; const s = t && t[id]; return s ? s[g - 1] || '-' : '-';
}
/* extra: assegnazioni già decise in questa proposta [{data,h,doc,cal}] ; escl: id lezioni da ignorare (sono quelle da coprire) */
function valutaDisp(id, date, cal, h, aula, opt) {
  opt = opt || {}; const d = DOC[id]; const g = dow(date);
  const r = { ok: true, blocchi: [], avvisi: [], pen: 0 };
  const blocca = m => { r.ok = false; r.blocchi.push(m); };
  if (!d) { blocca('docente sconosciuto'); return r; }
  const ass = assenzaDi(id, date); if (ass) blocca('assente il ' + fmtD(date) + ' (' + ass.tipo + ')');
  const ov = ST.docOv[id] || {};
  (ov.indisp || []).forEach(x => { if (x === String(g) || x === g + ':' + h) blocca('indisponibile (' + GIORNI[g] + (x.includes(':') ? ' alle ' + h : '') + ')'); });
  if (cal === 'M') {
    if (!d.cal.includes('M')) blocca('non lavora nel turno mattutino');
    else {
      const t = turno(id, 'M', g);
      if (t === '-') blocca('nessun turno indicato di ' + GIORNI[g].toLowerCase());
      else if (t === 'S') { r.avvisi.push('di ' + GIORNI[g].toLowerCase() + ' è in smart working: serve il rientro in sede'); r.pen += 60; }
    }
  } else {
    if (!d.sera) blocca('non fa lezioni serali');
    if (id === 'lp' && g === 5) blocca('Luca non è disponibile il venerdì sera (esce alle 16:00)');
    if (id === 'lc' && !((g === 2 || g === 4) && h >= 17 && h <= 18)) blocca('Lucia di sera è disponibile solo martedì e giovedì dalle 17 alle 19');
    if (r.ok && !lezioni().some(l => l.cal === 'S' && l.doc === id && l.g === g)) { r.avvisi.push('non ha lezioni serali il ' + GIORNI[g].toLowerCase() + ': disponibilità da confermare'); r.pen += 30; }
  }
  const occ = effettive(date).filter(l => l.docEff === id && l.h === h && !l.casa && !(opt.escl && opt.escl.has(l.id)));
  if (occ.length) blocca('ha già lezione alle ' + h + ':00 (aula ' + (occ[0].aula || '-') + ')');
  (opt.extra || []).forEach(e => { if (e.doc === id && e.data === date && e.h === h) blocca('ha già un\'altra sostituzione alle ' + h + ':00'); });
  const ore = new Set(effettive(date).filter(l => l.docEff === id && !l.casa).map(l => l.cal + l.h));
  (opt.extra || []).forEach(e => { if (e.doc === id && e.data === date) ore.add(e.cal + e.h); });
  if (ore.size + 1 > MAX_ORE_GIORNO) blocca('supererebbe le ' + MAX_ORE_GIORNO + ' ore al giorno (ne ha già ' + ore.size + ')');
  else if (ore.size >= 5) { r.avvisi.push('carico alto: ' + (ore.size + 1) + ' ore quel giorno'); r.pen += 10 * (ore.size - 4); }
  return r;
}
function contaSost(id, extra) {
  return ST.sost.reduce((n, s) => n + Object.values(s.map || {}).filter(x => x === id).length, 0) + (extra || []).filter(e => e.doc === id).length;
}
/* candidati per una sessione (oggetto da sessioni()) */
function candidati(sess, opt) {
  opt = opt || {}; const escl = new Set(sess.lezioni.map(l => l.id)); opt = { ...opt, escl };
  const elenco = [], esclusi = [];
  DOCENTI.forEach(d => {
    if (d.id === sess.doc || d.id === sess.docOrig) return;
    const liv = livelloPer(d.id, sess.subj);
    if (liv === 0) return;
    const v = valutaDisp(d.id, sess.data, sess.cal, sess.h, sess.aula, opt);
    if (!v.ok) { esclusi.push({ id: d.id, liv, motivi: v.blocchi }); return; }
    let sc = liv * 100 - v.pen - 3 * contaSost(d.id, opt.extra);
    const vicino = effettive(sess.data).some(l => l.docEff === d.id && l.aula === sess.aula && Math.abs(l.h - sess.h) === 1 && l.cal === sess.cal)
      || (opt.extra || []).some(e => e.doc === d.id && e.data === sess.data && e.aula === sess.aula && Math.abs(e.h - sess.h) === 1);
    if (vicino) sc += 12;
    if ((d.aule || []).includes(sess.aula)) sc += 4;
    elenco.push({ id: d.id, nome: d.nome, liv, livNome: NOME_LIV[liv], avvisi: v.avvisi, score: sc, continuita: vicino });
  });
  elenco.sort((a, b) => b.score - a.score);
  return { elenco, esclusi: esclusi.sort((a, b) => b.liv - a.liv) };
}

/* ---------- proposta di assenza ---------- */
const keyS = (date, cal, h, aula) => [date, cal, h, aula || 'casa'].join('|');
function creaPropostaAssenza(p) {
  const dateL = intervallo(p.dal, p.al); const errori = [];
  if (!DOC[p.docenteId]) return { errore: 'Docente non trovato: ' + p.docenteId };
  if (!dateL.length) return { errore: 'Nessun giorno di lezione nell\'intervallo indicato (lun-ven, dal ' + INIZIO + ').' };
  const ass = { t: 'assenza', docenteId: p.docenteId, dal: p.dal, al: p.al, tipo: p.tipo || 'malattia', nota: p.nota || '' };
  /* simula l'assenza per il calcolo */
  const idTmp = '__tmp__' + Date.now();
  ST.assenze.push({ id: idTmp, ...ass }); bump();
  const extra = [], dettagli = [], scoperte = [], nonServe = [], mapPerData = {};
  const sc = {}; (p.scelte || []).forEach(s => { sc[keyS(s.data, s.cal || (s.ora >= 15 ? 'S' : 'M'), s.ora, s.aula)] = s.docenteId; });
  try {
    dateL.forEach(date => {
      sessioni(date, l => l.docEff === p.docenteId).forEach(s => {
        if (s.casa) { nonServe.push({ data: date, h: s.h, materia: s.lezioni[0].materia }); return; }
        if (!s.scoperta) return;
        const info = { data: date, h: s.h, cal: s.cal, aula: s.aula, materia: [...new Set(s.lezioni.map(l => l.materia))].join(' / '), anni: s.lezioni.map(l => l.anno).join(', '), ids: s.lezioni.map(l => l.id), da: p.docenteId };
        const c = candidati(s, { extra });
        let scelta = null;
        const forz = sc[keyS(date, s.cal, s.h, s.aula)];
        if (forz) {
          const ok = c.elenco.find(x => x.id === forz);
          if (ok) scelta = ok; else errori.push('Il docente scelto (' + nomeD(forz) + ') non è idoneo il ' + fmtD(date) + ' alle ' + s.h + ':00: ' + ((c.esclusi.find(x => x.id === forz) || { motivi: ['competenza insufficiente'] }).motivi.join('; ')));
        }
        if (!scelta) scelta = c.elenco[0] || null;
        info.alternative = c.elenco.filter(x => !scelta || x.id !== scelta.id).slice(0, 3).map(x => ({ id: x.id, livNome: x.livNome }));
        if (scelta) {
          info.a = scelta.id; info.livNome = scelta.livNome; info.avvisi = scelta.avvisi; info.continuita = scelta.continuita;
          extra.push({ data: date, h: s.h, doc: scelta.id, aula: s.aula, cal: s.cal });
          (mapPerData[date] = mapPerData[date] || {});
          s.lezioni.forEach(l => { mapPerData[date][l.id] = scelta.id; });
        } else {
          info.a = null; info.motivo = c.esclusi.slice(0, 3).map(x => nomeD(x.id) + ': ' + x.motivi.join(', ')).join(' | ') || 'nessun docente con competenza sulla materia';
          scoperte.push(info);
        }
        dettagli.push(info);
      });
    });
  } finally { ST.assenze = ST.assenze.filter(a => a.id !== idTmp); bump(); }
  const azioni = [ass];
  Object.keys(mapPerData).sort().forEach(d => azioni.push({ t: 'sost', data: d, map: mapPerData[d] }));
  const nCop = dettagli.filter(x => x.a).length;
  return {
    titolo: nomeD(p.docenteId) + ' assente ' + (p.dal === p.al ? fmtD(p.dal) : 'dal ' + fmtD(p.dal) + ' al ' + fmtD(p.al)) + ' (' + ass.tipo + ')',
    tipo: 'assenza', azioni, dettagli, scoperte, nonServe, errori,
    riepilogo: nCop + ' sessioni coperte, ' + scoperte.length + ' scoperte, ' + nonServe.length + ' sessioni di esercizi senza copertura'
  };
}

/* ---------- controlli sul calendario ---------- */
function controlliSu(list) {
  const issues = []; const add = (sev, code, msg, ids) => issues.push({ sev, code, msg, ids });
  const labL = l => GIORNI_BREVI[l.g] + ' ' + l.h + ':00';
  list.forEach(l => { if (!l.doc && !l.casa) add('warn', 'nodoc', labL(l) + ' · ' + l.materia + ' (' + l.anno + '): docente da assegnare', [l.id]); });
  const byDoc = new Map(), byAula = new Map();
  list.forEach(l => {
    if (l.doc && !l.casa) { const k = l.g + '|' + l.h + '|' + l.doc; (byDoc.get(k) || byDoc.set(k, []).get(k)).push(l); }
    if (l.aula) { const k = l.g + '|' + l.h + '|' + l.aula; (byAula.get(k) || byAula.set(k, []).get(k)).push(l); }
  });
  byDoc.forEach(a => { const au = new Set(a.map(x => x.aula)); if (au.size > 1) add('err', 'doc2', brevD(a[0].doc) + ' è in aule diverse (' + [...au].join(' e ') + ') ' + labL(a[0]), a.map(x => x.id)); });
  byAula.forEach(a => { const ds = new Set(a.map(x => x.doc || '-')); if (ds.size > 1) add('err', 'aula2', 'Aula ' + a[0].aula + ' con docenti diversi (' + [...ds].map(brevD).join(' e ') + ') ' + labL(a[0]), a.map(x => x.id)); });
  const viste = new Set();
  list.forEach(l => {
    if (!l.doc || l.casa) return;
    const k = [l.g, l.h, l.doc, l.aula].join('|'); const liv = livelloPer(l.doc, l.subj);
    if (liv < 2 && !viste.has('c' + k + l.materia)) { viste.add('c' + k + l.materia); add(liv === 0 ? 'warn' : 'info', 'comp', labL(l) + ' · ' + brevD(l.doc) + ' insegna ' + l.materia + ': materia ' + (liv === 0 ? 'non presente nel suo elenco' : 'solo in area vicina'), [l.id]); }
    const g = l.g;
    if (l.cal === 'M') { const t = turno(l.doc, 'M', g); if ((t === 'S' || t === '-') && !viste.has('t' + k)) { viste.add('t' + k); add('warn', 'turno', labL(l) + ' · ' + brevD(l.doc) + ': lezione in aula ma turno ' + (t === 'S' ? 'smart working' : 'non indicato'), [l.id]); } }
    else {
      if (l.doc === 'lp' && g === 5) add('err', 'serale', 'Luca ha una lezione il venerdì sera (' + l.h + ':00): esce alle 16:00', [l.id]);
      if (l.doc === 'lc' && !((g === 2 || g === 4) && l.h <= 18)) add('err', 'serale', 'Lucia ha una lezione serale fuori da martedì/giovedì 17-19 (' + labL(l) + ')', [l.id]);
      if (!DOC[l.doc].sera) add('err', 'serale', brevD(l.doc) + ' non fa lezioni serali (' + labL(l) + ')', [l.id]);
    }
  });
  const perGiorno = new Map();
  list.forEach(l => { if (l.doc && !l.casa) { const k = l.doc + '|' + l.g; (perGiorno.get(k) || perGiorno.set(k, new Map()).get(k)).set(l.cal + l.h, l.id); } });
  perGiorno.forEach((m, k) => { if (m.size > MAX_ORE_GIORNO) add('err', 'ore8', brevD(k.split('|')[0]) + ' ha ' + m.size + ' ore di lezione ' + GIORNI[+k.split('|')[1]] + ' (massimo ' + MAX_ORE_GIORNO + ')', [...m.values()]); });
  list.forEach(l => { if (l.v && VERIFICA_MSG[l.v] && l.v !== 'nodoc') add('warn', 'verifica', labL(l) + ' · ' + l.materia + ' (' + l.id + '): ' + VERIFICA_MSG[l.v], [l.id]); });
  return issues;
}
function controlli() { return controlliSu(lezioni()); }

/* ---------- valutazione di una modifica permanente ---------- */
function valutaModifica(lessonId, patch) {
  const cur = lezioni(); const l0 = cur.find(x => x.id === lessonId);
  if (!l0) return { errore: 'Lezione non trovata: ' + lessonId };
  const prima = controlliSu(cur); const sig = i => i.code + '|' + i.msg;
  const prev = new Set(prima.map(sig));
  const sess = cur.filter(x => x.g === l0.g && x.h === l0.h && x.doc === l0.doc && x.aula === l0.aula).map(x => x.id);
  const ids = new Set(sess);
  const nuova = cur.map(x => {
    if (!ids.has(x.id)) return x;
    const n = { ...x, ...patch }; n.cal = n.h >= 15 ? 'S' : 'M'; n.casa = !!n.esercizi || (!n.aula && /casa|esercizi/i.test(n.note || '')); n.subj = disc(n.materia); return n;
  });
  const dopo = controlliSu(nuova).filter(i => !prev.has(sig(i)));
  return { lezioni: [...ids], nuove: dopo, bloccanti: dopo.filter(i => i.sev === 'err'), avvisi: dopo.filter(i => i.sev !== 'err'), risolte: prima.filter(i => !controlliSu(nuova).some(j => sig(j) === sig(i))).length };
}
function descLezione(l) {
  return l.id + ' · ' + GIORNI[l.g] + ' ' + l.h + ':00 · ' + l.materia + ' (' + l.anno + ', ' + l.ind + ') · ' + (l.doc ? nomeD(l.doc) : 'senza docente') + ' · aula ' + (l.aula || '—');
}
caricaBase();
if (typeof module !== 'undefined') module.exports = { ST };
