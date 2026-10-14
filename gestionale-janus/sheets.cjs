// Stessa struttura del generatore Excel originale; valori destinati al foglio esistente.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const SHEET_ID='17BkPIZw_eKagNqW_WEXkWfdA3ABFiWfnJ0NBBvUV4rw';
function sheets(dir, state, app) {
  const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n+'.json'),'utf8'));
  const d=read('docenti'), m=read('mattina'), s=read('sera'), ctx={};
  vm.runInNewContext(fs.readFileSync(path.join(app,'data.js'),'utf8')+'\nthis.sw={DOCENTI,TURNI};',ctx);
  const {DOCENTI,TURNI}=ctx.sw, days=['','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì'];
  const zoom={}; for(const f of [m,s]) for(const l of f.lezioni) { const r=l.room.replace('AULA ',''); if(/^\d+$/.test(r)&&!zoom[r]) zoom[r]=l.zoomUrl; }
  const room=r=>r.esercizi?'Aula docenti':`Aula ${r.aula}`;
  const hour=h=>`${String(h).padStart(2,'0')}:00 – ${String(h).padStart(2,'0')}:50`;
  const headers=['Giorno','Orario','Anno','Indirizzi','Materia','Docente','Aula','Note','Link lezione (Zoom)','ID'];
  const rows=rr=>[headers,...rr.slice().sort((a,b)=>a.day-b.day||a.hour-b.hour||a.anno.localeCompare(b.anno)||a.doc.localeCompare(b.doc)).map(r=>[days[r.day],hour(r.hour),r.anno+' anno',r.ind,r.materia,d.nomi[r.doc]||r.doc,room(r),r.esercizi?'Esercizi':r.note||'',zoom[r.aula]||'',r.id])];
  const all=[...d.diurno,...d.serale], teacher=[['Docente','Orario',...days.slice(1)]];
  for(const [id,name] of Object.entries(d.nomi).sort((a,b)=>a[1].localeCompare(b[1]))) {
    const mine=all.filter(r=>r.doc===id);
    for(const h of [...new Set(mine.map(r=>r.hour))].sort((a,b)=>a-b)) teacher.push([name,hour(h),...days.slice(1).map((_,i)=>mine.filter(r=>r.day===i+1&&r.hour===h).map(r=>`${r.materia} · ${r.anno} · ${r.ind} · ${room(r)}`).join('\n'))]);
  }
  const rooms=[['Aula','Link Zoom','Docenti che la usano'],...Object.keys(zoom).sort((a,b)=>+a-+b).map(n=>['Aula '+n,zoom[n],[...new Set(all.filter(r=>String(r.aula)===n&&!r.esercizi).map(r=>d.nomi[r.doc]||r.doc))].sort().join(', ')]),['Aula docenti',"Nessun link: è la sala in sede per chi svolge gli esercizi; il docente è collegato nella sua aula",'']];
  const shifts=[['Docente','Mattina','Sera',...days.slice(1)],...DOCENTI.map(r=>[r.nome,r.cal.includes('M')?'Sì':'No',r.sera?'Sì':'No',...(TURNI.m[r.id]||'-----')])];
  const names=Object.fromEntries(DOCENTI.map(d=>[d.id,d.nome])), changes=[];
  for(const a of state.assenze) changes.push([a.dal,a.al,'Assenza',names[a.docenteId]||a.docenteId,a.tipo||'',a.nota||'']);
  for(const s of state.sost) for(const [lid,did] of Object.entries(s.map||{})) changes.push([s.data,s.data,'Sostituzione',names[did]||'nessun sostituto',lid,'']);
  for(const m of state.mods) changes.push([(m.creata||'').slice(0,10),'','Modifica permanente','',m.lessonId||'',m.motivo||'']);
  changes.sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  return {spreadsheetId:SHEET_ID, sheets:{'Mattina':rows(d.diurno),'Sera':rows(d.serale),'Orari docenti':teacher,'Aule e link':rooms,'Turni docenti':shifts,'Modifiche e sostituzioni':[['Dal','Al','Tipo','Docente','Dettaglio','Note'],...changes]}};
}
module.exports={sheets,SHEET_ID};
