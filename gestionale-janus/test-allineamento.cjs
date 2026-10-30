const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),vm=require('node:vm');
const {Store}=require('./store.cjs'),{reconcile,lessons}=require('./allineamento.cjs'),plan=require('./allineamento.json');
const snapshot=()=>JSON.parse(fs.readFileSync(path.join(__dirname,'dati/calendario-gestionale-completo.json')));
function previous(){const s=snapshot();delete s.allineamento;s.collections.mods=s.collections.mods.filter(m=>m.batch!==plan.id);return s;}
function engine(collections){const ctx=vm.createContext({console,document:{addEventListener(){}}});vm.runInContext(['data.js','rules.js','engine.js','app.js'].map(f=>fs.readFileSync(path.join(__dirname,'app',f),'utf8')).join('\n')+'\nthis.X={ST,bump,lezioni,DOCENTI,DOC,controlli,pCal,U};',ctx);Object.assign(ctx.X.ST,{mods:collections.mods,assenze:collections.assenze,sost:collections.sost,regole:collections.regole,docOv:Object.fromEntries(collections.docenti.map(d=>[d.id,d]))});ctx.X.bump();return ctx.X;}
const canonical=d=>d.lezioni.map(l=>({id:l.id,weekday:l.weekday,start:l.start,end:l.end,subject:l.subject,year:l.year,class:l.class,teacher:l.teacher,room:l.room,note:l.note||'',tracks:l.tracks||null,affiancaA:l.affiancaA||[],esercizi:!!l.esercizi,zoomUrl:l.zoomUrl||'',zoomPasscode:l.zoomPasscode||''})).sort((a,b)=>a.id.localeCompare(b.id));
test('allineamento completo e idempotente, con preservazione di storico, assenze, sostituzioni e proposte',()=>{
 const old=previous();old.collections.assenze.push({id:'assenza_locale',docenteId:'as',dal:'2026-10-09',al:'2026-10-09'});old.collections.sost.push({id:'sost_locale',data:'2026-10-09',map:{L001:'gd'}});old.collections.proposte.push({id:'proposta_locale',stato:'in attesa',azioni:[]});old.collections.docenti.push({id:'gd',matExtra:['materia locale']});
 old.collections.mods.push({id:'nota_locale',tipo:'set',lessonId:'L001',creata:'2099-01-01',patch:{note:'Nota locale da conservare'}});
 old.collections.mods.push({id:'nuova_locale',tipo:'add',lessonId:'LOCALE_EXTRA',creata:'2099-01-01',lezione:{g:1,h:14,anno:'5',materia:'INCONTRO LOCALE',ind:'MME',doc:null,aula:'',note:''}});
 const next=reconcile(old);assert.equal(next.report.stato,'completato');
 for(const k of ['assenze','sost','proposte','regole','docenti'])assert.deepEqual(next.collections[k],old.collections[k]);
 const migrated={...old,collections:next.collections,allineamento:next.report};const twice=reconcile(migrated);assert.equal(twice.changed,false);assert.deepEqual(twice.collections,next.collections);assert.equal(new Set(next.collections.mods.map(m=>m.id)).size,next.collections.mods.length);
 const active=engine(next.collections);assert.ok(active.DOCENTI.some(d=>d.id==='mr'&&d.nome==='Marianna Raia'));assert.ok(!active.DOCENTI.some(d=>d.id==='as'));assert.equal(active.DOC.as.nome,'Alessandra Sbucafratta');
 assert.equal(active.lezioni().find(l=>l.id==='L001').note,'Nota locale da conservare');assert.ok(active.lezioni().some(l=>l.id==='LOCALE_EXTRA'));
 assert.ok(active.pCal().includes('Marianna Raia'));assert.ok(!active.pCal().includes('Alessandra Sbucafratta'));assert.ok(active.lezioni().every(l=>l.doc!=='as'));
 const unchanged=previous();unchanged.allineamento={id:plan.id,stato:'completato'};unchanged.collections.mods.push({id:'dopo_allineamento',tipo:'set',lessonId:'L001',creata:'2099-01-01',patch:{aula:'9'}});assert.deepEqual(reconcile(unchanged).collections,unchanged.collections);
});
test('modifiche locali discordanti bloccano l’allineamento senza sovrascrivere alcuna collezione',()=>{
 const old=previous(),action=plan.actions.find(a=>a.tipo==='set'&&a.patch.materia&&a.before.materia!==a.patch.materia);
 old.collections.mods.push({id:'modifica_locale',tipo:'set',lessonId:action.lessonId,creata:'2099-01-01',patch:{materia:'Materia scelta dalla collega'}});
 const res=reconcile(old);assert.equal(res.report.stato,'conflitti');assert.ok(res.report.conflitti.some(c=>c.lessonId===action.lessonId&&c.campi.includes('materia')));assert.deepEqual(res.collections,old.collections);assert.equal(res.changed,false);
 const code=fs.readFileSync(path.join(__dirname,'server.cjs'),'utf8');assert.match(code,/allineamento\?\.stato==='conflitti'/);
});
test('archivio già esistente: backup, migrazione una sola volta e mantenimento del marcatore dopo i salvataggi',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'janus-migrazione-'));try{const old=previous();old.revision=12;fs.writeFileSync(path.join(dir,'stato.json'),JSON.stringify(old));const store=new Store(dir,path.join(__dirname,'importazione')),after=store.read();assert.equal(after.revision,13);assert.equal(after.allineamento.stato,'completato');assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'backup/stato-12.json'))),old);assert.equal(new Store(dir,path.join(__dirname,'importazione')).read().revision,13);const cols=structuredClone(after.collections);cols.proposte.push({id:'nuova',stato:'in attesa',azioni:[]});store.save(13,cols);assert.equal(new Store(dir,path.join(__dirname,'importazione')).read().revision,14);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('tutte le 248 lezioni esportate coincidono con i calendari pubblicati, inclusi link e passcode',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'janus-confronto-'));try{
 const state=snapshot(),file=path.join(dir,'collections.json');fs.writeFileSync(file,JSON.stringify(state.collections));cp.execFileSync(process.execPath,[path.join(__dirname,'app/studenti/genera-studenti.js'),file,dir],{stdio:'pipe'});
 const expected=require('./allineamento-verifica.json');for(const n of ['mattina','sera']){const d=JSON.parse(fs.readFileSync(path.join(dir,n+'.json')));assert.equal(d.lezioni.length,expected.conteggi[n]);assert.equal(crypto.createHash('sha256').update(JSON.stringify(canonical(d))).digest('hex'),expected.sha256[n]);assert.equal(new Set(d.lezioni.map(l=>l.id)).size,d.lezioni.length);}
 const teacher=JSON.parse(fs.readFileSync(path.join(dir,'docenti.json')));assert.equal(teacher.nomi.MR,'Marianna Raia');assert.ok(!teacher.nomi.AS);assert.ok([...teacher.diurno,...teacher.serale].every(l=>l.doc!=='AS'));
 assert.equal(teacher.diurno.find(l=>l.id==='LJ20261014_7').materia,'Lab fisica');assert.equal(teacher.diurno.find(l=>l.id==='L118').materia,'Francese grammatica');assert.equal(teacher.diurno.find(l=>l.id==='L128').materia,'Francese avanzato');
 const serale=JSON.parse(fs.readFileSync(path.join(dir,'sera.json')));const meet=serale.lezioni.find(l=>l.id==='SJ20261030_MME_MECCANICA');assert.equal(meet.teacher,'');assert.equal(meet.zoomUrl,'https://meet.google.com/czs-wsxe-iqt');assert.equal(meet.start,'18:00');
 const {sheets}=require('./sheets.cjs');const payload=sheets(dir,state.collections,path.join(__dirname,'app'));const row=payload.sheets.Sera.find(r=>r[9]===meet.id);assert.equal(row[5],'');assert.equal(row[8],meet.zoomUrl);
 assert.ok(payload.sheets['Orari docenti'].some(r=>r[0]==='Marianna Raia'));assert.ok(payload.sheets['Turni docenti'].every(r=>r[0]!=='Alessandra Sbucafratta'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
