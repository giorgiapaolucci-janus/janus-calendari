const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),vm=require('node:vm');
const {Store}=require('./store.cjs'),{requestsFor,github}=require('./integrations.cjs');
test('importazione completa, persistenza al riavvio, backup e conflitto revisioni',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'janus-test-'));
 try {
  const store=new Store(dir,path.join(__dirname,'importazione')),s=store.read();
  assert.equal(s.collections.assenze.length,0);assert.equal(s.collections.mods.length,69);assert.equal(s.collections.proposte.length,0);
  const next=structuredClone(s.collections);next.proposte.push({id:'prova',stato:'in attesa',azioni:[]});
  store.save(0,next);assert.equal(new Store(dir,'non-usato').read().collections.proposte.length,1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'backup/stato-0.json'))),s);
  assert.throws(()=>store.save(0,s.collections),e=>e.status===409);
  assert.throws(()=>store.save(1,{assenze:[]}));assert.equal(store.read().revision,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('richieste Google preservano formattazione, cancellano vecchie celle e bloccano formule',()=>{
 const payload={sheets:{Mattina:[['ID'],['L001']]}},live={sheets:[{properties:{title:'Mattina',sheetId:42,gridProperties:{rowCount:1000}},data:[{rowData:[{values:[{userEnteredValue:{stringValue:'ID'}}]},{values:[{userEnteredValue:{stringValue:'L002'}}]},{values:[{userEnteredValue:{stringValue:'L003'}}]}]}]}]};
 const req=requestsFor(payload,live);assert.equal(req.length,2);assert.equal(req[0].updateCells.fields,'userEnteredValue');assert.deepEqual(req[1].updateCells.rows[0].values,[{}]);
 live.sheets[0].data[0].rowData[1].values[0].userEnteredValue={formulaValue:'=1'};
 assert.throws(()=>requestsFor(payload,live),/Formula/);
});
test('GitHub pubblica tre JSON in un solo commit senza forzare la cronologia',async()=>{
 const old=global.fetch,calls=[];
 global.fetch=async(url,opts)=>{calls.push({url,opts});let data;if(url.endsWith('git/ref/heads/main'))data={object:{sha:'head'}};else if(url.endsWith('git/commits/head'))data={tree:{sha:'base'}};else if(url.endsWith('git/trees'))data={sha:'tree'};else if(url.endsWith('git/commits'))data={sha:'commit'};else data={};return {ok:true,json:async()=>data};};
 try {await github('test-token',{'mattina.json':'{}','sera.json':'{}','docenti.json':'{}'});assert.equal(calls.length,5);assert.equal(JSON.parse(calls[2].opts.body).tree.length,3);assert.equal(JSON.parse(calls[4].opts.body).force,false);}
 finally{global.fetch=old;}
});
test('interfaccia: azione multipla salvata una volta; rollback su errore',async()=>{
 let saved=0,fail=false,persisted={revision:0,collections:Object.fromEntries(['assenze','sost','mods','proposte','regole','docenti'].map(k=>[k,[]])),sync:{}};
 const ctx={window:{JANUS_TOKEN:'test'},COLS:Object.keys(persisted.collections),LOCAL:{},U:{},ACT:{},localEmit(){},render(){},console,fetch:async(_url,opts)=>{
  if(opts.method==='POST'){if(fail)return {ok:false,json:async()=>({error:'Errore simulato'})};const b=JSON.parse(opts.body);saved++;persisted={revision:saved,collections:b.collections,sync:{}};}
  return {ok:true,json:async()=>structuredClone(persisted)};
 }};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'app/local.js'),'utf8').replace('render();initStore();',''),ctx);
 await vm.runInContext('initStore()',ctx);
 await vm.runInContext("localAction(async()=>{await put('mods','a',{patch:{aula:'6'}});await put('mods','b',{patch:{aula:'6'}})})",ctx);
 assert.equal(saved,1);assert.equal(persisted.collections.mods.length,2);
 fail=true;await vm.runInContext("localAction(async()=>{await del('mods','a');await del('mods','b')})",ctx);
 assert.equal(saved,1);assert.equal(vm.runInContext('collectionState().mods.length',ctx),2);
 assert.match(ctx.U.msg.t,/Errore simulato/);
});
test('server HTTP: CSRF, salvataggio, riavvio, conflitti e stato non pubblico',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'janus-http-')),port=18765,base=`http://127.0.0.1:${port}`;let proc;
 const start=()=>new Promise((resolve,reject)=>{proc=cp.spawn(process.execPath,[path.join(__dirname,'server.cjs')],{env:{...process.env,JANUS_PORT:String(port),JANUS_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});proc.stdout.once('data',resolve);proc.once('error',reject);proc.once('exit',code=>reject(Error('Server terminato: '+code)));});
 const stop=()=>new Promise(resolve=>{proc.once('exit',resolve);proc.kill();});
 try {
  await start();const html=await(await fetch(base)).text(),token=JSON.parse(html.match(/window.JANUS_TOKEN=("[^"]+")/)[1]);
  const headers={'X-Janus-Token':token,'Content-Type':'application/json'};
  assert.equal((await fetch(base+'/api/state')).status,403);
  assert.equal((await fetch(base+'/archivio/stato.json',{headers})).status,404);
  const s=await(await fetch(base+'/api/state',{headers})).json();s.collections.proposte.push({id:'test',stato:'in attesa',azioni:[]});
  const options={method:'POST',headers,body:JSON.stringify({revision:s.revision,collections:s.collections})};
  assert.equal((await fetch(base+'/api/state',{...options,headers:{...headers,Origin:'https://example.org'}})).status,403);
  const saved=await(await fetch(base+'/api/state',options)).json();assert.equal(saved.revision,1);
  assert.equal((await fetch(base+'/api/state',options)).status,409);
  await stop();await start();assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'stato.json'))).collections.proposte.length,1);
 }finally{if(proc&&proc.exitCode===null)await stop();fs.rmSync(dir,{recursive:true,force:true});}
});
