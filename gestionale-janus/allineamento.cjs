const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function lessons(collections,app=path.join(__dirname,'app')){
 const ctx=vm.createContext({console});
 vm.runInContext(['data.js','rules.js','engine.js'].map(f=>fs.readFileSync(path.join(app,f),'utf8')).join('\n')+'\nthis.X={ST,bump,lezioni};',ctx);
 Object.assign(ctx.X.ST,{mods:collections.mods,assenze:collections.assenze,sost:collections.sost,regole:collections.regole,docOv:Object.fromEntries(collections.docenti.map(d=>[d.id,d]))});ctx.X.bump();
 return JSON.parse(JSON.stringify(ctx.X.lezioni()));
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function reconcile(state,plan=JSON.parse(fs.readFileSync(path.join(__dirname,'allineamento.json')))){
 if(state.allineamento?.id===plan.id&&state.allineamento.stato==='completato')return {collections:state.collections,report:state.allineamento,changed:false};
 const collections=structuredClone(state.collections),current=new Map(lessons(collections).map(l=>[l.id,l])),conflicts=[],pending=[];
 for(const a of plan.actions){
  const l=current.get(a.lessonId),fields=a.tipo==='set'?Object.keys(a.patch).filter(k=>k!=='class'):[];
  if(a.tipo==='add'){
   if(!l)pending.push(a);else if(!Object.entries(a.lezione).filter(([k])=>k!=='class').every(([k,v])=>same(k==='esercizi'?!!l[k]:l[k],v)))conflicts.push({lessonId:a.lessonId,campi:['nuova lezione già presente con dati diversi']});
  }else if(a.tipo==='del'){
   if(!l)continue;
   const fields=['g','h','anno','materia','ind','doc','aula','note','tracks','affiancaA'];
   const changed=fields.filter(k=>!same(l[k],a.before[k]));
   if(changed.length)conflicts.push({lessonId:a.lessonId,campi:changed});else pending.push(a);
  }else if(!l)conflicts.push({lessonId:a.lessonId,campi:['lezione eliminata localmente']});
  else{
   const changed=fields.filter(k=>{const value=k==='esercizi'?!!l[k]:l[k],old=k==='esercizi'?!!a.before[k]:a.before[k];return !same(value,old)&&!same(value,a.patch[k]);});
   if(changed.length)conflicts.push({lessonId:a.lessonId,campi:changed});else if(Object.entries(a.patch).some(([k,v])=>!same(l[k],v)))pending.push(a);
  }
 }
 if(conflicts.length)return {collections:state.collections,report:{id:plan.id,stato:'conflitti',conflitti:conflicts},changed:false};
 let stamp=Math.max(Date.now(),...collections.mods.map(m=>Date.parse(m.creata)||0))+1;
 for(const a of pending){
  const id=plan.id+'_'+a.lessonId;
  if(collections.mods.some(m=>m.id===id))throw Error('Modifica di allineamento duplicata: '+a.lessonId);
  const m={id,batch:plan.id,creata:new Date(stamp++).toISOString(),lessonId:a.lessonId,tipo:a.tipo,motivo:'Allineamento del gestionale ai calendari pubblicati, 30 ottobre 2026'};
  if(a.patch)m.patch=a.patch;if(a.lezione)m.lezione=a.lezione;collections.mods.push(m);
 }
 return {collections,report:{id:plan.id,stato:'completato',modifiche:pending.length,conflitti:[]},changed:pending.length>0};
}
module.exports={reconcile,lessons};
