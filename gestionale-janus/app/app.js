/* ===== APP: interfaccia, db condiviso ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oggiIso = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const U = { tab: 'cal', cal: 'M', week: lunediDi(oggiIso() < INIZIO ? INIZIO : oggiIso()), filtro: '', sel: null, canEdit: false, canWrite: true, db: null, user: null, uid: 'anon', docSel: '', edit: null, form: { docenteId: '', dal: '', al: '', tipo: 'malattia', nota: '' }, showInfo: false, msg: null, loaded: {} };
const LOCAL = { assenze: {}, sost: {}, mods: {}, proposte: {}, regole: {}, docenti: {} };
const COLS = ['assenze', 'sost', 'mods', 'proposte', 'regole', 'docenti'];
const hueOf = id => Math.max(0, DOCENTI.findIndex(d => d.id === id)) * 18 + 60;
const nowIso = () => new Date().toISOString();
const uniq = a => [...new Set(a)];

/* ---------- store ---------- */
function applyCol(col, arr) {
  if (col === 'docenti') { ST.docOv = {}; arr.forEach(a => { ST.docOv[a.id] = a; }); } else ST[col] = arr;
  bump(); scheduleRender();
}
function localEmit(col) { applyCol(col, Object.entries(LOCAL[col]).map(([id, d]) => ({ id, ...d }))); }
/* ---------- render ---------- */
let _raf = 0;
function scheduleRender() { if (_raf) return; _raf = requestAnimationFrame(() => { _raf = 0; render(); }); }
const TABS = [['cal', 'Calendario'], ['doc', 'Docenti'], ['ass', 'Assenze e modifiche'], ['ctl', 'Controlli'], ['reg', 'Regole'], ['sync', 'Salvataggio e collegamenti']];
function render() {
  const attesa = ST.proposte.filter(p => p.stato === 'in attesa').length;
  $('#tabs').innerHTML = TABS.map(([k, n]) => '<button role="tab" data-a="tab" data-k="' + k + '" aria-selected="' + (U.tab === k) + '">' + n + (k === 'ass' && attesa ? '<span class="badge">' + attesa + '</span>' : '') + '</button>').join('');
  $('#status').innerHTML = '<span class="pill ' + (U.canEdit ? 'ok' : '') + '">' + (U.canEdit ? 'Può modificare e approvare' : 'Sola consultazione') + '</span>'
    + '<span class="pill ' + (localReady ? 'ok' : 'warn') + '">' + (localReady ? (localBusy ? 'Salvataggio in corso…' : 'Salvato su questo Mac') : 'Caricamento archivio…') + '</span>';
  const keep = {}; const ae = document.activeElement;
  $('#main').querySelectorAll('input[id],select[id],textarea[id]').forEach(el => { if (el.type !== 'file' && el.type !== 'password') keep[el.id] = el.value; });
  const aid = ae && ae.id; const ss = ae && ae.selectionStart;
  const f = { cal: pCal, doc: pDoc, ass: pAss, ctl: pCtl, reg: pReg, sync: pSync }[U.tab];
  $('#main').innerHTML = (U.msg ? '<div class="box ' + U.msg.k + '" style="margin-bottom:10px">' + esc(U.msg.t) + '</div>' : '') + f();
  Object.keys(keep).forEach(id => { const el = document.getElementById(id); if (el) el.value = keep[id]; });
  if (aid) { const el = document.getElementById(aid); if (el) { el.focus(); try { if (ss != null) el.setSelectionRange(ss, ss); } catch (e) { /* */ } } }
}

/* ---------- calendario ---------- */
function sessCard(s, filtro) {
  const mat = uniq(s.lezioni.map(l => l.materia)).join(' / ');
  const anni = uniq(s.lezioni.map(l => l.anno)).join(' · ');
  const dim = filtro && s.doc !== filtro && s.docOrig !== filtro;
  const sel = U.sel && U.sel.key === s.key && U.sel.data === s.data;
  const cls = 's' + (s.scoperta ? ' scop' : '') + (s.sost && !s.scoperta ? ' sost' : '') + (s.casa ? ' casa' : '') + (dim ? ' dim' : '') + (sel ? ' sel' : '');
  let riga;
  if (s.scoperta) riga = '<span class="tag">Scoperta</span>' + esc(brevD(s.docOrig)) + ' assente';
  else if (s.sost) riga = '<span class="tag">Sost.</span>' + esc(brevD(s.doc)) + ' per ' + esc(brevD(s.docOrig));
  else riga = esc(s.doc ? brevD(s.doc) : 'Da assegnare');
  const v = s.lezioni.some(l => l.v && l.v !== 'nodoc');
  return '<button class="' + cls + '" style="--hue:' + hueOf(s.doc || s.docOrig) + '" data-a="sel" data-d="' + s.data + '" data-k="' + esc(s.key) + '"><b>' + esc(mat) + '</b><span class="m">' + esc(anni) + '</span><br>' + riga + (s.aula ? ' <span class="aula">' + esc(s.aula) + '</span>' : (s.casa ? ' <span class="aula">esercizi</span>' : '')) + (v ? ' <span title="Da verificare">⚠</span>' : '') + '</button>';
}
function gridHTML(cal, filtro) {
  const dates = [0, 1, 2, 3, 4].map(i => addDays(U.week, i)); const ore = cal === 'M' ? ORE_MATTINA : ORE_SERA;
  const by = {}; dates.forEach(d => { by[d] = sessioni(d, l => l.cal === cal); });
  const oggi = oggiIso();
  let h = '<div class="scroll"><table class="cal"><thead><tr><th style="width:54px"></th>' + dates.map((d, i) => '<th' + (d === oggi ? ' style="color:var(--accent)"' : '') + '>' + GIORNI[i + 1] + '<small>' + fmtD(d).split(' ')[1] + (d < INIZIO ? ' · prima dell\'inizio' : '') + '</small></th>').join('') + '</tr></thead><tbody>';
  ore.forEach(o => {
    h += '<tr><td class="h">' + o + ':00</td>' + dates.map(d => '<td>' + by[d].filter(s => s.h === o).map(s => sessCard(s, filtro)).join('') + '</td>').join('') + '</tr>';
  });
  return h + '</tbody></table></div>';
}
function weekLabel() { const a = U.week, b = addDays(U.week, 4); return fmtD(a).split(' ')[1] + ' – ' + fmtD(b).split(' ')[1] + '/' + (dParse(b).getUTCFullYear()); }
function pCal() {
  const opt = '<option value="">Tutti i docenti</option>' + DOCENTI.filter(d => d.cal.includes(U.cal)).map(d => '<option value="' + d.id + '"' + (U.filtro === d.id ? ' selected' : '') + '>' + esc(d.nome) + '</option>').join('');
  const ab = ST.assenze.filter(a => intervallo(U.week, addDays(U.week, 4)).some(d => a.dal <= d && d <= a.al));
  return '<div class="col"><div class="row sp"><div class="row"><div class="seg"><button data-a="cal" data-k="M" aria-pressed="' + (U.cal === 'M') + '">Mattina</button><button data-a="cal" data-k="S" aria-pressed="' + (U.cal === 'S') + '">Sera</button></div>'
    + '<button class="b sm" data-a="wk" data-n="-7" aria-label="Settimana precedente">◀</button><b class="mono">' + weekLabel() + '</b><button class="b sm" data-a="wk" data-n="7" aria-label="Settimana successiva">▶</button><button class="b sm" data-a="oggi">Oggi</button></div>'
    + '<select id="flt" data-ch="filtro" aria-label="Filtra per docente">' + opt + '</select></div>'
    + '<div class="legend"><span><i style="background:var(--ok-soft);border:1px solid var(--ok)"></i>Sostituzione</span><span><i style="background:var(--err-soft);border:1px solid var(--err)"></i>Scoperta</span><span><i style="border:1px dashed var(--mute)"></i>Esercizi (aula docenti o da casa)</span><span>⚠ da verificare</span>'
    + (ab.length ? '<span>Assenti questa settimana: ' + esc(uniq(ab.map(a => brevD(a.docenteId))).join(', ')) + '</span>' : '') + '</div>'
    + gridHTML(U.cal, U.filtro) + detail() + '</div>';
}
function selSess() {
  if (!U.sel) return null; return sessioni(U.sel.data).find(s => s.key === U.sel.key) || null;
}
function detail() {
  const s = selSess(); if (!s) return '<p class="sub">Tocca una lezione per vedere i dettagli, chi può coprirla e, se puoi modificare, spostarla.</p>';
  const l0 = s.lezioni[0]; const base = lezioni().find(x => x.id === l0.id) || l0;
  let h = '<div class="card col"><div class="row sp"><h2 style="margin:0">' + esc(uniq(s.lezioni.map(l => l.materia)).join(' / ')) + '</h2><button class="b sm" data-a="chiudi">Chiudi</button></div>';
  h += '<div class="sub">' + esc(fmtDL(s.data)) + ' · ore ' + s.h + ':00 · ' + (s.aula ? 'aula ' + esc(s.aula) : (s.casa ? 'esercizi · aula docenti o da casa' : 'aula non indicata')) + ' · docente: <b>' + esc(s.doc ? nomeD(s.doc) : 'da assegnare') + '</b>' + (s.sost ? ' (sostituisce ' + esc(nomeD(s.docOrig)) + ')' : '') + '</div>';
  if (s.scoperta) h += '<div class="box err">Lezione scoperta: ' + esc(nomeD(s.docOrig)) + ' è assente' + (s.assenza ? ' (' + esc(s.assenza.tipo) + ')' : '') + ' e nessuno la copre. Vai su "Assenze e modifiche" per preparare una proposta.</div>';
  h += '<div class="tw"><table class="prop" style="border:0"><thead><tr><th>Codice</th><th>Anno</th><th>Indirizzi</th><th>Note</th></tr></thead><tbody>' + s.lezioni.map(l => '<tr><td>' + esc(l.id) + '</td><td>' + esc(l.anno) + '</td><td>' + esc(l.ind) + (l.dop ? ' <span class="chip">doppia scelta: ' + esc(l.dop) + '</span>' : '') + '</td><td>' + esc(l.note) + (l.v && VERIFICA_MSG[l.v] ? '<div class="box warn" style="margin-top:4px">' + esc(VERIFICA_MSG[l.v]) + '</div>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
  if (s.doc) h += '<div class="sub">Competenza di ' + esc(brevD(s.doc)) + ' su questa materia: <b>' + NOME_LIV[livelloPer(s.doc, s.subj)] + '</b></div>';
  if (!s.casa) {
    const c = candidati(s); h += '<h3>Chi potrebbe coprire questa lezione</h3>';
    h += c.elenco.length ? c.elenco.slice(0, 5).map(x => '<span class="chip ' + (x.avvisi.length ? '' : 'x') + '" title="' + esc(x.avvisi.join('; ')) + '">' + esc(x.nome) + ' · ' + x.livNome + (x.avvisi.length ? ' ⚠' : '') + '</span>').join('') : '<span class="sub">Nessun docente disponibile in quest\'ora.</span>';
  }
  if (s.doc) h += '<div class="row"><button class="b sm" data-a="segnala" data-id="' + s.docOrig + '" data-d="' + s.data + '">Segnala assenza di ' + esc(brevD(s.docOrig)) + '</button></div>';
  if (U.canEdit) {
    const e = U.edit && U.edit.lid === base.id ? U.edit : { lid: base.id, doc: base.doc || '', g: base.g, h: base.h, aula: base.aula, res: null };
    const sel = (id, opts, v) => '<select id="' + id + '">' + opts + '</select>';
    h += '<h3>Modifica permanente (vale da ora per tutte le settimane)</h3><div class="row">'
      + '<label class="f">Docente<select id="ed-doc"><option value="">— nessuno —</option>' + DOCENTI.map(d => '<option value="' + d.id + '"' + (e.doc === d.id ? ' selected' : '') + '>' + esc(d.nome) + '</option>').join('') + '</select></label>'
      + '<label class="f">Giorno<select id="ed-g">' + [1, 2, 3, 4, 5].map(g => '<option value="' + g + '"' + (+e.g === g ? ' selected' : '') + '>' + GIORNI[g] + '</option>').join('') + '</select></label>'
      + '<label class="f">Ora<select id="ed-h">' + ORE_MATTINA.concat(ORE_SERA).map(o => '<option value="' + o + '"' + (+e.h === o ? ' selected' : '') + '>' + o + ':00</option>').join('') + '</select></label>'
      + '<label class="f">Aula<input id="ed-aula" size="4" value="' + esc(e.aula) + '"></label>'
      + '<button class="b" data-a="valuta" data-id="' + base.id + '">Controlla</button></div>';
    if (e.res) {
      const r = e.res;
      if (r.errore) h += '<div class="box err">' + esc(r.errore) + '</div>';
      else {
        h += r.nuove.length ? '' : '<div class="box ok">Nessun nuovo conflitto: la modifica rispetta tutte le regole.</div>';
        r.bloccanti.forEach(i => { h += '<div class="box err" style="margin-top:6px">Blocca: ' + esc(i.msg) + '</div>'; });
        r.avvisi.forEach(i => { h += '<div class="box warn" style="margin-top:6px">Attenzione: ' + esc(i.msg) + '</div>'; });
        h += '<div class="row" style="margin-top:8px"><button class="b pri" data-a="applicaMod" ' + (r.bloccanti.length ? 'disabled' : '') + '>Applica modifica</button></div>';
      }
    }
  }
  return h + '</div>';
}

/* ---------- docenti ---------- */
function oreSett(id, cal) {
  return uniq(lezioni().filter(l => l.doc === id && l.cal === cal && !l.casa).map(l => l.g + '|' + l.h + '|' + l.aula)).length;
}
function pDoc() {
  let h = '<div class="col"><div class="tt">';
  DOCENTI.forEach(d => {
    const tm = (TURNI.m[d.id] || '-----').split('').map((t, i) => '<span class="chip ' + (t === '-' ? 'n' : t) + '" title="' + GIORNI[i + 1] + '">' + GIORNI_BREVI[i + 1][0] + ' ' + t + '</span>').join('');
    const ov = ST.docOv[d.id] || {};
    h += '<div class="card col" style="border-top:4px solid hsl(' + hueOf(d.id) + ' 62% 48%)"><div class="row sp"><b style="font-size:15px">' + esc(d.nome) + '</b><span class="sub mono">' + (d.cal.includes('M') ? 'Mattina ' + oreSett(d.id, 'M') + 'h ' : '') + (d.sera && oreSett(d.id, 'S') ? 'Sera ' + oreSett(d.id, 'S') + 'h' : '') + '</span></div>'
      + '<div class="sub">Aule: ' + esc(d.aule.join(', ')) + ' · ' + (d.sera ? 'fa il serale' : 'non fa il serale') + '</div>'
      + (d.cal.includes('M') ? '<div>' + tm + '</div>' : '')
      + '<div>' + matDocente(d.id).map(m => '<span class="chip' + ((ov.matExtra || []).includes(m) ? ' x' : '') + '">' + esc(m) + '</span>').join('') + '</div>'
      + ((ov.indisp || []).length ? '<div class="box warn">Indisponibile: ' + esc(ov.indisp.join(', ')) + '</div>' : '')
      + '<div class="row"><button class="b sm" data-a="docSel" data-id="' + d.id + '">' + (U.docSel === d.id ? 'Nascondi orario' : 'Vedi orario') + '</button></div></div>';
  });
  h += '</div>';
  if (U.docSel) {
    const d = DOC[U.docSel]; const ov = ST.docOv[d.id] || {};
    h += '<div class="card col"><div class="row sp"><h2 style="margin:0">Orario di ' + esc(d.nome) + '</h2><div class="row"><button class="b sm" data-a="wk" data-n="-7">◀</button><b class="mono">' + weekLabel() + '</b><button class="b sm" data-a="wk" data-n="7">▶</button></div></div>';
    if (d.cal.includes('M')) h += '<h3>Mattina</h3>' + gridHTML('M', d.id);
    if (d.sera) h += '<h3>Sera</h3>' + gridHTML('S', d.id);
    const as = ST.assenze.filter(a => a.docenteId === d.id);
    if (as.length) h += '<h3>Assenze</h3>' + as.map(a => '<div>' + esc(fmtD(a.dal)) + (a.al !== a.dal ? ' → ' + esc(fmtD(a.al)) : '') + ' · ' + esc(a.tipo) + (a.nota ? ' · ' + esc(a.nota) : '') + '</div>').join('');
    if (U.canEdit) {
      h += '<h3>Materie e disponibilità</h3><div class="row"><label class="f">Aggiungi materia<input id="add-mat" placeholder="es. lab matematica"></label><button class="b" data-a="addMat" data-id="' + d.id + '">Aggiungi</button></div>';
      if ((ov.matExtra || []).length) h += '<div class="row">Aggiunte: ' + ov.matExtra.map(m => '<span class="chip x">' + esc(m) + ' <button class="b sm" data-a="delMat" data-id="' + d.id + '" data-m="' + esc(m) + '">×</button></span>').join('') + '</div>';
      h += '<div class="row"><span class="sub">Non disponibile il giorno:</span>' + [1, 2, 3, 4, 5].map(g => '<button class="b sm" data-a="toggleIndisp" data-id="' + d.id + '" data-g="' + g + '" aria-pressed="' + (ov.indisp || []).includes(String(g)) + '">' + ((ov.indisp || []).includes(String(g)) ? '✓ ' : '') + GIORNI_BREVI[g] + '</button>').join('') + '</div>';
    }
    h += '</div>';
  }
  return h + '</div>';
}

/* ---------- proposte ---------- */
function propCard(p, compact) {
  const att = p.stato === 'in attesa';
  const pill = '<span class="pill ' + (att ? 'warn' : p.stato === 'approvata' ? 'ok' : 'err') + '">' + (att ? 'In attesa di approvazione' : p.stato === 'approvata' ? 'Approvata' : 'Rifiutata') + '</span>';
  let h = '<div class="prop ' + p.stato.replace(' ', '-') + '"><div class="row sp"><b>' + esc(p.titolo) + '</b>' + pill + '</div>';
  if (p.tipo === 'assenza') {
    h += '<div class="sub">' + esc(p.riepilogo || '') + '</div>';
    (p.errori || []).forEach(e => { h += '<div class="box err">' + esc(e) + '</div>'; });
    if ((p.dettagli || []).length) {
      h += '<div class="tw"><table><thead><tr><th>Quando</th><th>Lezione</th><th>Sostituto</th><th>Note</th></tr></thead><tbody>';
      p.dettagli.forEach((d, i) => {
        let cell;
        if (att && U.canEdit && (d.alternative || []).length + (d.a ? 1 : 0) > 1) {
          cell = '<select data-ch="cambiaSost" data-p="' + esc(p.id) + '" data-i="' + i + '" aria-label="Sostituto">' + (d.a ? '' : '<option value="">— scoperta —</option>') + [d.a].concat((d.alternative || []).map(x => x.id)).filter(Boolean).map(id => '<option value="' + id + '"' + (id === d.a ? ' selected' : '') + '>' + esc(nomeD(id)) + '</option>').join('') + '</select>';
        } else cell = d.a ? esc(nomeD(d.a)) : '<span class="pill err">scoperta</span>';
        h += '<tr><td class="mono">' + esc(fmtD(d.data)) + ' ' + d.h + ':00</td><td>' + esc(d.materia) + '<div class="sub">' + esc(d.anni) + ' · aula ' + esc(d.aula || '—') + '</div></td><td>' + cell + (d.livNome ? '<div class="sub">competenza ' + esc(d.livNome) + (d.continuita ? ' · continuità' : '') + '</div>' : '') + '</td><td>' + ((d.avvisi || []).map(a => '<div class="sub" style="color:var(--warn)">⚠ ' + esc(a) + '</div>').join('') + (d.motivo ? '<div class="sub" style="color:var(--err)">' + esc(d.motivo) + '</div>' : '')) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    if ((p.nonServe || []).length) h += '<div class="sub">' + p.nonServe.length + ' sessioni di esercizi non richiedono copertura.</div>';
  } else if (p.tipo === 'modifica') {
    h += '<div class="sub">' + esc(p.descrizione || '') + '</div>';
    (p.avvisi || []).forEach(a => { h += '<div class="box warn">' + esc(a) + '</div>'; });
    if (!(p.avvisi || []).length) h += '<div class="box ok">Nessun nuovo conflitto.</div>';
  } else if (p.tipo === 'regola') {
    h += '<div>' + esc((p.azioni[0] || {}).testo) + '</div>';
  } else if (p.tipo === 'docente') {
    h += '<div class="sub">' + esc(p.descrizione || '') + '</div>';
  }
  if (att) {
    h += U.canEdit ? '<div class="row"><button class="b ok" data-a="approva" data-id="' + esc(p.id) + '">Approva</button><button class="b bad" data-a="rifiuta" data-id="' + esc(p.id) + '">Rifiuta</button></div>' : '<div class="sub">Può approvare solo chi ha il permesso di modifica.</div>';
  } else if (p.deciso) h += '<div class="sub">' + (p.stato === 'approvata' ? 'Approvata' : 'Rifiutata') + ' il ' + esc(new Date(p.deciso).toLocaleString('it-IT')) + '</div>';
  return h + '</div>';
}
function ordinaP(a, b) { return (b.creata || '').localeCompare(a.creata || ''); }
async function salvaProposta(base) {
  const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const p = { ...base, id, stato: 'in attesa', creata: nowIso(), da: U.uid };
  await put('proposte', id, p); return p;
}
async function approva(id) {
  const p = ST.proposte.find(x => x.id === id); if (!p || p.stato !== 'in attesa') return;
  if (!U.canEdit) { U.msg = { k: 'err', t: 'Non hai il permesso di approvare.' }; return render(); }
  try {
    const ts = nowIso(); let batch = id;
    for (let i = 0; i < p.azioni.length; i++) {
      const a = p.azioni[i];
      if (a.t === 'assenza') await put('assenze', id + '_a', { docenteId: a.docenteId, dal: a.dal, al: a.al, tipo: a.tipo, nota: a.nota || '', origine: 'proposta', propostaId: id, creata: ts });
      else if (a.t === 'sost') await put('sost', id + '_' + a.data, { assenzaId: id + '_a', propostaId: id, data: a.data, map: a.map, creata: ts });
      else if (a.t === 'mod') await put('mods', id + '_m' + i, { tipo: a.tipo || 'set', lessonId: a.lessonId, patch: a.patch || {}, motivo: a.motivo || '', batch, propostaId: id, creata: ts });
      else if (a.t === 'regola') await put('regole', id + '_r', { titolo: a.titolo || '', testo: a.testo, attiva: true, creata: ts, propostaId: id });
      else if (a.t === 'docente') {
        const o = JSON.parse(JSON.stringify(ST.docOv[a.docenteId] || {}));
        o.matExtra = uniq((o.matExtra || []).concat((a.addMat || []).map(x => x.toLowerCase())));
        if ((a.delMat || []).length) o.matExtra = o.matExtra.filter(x => !a.delMat.includes(x));
        o.matTolte = uniq((o.matTolte || []).concat((a.togliMat || []).map(x => x.toLowerCase())));
        o.indisp = uniq((o.indisp || []).concat(a.addIndisp || [])).filter(x => !(a.delIndisp || []).includes(x));
        delete o.id; await put('docenti', a.docenteId, o);
      }
    }
    await put('proposte', id, { ...p, stato: 'approvata', deciso: ts, decisoDa: U.uid });
    U.msg = { k: 'ok', t: 'Proposta approvata: il calendario è aggiornato.' };
  } catch (e) { U.msg = { k: 'err', t: 'Non sono riuscita a salvare: ' + ((e && e.message) || e) }; }
  render();
}
async function rifiuta(id) {
  const p = ST.proposte.find(x => x.id === id); if (!p) return;
  try { await put('proposte', id, { ...p, stato: 'rifiutata', deciso: nowIso(), decisoDa: U.uid }); U.msg = { k: 'info', t: 'Proposta rifiutata: il calendario non è cambiato.' }; } catch (e) { U.msg = { k: 'err', t: 'Errore: ' + ((e && e.message) || e) }; }
  render();
}
async function cambiaSost(pid, i, nuovo) {
  const p = ST.proposte.find(x => x.id === pid); if (!p || p.tipo !== 'assenza' || !p.params) return;
  const scelte = p.dettagli.map((d, k) => ({ data: d.data, ora: d.h, cal: d.cal, aula: d.aula, docenteId: k === +i ? nuovo : d.a })).filter(s => s.docenteId);
  const n = creaPropostaAssenza({ ...p.params, scelte });
  if (n.errore) { U.msg = { k: 'err', t: n.errore }; return render(); }
  if ((n.errori || []).length) { U.msg = { k: 'err', t: n.errori.join(' ') }; render(); return; }
  await put('proposte', pid, { ...p, azioni: n.azioni, dettagli: n.dettagli, scoperte: n.scoperte, nonServe: n.nonServe, errori: n.errori, riepilogo: n.riepilogo });
}
async function annullaAssenza(id) {
  try {
    for (const s of ST.sost.filter(x => x.assenzaId === id)) await del('sost', s.id);
    await del('assenze', id); U.msg = { k: 'info', t: 'Assenza annullata: le lezioni tornano ai docenti originali.' };
  } catch (e) { U.msg = { k: 'err', t: 'Errore: ' + ((e && e.message) || e) }; }
  render();
}
async function annullaMod(batch) {
  try { for (const m of ST.mods.filter(x => (x.batch || x.id) === batch)) await del('mods', m.id); U.msg = { k: 'info', t: 'Modifica annullata.' }; } catch (e) { U.msg = { k: 'err', t: 'Errore: ' + ((e && e.message) || e) }; }
  render();
}

/* ---------- assenze e modifiche ---------- */
function pAss() {
  const f = U.form; const att = ST.proposte.filter(p => p.stato === 'in attesa').sort(ordinaP);
  let h = '<div class="col">';
  h += '<div class="card col"><h2>Segnala un\'assenza</h2><div class="row">'
    + '<label class="f">Docente<select id="f-doc"><option value="">Scegli…</option>' + DOCENTI.map(d => '<option value="' + d.id + '"' + (f.docenteId === d.id ? ' selected' : '') + '>' + esc(d.nome) + '</option>').join('') + '</select></label>'
    + '<label class="f">Dal<input type="date" id="f-dal" value="' + esc(f.dal) + '"></label><label class="f">Al<input type="date" id="f-al" value="' + esc(f.al) + '"></label>'
    + '<label class="f">Motivo<select id="f-tipo">' + ['malattia', 'ferie', 'permesso', 'recupero', 'altro'].map(t => '<option' + (f.tipo === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>'
    + '<label class="f" style="flex:1;min-width:160px">Nota<input id="f-nota" value="' + esc(f.nota) + '"></label>'
    + '<button class="b pri" data-a="preparaAss"' + (U.canWrite ? '' : ' disabled') + '>Prepara proposta</button></div>'
    + '<p class="sub">Il software trova i sostituti secondo le regole e li mostra qui: il calendario cambia solo dopo l\'approvazione.</p></div>';
  if (att.length) h += '<h2>Da approvare</h2><div class="grid2">' + att.map(p => propCard(p)).join('') + '</div>';
  const oggi = oggiIso();
  const ass = ST.assenze.slice().sort((a, b) => a.dal.localeCompare(b.dal));
  h += '<div class="card col"><h2>Assenze registrate</h2>' + (ass.length ? ass.map(a => {
    const ds = intervallo(a.dal, a.al); const cop = ST.sost.filter(s => s.assenzaId === a.id).reduce((n, s) => n + Object.keys(s.map || {}).length, 0);
    const sc = ds.reduce((n, d) => n + sessioni(d, l => l.docOrig === a.docenteId && l.scoperta).length, 0);
    return '<div class="issue"><span class="dot ' + (sc ? 'err' : 'ok') + '"></span><div style="flex:1;min-width:0"><b>' + esc(nomeD(a.docenteId)) + '</b> · ' + esc(fmtD(a.dal)) + (a.al !== a.dal ? ' → ' + esc(fmtD(a.al)) : '') + ' · ' + esc(a.tipo) + (a.nota ? ' · ' + esc(a.nota) : '')
      + '<div class="sub">' + (cop ? cop + ' lezioni coperte' : 'nessuna sostituzione registrata') + (sc ? ' · <b style="color:var(--err)">' + sc + ' sessioni scoperte</b>' : '') + (a.dal < oggi && a.al < oggi ? ' · passata' : '') + '</div></div>'
      + (U.canEdit ? '<button class="b sm bad" data-a="annullaAss" data-id="' + esc(a.id) + '">Annulla</button>' : '') + (sc && U.canWrite ? '<button class="b sm" data-a="copri" data-id="' + esc(a.id) + '">Trova copertura</button>' : '') + '</div>';
  }).join('') : '<div class="empty">Nessuna assenza registrata.</div>') + '</div>';
  const batches = {}; ST.mods.forEach(m => { const b = m.batch || m.id; (batches[b] = batches[b] || []).push(m); });
  const bl = Object.values(batches).sort((a, b) => (b[0].creata || '').localeCompare(a[0].creata || ''));
  h += '<div class="card col"><h2>Modifiche permanenti al calendario</h2>' + (bl.length ? bl.map(b => {
    const m = b[0]; const l = BASE.find(x => x.id === m.lessonId);
    return '<div class="issue"><span class="dot ok"></span><div style="flex:1;min-width:0"><b>' + esc(l ? l.materia : m.lessonId) + '</b> · ' + esc(Object.entries(m.patch || {}).map(([k, v]) => k + ' → ' + (k === 'doc' ? nomeD(v) : v)).join(', ')) + '<div class="sub">' + esc(m.motivo || '') + ' · ' + esc(new Date(m.creata || 0).toLocaleDateString('it-IT')) + '</div></div>' + (U.canEdit ? '<button class="b sm bad" data-a="annullaMod" data-id="' + esc(m.batch || m.id) + '">Annulla</button>' : '') + '</div>';
  }).join('') : '<div class="empty">Nessuna modifica permanente.</div>') + '</div>';
  const st = ST.proposte.filter(p => p.stato !== 'in attesa').sort(ordinaP).slice(0, 12);
  if (st.length) h += '<details class="card"><summary>Storico proposte (' + st.length + ')</summary><div class="grid2" style="margin-top:10px">' + st.map(p => propCard(p)).join('') + '</div></details>';
  return h + '</div>';
}

/* ---------- controlli ---------- */
function pCtl() {
  const all = controlli(); const vis = all.filter(i => U.showInfo || i.sev !== 'info');
  const n = s => all.filter(i => i.sev === s).length;
  let h = '<div class="col"><div class="row"><span class="pill err">' + n('err') + ' conflitti</span><span class="pill warn">' + n('warn') + ' da verificare</span><span class="pill">' + n('info') + ' note sulle competenze</span><label class="row sub"><input type="checkbox" id="showinfo" data-ch="showInfo"' + (U.showInfo ? ' checked' : '') + '> Mostra anche le note sulle competenze</label></div>';
  const gr = [['err', 'Conflitti'], ['warn', 'Da verificare'], ['info', 'Note']];
  gr.forEach(([s, t]) => {
    const l = vis.filter(i => i.sev === s); if (!l.length) return;
    h += '<div class="card"><h2>' + t + '</h2>' + l.map(i => '<div class="issue"><span class="dot ' + s + '"></span><div style="flex:1;min-width:0">' + esc(i.msg) + '</div><button class="b sm" data-a="vai" data-id="' + esc(i.ids[0]) + '">Apri</button></div>').join('') + '</div>';
  });
  if (!vis.length) h += '<div class="card empty">Nessun problema rilevato.</div>';
  return h + '<p class="sub">Controlli sul calendario base. I conflitti reali (due docenti nella stessa aula, un docente in due posti) vanno risolti con una modifica; le voci "da verificare" aspettano una conferma.</p></div>';
}

/* ---------- regole ---------- */
function pReg() {
  const rs = regoleTutte(ST.regole); const aree = uniq(rs.map(r => r.area));
  let h = '<div class="col"><div class="row sp"><p class="sub" style="margin:0;flex:1;min-width:220px">Queste regole sono quelle che il software rispetta per ogni proposta. Quando ne arrivano di nuove si aggiungono qui.</p><button class="b" data-a="copiaManuale">Copia il manuale (testo)</button></div><div id="man"></div>';
  aree.forEach(a => {
    h += '<div class="card"><h2>' + esc(a) + '</h2>' + rs.filter(r => r.area === a).map(r => '<div class="rule"><span class="id">' + r.id + '</span><b>' + esc(r.titolo) + '</b>' + (r.stato === 'ipotesi' ? ' <span class="pill warn">da confermare</span>' : '') + '<div>' + esc(r.testo) + '</div>' + (r.custom && U.canEdit ? '<button class="b sm bad" data-a="disattivaReg" data-id="' + esc(r.docId) + '" style="margin-top:6px">Rimuovi regola</button>' : '') + '</div>').join('') + '</div>';
  });
  return h + '</div>';
}

/* ---------- azioni ---------- */
const ACT = {
  tab: d => { U.tab = d.k; U.msg = null; render(); window.scrollTo({ top: 0 }); },
  cal: d => { U.cal = d.k; U.filtro = ''; U.sel = null; render(); },
  wk: d => { U.week = addDays(U.week, +d.n); render(); },
  oggi: () => { U.week = lunediDi(oggiIso() < INIZIO ? INIZIO : oggiIso()); render(); },
  sel: d => { U.sel = (U.sel && U.sel.key === d.k && U.sel.data === d.d) ? null : { data: d.d, key: d.k }; U.edit = null; render(); },
  chiudi: () => { U.sel = null; render(); },
  segnala: d => { U.form = { ...U.form, docenteId: d.id, dal: d.d, al: d.d }; U.tab = 'ass'; render(); },
  copri: d => { const a = ST.assenze.find(x => x.id === d.id); if (!a) return; U.form = { docenteId: a.docenteId, dal: a.dal, al: a.al, tipo: a.tipo, nota: a.nota || '' }; render(); },
  valuta: d => {
    const e = { lid: d.id, doc: $('#ed-doc').value, g: +$('#ed-g').value, h: +$('#ed-h').value, aula: $('#ed-aula').value.trim() };
    const base = lezioni().find(x => x.id === d.id); const patch = {}; if ((base.doc || '') !== e.doc) patch.doc = e.doc || null; if (base.g !== e.g) patch.g = e.g; if (base.h !== e.h) patch.h = e.h; if ((base.aula || '') !== e.aula) patch.aula = e.aula;
    e.patch = patch; e.res = Object.keys(patch).length ? valutaModifica(d.id, patch) : { errore: 'Nessuna differenza rispetto a oggi.' }; U.edit = e; render();
  },
  applicaMod: async () => {
    const e = U.edit; if (!e || !e.res || e.res.errore || e.res.bloccanti.length) return;
    try {
      const batch = 'b' + Date.now().toString(36); const ts = nowIso();
      for (const id of e.res.lezioni) await put('mods', batch + '_' + id, { tipo: 'set', lessonId: id, patch: e.patch, motivo: 'Modifica dal calendario', batch, creata: ts, da: U.uid });
      U.msg = { k: 'ok', t: 'Modifica applicata a ' + e.res.lezioni.length + ' lezione/i.' }; U.edit = null; U.sel = null;
    } catch (er) { U.msg = { k: 'err', t: 'Errore nel salvataggio: ' + ((er && er.message) || er) }; }
    render();
  },
  docSel: d => { U.docSel = U.docSel === d.id ? '' : d.id; render(); },
  addMat: async d => {
    const v = ($('#add-mat').value || '').trim().toLowerCase(); if (!v) return;
    const o = JSON.parse(JSON.stringify(ST.docOv[d.id] || {})); delete o.id; o.matExtra = uniq((o.matExtra || []).concat(v)); await put('docenti', d.id, o); $('#add-mat').value = '';
  },
  delMat: async d => { const o = JSON.parse(JSON.stringify(ST.docOv[d.id] || {})); delete o.id; o.matExtra = (o.matExtra || []).filter(x => x !== d.m); await put('docenti', d.id, o); },
  toggleIndisp: async d => { const o = JSON.parse(JSON.stringify(ST.docOv[d.id] || {})); delete o.id; const l = o.indisp || []; o.indisp = l.includes(d.g) ? l.filter(x => x !== d.g) : l.concat(d.g); await put('docenti', d.id, o); },
  preparaAss: async () => {
    const f = U.form = { docenteId: $('#f-doc').value, dal: $('#f-dal').value, al: $('#f-al').value || $('#f-dal').value, tipo: $('#f-tipo').value, nota: $('#f-nota').value };
    if (!f.docenteId || !validaData(f.dal) || !validaData(f.al)) { U.msg = { k: 'err', t: 'Scegli il docente e le date.' }; return render(); }
    const n = creaPropostaAssenza(f); if (n.errore) { U.msg = { k: 'err', t: n.errore }; return render(); }
    try { await salvaProposta({ ...n, params: { docenteId: f.docenteId, dal: f.dal, al: f.al, tipo: f.tipo, nota: f.nota }, fonte: 'form' }); U.msg = { k: 'info', t: 'Proposta pronta: controlla e approva qui sotto.' }; U.form = { docenteId: '', dal: '', al: '', tipo: 'malattia', nota: '' }; } catch (e) { U.msg = { k: 'err', t: 'Errore: ' + ((e && e.message) || e) }; }
    render();
  },
  approva: d => approva(d.id), rifiuta: d => rifiuta(d.id),
  annullaAss: d => annullaAssenza(d.id), annullaMod: d => annullaMod(d.id),
  vai: d => {
    const l = lezioni().find(x => x.id === d.id); if (!l) return;
    U.cal = l.cal; U.week = lunediDi(INIZIO > oggiIso() ? INIZIO : oggiIso()); const date = addDays(U.week, l.g - 1);
    const s = sessioni(date, x => x.id === l.id)[0]; U.sel = s ? { data: date, key: s.key } : null; U.tab = 'cal'; U.filtro = ''; render(); window.scrollTo({ top: 0 });
  },
  copiaManuale: async () => {
    const md = manualeMarkdown(ST.regole); const box = $('#man');
    try { await navigator.clipboard.writeText(md); box.innerHTML = '<div class="box ok" style="margin-bottom:10px">Manuale copiato negli appunti.</div>'; }
    catch (e) { box.innerHTML = '<textarea readonly style="width:100%;height:240px;margin-bottom:10px">' + esc(md) + '</textarea>'; const t = box.querySelector('textarea'); t.focus(); t.select(); }
  },
  disattivaReg: async d => { const r = ST.regole.find(x => x.id === d.id); if (r) await put('regole', d.id, { ...r, attiva: false }); },
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]'); if (!t || t.disabled) return;
  const f = ACT[t.dataset.a]; if (f) { try { const r = localAction(() => f(t.dataset, t)); if (r && r.catch) r.catch(er => { U.msg = { k: 'err', t: 'Errore: ' + ((er && er.message) || er) }; render(); }); } catch (er) { U.msg = { k: 'err', t: 'Errore: ' + er.message }; render(); } }
});
document.addEventListener('change', e => {
  const t = e.target.closest('[data-ch]'); if (!t) return; const k = t.dataset.ch;
  if (k === 'filtro') { U.filtro = t.value; render(); }
  else if (k === 'showInfo') { U.showInfo = t.checked; render(); }
  else if (k === 'cambiaSost') localAction(() => cambiaSost(t.dataset.p, t.dataset.i, t.value)).catch(er => { U.msg = { k: 'err', t: 'Errore: ' + ((er && er.message) || er) }; render(); });
});

