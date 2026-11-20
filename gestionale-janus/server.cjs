const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {Store,atomic}=require('./store.cjs'),{sheets,SHEET_ID}=require('./sheets.cjs'), integrations=require('./integrations.cjs');
const runtime=require('./condivisione.cjs').runtime(),{verify}=require('./verifica-pubblicazione.cjs');
const ROOT=__dirname, APP=path.join(ROOT,'app'), DATA=process.env.JANUS_DATA_DIR||path.join(ROOT,'archivio');
const store=new Store(DATA,path.join(ROOT,'importazione')), TOKEN=crypto.randomBytes(32).toString('hex');
const PORT=runtime.port, ORIGIN=runtime.origin;
const SECRET=path.join(DATA,'collegamenti-privati.json'), STATUS=path.join(DATA,'sincronizzazione.json');
const config=()=>{const c=fs.existsSync(SECRET)?JSON.parse(fs.readFileSync(SECRET,'utf8')):{};return {...c,...((runtime.githubToken||process.env.JANUS_GITHUB_TOKEN)?{github:runtime.githubToken||process.env.JANUS_GITHUB_TOKEN}:{}),...(runtime.shared?{automatico:true}:{})};};
let sync=fs.existsSync(STATUS)?JSON.parse(fs.readFileSync(STATUS,'utf8')):{github:'Da collegare',google:'Da collegare'};
let queue=Promise.resolve();
const enqueue=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
function generate(state) {
  const folder=path.join(DATA,'esportazioni',String(state.revision));fs.mkdirSync(folder,{recursive:true});
  atomic(path.join(folder,'stato.json'),state.collections);
  cp.execFileSync(process.execPath,[path.join(APP,'studenti/genera-studenti.js'),path.join(folder,'stato.json'),folder],{timeout:30000,stdio:'pipe'});
  const payload=sheets(folder,state.collections,APP);atomic(path.join(folder,'google-sheets.json'),payload);
  atomic(path.join(DATA,'ultima-esportazione.json'),{revision:state.revision,folder});
  return {folder,payload};
}
async function publish(state) {
  sync.delera='Aggiornamento da completare';sync.deleraVerificato=false;
  if(state.allineamento?.stato==='conflitti'){sync.locale='Allineamento da verificare: pubblicazione sospesa per conservare le modifiche locali.';atomic(STATUS,sync);return;}
  let output;
  try { output=generate(state); sync.locale='Dati esportati'; sync.exportRevision=state.revision; }
  catch(e) {sync.locale='Esportazione non riuscita. Dati salvati; riprova.';atomic(STATUS,sync);return;}
  const conf=config();
  for(const service of ['github','google']) {
    const credential=conf[service];
    if(!credential){sync[service]='Da collegare';continue;}
    if(!conf.automatico){sync[service]='Automatico disattivato';continue;}
    try {
      const contentHash=crypto.createHash('sha256').update(JSON.stringify(state.collections)).digest('hex');
      const alreadyPublished=sync[service+'Hash']===contentHash&&sync[service]==='Aggiornato';
      if(service==='github') {
        const files=Object.fromEntries(['mattina.json','sera.json','docenti.json'].map(n=>[n,fs.readFileSync(path.join(output.folder,n),'utf8')]));
        if(!alreadyPublished)sync.githubCommit=await integrations.github(credential,files);
        const verified=await verify(files);sync.deleraVerificato=verified.ok;
        sync.delera=verified.ok?'Dati per Delera verificati':'GitHub aggiornato; attesa aggiornamento dei dati per Delera';
        sync.deleraRevision=verified.ok?state.revision:null;
      } else if(!alreadyPublished)await integrations.google(credential,output.payload);
      sync[service]='Aggiornato';sync[service+'Revision']=state.revision;sync[service+'Hash']=contentHash;
    } catch(e) {sync[service]=e.message;}
  }
  sync.checkedAt=new Date().toISOString();atomic(STATUS,sync);
}
function status(){const c=config();return {...sync,condiviso:runtime.shared,allineamento:store.read().allineamento,automatico:!!c.automatico,githubConfigurato:!!c.github,googleConfigurato:!!c.google,googleEmail:c.google?.client_email||'',spreadsheetId:SHEET_ID};}
function html() {
  const src=['data.js','rules.js','engine.js','app.js','local.js'].map(n=>fs.readFileSync(path.join(APP,n),'utf8')).join('\n');
  return '<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+fs.readFileSync(path.join(APP,'template.html'),'utf8').replace('/*__SCRIPT__*/',`window.JANUS_TOKEN=${JSON.stringify(TOKEN)};\n${src}`)+'</html>';
}
async function body(req) {let text='';for await(const b of req){text+=b;if(Buffer.byteLength(text)>4e6)throw Error('Richiesta troppo grande.');}return JSON.parse(text);}
const server=http.createServer(async(req,res)=>{
  const send=(code,value,type='application/json')=>{res.writeHead(code,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'});res.end(type==='application/json'?JSON.stringify(value):value);};
  try {
    if(req.headers.host!==(new URL(ORIGIN)).host)return send(403,{error:'Host non consentito.'});
    try{await runtime.authenticate(req);}catch{return send(403,{error:'Accesso riservato alle colleghe autorizzate.'});}
    if(req.url==='/'&&req.method==='GET')return send(200,html(),'text/html');
    if(req.headers['x-janus-token']!==TOKEN||(req.headers.origin&&req.headers.origin!==ORIGIN))return send(403,{error:'Apri Calendari Janus dal suo indirizzo locale.'});
    if(req.url==='/api/state'&&req.method==='GET')return send(200,{...store.read(),sync:status()});
    if(req.url==='/api/status'&&req.method==='GET')return send(200,status());
    if(req.url==='/api/state'&&req.method==='POST') {
      const input=await body(req);
      const result=await enqueue(async()=>{const previous=store.read(), next=store.save(input.revision,input.collections);
        const relevant=c=>JSON.stringify(Object.fromEntries(Object.entries(c).filter(([k])=>k!=='proposte')));
        if(relevant(previous.collections)!==relevant(next.collections))await publish(next);
        return {...next,sync:status()};});return send(200,result);
    }
    if(req.url==='/api/sync'&&req.method==='POST') {await enqueue(()=>publish(store.read()));return send(200,status());}
    if(req.url==='/api/config'&&req.method==='POST') {
      if(runtime.shared)return send(403,{error:'I collegamenti si configurano nei segreti del server condiviso.'});
      const input=await body(req), c=config();
      if(typeof input.github==='string'&&input.github.trim())c.github=input.github.trim();
      if(input.google) {
        if(input.google.type!=='service_account'||!input.google.client_email?.endsWith('.gserviceaccount.com')||!input.google.private_key)throw Error('Seleziona un file JSON di account di servizio Google valido.');
        crypto.createPrivateKey(input.google.private_key);c.google=input.google;
      }
      c.automatico=input.automatico===true;atomic(SECRET,c);
      await enqueue(()=>publish(store.read()));return send(200,status());
    }
    send(404,{error:'Non trovato.'});
  }catch(e){send(e.status||400,{error:e.message});}
});
server.on('error',e=>{console.error('Avvio non riuscito: '+e.code);process.exitCode=1;});
server.listen(PORT,runtime.host,()=>{console.log('Calendari Janus: '+ORIGIN);enqueue(()=>publish(store.read()));if(!runtime.shared&&process.env.JANUS_OPEN_BROWSER==='1')cp.spawn('open',[ORIGIN],{stdio:'ignore'});});
// Il commit GitHub può precedere di alcuni minuti l'aggiornamento di Pages.
const retry=setInterval(()=>{if(!sync.deleraVerificato&&config().automatico)enqueue(()=>publish(store.read())).catch(()=>{});},30000);retry.unref();
