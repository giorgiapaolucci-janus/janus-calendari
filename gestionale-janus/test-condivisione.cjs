const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {runtime}=require('./condivisione.cjs'),{verify}=require('./verifica-pubblicazione.cjs');
test('condivisione: dominio HTTPS, disco persistente, segreto server e identità obbligatori',async()=>{
 const env={JANUS_MODE:'condiviso',JANUS_PUBLIC_ORIGIN:'https://janus.example.org',JANUS_DATA_DIR:'/var/data/janus',JANUS_GITHUB_TOKEN:'test-only',JANUS_ACCESS_ISSUER:'https://test.cloudflareaccess.com',JANUS_ACCESS_AUD:'test',JANUS_ALLOWED_EMAILS:'a@example.org,b@example.org'};
 const valid=runtime(env,()=>async token=>{if(token!=='signed-test')throw Error('negato');return 'a@example.org';});
 assert.equal(valid.host,'127.0.0.1');assert.equal(valid.origin,'https://janus.example.org');
 await assert.rejects(valid.authenticate({headers:{}}));assert.equal(await valid.authenticate({headers:{'cf-access-jwt-assertion':'signed-test'}}),'a@example.org');
 for(const k of ['JANUS_DATA_DIR','JANUS_GITHUB_TOKEN','JANUS_PUBLIC_ORIGIN','JANUS_ACCESS_ISSUER','JANUS_ACCESS_AUD','JANUS_ALLOWED_EMAILS']){const e={...env};delete e[k];assert.throws(()=>runtime(e));}
 assert.throws(()=>runtime({...env,JANUS_PUBLIC_ORIGIN:'http://janus.example.org'}));assert.throws(()=>runtime({...env,JANUS_PUBLIC_ORIGIN:'https://janus.example.org/path'}));
 assert.equal(runtime({}).shared,false);
});
test('pubblicazione: esito positivo solo se tutti e tre i dati corrispondono',async()=>{
 const files=Object.fromEntries(['mattina','sera','docenti'].map(n=>[n+'.json',JSON.stringify({aggiornato:'before',lezioni:[{id:n,teacher:'test'}]})]));
 const fetcher=async url=>{const name=new URL(url).pathname.split('/').pop();return {ok:true,json:async()=>({...JSON.parse(files[name]),aggiornato:'after'})};};
 assert.equal((await verify(files,{fetcher})).ok,true);
 assert.equal((await verify(files,{fetcher:async url=>url.includes('docenti')?{ok:true,json:async()=>({lezioni:[]})}:fetcher(url)})).ok,false);
 assert.equal((await verify(files,{fetcher:async()=>{throw Error('offline');}})).ok,false);
});
test('assenza approvata: studenti e docenti ricevono sostituzioni e scoperte solo nelle date interessate',()=>{
 const root=__dirname,state=require('./dati/calendario-gestionale-completo.json'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'janus-pubblicazione-'));
 try{
  const c=structuredClone(state.collections),row=require('./allineamento.cjs').lessons(c).find(l=>l.doc==='gl'&&l.g===1&&l.h===9);
  assert.ok(row);c.assenze.push({id:'test_assenza',docenteId:'gl',dal:'2026-11-23',al:'2026-11-27'});
  c.sost.push({id:'test_sost',data:'2026-11-23',map:{[row.id]:'er'}});
  const input=path.join(dir,'collections.json');fs.writeFileSync(input,JSON.stringify(c));
  cp.execFileSync(process.execPath,[path.join(root,'app/studenti/genera-studenti.js'),input,dir]);
  const morning=JSON.parse(fs.readFileSync(path.join(dir,'mattina.json'))),teachers=JSON.parse(fs.readFileSync(path.join(dir,'docenti.json')));
  assert.equal(morning.modifiche.find(m=>m.lessonId===row.id&&m.date==='2026-11-23').teacher,'Elisa Rubeo');
  const uncovered=morning.modifiche.find(m=>m.date==='2026-11-25'&&m.status==='uncovered');assert.ok(uncovered);assert.equal(uncovered.zoomUrl,'');
  assert.equal(teachers.sostituzioni['2026-11-23'][row.id],'ER');assert.equal(teachers.sostituzioni['2026-11-25'][uncovered.lessonId],'');
  assert.ok(morning.modifiche.every(m=>m.date>='2026-11-23'&&m.date<='2026-11-27'));
  assert.equal(morning.lezioni.find(l=>l.id===row.id).teacher,'Gabriele Luverà');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('HTTP condiviso: identità firmata obbligatoria anche per HTML, CSRF e configurazione segreti bloccata',async()=>{
 const crypto=require('node:crypto'),http=require('node:http'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'janus-shared-http-'));
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...publicKey.export({format:'jwk'}),kid:'test',use:'sig'};
 const issuer='https://test.cloudflareaccess.com',aud='janus-test',env={...process.env,JANUS_MODE:'condiviso',JANUS_PORT:'18766',JANUS_PUBLIC_ORIGIN:'https://janus.example.org',JANUS_DATA_DIR:dir,JANUS_GITHUB_TOKEN:'test-only',JANUS_ACCESS_ISSUER:issuer,JANUS_ACCESS_AUD:aud,JANUS_ALLOWED_EMAILS:'collega@example.org'};
 const bootstrap=`global.fetch=async url=>{if(String(url)==='${issuer}/cdn-cgi/access/certs')return {ok:true,json:async()=>({keys:[${JSON.stringify(jwk)}]})};throw Error('Rete esterna disabilitata nel test');};require(${JSON.stringify(path.join(__dirname,'server.cjs'))});`;
 const proc=cp.spawn(process.execPath,['-e',bootstrap],{env,stdio:['ignore','pipe','pipe']});
 const ready=new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);proc.once('exit',code=>reject(Error('Server test terminato: '+code)));});
 const sign=email=>{const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url'),body=enc({alg:'RS256',kid:'test'})+'.'+enc({iss:issuer,aud,sub:email,email,exp:Math.floor(Date.now()/1000)+120});return body+'.'+crypto.sign('RSA-SHA256',Buffer.from(body),privateKey).toString('base64url');};
 const request=(url,headers={},method='GET')=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:18766,path:url,method,headers:{Host:'janus.example.org',...headers}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve({status:res.statusCode,text}));});req.on('error',reject);req.end(method==='POST'?'{}':undefined);});
 try{
  await ready;assert.equal((await request('/')).status,403);
  assert.equal((await request('/',{'cf-access-jwt-assertion':sign('estranea@example.org')})).status,403);
  const identity={'cf-access-jwt-assertion':sign('collega@example.org')},page=await request('/',identity);assert.equal(page.status,200);
  assert.ok(!page.text.includes('test-only'));const token=JSON.parse(page.text.match(/window.JANUS_TOKEN=("[^"]+")/)[1]);
  assert.equal((await request('/api/state',identity)).status,403);
  const headers={...identity,'x-janus-token':token};assert.equal((await request('/api/state',headers)).status,200);
  assert.equal((await request('/api/config',headers,'POST')).status,403);
  assert.equal((await request('/api/state',{...headers,Origin:'https://estraneo.example.org'},'POST')).status,403);
 }finally{if(proc.exitCode===null)await new Promise(resolve=>{proc.once('exit',resolve);proc.kill();});fs.rmSync(dir,{recursive:true,force:true});}
});
