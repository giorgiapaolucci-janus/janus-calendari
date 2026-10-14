/* ===== APP: interfaccia, db condiviso, chat ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oggiIso = () => { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
const U = { tab: 'cal', cal: 'M', week: lunediDi(oggiIso() < INIZIO ? INIZIO : oggiIso()), filtro: '', sel: null, canEdit: false, canWrite: true, db: null, user: null, sample: null, uid: 'anon', docSel: '', edit: null, form: { docenteId: '', dal: '', al: '', tipo: 'malattia', nota: '' }, showInfo: false, msg: null, loaded: {} };
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
const TABS = [['cal', 'Calendario'], ['doc', 'Docenti'], ['ass', 'Assenze e modifiche'], ['ctl', 'Controlli'], ['reg', 'Regole'], ['chat', 'Chat'], ['sync', 'Salvataggio e collegamenti']];
function render() {
  const attesa = ST.proposte.filter(p => p.stato === 'in attesa').length;
  $('#tabs').innerHTML = TABS.map(([k, n]) => '<button role="tab" data-a="tab" data-k="' + k + '" aria-selected="' + (U.tab === k) + '">' + n + ((k === 'ass' || k === 'chat') && attesa ? '<span class="badge">' + attesa + '</span>' : '') + '</button>').join('');
  $('#status').innerHTML = '<span class="pill ' + (U.canEdit ? 'ok' : '') + '">' + (U.canEdit ? 'Può modificare e approvare' : 'Sola consultazione') + '</span>'
    + '<span class="pill ' + (localReady ? 'ok' : 'warn') + '">' + (localReady ? (localBusy ? 'Salvataggio in corso…' : 'Salvato su questo Mac') : 'Caricamento archivio…') + '</span>';
  if (U.tab === 'chat') { renderChat(); return; }
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
  h += '<div class="sub">' + esc(fmtDL(s.data)) + ' · ore ' + s.h + ':00 · ' + (s.aula ? 'aula ' + esc(s.aula) : 'esercizi · aula docenti o da casa') + ' · docente: <b>' + esc(s.doc ? nomeD(s.doc) : 'da assegnare') + '</b>' + (s.sost ? ' (sostituisce ' + esc(nomeD(s.docOrig)) + ')' : '') + '</div>';
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
    + '<p class="sub">Il software trova i sostituti secondo le regole e li mostra qui: il calendario cambia solo dopo l\'approvazione. Puoi farlo anche scrivendo in chat.</p></div>';
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
  let h = '<div class="col"><div class="row sp"><p class="sub" style="margin:0;flex:1;min-width:220px">Queste regole sono quelle che il software e la chat rispettano per ogni proposta. Quando ne arrivano di nuove si aggiungono qui (anche dalla chat).</p><button class="b" data-a="copiaManuale">Copia il manuale (testo)</button></div><div id="man"></div>';
  aree.forEach(a => {
    h += '<div class="card"><h2>' + esc(a) + '</h2>' + rs.filter(r => r.area === a).map(r => '<div class="rule"><span class="id">' + r.id + '</span><b>' + esc(r.titolo) + '</b>' + (r.stato === 'ipotesi' ? ' <span class="pill warn">da confermare</span>' : '') + '<div>' + esc(r.testo) + '</div>' + (r.custom && U.canEdit ? '<button class="b sm bad" data-a="disattivaReg" data-id="' + esc(r.docId) + '" style="margin-top:6px">Rimuovi regola</button>' : '') + '</div>').join('') + '</div>';
  });
  return h + '</div>';
}

/* ---------- chat ---------- */
const CHAT = { msgs: [], busy: false, ctl: null };
const SUGG = ['Giulia Dipalo è in malattia dal 12 al 16 ottobre, chi può sostituirla?', 'Chi è assente questa settimana e cosa resta scoperto?', 'Sposta la lezione S019 al mercoledì alle 18', 'Nuova regola: nessuna lezione di sostituzione per Luca il lunedì'];
function renderChat() {
  const main = $('#main');
  if (!document.getElementById('chatbox')) {
    main.innerHTML = '<div class="card col"><div class="chatbox" id="chatbox"></div><div class="sugg" id="sugg"></div><div class="composer"><textarea id="chat-in" rows="2" placeholder="Scrivi una richiesta, per esempio: Giulia Dipalo è in malattia per una settimana"></textarea><button class="b pri" id="chat-send" data-a="invia">Invia</button></div><div class="row sp"><span class="sub">Claude propone, tu approvi dalle schede che compaiono qui sotto.</span><button class="b sm" data-a="chatReset">Nuova conversazione</button></div></div>';
  }
  const box = document.getElementById('chatbox'); const near = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  let h = '';
  if (!CHAT.msgs.length) h = '<div class="msg a">Ciao! Dimmi cosa è successo (un\'assenza, una lezione da spostare, una nuova regola) e ti preparo una proposta rispettando il manuale delle regole. Non cambio nulla finché non premi Approva.' + (U.sample ? '' : '\n\nLa chat AI di Claude non è collegata nella versione locale. Puoi chiedere assistenza nella conversazione Codex oppure usare "Assenze e modifiche".') + '</div>';
  CHAT.msgs.forEach(m => {
    if (m.r === 'p') { const p = ST.proposte.find(x => x.id === m.c); h += p ? propCard(p) : ''; }
    else if (m.r === 't') h += '<div class="msg t">' + esc(m.c) + '</div>';
    else h += '<div class="msg ' + m.r + '">' + esc(m.c || (m.r === 'a' ? '…' : '')) + '</div>';
  });
  box.innerHTML = h; if (near || CHAT.busy) box.scrollTop = box.scrollHeight;
  document.getElementById('sugg').innerHTML = CHAT.msgs.length ? '' : SUGG.map(s => '<button data-a="sugg" data-t="' + esc(s) + '">' + esc(s) + '</button>').join('');
  const b = document.getElementById('chat-send'); b.disabled = !U.sample || !U.canWrite; b.textContent = CHAT.busy ? 'Interrompi' : 'Invia'; b.dataset.a = CHAT.busy ? 'stop' : 'invia';
}
function istruzioni() {
  const rs = regoleTutte(ST.regole).map(r => r.id + ' (' + r.stato + ') ' + r.titolo + ': ' + r.testo).join('\n');
  const dc = DOCENTI.map(d => d.id + ' = ' + d.nome + ' | materie: ' + matDocente(d.id).join(', ') + ' | aule ' + d.aule.join('/') + ' | ' + (d.cal.includes('M') ? 'mattina' : '') + (d.sera ? ' sera' : '') + ' | turni mattina L-V: ' + (TURNI.m[d.id] || '-----')).join('\n');
  return 'Sei l\'assistente di pianificazione di Istituto Janus, dentro il software dei calendari (mattina, sera, docenti). Rispondi sempre in italiano, in modo diretto, umano e breve: niente linguaggio burocratico.\n'
    + 'Oggi è ' + fmtDL(oggiIso()) + ' (' + oggiIso() + '). Il calendario parte il ' + INIZIO + '. Le date negli strumenti sono sempre AAAA-MM-GG; se manca l\'anno è il 2026; se mancano le date di un\'assenza chiedile.\n\n'
    + 'REGOLE DA RISPETTARE SEMPRE (manuale):\n' + rs + '\n\nDOCENTI (id = nome):\n' + dc + '\n\n'
    + 'COME LAVORI:\n1. Non modifichi mai il calendario da solo: usi gli strumenti "proponi_*", che creano una proposta con i pulsanti Approva/Rifiuta. Non dire mai che una modifica è stata applicata: dì che è pronta da approvare.\n'
    + '2. Assenza di un docente: chiama proponi_assenza (opzionalmente prima candidati_sostituzione per capire le alternative). Poi riassumi: chi copre cosa e perché (competenza, continuità), gli avvisi (es. smart working, carico alto), le ore che restano scoperte e le alternative. Le sessioni di esercizi (aula docenti o da casa) non vanno coperte.\n'
    + '3. Spostamenti o cambi docente permanenti: usa cerca_lezioni per trovare il codice, valuta_modifica per i conflitti, poi proponi_modifica. Se ci sono conflitti bloccanti non proporre: spiega e offri un\'alternativa.\n'
    + '4. Nuove regole o disponibilità/materie di un docente dette dall\'utente: proponi_regola oppure proponi_docente (materie aggiunte o giorni non disponibili). Poi ricorda che dopo l\'approvazione valgono per tutte le decisioni future.\n'
    + '5. Se una richiesta contrasta con una regola, dillo e proponi un\'alternativa. Non inventare dati: usa solo ciò che restituiscono gli strumenti.\n'
    + '6. Dopo aver creato una proposta, scrivi una sintesi di poche righe: la scheda con il dettaglio è già visibile nella chat.';
}
function toolsChat() {
  const nz = f => ({ errore: 'Non hai il permesso di scrivere sui dati condivisi.' });
  const push = (m) => { CHAT.msgs.push(m); scheduleRender(); };
  const note = t => push({ r: 't', c: t });
  const compatta = p => ({ propostaId: p.id, titolo: p.titolo, riepilogo: p.riepilogo, sessioni: (p.dettagli || []).slice(0, 40).map(d => ({ data: d.data, ora: d.h, aula: d.aula, materia: d.materia, sostituto: d.a ? nomeD(d.a) : null, competenza: d.livNome, avvisi: d.avvisi, motivoScoperta: d.motivo, alternative: (d.alternative || []).map(x => nomeD(x.id)) })), esercitazioniDaCasaNonCoperte: (p.nonServe || []).length, errori: p.errori });
  const lez = l => ({ codice: l.id, giorno: GIORNI[l.g], ora: l.h, materia: l.materia, anni: l.anno, indirizzi: l.ind, docente: l.doc ? nomeD(l.doc) : null, docenteId: l.doc, aula: l.aula, daCasa: l.casa });
  return [
    { name: 'elenco_docenti', description: 'Elenco dei docenti con id, materie, aule, turni e se fanno il serale.', inputSchema: { type: 'object', properties: {} }, execute: () => DOCENTI.map(d => ({ id: d.id, nome: d.nome, materie: matDocente(d.id), aule: d.aule, mattina: d.cal.includes('M'), sera: d.sera, turniMattinaLV: TURNI.m[d.id] || '-----', indisponibile: (ST.docOv[d.id] || {}).indisp || [] })) },
    { name: 'lezioni_docente', description: 'Lezioni (con sostituzioni e assenze applicate) di un docente tra due date.', inputSchema: { type: 'object', properties: { docenteId: { type: 'string' }, dal: { type: 'string' }, al: { type: 'string' } }, required: ['docenteId', 'dal', 'al'] }, execute: i => {
      if (!DOC[i.docenteId] || !validaData(i.dal) || !validaData(i.al)) return { errore: 'Parametri non validi' };
      const out = []; intervallo(i.dal, i.al).slice(0, 15).forEach(d => sessioni(d, l => l.docEff === i.docenteId || l.docOrig === i.docenteId).forEach(s => out.push({ data: d, ora: s.h, materia: uniq(s.lezioni.map(l => l.materia)).join(' / '), aula: s.aula, docenteEffettivo: s.doc ? nomeD(s.doc) : null, scoperta: !!s.scoperta, daCasa: s.casa }))); return out.slice(0, 120);
    } },
    { name: 'cerca_lezioni', description: 'Cerca lezioni nel calendario base per trovarne il codice. Tutti i filtri sono facoltativi.', inputSchema: { type: 'object', properties: { docenteId: { type: 'string' }, giorno: { type: 'integer', description: '1=lunedì … 5=venerdì' }, ora: { type: 'integer' }, materia: { type: 'string' }, calendario: { type: 'string', description: 'M mattina, S sera' }, codice: { type: 'string' } } }, execute: i => {
      let r = lezioni(); if (i.codice) r = r.filter(l => l.id.toLowerCase() === String(i.codice).toLowerCase()); if (i.docenteId) r = r.filter(l => l.doc === i.docenteId); if (i.giorno) r = r.filter(l => l.g === +i.giorno); if (i.ora) r = r.filter(l => l.h === +i.ora); if (i.calendario) r = r.filter(l => l.cal === i.calendario); if (i.materia) r = r.filter(l => l.materia.toLowerCase().includes(String(i.materia).toLowerCase()));
      return { totale: r.length, lezioni: r.slice(0, 40).map(lez) };
    } },
    { name: 'candidati_sostituzione', description: 'Per ogni sessione di un docente nell\'intervallo, elenca i migliori candidati e i motivi di esclusione. Solo lettura.', inputSchema: { type: 'object', properties: { docenteId: { type: 'string' }, dal: { type: 'string' }, al: { type: 'string' } }, required: ['docenteId', 'dal', 'al'] }, execute: i => {
      if (!DOC[i.docenteId] || !validaData(i.dal) || !validaData(i.al)) return { errore: 'Parametri non validi' };
      const idT = '__c__'; ST.assenze.push({ id: idT, docenteId: i.docenteId, dal: i.dal, al: i.al, tipo: 'prova' }); bump(); const out = [];
      try { intervallo(i.dal, i.al).slice(0, 10).forEach(d => sessioni(d, l => l.docEff === i.docenteId && !l.casa).forEach(s => { const c = candidati(s); out.push({ data: d, ora: s.h, materia: uniq(s.lezioni.map(l => l.materia)).join(' / '), aula: s.aula, candidati: c.elenco.slice(0, 4).map(x => ({ nome: x.nome, competenza: x.livNome, avvisi: x.avvisi })), esclusiConCompetenza: c.esclusi.slice(0, 3).map(x => nomeD(x.id) + ': ' + x.motivi.join(', ')) }); })); } finally { ST.assenze = ST.assenze.filter(a => a.id !== idT); bump(); }
      return out.slice(0, 40);
    } },
    { name: 'proponi_assenza', description: 'Registra una PROPOSTA di assenza con le sostituzioni migliori. Il calendario cambia solo dopo Approva. "scelte" (facoltativo) forza un sostituto per una sessione.', inputSchema: { type: 'object', properties: { docenteId: { type: 'string' }, dal: { type: 'string' }, al: { type: 'string' }, tipo: { type: 'string', description: 'malattia, ferie, permesso, recupero, altro' }, nota: { type: 'string' }, scelte: { type: 'array', items: { type: 'object', properties: { data: { type: 'string' }, ora: { type: 'integer' }, aula: { type: 'string' }, docenteId: { type: 'string' } } } } }, required: ['docenteId', 'dal', 'al'] }, execute: async i => {
      if (!U.canWrite) return nz(); if (!validaData(i.dal) || !validaData(i.al)) return { errore: 'Date non valide (AAAA-MM-GG)' };
      note('Cerco i sostituti per ' + nomeD(i.docenteId) + '…');
      const params = { docenteId: i.docenteId, dal: i.dal, al: i.al, tipo: i.tipo || 'malattia', nota: i.nota || '' };
      const n = creaPropostaAssenza({ ...params, scelte: i.scelte || [] }); if (n.errore) return n;
      const p = await salvaProposta({ ...n, params, fonte: 'chat' }); push({ r: 'p', c: p.id }); return compatta(p);
    } },
    { name: 'valuta_modifica', description: 'Valuta i conflitti di una modifica permanente a una lezione (e alla sua sessione). Solo lettura.', inputSchema: { type: 'object', properties: { codice: { type: 'string' }, giorno: { type: 'integer' }, ora: { type: 'integer' }, aula: { type: 'string' }, docenteId: { type: 'string', description: 'id docente, stringa vuota per nessuno' } }, required: ['codice'] }, execute: i => {
      const patch = {}; if (i.giorno) patch.g = +i.giorno; if (i.ora) patch.h = +i.ora; if (i.aula != null) patch.aula = String(i.aula); if (i.docenteId != null) patch.doc = i.docenteId || null;
      const r = valutaModifica(i.codice, patch); if (r.errore) return r; return { lezioniCoinvolte: r.lezioni, bloccanti: r.bloccanti.map(x => x.msg), avvisi: r.avvisi.map(x => x.msg), problemiRisolti: r.risolte };
    } },
    { name: 'proponi_modifica', description: 'Registra una PROPOSTA di modifica permanente (sposta giorno/ora/aula o cambia docente) per una lezione e la sua sessione. Rifiuta se ci sono conflitti bloccanti.', inputSchema: { type: 'object', properties: { codice: { type: 'string' }, giorno: { type: 'integer' }, ora: { type: 'integer' }, aula: { type: 'string' }, docenteId: { type: 'string' }, motivo: { type: 'string' } }, required: ['codice', 'motivo'] }, execute: async i => {
      if (!U.canWrite) return nz(); const patch = {}; if (i.giorno) patch.g = +i.giorno; if (i.ora) patch.h = +i.ora; if (i.aula != null) patch.aula = String(i.aula); if (i.docenteId != null) patch.doc = i.docenteId || null;
      if (!Object.keys(patch).length) return { errore: 'Nessuna modifica indicata' };
      const r = valutaModifica(i.codice, patch); if (r.errore) return r; if (r.bloccanti.length) return { creata: false, bloccanti: r.bloccanti.map(x => x.msg) };
      const l0 = lezioni().find(x => x.id === i.codice);
      const p = await salvaProposta({ tipo: 'modifica', titolo: 'Modifica: ' + l0.materia + ' (' + GIORNI[l0.g] + ' ' + l0.h + ':00)', descrizione: descLezione(l0) + ' → ' + Object.entries(patch).map(([k, v]) => ({ g: 'giorno', h: 'ora', aula: 'aula', doc: 'docente' }[k]) + ' ' + (k === 'doc' ? nomeD(v) : k === 'g' ? GIORNI[v] : v)).join(', ') + '. ' + (i.motivo || ''), avvisi: r.avvisi.map(x => x.msg), azioni: r.lezioni.map(id => ({ t: 'mod', tipo: 'set', lessonId: id, patch, motivo: i.motivo || '' })), fonte: 'chat' });
      push({ r: 'p', c: p.id }); return { creata: true, propostaId: p.id, avvisi: r.avvisi.map(x => x.msg) };
    } },
    { name: 'proponi_regola', description: 'Registra una PROPOSTA di nuova regola testuale per il manuale (vale per le decisioni future dopo l\'approvazione).', inputSchema: { type: 'object', properties: { titolo: { type: 'string' }, testo: { type: 'string' } }, required: ['titolo', 'testo'] }, execute: async i => {
      if (!U.canWrite) return nz(); const p = await salvaProposta({ tipo: 'regola', titolo: 'Nuova regola: ' + i.titolo, azioni: [{ t: 'regola', titolo: i.titolo, testo: i.testo }], fonte: 'chat' }); push({ r: 'p', c: p.id }); return { propostaId: p.id };
    } },
    { name: 'proponi_docente', description: 'Registra una PROPOSTA di modifica a un docente: materie aggiunte, materie tolte, giorni non disponibili (1-5, o "giorno:ora").', inputSchema: { type: 'object', properties: { docenteId: { type: 'string' }, aggiungiMaterie: { type: 'array', items: { type: 'string' } }, togliMaterie: { type: 'array', items: { type: 'string' } }, nonDisponibile: { type: 'array', items: { type: 'string' } }, disponibileDi_nuovo: { type: 'array', items: { type: 'string' } } }, required: ['docenteId'] }, execute: async i => {
      if (!U.canWrite) return nz(); if (!DOC[i.docenteId]) return { errore: 'Docente non trovato' };
      const a = { t: 'docente', docenteId: i.docenteId, addMat: i.aggiungiMaterie || [], togliMat: i.togliMaterie || [], addIndisp: (i.nonDisponibile || []).map(String), delIndisp: (i.disponibileDi_nuovo || []).map(String) };
      const desc = [a.addMat.length ? 'aggiunge materie: ' + a.addMat.join(', ') : '', a.togliMat.length ? 'toglie materie: ' + a.togliMat.join(', ') : '', a.addIndisp.length ? 'non disponibile: ' + a.addIndisp.join(', ') : '', a.delIndisp.length ? 'di nuovo disponibile: ' + a.delIndisp.join(', ') : ''].filter(Boolean).join(' · ');
      const p = await salvaProposta({ tipo: 'docente', titolo: 'Docente: ' + nomeD(i.docenteId), descrizione: desc, azioni: [a], fonte: 'chat' }); push({ r: 'p', c: p.id }); return { propostaId: p.id };
    } },
    { name: 'controlli', description: 'Riepilogo dei conflitti e delle voci da verificare nel calendario.', inputSchema: { type: 'object', properties: {} }, execute: () => { const c = controlli().filter(x => x.sev !== 'info'); return { totale: c.length, voci: c.slice(0, 30).map(x => x.sev + ': ' + x.msg) }; } }
  ];
}
async function inviaChat(testo) {
  if (!U.sample || CHAT.busy || !testo.trim()) return;
  CHAT.msgs.push({ r: 'u', c: testo.trim() }); const a = { r: 'a', c: '' }; CHAT.msgs.push(a); CHAT.busy = true; CHAT.ctl = new AbortController(); renderChat();
  const turns = []; CHAT.msgs.forEach(m => { if ((m.r === 'u' || m.r === 'a') && m.c && m !== a) { const role = m.r === 'u' ? 'user' : 'assistant'; if (turns.length && turns[turns.length - 1].role === role) turns[turns.length - 1].content += '\n' + m.c; else turns.push({ role, content: m.c }); } });
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (turns.length) turns[0] = { role: 'user', content: istruzioni() + '\n\n---\nRichiesta dell\'utente:\n' + turns[0].content };
  try {
    const r = await U.sample(turns, { tools: toolsChat(), cache: false, signal: CHAT.ctl.signal, onText: u => { a.c = u.text; renderChat(); } });
    a.c = r.text || a.c || 'Fatto: guarda le schede qui sotto.';
  } catch (e) {
    const c = e && e.code; a.c = c === 'cancelled' ? (a.c || 'Interrotto.') : c === 'not_granted' ? 'Per usare la chat serve il consenso a far rispondere Claude da questa pagina.' : c === 'rate_limited' ? 'Troppe richieste in poco tempo: riprova tra un minuto.' : 'Non sono riuscita a rispondere (' + ((e && e.message) || c || 'errore') + '). Riprova, oppure usa "Assenze e modifiche".';
  }
  CHAT.busy = false; CHAT.ctl = null; renderChat();
  const inp = document.getElementById('chat-in'); if (inp) inp.focus();
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
  invia: () => { const t = document.getElementById('chat-in'); const v = t.value; t.value = ''; inviaChat(v); },
  stop: () => { if (CHAT.ctl) CHAT.ctl.abort(); },
  sugg: d => { const t = document.getElementById('chat-in'); t.value = d.t; t.focus(); },
  chatReset: () => { if (CHAT.busy) return; CHAT.msgs = []; renderChat(); }
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
document.addEventListener('keydown', e => { if (e.target.id === 'chat-in' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!CHAT.busy) ACT.invia(); } });

